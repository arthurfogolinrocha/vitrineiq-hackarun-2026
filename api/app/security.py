"""Segurança: sanitização de entradas, bloqueio de prompt injection e hash encadeado (aponta alterações; não é garantia de segurança)."""

from __future__ import annotations

import hashlib
import re

GENESIS_HASH = "GENESIS_BLOCK_0000"

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u200b-\u200f\ufeff]")
_SCRIPT_TAG = re.compile(r"<script\b[^>]*>[\s\S]*?</script\s*>", re.IGNORECASE)
_EVENT_HANDLER_ATTR = re.compile(r"\bon[a-z]+\s*=\s*(?:\"[^\"]*\"|'[^']*'|[^\s<>\"']*)", re.IGNORECASE)
_JAVASCRIPT_URI = re.compile(r"javascript\s*:", re.IGNORECASE)

_RESTRICTED_PATTERNS = [
    re.compile(r"ignore all previous instructions", re.IGNORECASE),
    re.compile(r"ignore (as|todas as) instru[cç][oõ]es anteriores", re.IGNORECASE),
    re.compile(r"system prompt reveal", re.IGNORECASE),
    re.compile(r"revele? (o )?prompt", re.IGNORECASE),
    re.compile(r"drop table", re.IGNORECASE),
    re.compile(r"delete from", re.IGNORECASE),
    re.compile(r"<iframe", re.IGNORECASE),
]


def sanitize_input(text: str) -> str:
    """Remove bytes de controle, scripts, handlers inline, `javascript:` e escapa `<`/`>`."""
    if not text or not isinstance(text, str):
        return ""
    cleaned = _CONTROL_CHARS.sub("", text)
    cleaned = _SCRIPT_TAG.sub("", cleaned)
    cleaned = _EVENT_HANDLER_ATTR.sub("", cleaned)
    cleaned = _JAVASCRIPT_URI.sub("", cleaned)
    cleaned = cleaned.replace("<", "&lt;").replace(">", "&gt;")
    return cleaned.strip()


# Ordem importa: UUID/PIX e cartões (13-19 dígitos) vêm antes de CPF (11 dígitos) e telefone (8-13 dígitos).
_DADOS_PESSOAIS = [
    re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"),                                      # e-mail
    re.compile(
        r"(?<![0-9a-fA-F])[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?![0-9a-fA-F])"
    ),                                                                                # chave PIX aleatória (UUID)
    re.compile(
        r"(?<![\d+])(?:\d{13,19}|(?:\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{1,7}(?:[\s-]\d{1,3})?)|\d{4}[\s-]\d{6}[\s-]\d{5})(?!\d)"
    ),                                                                                # cartão de crédito (13-19 dígitos)
    re.compile(r"(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)"),                          # CPF
    re.compile(r"(?<!\d)(?:\+?55[\s-]?)?(?:\(?\d{2}\)?[\s-]?)?9?\d{4}[\s-]?\d{4}(?!\d)"),  # telefone BR
]


def mascarar_dados_pessoais(text: str) -> str:
    """Troca e-mail, PIX UUID, cartão, CPF e telefone por "[removido]" antes de gravar texto livre (LGPD)."""
    if not text or not isinstance(text, str):
        return ""
    for padrao in _DADOS_PESSOAIS:
        text = padrao.sub("[removido]", text)
    return text


def contains_restricted_patterns(text: str) -> bool:
    """Guardrail contra prompt injection e comandos destrutivos."""
    return any(pattern.search(text or "") for pattern in _RESTRICTED_PATTERNS)


def generate_audit_hash(
    payload: str,
    prev_hash: str = GENESIS_HASH,
    event_id: str = "",
    timestamp: str = "",
) -> str:
    """Hash SHA-256 encadeado (prevHash:id:timestamp:payload).

    Mesmo formato do frontend (`app/src/utils/security.ts`): `SEC-SHA-` + 16
    primeiros caracteres hexadecimais em maiúsculas.
    """
    combined = f"{prev_hash}:{event_id}:{timestamp}:{payload}"
    digest = hashlib.sha256(combined.encode("utf-8")).hexdigest()
    return f"SEC-SHA-{digest[:16].upper()}"

