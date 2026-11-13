"""Motor de Score de Oportunidade do VitrineIQ.

Fonte de verdade do cálculo. O frontend (`app/src/services/opportunityEngine.ts`)
mantém um espelho determinístico para atualizar a interface em tempo real, e a
paridade entre os dois é validada pelos testes (`tests/test_engine.py` e Vitest).
"""

from __future__ import annotations

import math
from typing import Literal

ZoneId = Literal[
    "ala-sul-esporte",
    "ala-central-ancoras",
    "alameda-gourmet",
    "ala-lazer-cinema",
    "praca-alimentacao-l2",
]
Weather = Literal["calor_38c", "chuva_forte", "ameno"]
TimeSlot = Literal["manha", "almoco", "pos_trabalho", "pos_cinema_20h"]
MallEvent = Literal["estreia_cinemark", "fim_de_semana", "dia_pagamento", "fluxo_normal"]

MIN_MULTIPLIER = 0.5
MAX_MULTIPLIER = 2.0


def _round_half_up(value: float, digits: int) -> float:
    """Arredonda igual ao `Math.round` do JavaScript (meio para cima).

    O `round()` nativo do Python usa arredondamento bancário, o que quebraria a
    paridade com o espelho TypeScript.
    """
    factor = 10**digits
    return math.floor(value * factor + 0.5) / factor


def calculate_retail_opportunity_score(
    vitrine_stops: int,
    qr_searches: int,
    lost_sales: int,
    context_multiplier: float,
) -> float:
    """Score de Oportunidade (0–100) cruzando vitrine, buscas QR e vendas perdidas."""
    clamped = min(MAX_MULTIPLIER, max(MIN_MULTIPLIER, context_multiplier))
    raw_demand = vitrine_stops * 0.15 + qr_searches * 2.4 + lost_sales * 3.8
    weighted = raw_demand * clamped
    return _round_half_up(min(100.0, max(0.0, weighted)), 1)


def compute_context_multiplier(
    zone_id: str,
    weather: str,
    time_slot: str,
    mall_event: str,
) -> float:
    """Multiplicador de contexto: clima de Palmas-TO, horário e eventos do shopping."""
    mult = 1.0

    # Clima de Palmas-TO
    if weather == "calor_38c":
        if zone_id in ("ala-central-ancoras", "praca-alimentacao-l2"):
            mult += 0.25
        if zone_id == "ala-sul-esporte":
            mult += 0.15
    elif weather == "chuva_forte":
        if zone_id in ("ala-lazer-cinema", "praca-alimentacao-l2"):
            mult += 0.2

    # Horário
    if time_slot == "almoco" and zone_id == "praca-alimentacao-l2":
        mult += 0.35
    if time_slot == "pos_trabalho":
        mult += 0.15
    if time_slot == "pos_cinema_20h" and zone_id in (
        "ala-lazer-cinema",
        "alameda-gourmet",
        "praca-alimentacao-l2",
    ):
        mult += 0.35

    # Eventos do shopping
    if mall_event == "estreia_cinemark" and zone_id == "ala-lazer-cinema":
        mult += 0.3
    if mall_event == "fim_de_semana":
        mult += 0.2
    if mall_event == "dia_pagamento":
        mult += 0.25

    return min(MAX_MULTIPLIER, round(mult, 2))


def classify_score(score: float) -> str:
    """Faixa de prioridade usada no painel do lojista."""
    if score >= 70:
        return "alta"
    if score >= 40:
        return "media"
    return "baixa"
