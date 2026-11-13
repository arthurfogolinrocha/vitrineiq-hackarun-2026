"""Ciclo completo pela API: Balcão → Concierge → campanha → cupom, e câmera → resumo da vitrine."""

import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app

client = TestClient(app)
ALA = "ala-lazer-cinema"


@pytest.fixture(autouse=True)
def banco_temporario(tmp_path):
    db.usar_banco(f"sqlite:///{tmp_path / 'teste.db'}")
    yield
    db.usar_banco(None)


def campanha(**extra):
    return {"zoneId": ALA, "storeName": "Loja Teste", "title": "Relâmpago pós-cinema",
            "discountBadge": "15% OFF", "couponCode": "CINE15", **extra}


def test_balcao_registra_venda_e_venda_perdida_no_estado():
    assert client.post("/api/balcao", json={"zoneId": ALA, "storeName": "Loja", "tipo": "venda"}).status_code == 201
    perdida = client.post("/api/balcao", json={"zoneId": ALA, "storeName": "Loja", "tipo": "perdida",
                                               "reason": "preco", "note": "achou caro"}).json()

    estado = client.get("/api/estado").json()
    assert estado["completedSalesByZone"] == {ALA: 1}
    assert [(s["reason"], s["note"]) for s in estado["lostSales"]] == [("preco", "achou caro")]

    assert client.delete(f"/api/balcao/{perdida['id']}").status_code == 204
    assert client.get("/api/estado").json()["lostSales"] == []


def test_venda_perdida_sem_motivo_e_recusada():
    res = client.post("/api/balcao", json={"zoneId": ALA, "storeName": "Loja", "tipo": "perdida"})
    assert res.status_code == 422


def test_ala_inexistente_e_recusada():
    res = client.post("/api/balcao", json={"zoneId": "ala-falsa", "storeName": "Loja", "tipo": "venda"})
    assert res.status_code == 422


def test_concierge_so_entrega_cupom_com_campanha_publicada():
    busca = {"zoneId": ALA, "query": "tênis casual", "budget": "80_200"}
    assert client.post("/api/concierge/busca", json=busca).json()["couponCode"] == ""

    criada = client.post("/api/campanhas", json=campanha()).json()
    assert client.post("/api/concierge/busca", json=busca).json()["couponCode"] == "CINE15"
    assert [c["couponCode"] for c in client.get(f"/api/campanhas/ativas?ala={ALA}").json()] == ["CINE15"]

    client.patch(f"/api/campanhas/{criada['id']}", json={"active": False})
    assert client.post("/api/concierge/busca", json=busca).json()["couponCode"] == ""
    assert len(client.get("/api/estado").json()["signals"]) == 3


def test_entrada_e_escapada():
    criada = client.post("/api/campanhas", json=campanha(title="<script>alert(1)</script>Promo")).json()
    assert criada["title"] == "Promo"


def test_camera_alimenta_resumo_e_alerta_da_vitrine():
    evento = {"zona": ALA, "inicio": "2026-11-13T19:00:00", "fim": "2026-11-13T19:00:10",
              "passantes": 10, "olharam": 4, "atencao_media_s": 2.5,
              "olhares_por_zona": {"esquerda": 1, "centro": 3, "direita": 0}, "pico_simultaneo": 3,
              "fluxo": {"esq_para_dir": 6}}
    assert client.post("/api/vitrine/eventos", json=evento).status_code == 201
    assert client.post("/api/vitrine/alertas", json={"zona": ALA, "evento": "atencao_alta",
                                                     "momento": "2026-11-13T19:00:05", "olhando_s": 3.2}).status_code == 201

    resumo = client.get(f"/api/vitrine/resumo?ala={ALA}").json()
    assert (resumo["passantes"], resumo["olharam"], resumo["taxaAtencao"], resumo["picoSimultaneo"]) == (10, 4, 40, 3)
    assert resumo["horaPico"] == 19 and resumo["olharesPorZona"]["centro"] == 3
    assert resumo["acoes"] and "centro" in resumo["acoes"][1]

    estado = client.get("/api/estado").json()
    assert estado["vitrine"][ALA]["passantes"] == 10
    assert [a["evento"] for a in estado["alertas"]] == ["atencao_alta"]


EVENTO = {"zona": ALA, "inicio": "2026-11-13T19:00:00", "fim": "2026-11-13T19:00:10", "passantes": 1, "olharam": 1}


def test_data_invalida_da_camera_e_recusada_e_estado_segue_de_pe():
    # Issue #36: "abc" era gravado e GET /api/estado passava a responder 500 para sempre.
    assert client.post("/api/vitrine/eventos", json={**EVENTO, "inicio": "abc"}).status_code == 422
    assert client.post("/api/vitrine/alertas", json={"zona": ALA, "evento": "lotacao", "momento": "abc"}).status_code == 422
    assert client.post("/api/vitrine/eventos", json=EVENTO).status_code == 201
    res = client.get("/api/estado")
    assert res.status_code == 200 and res.json()["vitrine"][ALA]["atualizadoEm"] == "2026-11-13T19:00:10"


def test_campo_extra_da_camera_nao_e_gravado():
    assert client.post("/api/vitrine/eventos", json={**EVENTO, "lixo": "x" * 100_000}).status_code == 201
    assert all("lixo" not in r for r in db.listar("vitrine"))


def test_token_da_camera(monkeypatch):
    monkeypatch.delenv("VITRINE_TOKEN", raising=False)
    assert client.post("/api/vitrine/eventos", json=EVENTO).status_code == 201  # sem token configurado: aberto

    monkeypatch.setenv("VITRINE_TOKEN", "segredo-de-teste")
    for rota, corpo in (("eventos", EVENTO), ("alertas", {"zona": ALA, "evento": "lotacao", "momento": "2026-11-13T19:00:05"})):
        assert client.post(f"/api/vitrine/{rota}", json=corpo).status_code == 401
        assert client.post(f"/api/vitrine/{rota}", json=corpo, headers={"X-Vitrine-Token": "errado"}).status_code == 401
        assert client.post(f"/api/vitrine/{rota}", json=corpo, headers={"X-Vitrine-Token": "segredo-de-teste"}).status_code == 201


def test_dado_pessoal_no_texto_livre_nao_e_gravado():
    client.post("/api/concierge/busca", json={"zoneId": ALA, "query": "tênis, me liga (63) 99999-1234"})
    client.post("/api/balcao", json={"zoneId": ALA, "storeName": "Loja", "tipo": "perdida", "reason": "preco",
                                     "note": "cliente ana@exemplo.com volta amanhã"})
    estado = client.get("/api/estado").json()
    assert estado["signals"][0]["query"] == "tênis, me liga [removido]"
    assert estado["lostSales"][0]["note"] == "cliente [removido] volta amanhã"


def test_na_vercel_sem_token_a_camera_e_recusada(monkeypatch):
    monkeypatch.delenv("VITRINE_TOKEN", raising=False)
    monkeypatch.setenv("VERCEL", "1")
    assert client.post("/api/vitrine/eventos", json=EVENTO).status_code == 503


def test_contagem_por_zona_negativa_ou_gigante_e_recusada():
    for valor in (-1, 10**30):
        corpo = {**EVENTO, "olhares_por_zona": {"centro": valor}}
        assert client.post("/api/vitrine/eventos", json=corpo).status_code == 422


def test_perfil_por_hora_junta_camera_balcao_e_concierge():
    client.post("/api/vitrine/eventos", json={**EVENTO, "inicio": "2026-11-13T19:00:00", "passantes": 7, "olharam": 2})
    client.post("/api/balcao", json={"zoneId": ALA, "storeName": "Loja", "tipo": "venda"})
    client.post("/api/balcao", json={"zoneId": ALA, "storeName": "Loja", "tipo": "perdida", "reason": "preco"})
    client.post("/api/concierge/busca", json={"zoneId": ALA, "query": "tênis"})

    perfil = client.get("/api/estado").json()["porHora"][ALA]
    assert perfil["19"]["passaram"] == 7 and perfil["19"]["olharam"] == 2
    agora = str(db.agora().hour)
    assert (perfil[agora]["vendas"], perfil[agora]["perdidas"], perfil[agora]["buscas"]) == (1, 1, 1)
