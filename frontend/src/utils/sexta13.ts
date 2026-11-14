import { FlashCampaign, LostSaleReason } from '../types';

/** Easter Egg de Sexta-feira 13 (issue #34): "O Fantasma da Venda Invisível". */

export const CLIQUES_PARA_ATIVAR = 13;

/** Sexta-feira 13 na data local do aparelho. */
export function ehSextaFeira13(data: Date): boolean {
  return data.getDate() === 13 && data.getDay() === 5;
}

/** `?sexta13=1` liga o Easter Egg em qualquer dia (para a demonstração). */
export function sexta13NaUrl(search: string): boolean {
  return new URLSearchParams(search).get('sexta13') === '1';
}

/** `criadoEm` (ISO) vem da API; registros locais da demonstração não têm e contam como de hoje. */
type Perda = { reason: LostSaleReason; criadoEm?: string };

/** Quantas vendas perdidas houve hoje e o motivo mais comum (empate: o primeiro que chegou à contagem). */
export function resumoAssombracao(
  perdas: Perda[],
  hoje: Date
): { total: number; motivo: LostSaleReason | null } {
  // shortcut: compara a data do ISO com a data local; vale enquanto aparelho e API estão no mesmo fuso
  const dia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const deHoje = perdas.filter((p) => !p.criadoEm || p.criadoEm.slice(0, 10) === dia);
  const contagem = new Map<LostSaleReason, number>();
  for (const p of deHoje) contagem.set(p.reason, (contagem.get(p.reason) ?? 0) + 1);
  let motivo: LostSaleReason | null = null;
  for (const [r, n] of contagem) if (motivo === null || n > contagem.get(motivo)!) motivo = r;
  return { total: deHoje.length, motivo };
}

/** Campanha publicada pelo botão "Espantar o azar". 130 min: 13 min acabaria antes do fim da apresentação. */
export function campanhaSexta13(
  zoneId: FlashCampaign['zoneId'],
  storeName: string,
  segmento?: string
): Omit<FlashCampaign, 'id' | 'active' | 'createdAt'> {
  return {
    zoneId,
    storeName,
    segmento,
    title: 'Sexta 13: 13% OFF anti-azar',
    discountBadge: '13% OFF',
    couponCode: 'SEXTA13',
    whatsappCopy:
      'Sexta-feira 13 no Capim Dourado: apresente SEXTA13 e ganhe 13% OFF nas próximas 2h10. O azar fica do lado de fora!',
    expiresInMinutes: 130,
  };
}
