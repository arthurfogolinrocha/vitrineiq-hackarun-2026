"""Rotas do ciclo do VitrineIQ: Balcão, Concierge, campanhas e câmera da vitrine.

O front lê tudo de uma vez em `GET /api/estado` (polling de 3 s), para o ciclo
atravessar aparelhos: o vendedor registra no celular e o painel do lojista vê.
Os campos seguem os nomes dos tipos do front (camelCase).
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Literal, Optional

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from . import db
from .engine import ZoneId
from .security import sanitize_input

router = APIRouter(prefix="/api")

LostSaleReason = Literal["preco", "estoque_grade", "pesquisando", "fila_atendimento"]
Budget = Literal["ate_80", "80_200", "acima_200"]

ZONAS_VITRINE = ("esquerda", "centro", "direita")
ALERTA_RECENTE_S = 60  # alertas mais antigos que isso não aparecem no painel


# ---------- Balcão ----------

class BalcaoIn(BaseModel):
    zoneId: ZoneId
    storeName: str = Field(min_length=1, max_length=80)
    tipo: Literal["venda", "perdida"]
    reason: Optional[LostSaleReason] = None
    note: Optional[str] = Field(default=None, max_length=200)


@router.post("/balcao", status_code=201)
def registrar_balcao(body: BalcaoIn) -> dict[str, Any]:
    if body.tipo == "perdida" and body.reason is None:
        raise HTTPException(422, "Venda perdida precisa de um motivo (RN07).")
    dados = {"zoneId": body.zoneId, "storeName": sanitize_input(body.storeName), "tipo": body.tipo}
    if body.tipo == "perdida":
        dados["reason"] = body.reason
        if body.note:
            dados["note"] = sanitize_input(body.note)
    return db.inserir("balcao", body.zoneId, dados)


@router.delete("/balcao/{rid}", status_code=204, response_model=None)
def desfazer_balcao(rid: int) -> Response:
    if not db.apagar("balcao", rid):
        raise HTTPException(404, "Registro não encontrado.")
    return Response(status_code=204)


# ---------- Campanhas relâmpago ----------

class CampanhaIn(BaseModel):
    zoneId: ZoneId
    storeName: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=120)
    discountBadge: str = Field(min_length=1, max_length=40)
    couponCode: str = Field(min_length=3, max_length=30)
    whatsappCopy: str = Field(default="", max_length=500)
    expiresInMinutes: int = Field(default=60, ge=1, le=24 * 60)


class CampanhaPatch(BaseModel):
    active: bool


def _campanha(c: dict[str, Any]) -> dict[str, Any]:
    return {**c, "createdAt": c["timestamp"]}


@router.post("/campanhas", status_code=201)
def publicar_campanha(body: CampanhaIn) -> dict[str, Any]:
    dados = {k: sanitize_input(v) if isinstance(v, str) else v for k, v in body.model_dump().items()}
    return _campanha(db.inserir("campanha", body.zoneId, {**dados, "active": True}))


@router.patch("/campanhas/{rid}")
def alterar_campanha(rid: int, body: CampanhaPatch) -> dict[str, Any]:
    c = db.buscar("campanha", rid)
    if c is None:
        raise HTTPException(404, "Campanha não encontrada.")
    dados = {k: v for k, v in c.items() if k not in ("id", "timestamp", "criadoEm")}
    db.atualizar("campanha", rid, {**dados, "active": body.active})
    return _campanha({**c, "active": body.active})


@router.delete("/campanhas/{rid}", status_code=204, response_model=None)
def remover_campanha(rid: int) -> Response:
    if not db.apagar("campanha", rid):
        raise HTTPException(404, "Campanha não encontrada.")
    return Response(status_code=204)


@router.get("/campanhas/ativas")
def campanhas_ativas(ala: Optional[ZoneId] = None) -> list[dict[str, Any]]:
    return [_campanha(c) for c in db.listar("campanha") if c["active"] and (ala is None or c["zoneId"] == ala)]


# ---------- Concierge QR ----------

class BuscaIn(BaseModel):
    zoneId: ZoneId
    query: str = Field(min_length=3, max_length=200)
    budget: Budget = "80_200"


@router.post("/concierge/busca", status_code=201)
def buscar_oferta(body: BuscaIn) -> dict[str, Any]:
    """Registra a busca anônima. Só entrega cupom se houver campanha publicada pelo lojista (T1)."""
    ativas = campanhas_ativas()
    oferta = next((c for c in ativas if c["zoneId"] == body.zoneId), None) or (ativas[0] if ativas else None)
    dados = {
        "zoneId": body.zoneId,
        "query": sanitize_input(body.query),
        "budget": body.budget,
        "preference": "",
        "couponCode": oferta["couponCode"] if oferta else "",
        "matchedOffer": f"{oferta['storeName']} — {oferta['title']} ({oferta['discountBadge']})" if oferta else "",
    }
    return db.inserir("busca", body.zoneId, dados)


# ---------- Câmera da vitrine ----------

class VitrineEventoIn(BaseModel):
    """Resumo de 10 s que o computer-vision grava (formato do vitrine_eventos.json) + a ala."""
    zona: ZoneId
    inicio: datetime  # a câmera manda sem fuso ("2026-11-13T19:00:00"); vale o horário local dela
    fim: datetime
    passantes: int = Field(ge=0, le=10_000)
    olharam: int = Field(ge=0, le=10_000)
    pararam_sem_olhar: int = Field(default=0, ge=0, le=10_000)
    atencao_media_s: float = Field(default=0, ge=0, le=3600)
    olhares_por_zona: dict[str, int] = Field(default_factory=dict)
    pico_simultaneo: int = Field(default=0, ge=0, le=1000)

    model_config = {"extra": "allow"}  # demais contagens (fluxo, grupos...) vão junto, sem validação extra


class VitrineAlertaIn(BaseModel):
    zona: ZoneId
    evento: Literal["atencao_alta", "lotacao", "apontou"]
    momento: datetime
    zonaVitrine: Optional[str] = Field(default=None, max_length=20)
    olhando_s: Optional[float] = None
    pessoas: Optional[int] = None


# mode="json" grava as datas em ISO: o JSON continua serializável e resumo_vitrine lê com fromisoformat.
@router.post("/vitrine/eventos", status_code=201)
def receber_evento(body: VitrineEventoIn) -> dict[str, Any]:
    return db.inserir("vitrine", body.zona, body.model_dump(mode="json"))


@router.post("/vitrine/alertas", status_code=201)
def receber_alerta(body: VitrineAlertaIn) -> dict[str, Any]:
    return db.inserir("alerta", body.zona, body.model_dump(mode="json", exclude_none=True))


def _pct(a: int, b: int) -> int:
    return round(100 * a / b) if b else 0


def resumo_vitrine(regs: list[dict[str, Any]]) -> dict[str, Any]:
    """Soma os resumos de 10 s. Mesma lógica de resumo() e acoes() do computer-vision/lojista.py."""
    passantes = sum(r["passantes"] for r in regs)
    olharam = sum(r["olharam"] for r in regs)
    sem_olhar = sum(r.get("pararam_sem_olhar", 0) for r in regs)
    com_tempo = [r for r in regs if r.get("atencao_media_s")]
    n_tempo = sum(r["olharam"] for r in com_tempo)
    zonas: Counter[str] = Counter()
    por_hora: Counter[int] = Counter()
    for r in regs:
        zonas.update(r.get("olhares_por_zona", {}))
        por_hora[datetime.fromisoformat(r["inicio"]).hour] += r["passantes"]
    hora_pico = max(por_hora.items(), key=lambda kv: kv[1])[0] if passantes else None
    taxa = _pct(olharam, passantes)

    acoes = []
    if passantes:
        acoes.append(f"Só {taxa}% de quem passa olha a vitrine. Troque a vitrine e compare a taxa na semana seguinte."
                     if taxa < 20 else
                     f"{taxa}% de quem passa olha a vitrine. Mantenha o que está funcionando e teste uma mudança por vez.")
    total_z = sum(zonas[z] for z in ZONAS_VITRINE)
    if total_z:
        z = max(ZONAS_VITRINE, key=lambda k: zonas[k])
        acoes.append(f"A parte da {z} recebe {_pct(zonas[z], total_z)}% dos olhares. "
                     "Coloque ali o produto que você mais quer vender.")
    if hora_pico is not None:
        acoes.append(f"O maior movimento é das {hora_pico}h às {hora_pico + 1}h ({por_hora[hora_pico]} passantes). "
                     "Tenha um vendedor perto da porta e dispare campanhas relâmpago um pouco antes.")
    if sem_olhar > olharam:
        acoes.append(f"{sem_olhar} pessoas pararam na frente sem olhar a vitrine. "
                     "Um cartaz ou QR na altura dos olhos aproveita esse tempo.")

    return {
        "passantes": passantes,
        "olharam": olharam,
        "taxaAtencao": taxa,
        "pararamSemOlhar": sem_olhar,
        "atencaoMediaS": round(sum(r["atencao_media_s"] * r["olharam"] for r in com_tempo) / n_tempo, 1) if n_tempo else 0,
        "picoSimultaneo": max((r.get("pico_simultaneo", 0) for r in regs), default=0),
        "horaPico": hora_pico,
        "porHora": {str(h): n for h, n in sorted(por_hora.items())},
        "olharesPorZona": {z: zonas[z] for z in ZONAS_VITRINE},
        "acoes": acoes[:3],
        "atualizadoEm": max((r["fim"] for r in regs), default=None),
    }


def _hoje() -> datetime:
    return db.agora().replace(hour=0, minute=0, second=0, microsecond=0)


@router.get("/vitrine/resumo")
def vitrine_resumo(ala: ZoneId) -> dict[str, Any]:
    return resumo_vitrine([r for r in db.listar("vitrine", 5000, _hoje()) if r["zona"] == ala])


# ---------- Estado completo para o painel ----------

@router.get("/estado")
def estado() -> dict[str, Any]:
    """Tudo o que o front precisa para desenhar o ciclo, numa chamada só (polling de 3 s)."""
    balcao = db.listar("balcao", 500)
    vendas: Counter[str] = Counter(r["zoneId"] for r in balcao if r["tipo"] == "venda")
    vitrine_regs = db.listar("vitrine", 5000, _hoje())
    vitrine = {z: resumo_vitrine([r for r in vitrine_regs if r["zona"] == z])
               for z in sorted({r["zona"] for r in vitrine_regs})}
    return {
        "lostSales": [r for r in balcao if r["tipo"] == "perdida"],
        "completedSalesByZone": dict(vendas),
        "signals": db.listar("busca", 100),
        "campaigns": [_campanha(c) for c in db.listar("campanha", 100)],
        "vitrine": vitrine,
        "alertas": db.listar("alerta", 20, db.agora() - timedelta(seconds=ALERTA_RECENTE_S)),
        "agora": db.agora().isoformat(),
    }
