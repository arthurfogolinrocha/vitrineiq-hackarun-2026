"""API do VitrineIQ (FastAPI).

Rodar localmente:  uvicorn app.main:app --reload --port 8000
Documentação automática: http://localhost:8000/docs
"""

from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .ai_agent import audit_storefront_image, generate_plan
from .auth import exigir_login, limitar_por_ip
from .auth import router as auth_router
from .ciclo import router as ciclo_router
from .contexto import get_live_context
from .engine import (
    calculate_retail_opportunity_score,
    classify_score,
    compute_context_multiplier,
)
from .schemas import (
    AuditHashRequest,
    AuditHashResponse,
    ContextoResponse,
    PlanRequest,
    PlanResponse,
    ScoreRequest,
    ScoreResponse,
    VitrineAuditRequest,
    VitrineAuditResponse,
)
from .security import contains_restricted_patterns, generate_audit_hash, sanitize_input

app = FastAPI(
    title="VitrineIQ API",
    version=__version__,
    description="Backend do VitrineIQ: Score de Oportunidade, Agente de IA e hash encadeado para apontar alterações nos registros.",
)

_default_origins = (
    "http://localhost:3000,"
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "http://localhost:4173,"
    "http://127.0.0.1:4173,"
    "https://vitrineiq-capim-dourado.vercel.app"
)
allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]
_default_origin_regex = r"^https://vitrineiq-capim-dourado-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$"
_raw_origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX")
# Previews da Vercel (<projeto>-<hash>-<escopo>.vercel.app) e locais ficam compatíveis por padrão.
# Em produção estrita, defina ALLOWED_ORIGIN_REGEX="" para aceitar só ALLOWED_ORIGINS
# (como https://vitrineiq-capim-dourado.vercel.app) ou fixe o escopo do time na Vercel.
allowed_origin_regex = (
    (_raw_origin_regex.strip() or None) if _raw_origin_regex is not None else _default_origin_regex
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "If-None-Match"],
    expose_headers=["ETag"],
)


@app.middleware("http")
async def adicionar_headers_seguranca(request: Request, call_next):
    """Aplica cabeçalhos HTTP defensivos e bloqueia cache em rotas de autenticação e administração."""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(self), camera=(self)")
    if request.url.path.startswith("/api/auth/") or request.url.path.startswith("/api/admin/"):
        response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


app.include_router(ciclo_router)
app.include_router(auth_router)


LIMITE_IA_POR_MINUTO = 10
_chamadas_ia: defaultdict[str, deque[float]] = defaultdict(deque)


def limitar_ia(request: Request) -> None:
    """No máximo LIMITE_IA_POR_MINUTO chamadas ao Agente de IA por IP (protege a cota do Gemini)."""
    limitar_por_ip(request, _chamadas_ia, LIMITE_IA_POR_MINUTO,
                   "Muitas chamadas ao Agente de IA. Aguarde um minuto e tente de novo.")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/")
def root() -> dict:
    return {
        "service": "vitrineiq-api",
        "version": __version__,
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "vitrineiq-api",
        "version": __version__,
        "ai_provider_configured": bool(os.getenv("GEMINI_API_KEY")),
    }


@app.get("/api/contexto", response_model=ContextoResponse)
def contexto(force: bool = False) -> ContextoResponse:
    """Retorna clima real de Palmas-TO, faixa horária, eventos e gatilho do shopping."""
    return ContextoResponse(**get_live_context(force_refresh=force))


@app.post("/api/score", response_model=ScoreResponse)
def score(body: ScoreRequest) -> ScoreResponse:
    multiplier = compute_context_multiplier(body.zone_id, body.weather, body.time_slot, body.mall_event)
    value = calculate_retail_opportunity_score(
        body.vitrine_stops, body.qr_searches, body.lost_sales, multiplier
    )
    return ScoreResponse(
        score=value,
        multiplier=multiplier,
        priority=classify_score(value),
        audit_hash=generate_audit_hash(f"SCORE:{body.zone_id}:{value}", timestamp=_now()),
    )


@app.post("/api/ia/plano", response_model=PlanResponse, dependencies=[Depends(exigir_login), Depends(limitar_ia)])
def ia_plano(body: PlanRequest) -> PlanResponse:
    start = time.perf_counter()
    prompt = sanitize_input(body.prompt)
    context = sanitize_input(body.context or "")

    if contains_restricted_patterns(prompt) or contains_restricted_patterns(context):
        return PlanResponse(
            success=False,
            content="Aviso de Segurança: o pedido contém padrões restritos de segurança ou injeção.",
            source="BLOCKED",
            latency_ms=int((time.perf_counter() - start) * 1000),
            audit_hash=generate_audit_hash("IA_PLANO_BLOQUEADO", timestamp=_now()),
        )

    result = generate_plan(prompt, body.category, context or None)
    return PlanResponse(
        success=True,
        content=result.content,
        source=result.source,  # type: ignore[arg-type]
        latency_ms=int((time.perf_counter() - start) * 1000),
        audit_hash=generate_audit_hash(f"IA_PLANO:{result.source}", timestamp=_now()),
    )


@app.post(
    "/api/ia/auditar-vitrine",
    response_model=VitrineAuditResponse,
    dependencies=[Depends(exigir_login), Depends(limitar_ia)],
)
def ia_auditar_vitrine(body: VitrineAuditRequest) -> VitrineAuditResponse:
    """Raio-X Multimodal da Vitrine (sem persistência nem log da imagem - LGPD)."""
    start = time.perf_counter()
    raw_store_name = body.store_name
    store_name = sanitize_input(raw_store_name)

    if contains_restricted_patterns(raw_store_name) or contains_restricted_patterns(store_name) or not store_name:
        return VitrineAuditResponse(
            success=False,
            score=0,
            headline="Aviso de Segurança: o nome da loja contém padrões restritos de segurança ou injeção.",
            defects=["Entrada bloqueada pelo guardrail de segurança."],
            zone_moves=[],
            quick_win="Remova instruções ou scripts suspeitos do nome da loja e tente novamente.",
            source="BLOCKED",
            latency_ms=int((time.perf_counter() - start) * 1000),
            audit_hash=generate_audit_hash("IA_AUDITORIA_BLOQUEADA", timestamp=_now()),
        )

    result = audit_storefront_image(
        image_base64=body.image_base64,
        zone_id=body.zone_id,
        store_name=store_name,
        olhares_por_zona=body.olhares_por_zona,
        taxa_atencao=body.taxa_atencao,
    )
    return VitrineAuditResponse(
        success=True,
        score=result.score,
        headline=result.headline,
        defects=result.defects,
        zone_moves=result.zone_moves,
        quick_win=result.quick_win,
        source=result.source,  # type: ignore[arg-type]
        latency_ms=int((time.perf_counter() - start) * 1000),
        audit_hash=generate_audit_hash(
            f"IA_AUDITORIA:{body.zone_id}:{store_name}:{result.score}:{result.source}",
            timestamp=_now(),
        ),
    )


@app.post("/api/audit/hash", response_model=AuditHashResponse)
def audit_hash(body: AuditHashRequest) -> AuditHashResponse:
    return AuditHashResponse(
        hash=generate_audit_hash(body.payload, body.prev_hash, body.event_id, body.timestamp)
    )


_ALLOWED_LOGO_HOSTS = {
    "www.intranetmall.com",
    "intranetmall.com",
    "www.capimdouradosc.com.br",
    "capimdouradosc.com.br",
}


@app.get("/api/logo-proxy")
def logo_proxy(url: str) -> Response:
    """Proxy seguro (anti-SSRF) para carregar logos oficiais do shopping em Canvas PNG sem erro de CORS."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in _ALLOWED_LOGO_HOSTS:
        raise HTTPException(400, "Domínio de logo não autorizado.")
    try:
        resp = httpx.get(url, timeout=5.0, follow_redirects=False)
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Falha ao buscar logo da loja.") from exc
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, "Logo indisponível.")
    ctype = resp.headers.get("content-type", "image/png").split(";")[0].strip()
    if not ctype.startswith("image/"):
        raise HTTPException(415, "Conteúdo retornado não é uma imagem.")
    return Response(
        content=resp.content[:2_000_000],
        media_type=ctype,
        headers={
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
        },
    )

