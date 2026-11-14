"""Agente de IA do VitrineIQ.

Provedor intercambiável (Gemini no MVP). A chave fica só no servidor
(`GEMINI_API_KEY`), a chamada tem timeout de 4,5 s e, em qualquer falha, o
agente responde com um plano heurístico local para nunca travar a demo.
Somente dados agregados e anônimos são enviados ao provedor.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any, Optional

import httpx

TIMEOUT_SECONDS = 4.5
VISION_TIMEOUT_SECONDS = 6.5
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


@dataclass
class VitrineAuditResult:
    score: int
    headline: str
    defects: list[str]
    zone_moves: list[str]
    quick_win: str
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

    def generate_vision(
        self,
        prompt: str,
        image_base64: str,
        mime_type: str = "image/jpeg",
    ) -> Optional[str]:
        """Chamada multimodal ao Gemini usando inline_data base64 (JPEG/PNG) sem persistir a imagem."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": mime_type, "data": image_base64}},
                    ]
                }
            ],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        response = httpx.post(
            url,
            headers={"x-goog-api-key": self.api_key, "Content-Type": "application/json"},
            json=payload,
            timeout=VISION_TIMEOUT_SECONDS,
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
        f"Plano gerado por heurística no servidor, sem IA [{cat}]\n\n"
        "1. Diagnóstico Executivo (VitrineIQ):\n"
        f"Demanda ativa detectada para {wing}. Oportunidade imediata de conversão aproveitando o fluxo "
        "em circulação na ala, usando só contagens anônimas.\n\n"
        "2. Ação Imediata na Vitrine & Balcão:\n"
        f"• {action}\n\n"
        "3. Copy Pronta para WhatsApp / Cupom Relâmpago:\n"
        f"• \"{whatsapp}\"\n\n"
        "4. Oportunidade Cross-Segmento no Capim Dourado:\n"
        f"• {cross}\n\n"
        "Status: IA indisponível ou sem chave; regras fixas por palavra-chave, sem IA."
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


def _extract_image_payload(image_base64: str) -> tuple[str, str]:
    raw = (image_base64 or "").strip()
    mime_type = "image/jpeg"
    if raw.startswith("data:") and "," in raw:
        header, raw = raw.split(",", 1)
        lower_header = header.lower()
        if "image/png" in lower_header:
            mime_type = "image/png"
        elif "image/webp" in lower_header:
            mime_type = "image/webp"
    return mime_type, raw.strip()


def _parse_audit_json(raw_text: str) -> Optional[dict[str, Any]]:
    cleaned = (raw_text or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        parsed = json.loads(cleaned)
    except (ValueError, TypeError):
        return None
    if not isinstance(parsed, dict):
        return None
    if not isinstance(parsed.get("headline"), str) or not parsed["headline"].strip():
        return None
    if not isinstance(parsed.get("quick_win"), str) or not parsed["quick_win"].strip():
        return None
    try:
        score = max(0, min(100, int(parsed.get("score", 0))))
    except (TypeError, ValueError):
        return None
    defects = [str(item).strip() for item in (parsed.get("defects") or []) if str(item).strip()][:5]
    zone_moves = [str(item).strip() for item in (parsed.get("zone_moves") or []) if str(item).strip()][:5]
    return {
        "score": score,
        "headline": strip_markdown(parsed["headline"]),
        "defects": [strip_markdown(d) for d in defects],
        "zone_moves": [strip_markdown(z) for z in zone_moves],
        "quick_win": strip_markdown(parsed["quick_win"]),
    }


def heuristic_storefront_audit(
    zone_id: str,
    store_name: str,
    olhares_por_zona: Optional[dict[str, int]] = None,
    taxa_atencao: Optional[int] = None,
) -> VitrineAuditResult:
    """Auditoria determinística local usando telemetria da vitrine (esquerda/centro/direita e taxa de atenção)."""
    zonas_raw = olhares_por_zona or {}
    zonas = {
        "esquerda": max(0, int(zonas_raw.get("esquerda", 0) or 0)),
        "centro": max(0, int(zonas_raw.get("centro", 0) or 0)),
        "direita": max(0, int(zonas_raw.get("direita", 0) or 0)),
    }
    total_olhares = sum(zonas.values())

    if taxa_atencao is not None:
        taxa = max(0, min(100, int(taxa_atencao)))
        if taxa < 15:
            score = 44
        elif taxa < 25:
            score = 60
        elif taxa < 40:
            score = 76
        else:
            score = 88
    else:
        taxa = None
        score = 66

    defects: list[str] = []
    zone_moves: list[str] = []

    if taxa is not None and taxa < 20:
        defects.append(
            f"Retenção baixa no corredor ({taxa}% de atenção): falta ponto focal iluminado na altura dos olhos (1,50m)."
        )
    elif taxa is not None:
        defects.append(
            f"Taxa de atenção atual em {taxa}%: há margem para reforçar contraste de preço/benefício no vidro frontal."
        )

    if total_olhares > 0:
        zona_quente = max(zonas, key=lambda k: zonas[k])
        zona_fria = min(zonas, key=lambda k: zonas[k])
        pct_quente = round(100 * zonas[zona_quente] / total_olhares)
        pct_fria = round(100 * zonas[zona_fria] / total_olhares)

        if pct_quente >= 55 and pct_fria <= 15:
            score -= 6
            defects.append(
                f"Concentração excessiva na zona '{zona_quente}' ({pct_quente}% dos olhares) deixando '{zona_fria}' subaproveitada ({pct_fria}%)."
            )
        else:
            score += 4

        if zonas["centro"] < zonas["esquerda"] and zonas["centro"] < zonas["direita"]:
            defects.append(
                "Centro da vitrine perde leitura para as laterais: falta peça-âncora central com placa de oferta legível a 3 metros."
            )

        zone_moves.append(
            f"Zona '{zona_quente}' ({zonas[zona_quente]} olhares): posicione o produto hero de maior giro e margem."
        )
        zone_moves.append(
            f"Zona '{zona_fria}' ({zonas[zona_fria]} olhares): instale QR Code do Concierge + display luminoso para puxar olhar."
        )
        if "centro" not in (zona_quente, zona_fria):
            zone_moves.append(
                f"Zona 'centro' ({zonas['centro']} olhares): organize composição em pirâmide com 3 níveis e etiqueta de preço clara."
            )
        else:
            outra = next(z for z in ("esquerda", "centro", "direita") if z not in (zona_quente, zona_fria))
            zone_moves.append(
                f"Zona '{outra}' ({zonas[outra]} olhares): use look complementar de cross-sell com indicação de combo no balcão."
            )

        quick_win = (
            f"Mova a peça de maior desejo da {store_name} para a zona '{zona_quente}' e fixe o QR relâmpago na altura dos olhos na '{zona_fria}'."
        )
    else:
        defects.append(
            "Sem histórico recente de heatmap por zona (esquerda/centro/direita): aplique regra dos 3 pontos focais para calibrar leitura."
        )
        zone_moves = [
            "Zona 'esquerda': posicione novidade de entrada para capturar quem chega pelo corredor principal.",
            "Zona 'centro': crie bloco focal na altura de 1,45m–1,65m com iluminação direcionada e preço âncora.",
            "Zona 'direita': posicione QR Code de resgate rápido e kit de ticket acessível para conversão imediata.",
        ]
        quick_win = (
            f"Destaque uma oferta-âncora da {store_name} no 'centro' da vitrine com QR Code visível a 2 metros."
        )

    if len(defects) < 2:
        defects.append(
            "Sinalização de urgência discreta: adicione badge de benefício por tempo limitado visível sem precisar entrar na loja."
        )

    score = max(15, min(98, score))
    if score >= 75:
        headline = f"Vitrine competitiva da {store_name} ({score}/100): ajustes finos destravam mais conversão."
    elif score >= 55:
        headline = f"Vitrine da {store_name} com potencial retido ({score}/100): redistribuição por zonas pode elevar paradas."
    else:
        headline = f"Alerta de conversão na {store_name} ({score}/100): vitrine precisa de novo ponto focal imediato."

    return VitrineAuditResult(
        score=score,
        headline=headline,
        defects=defects[:3],
        zone_moves=zone_moves[:3],
        quick_win=quick_win,
        source="FALLBACK_LOCAL",
    )


def audit_storefront_image(
    image_base64: str,
    zone_id: str,
    store_name: str,
    olhares_por_zona: Optional[dict[str, int]] = None,
    taxa_atencao: Optional[int] = None,
    provider: Optional[GeminiProvider] = None,
) -> VitrineAuditResult:
    """Audita foto da vitrine com Gemini multimodal (timeout 6,5 s) e fallback heurístico local.

    LGPD: a imagem recebida em memória nunca é gravada em banco nem registrada em logs.
    """
    provider = provider if provider is not None else build_provider()
    if provider is not None:
        mime_type, clean_b64 = _extract_image_payload(image_base64)
        zonas = olhares_por_zona or {}
        prompt = (
            "Você é um consultor sênior de Visual Merchandising e Varejo no Capim Dourado Shopping (Palmas - TO). "
            f"Analise a foto da vitrine da loja '{store_name}' na ala '{zone_id}'. "
            f"Sinais anônimos da câmera — olhares por zona: esquerda={zonas.get('esquerda', 0)}, "
            f"centro={zonas.get('centro', 0)}, direita={zonas.get('direita', 0)}; "
            f"taxa_atencao={taxa_atencao if taxa_atencao is not None else 'n/d'}%. "
            "Responda APENAS com JSON puro (sem Markdown) exatamente no formato: "
            '{"score": 0-100, "headline": "resumo curto em pt-BR", '
            '"defects": ["defeito 1", "defeito 2"], '
            '"zone_moves": ["movimento esquerda/centro/direita 1", "movimento 2"], '
            '"quick_win": "ação rápida prática em pt-BR"}.'
        )
        try:
            raw = provider.generate_vision(prompt, clean_b64, mime_type=mime_type)
            if raw:
                parsed = _parse_audit_json(raw)
                if parsed is not None:
                    return VitrineAuditResult(
                        score=parsed["score"],
                        headline=parsed["headline"],
                        defects=parsed["defects"],
                        zone_moves=parsed["zone_moves"],
                        quick_win=parsed["quick_win"],
                        source="GEMINI_API",
                    )
        except (httpx.HTTPError, ValueError, KeyError, IndexError, AttributeError):
            pass

    return heuristic_storefront_audit(
        zone_id=zone_id,
        store_name=store_name,
        olhares_por_zona=olhares_por_zona,
        taxa_atencao=taxa_atencao,
    )
