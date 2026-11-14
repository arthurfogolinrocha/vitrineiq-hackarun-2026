"""Fixtures comuns: banco temporário, limites zerados e login de admin/lojista."""

import pytest
from fastapi.testclient import TestClient

from app import auth, ciclo, db, main
from app.main import app

ADMIN = {"usuario": "admin", "senha": "senha-admin-de-teste"}
SENHA_LOJISTA = "senha-lojista-1"


@pytest.fixture(autouse=True)
def banco_temporario(tmp_path, monkeypatch):
    db.usar_banco(f"sqlite:///{tmp_path / 'teste.db'}")
    monkeypatch.delenv("VERCEL", raising=False)
    main._chamadas_ia.clear()  # os limites por IP são globais no processo
    auth._tentativas_login.clear()
    ciclo._buscas.clear()
    yield
    db.usar_banco(None)


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin(monkeypatch) -> dict:
    """Cabeçalho de login do admin (definido por variável de ambiente)."""
    monkeypatch.setenv("ADMIN_USUARIO", ADMIN["usuario"])
    monkeypatch.setenv("ADMIN_SENHA", ADMIN["senha"])
    res = TestClient(app).post("/api/auth/login", json=ADMIN)
    assert res.status_code == 200
    return bearer(res.json()["token"])


@pytest.fixture
def lojista(admin):
    """Cria uma conta de lojista pelo admin e devolve (item criado, cabeçalho de login)."""
    def criar(usuario: str, zone_id: str = "ala-lazer-cinema", loja: str = "Loja Teste"):
        c = TestClient(app)
        res = c.post("/api/admin/lojistas", headers=admin,
                     json={"usuario": usuario, "senha": SENHA_LOJISTA, "lojaNome": loja, "zoneId": zone_id})
        assert res.status_code == 201
        login = c.post("/api/auth/login", json={"usuario": usuario, "senha": SENHA_LOJISTA})
        return res.json(), bearer(login.json()["token"])
    return criar
