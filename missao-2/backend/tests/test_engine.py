"""Testes do motor de score — inclui casos de paridade com o espelho TypeScript."""

import pytest

from app.engine import (
    calculate_retail_opportunity_score,
    classify_score,
    compute_context_multiplier,
)


def test_score_fica_entre_0_e_100():
    low = calculate_retail_opportunity_score(10, 2, 1, 1.0)
    assert 0 < low < 100
    capped = calculate_retail_opportunity_score(1000, 100, 50, 2.0)
    assert capped == 100.0
    assert calculate_retail_opportunity_score(0, 0, 0, 1.0) == 0.0


def test_multiplicador_e_limitado_entre_0_5_e_2():
    # Referência do espelho TypeScript: multiplicador 9.0 vira 2.0 e 0.1 vira 0.5
    assert calculate_retail_opportunity_score(10, 2, 1, 9.0) == 20.2
    assert calculate_retail_opportunity_score(10, 2, 1, 0.1) == 5.1


@pytest.mark.parametrize(
    "args, expected",
    [
        # Valores calculados com o espelho TypeScript (opportunityEngine.ts)
        ((140, 8, 5, 1.25), 74.0),
        ((10, 2, 1, 1.0), 10.1),
        ((33, 3, 2, 1.35), 26.7),
        ((1, 0, 0, 1.0), 0.2),  # 0.15 -> arredonda meio para cima como Math.round
    ],
)
def test_paridade_com_frontend(args, expected):
    assert calculate_retail_opportunity_score(*args) == expected


def test_praca_alimentacao_ganha_peso_no_almoco():
    normal = compute_context_multiplier("praca-alimentacao-l2", "ameno", "manha", "fluxo_normal")
    almoco = compute_context_multiplier("praca-alimentacao-l2", "ameno", "almoco", "fluxo_normal")
    assert normal == 1.0
    assert almoco == 1.35


def test_multiplicador_acumula_fatores_e_respeita_teto():
    mult = compute_context_multiplier("praca-alimentacao-l2", "calor_38c", "pos_cinema_20h", "dia_pagamento")
    assert mult == 1.85  # 1.0 + 0.25 (calor) + 0.35 (pós-cinema) + 0.25 (pagamento)
    assert mult <= 2.0


def test_estreia_cinemark_so_afeta_ala_de_lazer():
    lazer = compute_context_multiplier("ala-lazer-cinema", "ameno", "manha", "estreia_cinemark")
    esporte = compute_context_multiplier("ala-sul-esporte", "ameno", "manha", "estreia_cinemark")
    assert lazer == 1.3
    assert esporte == 1.0


@pytest.mark.parametrize("score, faixa", [(85, "alta"), (70, "alta"), (55, "media"), (12, "baixa")])
def test_classificacao_de_prioridade(score, faixa):
    assert classify_score(score) == faixa
