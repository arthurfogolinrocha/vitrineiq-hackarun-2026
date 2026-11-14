"""Persistência do VitrineIQ.

Uma tabela só, `registros`: cada linha guarda um evento do ciclo (Balcão, Concierge,
campanha, resumo ou alerta da câmera) como JSON, com o tipo e a ala para filtrar.

- Local: SQLite em `api/vitrineiq.db` (padrão, sem configurar nada).
- Produção: Postgres (Neon ou Supabase) via `DATABASE_URL`. SQLite numa função da
  Vercel NÃO persiste: o disco é temporário e cada instância tem o seu.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

# Palmas-TO: UTC-3 o ano inteiro (sem horário de verão).
FUSO = timezone(timedelta(hours=-3))

_engine: Optional[Engine] = None


def _url() -> str:
    padrao_dir = Path("/tmp") if os.getenv("VERCEL") else Path(__file__).resolve().parents[1]
    url = os.getenv("DATABASE_URL", f"sqlite:///{(padrao_dir / 'vitrineiq.db').as_posix()}")
    # Neon e Supabase entregam postgres:// ou postgresql://; o SQLAlchemy usa o driver psycopg 3.
    for prefixo in ("postgres://", "postgresql://"):
        if url.startswith(prefixo):
            return "postgresql+psycopg://" + url[len(prefixo):]
    return url


def engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(_url(), pool_pre_ping=True)
        is_sqlite = _engine.dialect.name == "sqlite"
        id_col = "INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "SERIAL PRIMARY KEY"
        with _engine.begin() as con:
            if is_sqlite:
                con.execute(text("PRAGMA journal_mode=WAL"))
                con.execute(text("PRAGMA synchronous=NORMAL"))
            con.execute(text(
                f"CREATE TABLE IF NOT EXISTS registros ("
                f"id {id_col}, tipo TEXT NOT NULL, zona TEXT, dados TEXT NOT NULL, criado_em TEXT NOT NULL)"
            ))
            con.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_registros_tipo_criado ON registros (tipo, criado_em)"
            ))
            con.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_registros_tipo_zona_criado ON registros (tipo, zona, criado_em)"
            ))
    return _engine


def usar_banco(url: Optional[str]) -> None:
    """Troca o banco (testes usam um SQLite temporário)."""
    global _engine
    if url is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = url
    _engine = None


def agora() -> datetime:
    return datetime.now(FUSO)


def inserir(tipo: str, zona: Optional[str], dados: dict[str, Any]) -> dict[str, Any]:
    criado = agora()
    with engine().begin() as con:
        res = con.execute(
            text("INSERT INTO registros (tipo, zona, dados, criado_em) VALUES (:t, :z, :d, :c) RETURNING id"),
            {"t": tipo, "z": zona, "d": json.dumps(dados, ensure_ascii=False), "c": criado.isoformat()},
        )
        rid = res.scalar_one()
    return _linha(rid, dados, criado.isoformat())


def listar(
    tipo: str,
    limite: int = 200,
    desde: Optional[datetime] = None,
    zona: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Registros do tipo (e zona opcional), do mais novo para o mais antigo."""
    sql = "SELECT id, dados, criado_em FROM registros WHERE tipo = :t"
    params: dict[str, Any] = {"t": tipo, "n": limite}
    if zona is not None:
        sql += " AND zona = :z"
        params["z"] = zona
    if desde is not None:
        sql += " AND criado_em >= :d"
        params["d"] = desde.isoformat()
    with engine().connect() as con:
        rows = con.execute(text(sql + " ORDER BY id DESC LIMIT :n"), params).all()
    return [_linha(r.id, json.loads(r.dados), r.criado_em) for r in rows]


def buscar(tipo: str, rid: int) -> Optional[dict[str, Any]]:
    with engine().connect() as con:
        r = con.execute(text("SELECT id, dados, criado_em FROM registros WHERE tipo = :t AND id = :i"),
                        {"t": tipo, "i": rid}).first()
    return _linha(r.id, json.loads(r.dados), r.criado_em) if r else None


def atualizar(tipo: str, rid: int, dados: dict[str, Any]) -> None:
    with engine().begin() as con:
        con.execute(text("UPDATE registros SET dados = :d WHERE tipo = :t AND id = :i"),
                    {"d": json.dumps(dados, ensure_ascii=False), "t": tipo, "i": rid})


def apagar(tipo: str, rid: int) -> bool:
    with engine().begin() as con:
        return con.execute(text("DELETE FROM registros WHERE tipo = :t AND id = :i"),
                           {"t": tipo, "i": rid}).rowcount > 0


def _linha(rid: int, dados: dict[str, Any], criado_em: str) -> dict[str, Any]:
    criado = datetime.fromisoformat(criado_em)
    return {**dados, "id": str(rid), "timestamp": criado.strftime("%H:%M"), "criadoEm": criado_em}
