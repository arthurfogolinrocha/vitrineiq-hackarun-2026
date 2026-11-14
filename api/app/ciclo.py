"""Rotas do ciclo do VitrineIQ: Balcão, Concierge, campanhas e câmera da vitrine.

O front lê tudo de uma vez em `GET /api/estado` (polling de 3 s), para o ciclo
atravessar aparelhos: o vendedor registra no celular e o painel do lojista vê.
Os campos seguem os nomes dos tipos do front (camelCase).
"""

from __future__ import annotations

import hmac
import os
from collections import Counter
from datetime import datetime, timedelta
from typing import Annotated, Any, Literal, Optional, get_args

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel, Field, StringConstraints

from . import db
from .engine import ZoneId
from .security import mascarar_dados_pessoais, sanitize_input

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
            dados["note"] = mascarar_dados_pessoais(sanitize_input(body.note))
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
    segmento: Optional[str] = Field(default=None, max_length=40)
    triggerOrigin: Optional[str] = Field(default=None, max_length=60)


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
    segmento: Optional[str] = Field(default=None, max_length=40)
    originZone: Optional[ZoneId] = None


def _combina_origem(campanha: dict[str, Any], origin_zone: Optional[str], zone_id: str) -> bool:
    trigger = (campanha.get("triggerOrigin") or "").strip().lower()
    if not trigger:
        return False
    alvos = [z.lower() for z in (origin_zone, zone_id) if z]
    return any(trigger == alvo or (len(trigger) >= 4 and trigger in alvo) for alvo in alvos)


@router.post("/concierge/busca", status_code=201)
def buscar_oferta(body: BuscaIn) -> dict[str, Any]:
    """Registra a busca anônima. Só entrega cupom se houver campanha publicada pelo lojista (T1)."""
    ativas = campanhas_ativas()
    seg = (body.segmento or "").strip().lower()
    if seg and seg != "todos":
        ativas_seg = [c for c in ativas if (c.get("segmento") or "").strip().lower() == seg]
        if ativas_seg:
            ativas = ativas_seg

    ativas_rota = [c for c in ativas if _combina_origem(c, body.originZone, body.zoneId)]
    bonus_rota = False
    if ativas_rota:
        oferta = next((c for c in ativas_rota if c["zoneId"] == body.zoneId), ativas_rota[0])
        bonus_rota = True
    else:
        gerais = [c for c in ativas if not (c.get("triggerOrigin") or "").strip()]
        pool = gerais or ativas
        oferta = next((c for c in pool if c["zoneId"] == body.zoneId), None) or (pool[0] if pool else None)

    matched = f"{oferta['storeName']} — {oferta['title']} ({oferta['discountBadge']})" if oferta else ""
    if bonus_rota and matched:
        matched = f"🎁 Bônus de Rota • {matched}"

    dados = {
        "zoneId": body.zoneId,
        "originZone": body.originZone or "",
        "query": mascarar_dados_pessoais(sanitize_input(body.query)),
        "budget": body.budget,
        "segmento": sanitize_input(body.segmento) if body.segmento else "",
        "preference": "",
        "couponCode": oferta["couponCode"] if oferta else "",
        "matchedOffer": matched,
        "bonusRota": bonus_rota,
    }
    return db.inserir("busca", body.zoneId, dados)


# ---------- Câmera da vitrine ----------

def exigir_token_vitrine(x_vitrine_token: Optional[str] = Header(default=None)) -> None:
    """Com VITRINE_TOKEN definida, só a câmera com o mesmo token grava. Sem ela, rotas abertas (dev local)."""
    esperado = os.getenv("VITRINE_TOKEN")
    if not esperado and os.getenv("VERCEL"):
        # Em produção, sem token configurado, recusa em vez de deixar qualquer um injetar dados na vitrine.
        raise HTTPException(503, "VITRINE_TOKEN não configurada no servidor.")
    if esperado and not hmac.compare_digest((x_vitrine_token or "").encode(), esperado.encode()):
        raise HTTPException(401, "Token da câmera ausente ou inválido.")


ParteVitrine = Annotated[str, StringConstraints(max_length=20)]


class VitrineEventoIn(BaseModel):
    """Resumo de 10 s que o computer-vision grava (formato do vitrine_eventos.json) + a ala."""
    zona: ZoneId
    inicio: datetime  # a câmera manda sem fuso ("2026-11-13T19:00:00"); vale o horário local dela
    fim: datetime
    passantes: int = Field(ge=0, le=10_000)
    olharam: int = Field(ge=0, le=10_000)
    pararam_sem_olhar: int = Field(default=0, ge=0, le=10_000)
    atencao_media_s: float = Field(default=0, ge=0, le=3600)
    olhares_por_zona: dict[ParteVitrine, Annotated[int, Field(ge=0, le=10_000)]] = Field(default_factory=dict, max_length=10)
    pico_simultaneo: int = Field(default=0, ge=0, le=1000)
    apontaram: int = Field(default=0, ge=0, le=10_000)
    no_celular: int = Field(default=0, ge=0, le=10_000)
    voltaram_a_olhar: int = Field(default=0, ge=0, le=10_000)
    chegaram_perto: int = Field(default=0, ge=0, le=10_000)

    model_config = {"extra": "ignore"}  # campos extras não mapeados seguem descartados


class VitrineAlertaIn(BaseModel):
    zona: ZoneId
    evento: Literal["atencao_alta", "lotacao", "apontou"]
    momento: datetime
    zonaVitrine: Optional[str] = Field(default=None, max_length=20)
    olhando_s: Optional[float] = Field(default=None, ge=0, le=3600)
    pessoas: Optional[int] = Field(default=None, ge=0, le=1000)


# mode="json" grava as datas em ISO: o JSON continua serializável e resumo_vitrine lê com fromisoformat.
@router.post("/vitrine/eventos", status_code=201, dependencies=[Depends(exigir_token_vitrine)])
def receber_evento(body: VitrineEventoIn) -> dict[str, Any]:
    return db.inserir("vitrine", body.zona, body.model_dump(mode="json"))


@router.post("/vitrine/alertas", status_code=201, dependencies=[Depends(exigir_token_vitrine)])
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
        "apontaram": sum(r.get("apontaram", 0) for r in regs),
        "noCelular": sum(r.get("no_celular", 0) for r in regs),
        "voltaramOlhar": sum(r.get("voltaram_a_olhar", 0) for r in regs),
        "chegaramPerto": sum(r.get("chegaram_perto", 0) for r in regs),
        "horaPico": hora_pico,
        "porHora": {str(h): n for h, n in sorted(por_hora.items())},
        "olharesPorZona": {z: zonas[z] for z in ZONAS_VITRINE},
        "acoes": acoes[:3],
        "atualizadoEm": max((r["fim"] for r in regs), default=None),
    }


def _hoje() -> datetime:
    return db.agora().replace(hour=0, minute=0, second=0, microsecond=0)


def perfil_por_hora(vitrine_regs: list[dict[str, Any]], balcao: list[dict[str, Any]],
                    buscas: list[dict[str, Any]]) -> dict[str, dict[str, dict[str, int]]]:
    """Por ala e por hora de hoje: quantos passaram e olharam (câmera), vendas, perdidas (Balcão) e buscas (Concierge)."""
    perfil: dict[str, dict[str, Counter[str]]] = {}

    def somar(zona: str, hora: int, campo: str, n: int = 1) -> None:
        perfil.setdefault(zona, {}).setdefault(str(hora), Counter())[campo] += n

    for r in vitrine_regs:
        hora = datetime.fromisoformat(r["inicio"]).hour
        somar(r["zona"], hora, "passaram", r["passantes"])
        somar(r["zona"], hora, "olharam", r["olharam"])
    hoje = _hoje()
    for campo, regs in (("vendas", [b for b in balcao if b["tipo"] == "venda"]),
                        ("perdidas", [b for b in balcao if b["tipo"] == "perdida"]),
                        ("buscas", buscas)):
        for r in regs:
            criado = datetime.fromisoformat(r["criadoEm"])
            if criado >= hoje:
                somar(r["zoneId"], criado.hour, campo)
    campos = ("passaram", "olharam", "vendas", "perdidas", "buscas")
    return {z: {h: {c: horas[h][c] for c in campos} for h in sorted(horas, key=int)} for z, horas in perfil.items()}


def compute_crowd_drop(regs: list[dict[str, Any]], zone_id: str) -> dict[str, Any]:
    """Calcula o tier dinâmico de desconto coletivo (Crowd-Drop) pelos eventos recentes da ala."""
    recentes = regs[-6:]
    olharam = sum(r.get("olharam", 0) for r in recentes)
    chegaram_perto = sum(r.get("chegaram_perto", 0) for r in recentes)
    people_now = max((r.get("pico_simultaneo", 0) for r in recentes), default=0)
    if people_now == 0 and olharam > 0:
        people_now = min(6, max(1, olharam // 10))

    if people_now >= 5:
        tier, discount_pct, next_target, label = 3, 30, 5, "CROWD-DROP MÁXIMO (30% OFF)"
    elif people_now >= 3:
        tier, discount_pct, next_target, label = 2, 20, 5, "Combo Coletivo Ativo (20% OFF)"
    elif people_now >= 1:
        tier, discount_pct, next_target, label = 1, 10, 3, "Vitrine Despertada (10% OFF)"
    else:
        tier, discount_pct, next_target, label = 0, 5, 1, "Aguardando Fluxo na Vitrine"

    return {
        "zoneId": zone_id,
        "peopleNow": people_now,
        "tier": tier,
        "discountPct": discount_pct,
        "nextTarget": next_target,
        "label": label,
        "couponCode": f"CROWD-{zone_id.split('-')[0].upper()}-{discount_pct}",
        "olharamRecentes": olharam,
        "chegaramPerto": chegaram_perto,
    }


@router.get("/vitrine/resumo")
def vitrine_resumo(ala: ZoneId) -> dict[str, Any]:
    return resumo_vitrine([r for r in db.listar("vitrine", 5000, _hoje()) if r["zona"] == ala])


@router.get("/vitrine/crowd-drop")
def vitrine_crowd_drop(ala: ZoneId) -> dict[str, Any]:
    regs = [r for r in db.listar("vitrine", 5000, _hoje()) if r["zona"] == ala]
    return compute_crowd_drop(regs, ala)


# ---------- Estado completo para o painel ----------

@router.get("/estado")
def estado(loja: Optional[str] = None, ala: Optional[ZoneId] = None) -> dict[str, Any]:
    """Tudo o que o front precisa para desenhar o ciclo, numa chamada só (polling de 3 s).

    Quando `loja` (e opcionalmente `ala`) é informado, isola os dados privados do lojista
    para que uma loja nunca veja vendas perdidas, notas ou campanhas de outras lojas.
    """
    loja_norm = loja.strip().lower() if loja and loja.strip() else None
    balcao = db.listar("balcao", 500)
    campanhas = [_campanha(c) for c in db.listar("campanha", 100)]
    buscas_recentes = db.listar("busca", 100)
    buscas_hoje = db.listar("busca", 500, _hoje())
    vitrine_regs = db.listar("vitrine", 5000, _hoje())
    alertas = db.listar("alerta", 20, db.agora() - timedelta(seconds=ALERTA_RECENTE_S))

    if loja_norm:
        balcao = [r for r in balcao if (r.get("storeName") or "").strip().lower() == loja_norm]
        campanhas = [c for c in campanhas if (c.get("storeName") or "").strip().lower() == loja_norm]
    if ala:
        balcao = [r for r in balcao if r.get("zoneId") == ala]
        campanhas = [c for c in campanhas if c.get("zoneId") == ala]
        buscas_recentes = [b for b in buscas_recentes if b.get("zoneId") == ala]
        buscas_hoje = [b for b in buscas_hoje if b.get("zoneId") == ala]
        vitrine_regs = [v for v in vitrine_regs if v.get("zona") == ala]
        alertas = [a for a in alertas if a.get("zona") == ala]

    vendas: Counter[str] = Counter(r["zoneId"] for r in balcao if r["tipo"] == "venda")
    vitrine = {z: resumo_vitrine([r for r in vitrine_regs if r["zona"] == z])
               for z in sorted({r["zona"] for r in vitrine_regs})}
    zonas_crowd = (ala,) if ala else get_args(ZoneId)
    crowd_drop = {
        z: compute_crowd_drop([r for r in vitrine_regs if r["zona"] == z], z)
        for z in zonas_crowd
    }
    return {
        "porHora": perfil_por_hora(vitrine_regs, balcao, buscas_hoje),
        "lostSales": [r for r in balcao if r["tipo"] == "perdida"],
        "completedSalesByZone": dict(vendas),
        "signals": buscas_recentes,
        "campaigns": campanhas,
        "vitrine": vitrine,
        "crowdDrop": crowd_drop,
        "alertas": alertas,
        "agora": db.agora().isoformat(),
    }
