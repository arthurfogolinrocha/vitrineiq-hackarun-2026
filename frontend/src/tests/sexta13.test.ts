import { describe, it, expect } from 'vitest';
import { campanhaSexta13, ehSextaFeira13, resumoAssombracao, sexta13NaUrl } from '../utils/sexta13';

describe('Easter Egg de Sexta-feira 13 (issue #34)', () => {
  it('detecta sexta-feira 13 na data local', () => {
    expect(ehSextaFeira13(new Date(2026, 10, 13))).toBe(true); // 13/11/2026
    expect(ehSextaFeira13(new Date(2026, 1, 13))).toBe(true); // 13/02/2026
    expect(ehSextaFeira13(new Date(2026, 10, 14))).toBe(false); // sábado 14
    expect(ehSextaFeira13(new Date(2026, 0, 13))).toBe(false); // terça 13
  });

  it('liga só com ?sexta13=1', () => {
    expect(sexta13NaUrl('?sexta13=1')).toBe(true);
    expect(sexta13NaUrl('?tela=concierge&sexta13=1')).toBe(true);
    expect(sexta13NaUrl('?sexta13=0')).toBe(false);
    expect(sexta13NaUrl('')).toBe(false);
  });

  it('conta as vendas perdidas de hoje e acha o motivo dominante', () => {
    const hoje = new Date(2026, 10, 13, 20, 0);
    const r = resumoAssombracao(
      [
        { reason: 'preco', criadoEm: '2026-11-13T19:10:00-03:00' },
        { reason: 'estoque_grade', criadoEm: '2026-11-13T19:20:00-03:00' },
        { reason: 'estoque_grade' }, // demonstração local, sem criadoEm
        { reason: 'preco', criadoEm: '2026-11-12T18:00:00-03:00' }, // ontem: não conta
      ],
      hoje
    );
    expect(r).toEqual({ total: 3, motivo: 'estoque_grade' });
  });

  it('sem vendas perdidas não há fantasma', () => {
    expect(resumoAssombracao([], new Date(2026, 10, 13))).toEqual({ total: 0, motivo: null });
  });

  it('a campanha anti-azar publica o cupom SEXTA13 com 13% OFF na ala e loja informadas', () => {
    const c = campanhaSexta13('ala-lazer-cinema', 'Loja Teste');
    expect(c).toMatchObject({
      zoneId: 'ala-lazer-cinema',
      storeName: 'Loja Teste',
      couponCode: 'SEXTA13',
      discountBadge: '13% OFF',
      title: 'Sexta 13: 13% OFF anti-azar',
      expiresInMinutes: 130,
    });
  });
});
