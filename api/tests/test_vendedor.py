"""Perfil vendedor: conta ligada a uma loja que só acessa o Modo Balcão dela."""

from fastapi.testclient import TestClient

from app.main import app
from conftest import bearer

client = TestClient(app)
ALA = "ala-lazer-cinema"
SENHA = "senha-vendedor-1"


def _criar_vendedor(admin, loja_id, usuario="vend-a"):
    res = client.post(f"/api/admin/lojistas/{loja_id}/vendedores", headers=admin,
                      json={"usuario": usuario, "senha": SENHA})
    assert res.status_code == 201
    login = client.post("/api/auth/login", json={"usuario": usuario, "senha": SENHA})
    assert login.status_code == 200
    return res.json(), login.json(), bearer(login.json()["token"])


def test_vendedor_herda_loja_e_registra_no_balcao_do_lojista(admin, lojista):
    loja, h_loja = lojista("loja-a", ALA, "Loja A")
    item, login, h = _criar_vendedor(admin, loja["id"])
    assert item["papel"] == "vendedor" and item["lojaId"] == loja["id"]
    assert login["usuario"] == {"nome": "vend-a", "papel": "vendedor", "lojaId": loja["id"],
                                "lojaNome": "Loja A", "zoneId": ALA}

    # Loja e ala vêm do token, mesmo que o body diga outra coisa
    r = client.post("/api/balcao", headers=h,
                    json={"zoneId": "ala-sul-esporte", "storeName": "Outra", "tipo": "perdida", "reason": "preco"})
    assert r.status_code == 201 and r.json()["storeName"] == "Loja A" and r.json()["zoneId"] == ALA

    # O lojista vê a venda perdida registrada pelo vendedor
    estado = client.get("/api/estado", headers=h_loja).json()
    assert [p["id"] for p in estado["lostSales"]] == [r.json()["id"]]
    assert client.delete(f"/api/balcao/{r.json()['id']}", headers=h).status_code == 204


def test_vendedor_nao_publica_campanha_nem_usa_ia_nem_administra(admin, lojista):
    loja, _ = lojista("loja-a", ALA, "Loja A")
    _, _, h = _criar_vendedor(admin, loja["id"])
    campanha = {"zoneId": ALA, "storeName": "Loja A", "title": "X", "discountBadge": "Brinde na compra",
                "couponCode": "ABC"}
    assert client.post("/api/campanhas", headers=h, json=campanha).status_code == 403
    assert client.post("/api/ia/plano", headers=h, json={"prompt": "ideias"}).status_code == 403
    assert client.get(f"/api/vitrine/resumo?ala={ALA}", headers=h).status_code == 403
    assert client.get("/api/admin/lojistas", headers=h).status_code == 403


def test_vendedor_perde_acesso_quando_lojista_e_apagado(admin, lojista):
    loja, _ = lojista("loja-a", ALA, "Loja A")
    _, _, h = _criar_vendedor(admin, loja["id"])
    assert client.delete(f"/api/admin/lojistas/{loja['id']}", headers=admin).status_code == 204
    assert client.get("/api/auth/eu", headers=h).status_code == 401


def test_vendedor_so_pode_ser_criado_para_lojista_existente(admin, lojista):
    loja, _ = lojista("loja-a", ALA, "Loja A")
    vend, _, _ = _criar_vendedor(admin, loja["id"])
    corpo = {"usuario": "vend-b", "senha": SENHA}
    assert client.post("/api/admin/lojistas/9999/vendedores", headers=admin, json=corpo).status_code == 404
    # Vendedor não pode ter vendedor
    assert client.post(f"/api/admin/lojistas/{vend['id']}/vendedores", headers=admin, json=corpo).status_code == 404
    # Usuário repetido
    assert client.post(f"/api/admin/lojistas/{loja['id']}/vendedores", headers=admin,
                       json={"usuario": "loja-a", "senha": SENHA}).status_code == 409
