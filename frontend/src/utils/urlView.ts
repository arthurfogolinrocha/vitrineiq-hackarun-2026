import { CAPIM_DOURADO_ZONES } from '../data/shoppingData';
import { ZoneId } from '../types';

/** Tela que o QR ou o vendedor abrem direto, sem o menu do lojista. */
export type KioskTab = 'counter' | 'concierge';

/** Lê `?tela=concierge|balcao&ala=<id>`. Valores desconhecidos são ignorados. */
export function readUrlView(search: string): { kioskTab: KioskTab | null; zoneId: ZoneId | null } {
  const params = new URLSearchParams(search);
  const tela = params.get('tela');
  const ala = params.get('ala');
  return {
    kioskTab: tela === 'balcao' ? 'counter' : tela === 'concierge' ? 'concierge' : null,
    zoneId: CAPIM_DOURADO_ZONES.find((z) => z.id === ala)?.id ?? null,
  };
}
