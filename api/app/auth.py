"""Login de admin e lojista: usuário e senha, token assinado com HMAC (só stdlib).

- Admin: vem de ADMIN_USUARIO / ADMIN_SENHA (não fica no banco). Cria as contas dos lojistas.
- Lojista: conta na tabela `registros` (tipo "lojista"); o id da conta é o `lojaId`.
- Token: base64url(json) + "." + base64url(hmac_sha256(AUTH_SECRET, parte1)), validade de 12 h.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from collections import defaultdict, deque
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field, StringConstraints

from . import db
from .engine import ZoneId
from .security import sanitize_input

router = APIRouter(prefix="/api")

VALIDADE_S = 12 * 3600
ITERACOES = 200_000
LIMITE_LOGIN_POR_MINUTO = 10
CAMPOS_USUARIO = ("nome", "papel", "lojaId", "lojaNome", "zoneId")

# Sem AUTH_SECRET fora da Vercel: segredo por processo (os tokens caem ao reiniciar).
_SEGREDO_LOCAL = secrets.token_bytes(32)
_tentativas_login: defaultdict[str, deque[float]] = defaultdict(deque)


def limitar_por_ip(request: Request, chamadas: defaultdict[str, deque[float]], limite: int, mensagem: str) -> None:
    """No máximo `limite` chamadas por minuto por IP; acima disso, 429."""
    # shortcut: limite por instância da Vercel, não global; usar Redis/Upstash se precisar de limite global
    # Na Vercel o proxy reescreve X-Forwarded-For com o IP real; fora dela o cliente pode forjá-lo.
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    ip = ip or (request.client.host if request.client else "desconhecido")
    agora = time.monotonic()
    fila = chamadas[ip]
    while fila and agora - fila[0] >= 60:
        fila.popleft()
    if len(fila) >= limite:
        raise HTTPException(429, mensagem)
    fila.append(agora)


def _segredo() -> bytes:
    segredo = os.getenv("AUTH_SECRET")
    if segredo and len(segredo) < 32:
        # Segredo curto pode ser quebrado por força bruta a partir de um token e permitir forjar um admin.
        raise HTTPException(503, "AUTH_SECRET curta demais (mínimo de 32 caracteres).")
    if segredo:
        return segredo.encode()
    if os.getenv("VERCEL"):
        # Em produção, sem segredo fixo cada instância assinaria com uma chave diferente: recusa.
        raise HTTPException(503, "AUTH_SECRET não configurada no servidor.")
    return _SEGREDO_LOCAL


def _b64(dados: bytes) -> str:
    return base64.urlsafe_b64encode(dados).rstrip(b"=").decode()


def _de_b64(texto: str) -> bytes:
    return base64.urlsafe_b64decode(texto + "=" * (-len(texto) % 4))


def assinar(payload: dict[str, Any]) -> str:
    parte = _b64(json.dumps(payload, ensure_ascii=False).encode())
    return parte + "." + _b64(hmac.new(_segredo(), parte.encode(), hashlib.sha256).digest())


def hash_senha(senha: str, sal: Optional[bytes] = None) -> str:
    sal = sal or secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", senha.encode(), sal, ITERACOES)
    return f"pbkdf2_sha256${ITERACOES}${_b64(sal)}${_b64(dk)}"


def senha_confere(senha: str, guardado: str) -> bool:
    _, iteracoes, sal, dk = guardado.split("$")
    calculado = hashlib.pbkdf2_hmac("sha256", senha.encode(), _de_b64(sal), int(iteracoes))
    return hmac.compare_digest(calculado, _de_b64(dk))


# Usado quando o usuário não existe, para a resposta levar o mesmo tempo (não revela quais usuários existem).
_HASH_FALSO = hash_senha(secrets.token_urlsafe(16))


def exigir_login(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    segredo = _segredo()
    esquema, _, token = (authorization or "").partition(" ")
    payload = None
    try:
        parte, assinatura = token.split(".")
        esperado = hmac.new(segredo, parte.encode(), hashlib.sha256).digest()
        if esquema.lower() == "bearer" and hmac.compare_digest(_de_b64(assinatura), esperado):
            payload = json.loads(_de_b64(parte))
    except ValueError:  # base64, JSON ou formato inválido
        pass
    if not isinstance(payload, dict) or payload.get("exp", 0) < time.time():
        raise HTTPException(401, "Faça login para continuar.")
    # Conta de lojista apagada pelo admin perde o acesso na hora, mesmo com token ainda válido.
    # Confere também o usuário: se o banco for zerado, o mesmo id pode virar outra conta.
    conta = db.buscar("lojista", int(payload["sub"])) if payload.get("papel") == "lojista" else None
    if payload.get("papel") == "lojista" and (conta is None or conta["usuario"] != payload.get("nome")):
        raise HTTPException(401, "Faça login para continuar.")
    return payload


def exigir_admin(usuario: Annotated[dict[str, Any], Depends(exigir_login)]) -> dict[str, Any]:
    if usuario["papel"] != "admin":
        raise HTTPException(403, "Só o administrador pode fazer isso.")
    return usuario


# ---------- Login ----------

class LoginIn(BaseModel):
    usuario: str = Field(max_length=128)
    senha: str = Field(max_length=128)


@router.post("/auth/login")
def login(body: LoginIn, request: Request) -> dict[str, Any]:
    limitar_por_ip(request, _tentativas_login, LIMITE_LOGIN_POR_MINUTO,
                   "Muitas tentativas de login. Aguarde um minuto e tente de novo.")
    _segredo()  # 503 antes de conferir senha, se faltar configuração
    admin_u, admin_s = os.getenv("ADMIN_USUARIO"), os.getenv("ADMIN_SENHA")
    usuario: Optional[dict[str, Any]] = None
    if admin_u and admin_s and hmac.compare_digest(body.usuario.encode(), admin_u.encode()) \
            and hmac.compare_digest(body.senha.encode(), admin_s.encode()):
        usuario = {"sub": "admin", "papel": "admin", "nome": admin_u, "lojaId": None, "lojaNome": None, "zoneId": None}
    else:
        nome = body.usuario.strip().lower()
        # shortcut: varre as contas em memória; com milhares de lojistas, criar índice/tabela própria
        conta = next((c for c in db.listar("lojista", 10_000) if c["usuario"] == nome), None)
        if senha_confere(body.senha, conta["senhaHash"] if conta else _HASH_FALSO) and conta:
            usuario = {"sub": conta["id"], "papel": "lojista", "nome": conta["usuario"], "lojaId": conta["id"],
                       "lojaNome": conta["lojaNome"], "zoneId": conta["zoneId"]}
    if usuario is None:
        raise HTTPException(401, "Usuário ou senha inválidos.")
    token = assinar({**usuario, "exp": int(time.time()) + VALIDADE_S})
    return {"token": token, "usuario": {k: usuario[k] for k in CAMPOS_USUARIO}}


@router.get("/auth/eu")
def eu(usuario: Annotated[dict[str, Any], Depends(exigir_login)]) -> dict[str, Any]:
    return {k: usuario.get(k) for k in CAMPOS_USUARIO}


# ---------- Contas de lojista (admin) ----------

class LojistaIn(BaseModel):
    usuario: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=3, max_length=40,
                                              pattern=r"^[A-Za-z0-9._-]+$")]  # maiúsculas viram minúsculas
    senha: str = Field(min_length=8, max_length=128)
    lojaNome: str = Field(min_length=2, max_length=80)
    zoneId: ZoneId


def _lojista(c: dict[str, Any]) -> dict[str, Any]:
    return {"id": c["id"], "usuario": c["usuario"], "lojaNome": c["lojaNome"], "zoneId": c["zoneId"],
            "criadoEm": c["criadoEm"]}


@router.get("/admin/lojistas", dependencies=[Depends(exigir_admin)])
def listar_lojistas() -> list[dict[str, Any]]:
    return [_lojista(c) for c in db.listar("lojista", 10_000)]


@router.post("/admin/lojistas", status_code=201, dependencies=[Depends(exigir_admin)])
def criar_lojista(body: LojistaIn) -> dict[str, Any]:
    if body.usuario == (os.getenv("ADMIN_USUARIO") or "").lower() or \
            any(c["usuario"] == body.usuario for c in db.listar("lojista", 10_000)):
        raise HTTPException(409, "Esse usuário já existe.")
    dados = {"usuario": body.usuario, "lojaNome": sanitize_input(body.lojaNome), "zoneId": body.zoneId,
             "senhaHash": hash_senha(body.senha)}
    return _lojista(db.inserir("lojista", body.zoneId, dados))


@router.delete("/admin/lojistas/{rid}", status_code=204, response_model=None, dependencies=[Depends(exigir_admin)])
def apagar_lojista(rid: int) -> Response:
    if not db.apagar("lojista", rid):
        raise HTTPException(404, "Lojista não encontrado.")
    return Response(status_code=204)
