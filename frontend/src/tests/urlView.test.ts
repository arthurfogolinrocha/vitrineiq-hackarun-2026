import { describe, it, expect } from 'vitest';
import { readUrlView } from '../utils/urlView';
import { CAPIM_DOURADO_STORES, findStoreByName } from '../data/shoppingData';

describe('readUrlView (US: QR abre o Concierge direto)', () => {
  it('abre o Concierge na ala do QR', () => {
    expect(readUrlView('?tela=concierge&ala=ala-lazer-cinema')).toEqual({
      kioskTab: 'concierge',
      zoneId: 'ala-lazer-cinema',
    });
  });

  it('abre o Modo Balcão', () => {
    expect(readUrlView('?tela=balcao').kioskTab).toBe('counter');
  });

  it('ignora tela e ala desconhecidas (volta ao painel completo)', () => {
    expect(readUrlView('?tela=toString&ala=ala-falsa')).toEqual({ kioskTab: null, zoneId: null });
    expect(readUrlView('')).toEqual({ kioskTab: null, zoneId: null });
  });
});

// A loja do lojista vem do login (token), não da URL: readTenantUrl foi removido na feat/login.
describe('catálogo do Capim Dourado', () => {
  it('carrega catálogo completo do Capim Dourado (180+ lojas) com logos oficiais', () => {
    expect(CAPIM_DOURADO_STORES.length).toBeGreaterThanOrEqual(180);
    const withLogo = CAPIM_DOURADO_STORES.filter((s) => Boolean(s.logoUrl));
    expect(withLogo.length).toBeGreaterThanOrEqual(180);
    expect(findStoreByName('Centauro')?.logoUrl).toContain('https://');
  });
});
