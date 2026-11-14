"""Login de admin e lojista: token, contas e separação dos dados por loja e por ala."""

import time

from fastapi.testclient import TestClient

from app import auth, db
from app.main import app
from conftest import ADMIN, SENHA_LOJISTA, bearer

client = TestClient(app)
ALA = "ala-lazer-cinema"
OUTRA_ALA = "ala-sul-esporte"


def test_login_certo_e_errado(admin):
    res = client.post("/api/auth/login", json=ADMIN)
    assert res.status_code == 200
    assert res.json()["usuario"] == {"nome": "admin", "papel": "admin", "lojaId": None, "lojaNome": None, "zoneId": None}
    assert client.get("/api/auth/eu", headers=bearer(res.json()["token"])).json()["papel"] == "admin"

    for corpo in ({**ADMIN, "senha": "errada"}, {"usuario": "ninguem", "senha": "qualquer-coisa"}):
        res = client.post("/api/auth/login", json=corpo)
        assert res.status_code == 401 and res.json()["detail"] == "Usuário ou senha inválidos."


def test_sem_variaveis_de_admin_nao_existe_admin(monkeypatch):
    monkeypatch.delenv("ADMIN_USUARIO", raising=False)
    monkeypatch.delenv("ADMIN_SENHA", raising=False)
    assert client.post("/api/auth/login", json={"usuario": "", "senha": ""}).status_code == 401


def test_lojista_faz_login_com_dados_da_loja(lojista):
    item, h = lojista("Loja.Cinema", loja="Pipoca & Cia")  # usuário vira minúsculo
    assert item["usuario"] == "loja.cinema"
    res = client.post("/api/auth/login", json={"usuario": "loja.cinema", "senha": SENHA_LOJISTA}).json()
    assert res["usuario"] == {"nome": "loja.cinema", "papel": "lojista", "lojaId": item["id"],
                              "lojaNome": "Pipoca & Cia", "zoneId": ALA}
    assert client.get("/api/auth/eu", headers=h).json() == res["usuario"]


def test_token_adulterado_expirado_ou_ausente_da_401(admin):
    token = admin["Authorization"].split(" ")[1]
    parte, assinatura = token.split(".")
    outra_parte = auth._b64(b'{"sub": "admin", "papel": "admin", "exp": 9999999999}')
    expirado = auth.assinar({"sub": "admin", "papel": "admin", "nome": "admin", "lojaId": None,
                             "lojaNome": None, "zoneId": None, "exp": int(time.time()) - 1})
    for cab in ({}, {"Authorization": "Bearer lixo"}, bearer(f"{outra_parte}.{assinatura}"),
                bearer(f"{parte}.{assinatura[:-2]}AA"), bearer(expirado), {"Authorization": token}):
        assert client.get("/api/estado", headers=cab).status_code == 401
    assert client.get("/api/estado", headers=admin).status_code == 200


def test_rotas_protegidas_sem_token_dao_401():
    for metodo, rota in (("get", "/api/estado"), ("get", "/api/auth/eu"), ("post", "/api/balcao"),
                         ("delete", "/api/balcao/1"), ("post", "/api/campanhas"), ("patch", "/api/campanhas/1"),
                         ("delete", "/api/campanhas/1"), ("post", "/api/ia/plano"), ("get", "/api/admin/lojistas"),
                         ("post", "/api/admin/lojistas"), ("delete", "/api/admin/lojistas/1")):
        assert client.request(metodo.upper(), rota, json={}).status_code == 401, rota
    # Cliente (Concierge) e câmera continuam sem login
    assert client.post("/api/concierge/busca", json={"zoneId": ALA, "query": "tênis"}).status_code == 201
    assert client.get(f"/api/campanhas/ativas?ala={ALA}").status_code == 200
    assert client.get(f"/api/vitrine/resumo?ala={ALA}").status_code == 401  # câmera da ala exige login


def test_admin_cria_lista_e_apaga_lojista_sem_expor_hash(admin, lojista):
    item, h = lojista("loja-a")
    assert set(item) == {"id", "usuario", "lojaNome", "zoneId", "criadoEm", "papel", "lojaId"}
    dup = client.post("/api/admin/lojistas", headers=admin,
                      json={"usuario": "loja-a", "senha": "outra-senha", "lojaNome": "Outra", "zoneId": ALA})
    assert dup.status_code == 409
    lista = client.get("/api/admin/lojistas", headers=admin)
    assert [c["usuario"] for c in lista.json()] == ["loja-a"]
    assert "senha" not in lista.text.lower() and "pbkdf2" not in lista.text
    assert "pbkdf2_sha256$" in db.listar("lojista")[0]["senhaHash"]  # no banco só o hash

    assert client.get("/api/admin/lojistas", headers=h).status_code == 403  # lojista não administra
    assert client.delete(f"/api/admin/lojistas/{item['id']}", headers=admin).status_code == 204
    assert client.delete(f"/api/admin/lojistas/{item['id']}", headers=admin).status_code == 404


def test_cadastro_de_lojista_valida_entrada(admin):
    base = {"usuario": "loja-ok", "senha": "senha-boa-1", "lojaNome": "Loja", "zoneId": ALA}
    for ruim in ({"usuario": "ab"}, {"usuario": "com espaço"}, {"senha": "curta"}, {"zoneId": "ala-falsa"},
                 {"lojaNome": "x"}, {"usuario": "admin"}):
        assert client.post("/api/admin/lojistas", headers=admin, json={**base, **ruim}).status_code in (409, 422), ruim


def test_conta_apagada_perde_acesso(admin, lojista):
    item, h = lojista("loja-a")
    assert client.get("/api/estado", headers=h).status_code == 200
    client.delete(f"/api/admin/lojistas/{item['id']}", headers=admin)
    assert client.get("/api/estado", headers=h).status_code == 401


def test_lojista_so_ve_e_apaga_o_que_e_da_loja_dele(lojista):
    a, ha = lojista("loja-a")
    b, hb = lojista("loja-b", loja="Loja B")
    # O lojista não escolhe loja nem ala: vêm do token.
    venda_b = client.post("/api/balcao", headers=hb,
                          json={"zoneId": OUTRA_ALA, "storeName": "Finge ser A", "tipo": "venda"}).json()
    assert (venda_b["lojaId"], venda_b["storeName"], venda_b["zoneId"]) == (b["id"], "Loja B", ALA)
    perdida_b = client.post("/api/balcao", headers=hb, json={"zoneId": ALA, "storeName": "x", "tipo": "perdida",
                                                             "reason": "preco"}).json()
    camp_b = client.post("/api/campanhas", headers=hb, json={"zoneId": ALA, "storeName": "x", "title": "Promo B",
                                                             "discountBadge": "10% OFF", "couponCode": "LOJAB10"}).json()

    estado_a = client.get("/api/estado", headers=ha).json()
    assert estado_a["lostSales"] == [] and estado_a["completedSalesByZone"] == {} and estado_a["campaigns"] == []
    assert client.delete(f"/api/balcao/{perdida_b['id']}", headers=ha).status_code == 404
    assert client.patch(f"/api/campanhas/{camp_b['id']}", headers=ha, json={"active": False}).status_code == 404
    assert client.delete(f"/api/campanhas/{camp_b['id']}", headers=ha).status_code == 404

    estado_b = client.get("/api/estado", headers=hb).json()
    assert estado_b["completedSalesByZone"] == {ALA: 1} and len(estado_b["lostSales"]) == 1
    assert [c["couponCode"] for c in estado_b["campaigns"]] == ["LOJAB10"]
    assert client.patch(f"/api/campanhas/{camp_b['id']}", headers=hb, json={"active": False}).json()["active"] is False
    assert client.delete(f"/api/balcao/{perdida_b['id']}", headers=hb).status_code == 204


def test_lojista_ve_so_a_ala_dele_no_estado(admin, lojista):
    _, h = lojista("loja-cinema")
    evento = {"inicio": "2026-11-13T19:00:00", "fim": "2026-11-13T19:00:10", "passantes": 5, "olharam": 2}
    for ala in (ALA, OUTRA_ALA):
        client.post("/api/vitrine/eventos", json={**evento, "zona": ala})
        client.post("/api/vitrine/alertas", json={"zona": ala, "evento": "lotacao", "momento": "2026-11-13T19:00:05"})
        client.post("/api/concierge/busca", json={"zoneId": ala, "query": "tênis"})
        client.post("/api/balcao", headers=admin, json={"zoneId": ala, "storeName": "Antiga", "tipo": "venda"})

    estado = client.get("/api/estado", headers=h).json()
    assert list(estado["vitrine"]) == [ALA] and list(estado["porHora"]) == [ALA]
    assert {s["zoneId"] for s in estado["signals"]} == {ALA}
    assert {a["zona"] for a in estado["alertas"]} == {ALA}
    agora = str(db.agora().hour)
    # passaram/buscas da ala inteira; vendas só da loja (a venda do admin, sem lojaId, não conta)
    assert estado["porHora"][ALA][agora]["buscas"] == 1 and estado["porHora"][ALA][agora]["vendas"] == 0
    assert estado["completedSalesByZone"] == {}

    tudo = client.get("/api/estado", headers=admin).json()
    assert set(tudo["vitrine"]) == {ALA, OUTRA_ALA} and tudo["completedSalesByZone"] == {ALA: 1, OUTRA_ALA: 1}


def test_login_limita_10_tentativas_por_minuto_por_ip():
    corpo = {"usuario": "x", "senha": "y"}
    assert [client.post("/api/auth/login", json=corpo).status_code for _ in range(10)] == [401] * 10
    assert client.post("/api/auth/login", json=corpo).status_code == 429


def test_na_vercel_sem_auth_secret_da_503(admin, monkeypatch):
    monkeypatch.delenv("AUTH_SECRET", raising=False)
    monkeypatch.setenv("VERCEL", "1")
    assert client.get("/api/estado", headers=admin).status_code == 503
    assert client.post("/api/auth/login", json=ADMIN).status_code == 503


def test_auth_secret_definida_assina_os_tokens(admin, monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "segredo-de-teste-com-mais-de-32-caracteres")
    assert client.get("/api/estado", headers=admin).status_code == 401  # token do segredo local não vale mais
    token = client.post("/api/auth/login", json=ADMIN).json()["token"]
    assert client.get("/api/estado", headers=bearer(token)).status_code == 200


def test_auth_secret_curta_da_503(admin, monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "curta")
    assert client.post("/api/auth/login", json=ADMIN).status_code == 503


def test_busca_publica_tem_limite_por_ip():
    corpo = {"zoneId": ALA, "query": "tênis"}
    assert all(client.post("/api/concierge/busca", json=corpo).status_code == 201 for _ in range(20))
    assert client.post("/api/concierge/busca", json=corpo).status_code == 429


def test_campanha_publica_nao_expoe_conta_e_lojista_ve_so_camera_da_ala(admin, lojista):
    _, loja = lojista("cine", ALA, "Cine Teste")
    client.post("/api/campanhas", headers=loja, json={"zoneId": ALA, "storeName": "x", "title": "Promo teste",
                                                      "discountBadge": "10% OFF", "couponCode": "CINE10"})
    assert all("lojaId" not in c for c in client.get(f"/api/campanhas/ativas?ala={ALA}").json())
    outra = client.get("/api/vitrine/resumo?ala=ala-sul-esporte", headers=loja)
    assert outra.status_code == 200  # a ala pedida é ignorada: vem a do token


def test_lojista_ignora_filtro_de_loja_da_url(admin, lojista):
    _, a = lojista("loja-a", ALA, "Loja A")
    _, b = lojista("loja-b", ALA, "Loja B")
    client.post("/api/balcao", headers=b, json={"zoneId": ALA, "storeName": "x", "tipo": "perdida", "reason": "preco"})
    # A tenta ver os dados de B pelo filtro ?loja= que o admin usa: a API segue o token
    assert client.get("/api/estado", headers=a, params={"loja": "Loja B", "ala": ALA}).json()["lostSales"] == []
    assert len(client.get("/api/estado", headers=admin, params={"loja": "Loja B"}).json()["lostSales"]) == 1
