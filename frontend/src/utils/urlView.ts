import { CAPIM_DOURADO_STORES, CAPIM_DOURADO_ZONES } from '../data/shoppingData';
import { AccessRole, ZoneId } from '../types';

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

/** Lê `?perfil=loja&loja=<id|nome>` para abrir direto no painel isolado de uma loja. */
export function readTenantUrl(search: string): { role: AccessRole; storeId: string | null } {
  const params = new URLSearchParams(search);
  const perfil = params.get('perfil');
  const loja = params.get('loja')?.trim().toLowerCase();
  if (perfil === 'loja' || loja) {
    const match = CAPIM_DOURADO_STORES.find(
      (s) => s.id === loja || s.storeName.toLowerCase() === loja
    );
    return { role: 'store', storeId: match?.id ?? CAPIM_DOURADO_STORES[0].id };
  }
  return { role: 'admin', storeId: null };
}
