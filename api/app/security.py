"""Segurança: sanitização de entradas, bloqueio de prompt injection e trilha SHA-256."""

from __future__ import annotations

import hashlib
import re

GENESIS_HASH = "GENESIS_BLOCK_0000"

_SCRIPT_TAG = re.compile(r"<script\b[^<]*(?:(?!</script>)<[^<]*)*</script>", re.IGNORECASE)

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
    """Remove tags <script> e escapa `<`/`>` (mesma regra do frontend)."""
    if not text or not isinstance(text, str):
        return ""
    cleaned = _SCRIPT_TAG.sub("", text)
    cleaned = cleaned.replace("<", "&lt;").replace(">", "&gt;")
    return cleaned.strip()


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

