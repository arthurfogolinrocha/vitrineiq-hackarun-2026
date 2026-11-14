"""Testes de hardening: headers HTTP, índices e filtros SQL, anti brute-force, LGPD Zero-PII e sanitização."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app import auth, db
from app.main import app
from app.security import mascarar_dados_pessoais, sanitize_input
from conftest import ADMIN, SENHA_LOJISTA

client = TestClient(app)
ALA = "ala-lazer-cinema"
OUTRA_ALA = "ala-sul-esporte"


@pytest.fixture(autouse=True)
def limpar_tentativas_login():
    auth._tentativas_login.clear()
    yield
    auth._tentativas_login.clear()


def test_headers_defensivos_http_e_no_store_em_auth_e_admin(admin):
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.headers["X-Content-Type-Options"] == "nosniff"
    assert res_health.headers["X-Frame-Options"] == "DENY"
    assert res_health.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "camera=(self)" in res_health.headers["Permissions-Policy"]

    res_login = client.post(
        "/api/auth/login",
        json=ADMIN,
        headers={"X-Forwarded-For": "198.51.100.10"},
    )
    assert res_login.status_code == 200
    assert "no-store" in res_login.headers["Cache-Control"]
    assert res_login.headers["X-Content-Type-Options"] == "nosniff"
    assert res_login.headers["X-Frame-Options"] == "DENY"
    assert res_login.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    res_admin = client.get("/api/admin/lojistas", headers=admin)
    assert res_admin.status_code == 200
    assert "no-store" in res_admin.headers["Cache-Control"]


def test_indices_sqlite_e_filtro_sql_por_zona_e_endpoints_vitrine(admin, lojista):
    db.inserir(
        "vitrine",
        ALA,
        {
            "zona": ALA,
            "inicio": "2026-11-13T19:00:00",
            "fim": "2026-11-13T19:00:10",
            "passantes": 20,
            "olharam": 8,
            "pico_simultaneo": 4,
            "olhares_por_zona": {"esquerda": 2, "centro": 5, "direita": 1},
        },
    )
    db.inserir(
        "vitrine",
        OUTRA_ALA,
        {
            "zona": OUTRA_ALA,
            "inicio": "2026-11-13T19:00:00",
            "fim": "2026-11-13T19:00:10",
            "passantes": 50,
            "olharam": 25,
            "pico_simultaneo": 6,
            "olhares_por_zona": {"esquerda": 5, "centro": 15, "direita": 5},
        },
    )

    with db.engine().connect() as con:
        indices = {
            row[0]
            for row in con.execute(
                text("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'registros'")
            ).all()
        }
    assert {"idx_registros_tipo_criado", "idx_registros_tipo_zona_criado"} <= indices

    filtrados = db.listar("vitrine", zona=ALA)
    assert len(filtrados) == 1
    assert filtrados[0]["zona"] == ALA

    res_resumo = client.get(f"/api/vitrine/resumo?ala={ALA}", headers=admin)
    assert res_resumo.status_code == 200
    assert res_resumo.json()["passantes"] == 20
    assert res_resumo.json()["olharam"] == 8

    _, headers_lojista = lojista("loja-cinema", zone_id=ALA)
    res_lojista_resumo = client.get(f"/api/vitrine/resumo?ala={OUTRA_ALA}", headers=headers_lojista)
    assert res_lojista_resumo.status_code == 200
    assert res_lojista_resumo.json()["passantes"] == 20  # lojista permanece restrito à ala do token

    res_crowd_ala = client.get(f"/api/vitrine/crowd-drop?ala={ALA}")
    assert res_crowd_ala.status_code == 200
    assert res_crowd_ala.json()["zoneId"] == ALA
    assert res_crowd_ala.json()["tier"] == 2

    res_crowd_outra = client.get(f"/api/vitrine/crowd-drop?ala={OUTRA_ALA}")
    assert res_crowd_outra.status_code == 200
    assert res_crowd_outra.json()["zoneId"] == OUTRA_ALA
    assert res_crowd_outra.json()["tier"] == 3


def test_anti_brute_force_login_rastreia_apenas_falhas_e_reseta_no_sucesso(monkeypatch):
    monkeypatch.setenv("ADMIN_USUARIO", ADMIN["usuario"])
    monkeypatch.setenv("ADMIN_SENHA", ADMIN["senha"])
    ip_atacante = {"X-Forwarded-For": "203.0.113.99"}
    ip_legitimo = {"X-Forwarded-For": "198.51.100.77"}

    # Logins válidos consecutivos nunca são bloqueados
    for _ in range(12):
        assert client.post("/api/auth/login", json=ADMIN, headers=ip_atacante).status_code == 200

    # Falhas parciais são zeradas após um login válido
    errado = {"usuario": ADMIN["usuario"], "senha": "senha-errada"}
    for _ in range(5):
        assert client.post("/api/auth/login", json=errado, headers=ip_atacante).status_code == 401
    assert client.post("/api/auth/login", json=ADMIN, headers=ip_atacante).status_code == 200

    # 10 falhas na janela -> 401; 11ª tentativa -> 429 com Retry-After, mesmo tentando a senha correta
    assert [
        client.post("/api/auth/login", json=errado, headers=ip_atacante).status_code
        for _ in range(auth.LIMITE_LOGIN_POR_MINUTO)
    ] == [401] * auth.LIMITE_LOGIN_POR_MINUTO

    bloqueado = client.post("/api/auth/login", json=ADMIN, headers=ip_atacante)
    assert bloqueado.status_code == 429
    assert bloqueado.headers.get("Retry-After") == "60"

    # Outro IP segue operando normalmente
    assert client.post("/api/auth/login", json=ADMIN, headers=ip_legitimo).status_code == 200


@pytest.mark.parametrize(
    "dado",
    [
        "123.456.789-09",
        "12345678909",
        "cliente.vip+promo@capimdourado.com.br",
        "(63) 99999-1234",
        "+55 63 99999-1234",
        "4532 1234 5678 9010",
        "4532-1234-5678-9010",
        "4532123456789010",
        "4111111111111",
        "3782 822463 10005",
        "4000123456789010123",
        "550e8400-e29b-41d4-a716-446655440000",
    ],
)
def test_mascarar_dados_pessoais_edge_cases(dado):
    assert mascarar_dados_pessoais(f"obs: {dado} fim") == "obs: [removido] fim"


def test_mascarar_dados_pessoais_preserva_texto_varejo_e_trata_vazio():
    assert mascarar_dados_pessoais("") == ""
    assert mascarar_dados_pessoais("Tênis 41 por R$ 1.299,90 até 19h30") == "Tênis 41 por R$ 1.299,90 até 19h30"


def test_sanitize_input_remove_controle_script_event_handler_e_javascript_uri():
    assert sanitize_input("\x00\u200b\ufeff  <script>alert('xss')</script>Oferta \x07 ") == "Oferta"
    assert sanitize_input("<SCRIPT type='text/javascript'>\nalert(1)\n</SCRIPT>Loja Central") == "Loja Central"

    limpo_uri = sanitize_input("javascript:alert(1)")
    assert "javascript:" not in limpo_uri.lower()

    limpo_handler = sanitize_input('<img src=x onerror=alert(1) onclick="roubar()">')
    assert "onerror=" not in limpo_handler.lower()
    assert "onclick=" not in limpo_handler.lower()
    assert "&lt;img" in limpo_handler and "&gt;" in limpo_handler


def test_estado_etag_e_304_not_modified_e_invalidacao(lojista):
    _, headers_lojista = lojista("loja-etag", zone_id=ALA, loja="Loja ETag")

    res1 = client.get("/api/estado", headers=headers_lojista)
    assert res1.status_code == 200
    etag1 = res1.headers.get("ETag")
    assert etag1 and etag1.startswith('W/"')
    assert res1.headers.get("Cache-Control") == "private, no-cache"

    # Sem mudanças nos dados (apenas o relógio "agora" avança), devolve 304 Not Modified via header
    # ou HTTP 200 compacto {"unchanged": True} via ?etag= (seguro contra strip de CORS em 304 na Vercel)
    res_304 = client.get("/api/estado", headers={**headers_lojista, "If-None-Match": etag1})
    assert res_304.status_code == 304
    assert res_304.content == b""
    assert res_304.headers.get("ETag") == etag1
    assert res_304.headers.get("Cache-Control") == "private, no-cache"

    res_compact = client.get("/api/estado", params={"etag": etag1}, headers=headers_lojista)
    assert res_compact.status_code == 200
    assert res_compact.json() == {"unchanged": True, "etag": etag1}
    assert res_compact.headers.get("ETag") == etag1

    # Novo registro no balcão invalida o ETag imediatamente
    res_balcao = client.post(
        "/api/balcao",
        headers=headers_lojista,
        json={"zoneId": ALA, "storeName": "Loja ETag", "tipo": "venda"},
    )
    assert res_balcao.status_code == 201

    res2 = client.get("/api/estado", headers={**headers_lojista, "If-None-Match": etag1})
    assert res2.status_code == 200
    etag2 = res2.headers.get("ETag")
    assert etag2 and etag2 != etag1
    assert res2.json()["completedSalesByZone"] == {ALA: 1}

    assert client.get("/api/estado", headers={**headers_lojista, "If-None-Match": etag2}).status_code == 304

    # Nova campanha também invalida o ETag imediatamente
    res_camp = client.post(
        "/api/campanhas",
        headers=headers_lojista,
        json={
            "zoneId": ALA,
            "storeName": "Loja ETag",
            "title": "Oferta Relâmpago",
            "discountBadge": "15% OFF",
            "couponCode": "ETAG15",
        },
    )
    assert res_camp.status_code == 201

    res3 = client.get("/api/estado", headers={**headers_lojista, "If-None-Match": etag2})
    assert res3.status_code == 200
    etag3 = res3.headers.get("ETag")
    assert etag3 and etag3 != etag2
    assert [c["couponCode"] for c in res3.json()["campaigns"]] == ["ETAG15"]

    assert client.get("/api/estado", headers={**headers_lojista, "If-None-Match": etag3}).status_code == 304


def test_cors_expoe_etag_e_aceita_if_none_match_na_vercel(admin):
    origem_vercel = "https://vitrineiq-capim-dourado.vercel.app"
    preflight = client.options(
        "/api/estado",
        headers={
            "Origin": origem_vercel,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization, if-none-match",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == origem_vercel
    allowed_headers = {h.strip().lower() for h in preflight.headers.get("access-control-allow-headers", "").split(",")}
    assert {"authorization", "if-none-match"} <= allowed_headers

    res = client.get("/api/estado", headers={**admin, "Origin": origem_vercel})
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == origem_vercel
    exposed = {h.strip().lower() for h in res.headers.get("access-control-expose-headers", "").split(",")}
    assert "etag" in exposed


def test_rotacao_de_senha_lojista_e_bloqueio_para_admin(admin, lojista):
    assert client.patch(
        "/api/auth/senha",
        json={"senhaAtual": SENHA_LOJISTA, "novaSenha": "nova-senha-123"},
    ).status_code == 401

    res_admin = client.patch(
        "/api/auth/senha",
        headers=admin,
        json={"senhaAtual": ADMIN["senha"], "novaSenha": "nova-senha-admin"},
    )
    assert res_admin.status_code == 400
    assert res_admin.json()["detail"] == "A senha do administrador é gerenciada pelas variáveis de ambiente."

    item, headers_lojista = lojista("loja-rotacao", zone_id=ALA, loja="Loja Rotação")
    rid = int(item["id"])
    hash_antigo = db.buscar("lojista", rid)["senhaHash"]

    # Senha atual incorreta -> 401 e hash intacto
    res_errada = client.patch(
        "/api/auth/senha",
        headers=headers_lojista,
        json={"senhaAtual": "senha-errada-aqui", "novaSenha": "nova-senha-123"},
    )
    assert res_errada.status_code == 401
    assert db.buscar("lojista", rid)["senhaHash"] == hash_antigo

    # Nova senha curta (< 8) -> 422
    assert client.patch(
        "/api/auth/senha",
        headers=headers_lojista,
        json={"senhaAtual": SENHA_LOJISTA, "novaSenha": "curta"},
    ).status_code == 422

    # Rotação válida -> 200, novo salt PBKDF2, senha antiga falha e nova funciona
    nova_senha = "nova-senha-segura-2026"
    res_ok = client.patch(
        "/api/auth/senha",
        headers=headers_lojista,
        json={"senhaAtual": SENHA_LOJISTA, "novaSenha": nova_senha},
    )
    assert res_ok.status_code == 200
    assert "no-store" in res_ok.headers.get("Cache-Control", "")

    conta_atualizada = db.buscar("lojista", rid)
    assert conta_atualizada["senhaHash"] != hash_antigo
    assert conta_atualizada["senhaHash"].startswith("pbkdf2_sha256$")

    assert client.post("/api/auth/login", json={"usuario": "loja-rotacao", "senha": SENHA_LOJISTA}).status_code == 401
    res_novo_login = client.post("/api/auth/login", json={"usuario": "loja-rotacao", "senha": nova_senha})
    assert res_novo_login.status_code == 200
    assert res_novo_login.json()["usuario"]["nome"] == "loja-rotacao"
