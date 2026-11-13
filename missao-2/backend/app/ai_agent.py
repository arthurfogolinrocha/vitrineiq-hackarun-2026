"""Agente de IA do VitrineIQ.

Provedor intercambiável (Gemini no MVP). A chave fica só no servidor
(`GEMINI_API_KEY`), a chamada tem timeout de 4,5 s e, em qualquer falha, o
agente responde com um plano heurístico local para nunca travar a demo.
Somente dados agregados e anônimos são enviados ao provedor.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Optional

import httpx

TIMEOUT_SECONDS = 4.5
DEFAULT_MODEL = "gemini-3.1-flash-lite"

SYSTEM_INSTRUCTIONS = (
    "Você é o Agente Comercial do VitrineIQ no Capim Dourado Shopping (Palmas - TO). "
    "Analise os sinais anônimos de corredor, vendas perdidas no balcão e fatores externos "
    "e responda em português direto, sem Markdown, com:\n"
    "1) Diagnóstico da oportunidade agora;\n"
    "2) Ação imediata na vitrine/balcão;\n"
    "3) Texto pronto curto para WhatsApp/cupom relâmpago;\n"
    "4) Ideia de parceria cross-segmento no shopping."
)


@dataclass
class AgentResult:
    content: str
    source: str  # "GEMINI_API" | "FALLBACK_LOCAL"


def strip_markdown(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"__(.*?)__", r"\1", text)
    text = re.sub(r"_(.*?)_", r"\1", text)
    return text.strip()


class GeminiProvider:
    """Provedor Gemini via REST. Pode ser trocado por outro com o mesmo `generate`."""

    def __init__(self, api_key: str, model: str = DEFAULT_MODEL) -> None:
        self.api_key = api_key
        self.model = model

    def generate(self, prompt: str) -> Optional[str]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        response = httpx.post(
            url,
            headers={"x-goog-api-key": self.api_key, "Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        return (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text")
        )


def build_provider() -> Optional[GeminiProvider]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    return GeminiProvider(api_key, os.getenv("GEMINI_MODEL", DEFAULT_MODEL))


def heuristic_plan(prompt: str, category: Optional[str], context: Optional[str]) -> str:
    """Plano de contingência determinístico (mesmo texto do fallback do frontend)."""
    lower = f"{prompt or ''} {context or ''}".lower()
    cat = category or "Geral"

    action = "Posicionar placa de oferta-âncora na entrada da vitrine com QR Code de resgate válido por 2 horas."
    whatsapp = "⚡ Só nas próximas 2h no Capim Dourado: apresente o cupom VITRINE-HOJE no balcão e garanta condição exclusiva!"
    cross = "Criar voucher cruzado com a Praça de Alimentação / Cinemark para converter o fluxo que já está circulando na ala."

    if any(word in lower for word in ("preco", "preço", "desconto")):
        action = "Destacar kit de entrada/combo de menor ticket na frente da vitrine e oferecer condição relâmpago de parcelamento sem juros."
        whatsapp = "🔥 Achado do dia no Capim Dourado: baixamos o combo mais procurado por tempo limitado. Mostre VITRINE-PRECO no balcão!"
    elif any(word in lower for word in ("estoque", "tamanho", "grade")):
        action = "Ativar reserva expressa com entrega gratuita em casa ou retirada no dia seguinte para não perder o cliente por falta de grade."
        whatsapp = "📦 Não achou sua numeração na vitrine? Garantimos entrega expressa amanhã com 10% OFF usando VITRINE-GRADE!"
    elif any(word in lower for word in ("fila", "almo", "cinema")):
        action = "Liberar fila expressa para pedidos pré-selecionados via QR Code (retirada em balcão dedicado em até 5 min)."
        cross = "Integrar alerta pós-sessão do Cinemark e saída da Morofit para antecipar produção em horários de pico."

    wing_match = re.search(r"Ala:\s*([^|]+)", context or "", flags=re.IGNORECASE)
    wing = wing_match.group(1).strip() if wing_match else f"{cat} • Capim Dourado Shopping"

    return (
        f"⚡ Análise Concluída pelo Motor de Inteligência [{cat}]\n\n"
        "1. Diagnóstico Executivo (VitrineIQ):\n"
        f"Demanda ativa detectada para {wing}. Oportunidade imediata de conversão aproveitando o fluxo "
        "em circulação na ala sem captura de dados pessoais (100% LGPD).\n\n"
        "2. Ação Imediata na Vitrine & Balcão:\n"
        f"• {action}\n\n"
        "3. Copy Pronta para WhatsApp / Cupom Relâmpago:\n"
        f"• \"{whatsapp}\"\n\n"
        "4. Oportunidade Cross-Segmento no Capim Dourado:\n"
        f"• {cross}\n\n"
        "Status: Motor de Contingência Local Ativo (backend Python, 100% em conformidade com LGPD e Artigo 6 HackaRun 2026)."
    )


def generate_plan(
    prompt: str,
    category: Optional[str] = None,
    context: Optional[str] = None,
    provider: Optional[GeminiProvider] = None,
) -> AgentResult:
    provider = provider if provider is not None else build_provider()
    if provider is not None:
        full_prompt = (
            f"{SYSTEM_INSTRUCTIONS}\n\nContexto: {context or 'Inteligência Comercial Shopping'}\n"
            f"Dados: {prompt}"
        )
        try:
            text = provider.generate(full_prompt)
            if text and text.strip():
                return AgentResult(strip_markdown(text), "GEMINI_API")
        except (httpx.HTTPError, ValueError, KeyError, IndexError):
            pass  # cai no plano heurístico abaixo

    return AgentResult(heuristic_plan(prompt, category, context), "FALLBACK_LOCAL")
