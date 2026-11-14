import React from 'react';
import { Users } from 'lucide-react';

interface DoorFunnelCardProps {
  isCamActiveHere: boolean;
  corridorTotal: number;
  stopsTotal: number;
  entriesTotal: number;
  conversionsTotal: number;
  stopRatePct: number;
  entryRatePct: number;
  convBarPct: number;
}

/** Card lateral Bento com o funil físico de 4 etapas na porta da loja. */
export const DoorFunnelCard: React.FC<DoorFunnelCardProps> = ({
  isCamActiveHere,
  corridorTotal,
  stopsTotal,
  entriesTotal,
  conversionsTotal,
  stopRatePct,
  entryRatePct,
  convBarPct,
}) => {
  const steps = [
    {
      label: '1. Passaram na Frente',
      withUsersIcon: true,
      valueText: `${corridorTotal} pessoas (100%)`,
      valueColorClass: '',
      barColorClass: 'bg-[#111318]',
      widthStyle: undefined as string | undefined,
    },
    {
      label: '2. Pararam / Olharam Vitrine',
      withUsersIcon: false,
      valueText: `${stopsTotal} (${stopRatePct}%)`,
      valueColorClass: 'text-[#B45309]',
      barColorClass: 'bg-[#E2A83B] transition-all duration-300',
      widthStyle: `${Math.max(12, stopRatePct)}%`,
    },
    {
      label: '3. Entraram na Loja',
      withUsersIcon: false,
      valueText: `${entriesTotal} (${entryRatePct}%)`,
      valueColorClass: 'text-blue-700',
      barColorClass: 'bg-blue-600 transition-all duration-300',
      widthStyle: `${Math.max(8, entryRatePct)}%`,
    },
    {
      label: '4. Compra Concluída',
      withUsersIcon: false,
      valueText: `${conversionsTotal} (${convBarPct}%)`,
      valueColorClass: 'text-emerald-700',
      barColorClass: 'bg-emerald-600 transition-all duration-300',
      widthStyle: `${Math.max(5, convBarPct)}%`,
    },
  ];

  const nonEntrants = corridorTotal - entriesTotal;

  return (
    <section className="xl:col-span-4 bento-card-cream rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
            Conversão Física da Porta
          </span>
          <h3 className="text-base font-extrabold text-[#111318] mt-0.5">
            Quem Passa vs. Quem Entra
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-stone-100 text-[10px] font-bold text-stone-700">
          {isCamActiveHere ? 'Sensor Webcam' : 'Projeção da Ala'}
        </span>
      </div>

      <div className="space-y-3.5">
        {steps.map((step) => (
          <div key={step.label}>
            <div className="flex justify-between text-xs font-bold text-[#111318] mb-1">
              <span className={step.withUsersIcon ? 'flex items-center gap-1.5' : undefined}>
                {step.withUsersIcon && (
                  <Users className="w-3.5 h-3.5 text-stone-500" aria-hidden="true" />
                )}
                {step.label}
              </span>
              <span className={step.valueColorClass || undefined}>{step.valueText}</span>
            </div>
            <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${step.barColorClass} ${
                  step.widthStyle ? '' : 'w-full'
                }`}
                style={step.widthStyle ? { width: step.widthStyle } : undefined}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-[#FAF8F5] border border-stone-200 p-3.5 text-xs text-stone-700">
        <strong className="text-[#111318] block mb-0.5">Leitura para o Lojista:</strong>
        {nonEntrants > 0
          ? `${nonEntrants} pessoas passaram na frente sem entrar. Use uma oferta relâmpago ou QR na vitrine para capturar essa demanda.`
          : 'Ótima taxa de atração na porta nesta janela horária.'}
      </div>
    </section>
  );
};
