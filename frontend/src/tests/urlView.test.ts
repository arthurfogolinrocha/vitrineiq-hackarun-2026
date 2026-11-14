import { describe, it, expect } from 'vitest';
import { readTenantUrl, readUrlView } from '../utils/urlView';
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

describe('readTenantUrl (Multi-tenant Admin vs Lojista)', () => {
  it('isola o painel para uma loja específica via ?perfil=loja&loja=centauro', () => {
    expect(readTenantUrl('?perfil=loja&loja=centauro')).toEqual({
      role: 'store',
      storeId: 'centauro',
    });
  });

  it('aceita busca case-insensitive por nome da loja (ex: Outback)', () => {
    expect(readTenantUrl('?loja=Outback')).toEqual({
      role: 'store',
      storeId: 'outback',
    });
  });

  it('retorna admin quando nenhum filtro de loja é informado', () => {
    expect(readTenantUrl('')).toEqual({ role: 'admin', storeId: null });
  });

  it('faz fallback seguro para a primeira loja quando ?perfil=loja sem loja válida', () => {
    expect(readTenantUrl('?perfil=loja&loja=inexistente')).toEqual({
      role: 'store',
      storeId: CAPIM_DOURADO_STORES[0].id,
    });
  });

  it('carrega catálogo completo do Capim Dourado (180+ lojas) com logos oficiais', () => {
    expect(CAPIM_DOURADO_STORES.length).toBeGreaterThanOrEqual(180);
    const withLogo = CAPIM_DOURADO_STORES.filter((s) => Boolean(s.logoUrl));
    expect(withLogo.length).toBeGreaterThanOrEqual(180);
    expect(findStoreByName('Centauro')?.logoUrl).toContain('https://');
  });
});
