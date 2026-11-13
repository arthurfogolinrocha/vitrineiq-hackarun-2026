import { describe, it, expect } from 'vitest';
import { readUrlView } from '../utils/urlView';

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
