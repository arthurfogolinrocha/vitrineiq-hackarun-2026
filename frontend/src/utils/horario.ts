/** Uma hora do dia numa ala, como `GET /api/estado` devolve em `porHora` (api/app/ciclo.py). */
export interface HoraResumo {
  passaram: number;
  olharam: number;
  vendas: number;
  perdidas: number;
  buscas: number;
}

export type PerfilPorHora = Record<string, HoraResumo>;

const ABERTURA = 10;
const FECHAMENTO = 22;
const MIN_PASSANTES_TAXA = 10; // abaixo disso a % de quem olhou é ruído

const VAZIA: HoraResumo = { passaram: 0, olharam: 0, vendas: 0, perdidas: 0, buscas: 0 };

/** Horário do shopping (10h–22h) mais qualquer hora fora dele que tenha dado. */
export function horasDoGrafico(perfil: PerfilPorHora): { hora: number; dados: HoraResumo }[] {
  const horas = new Set<number>(Object.keys(perfil).map(Number));
  for (let h = ABERTURA; h <= FECHAMENTO; h++) horas.add(h);
  return [...horas].sort((a, b) => a - b).map((hora) => ({ hora, dados: perfil[hora] ?? VAZIA }));
}

function maior(perfil: PerfilPorHora, valor: (d: HoraResumo) => number) {
  let melhor: { hora: number; n: number } | null = null;
  for (const [h, d] of Object.entries(perfil)) {
    const n = valor(d);
    if (n > 0 && (!melhor || n > melhor.n)) melhor = { hora: Number(h), n };
  }
  return melhor;
}

/** Frases curtas para o lojista, só com o que foi medido hoje. Lista vazia quando não há dado. */
export function insightsPorHora(perfil: PerfilPorHora): string[] {
  const insights: string[] = [];

  const pico = maior(perfil, (d) => d.passaram);
  if (pico) {
    insights.push(`Maior movimento: ${pico.hora}h às ${pico.hora + 1}h (${pico.n} passaram). Deixe um vendedor perto da porta e lance a campanha relâmpago um pouco antes.`);
  }

  const atencao = maior(perfil, (d) => (d.passaram >= MIN_PASSANTES_TAXA ? d.olharam / d.passaram : 0));
  if (atencao) {
    insights.push(`A vitrine prende mais às ${atencao.hora}h: ${Math.round(atencao.n * 100)}% de quem passou olhou.`);
  }

  const perdas = maior(perfil, (d) => d.perdidas);
  if (perdas) {
    insights.push(`Mais vendas perdidas às ${perdas.hora}h (${perdas.n}). Reforce a equipe ou o estoque nesse horário.`);
  }

  const semVenda = maior(perfil, (d) => (d.vendas === 0 ? d.passaram : 0));
  if (semVenda && semVenda.hora !== pico?.hora) {
    insights.push(`Às ${semVenda.hora}h passaram ${semVenda.n} pessoas e nenhuma venda foi registrada no Balcão.`);
  } else if (semVenda) {
    insights.push(`No horário de pico ainda não há venda registrada no Balcão.`);
  }

  const buscas = maior(perfil, (d) => d.buscas);
  if (buscas) {
    insights.push(`Buscas no Concierge concentradas às ${buscas.hora}h (${buscas.n}).`);
  }

  return insights;
}
