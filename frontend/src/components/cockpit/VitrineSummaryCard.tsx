import React from 'react';
import { Eye } from 'lucide-react';
import { VitrineResumo } from '../../services/api';

interface VitrineSummaryCardProps {
  vitrineResumo?: VitrineResumo;
  zoneShortName: string;
  medido: boolean;
}

/** Card Vitrine (issue #30): o que a câmera mediu hoje e o que fazer. */
export const VitrineSummaryCard: React.FC<VitrineSummaryCardProps> = ({
  vitrineResumo,
  zoneShortName,
  medido,
}) => {
  const tercos = vitrineResumo?.olharesPorZona ?? { esquerda: 0, centro: 0, direita: 0 };
  const totalTercos = tercos.esquerda + tercos.centro + tercos.direita;
  const parteMaisOlhada =
    totalTercos > 0
      ? (['esquerda', 'centro', 'direita'] as const).reduce((a, b) => (tercos[b] > tercos[a] ? b : a))
      : null;

  return (
    <section
      aria-labelledby="card-vitrine-titulo"
      className="bento-card-cream rounded-3xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            Vitrine
          </span>
          <h3 id="card-vitrine-titulo" className="text-base font-extrabold text-[#111318] mt-0.5">
            Câmera da vitrine hoje ({zoneShortName})
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {medido && vitrineResumo && (
            <span
              role="status"
              className="text-[11px] font-bold px-2 py-1 rounded-lg bg-[#111318] text-white inline-flex items-center gap-1.5"
              title="Quem está na frente agora entra em Passaram quando sair da imagem"
            >
              <span
                className={`w-2 h-2 rounded-full ${(vitrineResumo.agora ?? 0) > 0 ? 'bg-emerald-400 motion-safe:animate-pulse' : 'bg-stone-500'}`}
                aria-hidden="true"
              />
              Agora na frente: {vitrineResumo.agora ?? 0}
            </span>
          )}
          <span
            className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${
              medido ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {medido ? 'Medido pela câmera (só contagens)' : 'Demonstração: dados fictícios'}
          </span>
        </div>
      </div>

      {vitrineResumo ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <dl className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { rotulo: 'Passaram', valor: String(vitrineResumo.passantes), detalhe: 'na frente da vitrine' },
              {
                rotulo: 'Olharam',
                valor: `${vitrineResumo.taxaAtencao}%`,
                detalhe: `${vitrineResumo.olharam} pessoas`,
              },
              {
                rotulo: 'Pico',
                valor:
                  vitrineResumo.horaPico === null
                    ? '—'
                    : `${vitrineResumo.horaPico}h–${vitrineResumo.horaPico + 1}h`,
                detalhe: `até ${vitrineResumo.picoSimultaneo} ao mesmo tempo`,
              },
              {
                rotulo: 'Parte mais olhada',
                valor: parteMaisOlhada ?? '—',
                detalhe: parteMaisOlhada
                  ? `${Math.round((tercos[parteMaisOlhada] * 100) / totalTercos)}% dos olhares`
                  : 'sem olhares por parte',
              },
            ].map((item) => (
              <div key={item.rotulo} className="rounded-2xl bg-[#FAF8F5] border border-stone-200 p-3">
                <dt className="text-[11px] font-bold text-stone-500">{item.rotulo}</dt>
                <dd className="text-xl font-extrabold text-[#111318] kpi-metric capitalize">{item.valor}</dd>
                <dd className="text-[11px] text-stone-500">{item.detalhe}</dd>
              </div>
            ))}
          </dl>
          <div className="lg:col-span-5 rounded-2xl bg-[#FAF8F5] border border-stone-200 p-3.5">
            <strong className="text-xs text-[#111318] block mb-1.5">O que fazer</strong>
            {vitrineResumo.acoes.length > 0 ? (
              <ul className="space-y-1.5">
                {vitrineResumo.acoes.map((acao) => (
                  <li key={acao} className="text-xs text-stone-700 flex gap-2">
                    <span className="text-[#B45309] font-bold" aria-hidden="true">→</span>
                    {acao}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-500">
                {medido
                  ? 'Ainda sem movimento suficiente para sugerir uma ação.'
                  : 'Na demonstração offline não há sugestões: elas vêm da câmera real.'}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p role="status" className="text-xs font-semibold text-stone-600 bg-[#FAF8F5] border border-dashed border-stone-300 rounded-2xl p-4">
          Câmera desta ala ainda sem dados hoje. Quando ela enviar as contagens, este card mostra quem passou, quem olhou, o pico e o que fazer.
        </p>
      )}
    </section>
  );
};
