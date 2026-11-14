import { AIAnalysisRequest, AIAnalysisResponse } from '../types';
import { sanitizeInput, containsRestrictedPatterns } from '../utils/security';
import { cabecalhoAuth, DEFAULT_API_URL, resolveApiUrl, tratar401 } from './api';

/**
 * Serviço do Agente de IA — VitrineIQ
 * O frontend NÃO guarda chave de IA: chama o backend Python
 * (`vitrineiq-hackarun-2026-api`, rota `POST /api/ia/plano`), que fala com o
 * provedor de IA. Se o backend estiver indisponível, usa o fallback heurístico
 * local (zero quebra na demo).
 */
export { DEFAULT_API_URL, resolveApiUrl };

export async function analyzeWithAI(
  request: AIAnalysisRequest,
  apiBaseUrl?: string
): Promise<AIAnalysisResponse> {
  const startTime = performance.now();
  const cleanPrompt = sanitizeInput(request.prompt);

  // Verificação de Segurança Ética / Guardrails (também repetida no backend)
  if (containsRestrictedPatterns(cleanPrompt)) {
    const elapsed = Math.round(performance.now() - startTime);
    return {
      success: false,
      content: 'Aviso de Segurança: O prompt fornecido contém padrões restritos de segurança ou injeção.',
      latencyMs: elapsed,
      timestamp: new Date().toISOString(),
    };
  }

  const baseUrl = apiBaseUrl !== undefined ? apiBaseUrl : resolveApiUrl();

  if (baseUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${baseUrl}/api/ia/plano`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...cabecalhoAuth() },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: cleanPrompt,
          context: request.context,
          category: request.category,
        }),
      });

      if (response.status === 401) tratar401();
      if (response.ok) {
        const data = (await response.json()) as {
          success: boolean;
          content: string;
          source: 'GEMINI_API' | 'FALLBACK_LOCAL' | 'BLOCKED';
          audit_hash?: string;
        };
        const elapsed = Math.round(performance.now() - startTime);
        if (data?.content?.trim()) {
          return {
            success: data.success,
            content: stripMarkdown(data.content),
            latencyMs: elapsed,
            cached: data.source !== 'GEMINI_API',
            source: data.source === 'GEMINI_API' ? 'GEMINI_API' : data.success ? 'BACKEND_FALLBACK' : undefined,
            timestamp: new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn('Backend Python indisponível (rede/timeout), acionando fallback local VitrineIQ:', err);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Backend fora do ar: heurística local (sem IA), para a demo não quebrar.
  const elapsed = Math.round(performance.now() - startTime);

  const fallbackOutput = generateIntelligentFallback(cleanPrompt, request.category, request.context);

  return {
    success: true,
    content: fallbackOutput,
    latencyMs: elapsed,
    cached: true,
    source: 'FALLBACK_LOCAL',
    timestamp: new Date().toISOString(),
  };
}

export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .trim();
}

function generateIntelligentFallback(
  prompt: string,
  category?: string,
  context?: string
): string {
  const cat = category || 'Geral';
  const lower = `${prompt} ${context || ''}`.toLowerCase();

  let actionTip =
    'Posicionar placa de oferta-âncora na entrada da vitrine com QR Code de resgate válido por 2 horas.';
  let whatsappTip =
    '⚡ Só nas próximas 2h no Capim Dourado: apresente o cupom VITRINE-HOJE no balcão e garanta condição exclusiva!';
  let crossTip =
    'Criar voucher cruzado com a Praça de Alimentação / Cinemark para converter o fluxo que já está circulando na ala.';

  if (lower.includes('preco') || lower.includes('preço') || lower.includes('desconto')) {
    actionTip =
      'Destacar kit de entrada/combo de menor ticket na frente da vitrine e oferecer condição relâmpago de parcelamento sem juros.';
    whatsappTip =
      '🔥 Achado do dia no Capim Dourado: baixamos o combo mais procurado por tempo limitado. Mostre VITRINE-PRECO no balcão!';
  } else if (lower.includes('estoque') || lower.includes('tamanho') || lower.includes('grade')) {
    actionTip =
      'Ativar reserva expressa com entrega gratuita em casa ou retirada no dia seguinte para não perder o cliente por falta de grade.';
    whatsappTip =
      '📦 Não achou sua numeração na vitrine? Garantimos entrega expressa amanhã com 10% OFF usando VITRINE-GRADE!';
  } else if (lower.includes('fila') || lower.includes('almo') || lower.includes('cinema')) {
    actionTip =
      'Liberar fila expressa para pedidos pré-selecionados via QR Code (retirada em balcão dedicado em até 5 min).';
    crossTip =
      'Integrar alerta pós-sessão do Cinemark e saída da Morofit para antecipar produção em horários de pico.';
  }

  // Extrai nome amigável da ala se presente no contexto
  const wingMatch = context?.match(/Ala:\s*([^|]+)/i);
  const wingName = wingMatch ? wingMatch[1].trim() : `${cat} • Capim Dourado Shopping`;

  return `Plano gerado por heurística local, sem IA [${cat}]

1. Diagnóstico Executivo (VitrineIQ):
Demanda ativa detectada para ${wingName}. Oportunidade imediata de conversão aproveitando o fluxo em circulação na ala, usando só contagens anônimas.

2. Ação Imediata na Vitrine & Balcão:
• ${actionTip}

3. Copy Pronta para WhatsApp / Cupom Relâmpago:
• "${whatsappTip}"

4. Oportunidade Cross-Segmento no Capim Dourado:
• ${crossTip}

Status: backend indisponível; regras fixas por palavra-chave, sem IA.`;
}
