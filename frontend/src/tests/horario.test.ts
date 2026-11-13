import { describe, expect, it } from 'vitest';
import { horasDoGrafico, insightsPorHora, PerfilPorHora } from '../utils/horario';

const h = (passaram: number, olharam = 0, vendas = 0, perdidas = 0, buscas = 0) =>
  ({ passaram, olharam, vendas, perdidas, buscas });

describe('perfil por hora', () => {
  it('mostra 10h–22h e inclui horas fora do horário que tenham dado', () => {
    const horas = horasDoGrafico({ '23': h(5) }).map((x) => x.hora);
    expect(horas[0]).toBe(10);
    expect(horas.at(-1)).toBe(23);
    expect(horas).toHaveLength(14);
  });

  it('sem dado, não inventa insight', () => {
    expect(insightsPorHora({})).toEqual([]);
  });

  it('aponta pico, atenção, perdas e buscas a partir dos números medidos', () => {
    const perfil: PerfilPorHora = {
      '15': h(20, 10, 1),       // 50% olhou
      '19': h(80, 16, 0, 3, 2), // pico, sem venda
      '21': h(5, 5),            // poucos passantes: não conta para a %
    };
    const [pico, atencao, perdas, semVenda, buscas] = insightsPorHora(perfil);
    expect(pico).toContain('19h às 20h (80 passaram)');
    expect(atencao).toContain('15h: 50%');
    expect(perdas).toContain('19h (3)');
    expect(semVenda).toContain('pico ainda não há venda');
    expect(buscas).toContain('19h (2)');
  });
});
