"""Testes de hardening: headers HTTP, índices e filtros SQL, anti brute-force, LGPD Zero-PII e sanitização."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app import auth, db
from app.main import app
from app.security import mascarar_dados_pessoais, sanitize_input
from conftest import ADMIN

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
