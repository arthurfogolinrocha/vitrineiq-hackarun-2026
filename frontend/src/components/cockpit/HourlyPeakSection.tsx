import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { ShopContextFactors, StoreTenant, TimeSlot } from '../../types';
import { HoraResumo } from '../../utils/horario';
import { HOURLY_PROFILE, TIME_SLOTS, cleanWingLabel } from './cockpitHelpers';

interface HourlyPeakSectionProps {
  zoneShortName: string;
  activeTenant?: StoreTenant | null;
  horasReais: { hora: number; dados: HoraResumo }[];
  temDadoReal: boolean;
  /** Logado: sem dado real não mostra a curva estimada. */
  medido: boolean;
  maxPassaram: number;
  insights: string[];
  maxHourlyFlow: number;
  factors: ShopContextFactors;
  onChangeTimeSlot: (slot: TimeSlot) => void;
  onSelectBarWeight: (weight: number) => void;
}

/** Curva horária de fluxo da ala (dados reais medidos hoje ou perfil estimado por turno). */
export const HourlyPeakSection: React.FC<HourlyPeakSectionProps> = ({
  zoneShortName,
  activeTenant,
  horasReais,
  temDadoReal,
  medido,
  maxPassaram,
  insights,
  maxHourlyFlow,
  factors,
  onChangeTimeSlot,
  onSelectBarWeight,
}) => {
  const [horaSelecionada, setHoraSelecionada] = useState<number | null>(null);
  const horaDetalhe = horasReais.find((x) => x.hora === horaSelecionada);
  const zoneTitle = activeTenant ? cleanWingLabel(zoneShortName) : zoneShortName;

  return (
    <section className="xl:col-span-7 bento-card-cream rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309] flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            User Story #01 • Horário de Pico do Segmento
          </span>
          <h3 className="text-base font-extrabold text-[#111318] mt-0.5">
            {temDadoReal || medido
              ? `Movimento real por hora, hoje (${zoneTitle})`
              : `Fluxo Estimado de Clientes ao Longo do Dia (${zoneTitle})`}
          </h3>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${
            temDadoReal ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {temDadoReal
            ? 'Medido: câmera, Balcão e Concierge'
            : medido
              ? 'Sem dados reais desta ala hoje'
              : 'Estimativa: sem dados reais desta ala hoje'}
        </span>
      </div>

      {temDadoReal ? (
        <div className="pt-2 space-y-3">
          <div className="h-44 flex items-end justify-between gap-1 sm:gap-1.5 px-1 border-b border-stone-200 pb-2">
            {horasReais.map(({ hora, dados: d }) => {
              const resumo = `${hora}h: ${d.passaram} passaram, ${d.olharam} olharam, ${d.vendas} vendas, ${d.perdidas} perdidas, ${d.buscas} buscas`;
              const selecionada = hora === horaSelecionada;
              return (
                <button
                  key={hora}
                  type="button"
                  onClick={() => setHoraSelecionada(selecionada ? null : hora)}
                  className="flex-1 flex flex-col items-center justify-end h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded-md"
                  title={resumo}
                  aria-label={resumo}
                  aria-pressed={selecionada}
                >
                  <span className="text-[10px] font-bold mb-1 text-stone-500">
                    {d.passaram || ''}
                  </span>
                  <div
                    className={`w-full max-w-[28px] rounded-t-lg relative overflow-hidden transition-all duration-300 ${
                      selecionada
                        ? 'bg-[#111318]/45'
                        : 'bg-[#111318]/15 group-hover:bg-[#111318]/30'
                    }`}
                    style={{ height: `${Math.round((d.passaram / maxPassaram) * 100)}%` }}
                  >
                    <div
                      className="absolute bottom-0 inset-x-0 bg-[#E2A83B]"
                      style={{
                        height: `${d.passaram ? Math.round((d.olharam / d.passaram) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-between gap-1 sm:gap-1.5 px-1">
            {horasReais.map(({ hora, dados: d }) => (
              <span
                key={hora}
                className="flex-1 flex flex-col items-center gap-0.5 text-[10px] font-bold text-stone-400"
              >
                {hora}h
                <span className="flex gap-0.5 h-1.5" aria-hidden="true">
                  {d.vendas > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  {d.perdidas > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                </span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#111318]/15" />
              passaram
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#E2A83B]" />
              olharam a vitrine
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              venda concluída
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              venda perdida
            </span>
          </div>
          {horaDetalhe && (
            <p className="text-xs font-semibold text-[#111318] bg-[#FAF8F5] border border-stone-200 rounded-xl px-3 py-2">
              {horaDetalhe.hora}h às {horaDetalhe.hora + 1}h: {horaDetalhe.dados.passaram} passaram ·{' '}
              {horaDetalhe.dados.olharam} olharam
              {horaDetalhe.dados.passaram > 0 &&
                ` (${Math.round((horaDetalhe.dados.olharam / horaDetalhe.dados.passaram) * 100)}%)`}{' '}
              · {horaDetalhe.dados.vendas} vendas · {horaDetalhe.dados.perdidas} perdidas ·{' '}
              {horaDetalhe.dados.buscas} buscas no Concierge
            </p>
          )}
          {insights.length > 0 && (
            <ul className="space-y-1.5">
              {insights.map((texto) => (
                <li key={texto} className="text-xs text-stone-700 flex gap-2">
                  <span className="text-[#B45309] font-bold" aria-hidden="true">
                    →
                  </span>
                  {texto}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : medido ? (
        <p className="text-xs font-semibold text-stone-600 bg-[#FAF8F5] border border-dashed border-stone-300 rounded-2xl p-4">
          Nenhum movimento registrado hoje nesta ala. O gráfico aparece quando a câmera, o Balcão ou o Concierge registrarem algo.
        </p>
      ) : (
        <div className="pt-2">
          <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-2 px-1 border-b border-stone-200 pb-2">
            {HOURLY_PROFILE.map((bar) => {
              const isSelectedSlot = bar.slot === factors.timeSlot;
              const val = Math.round(maxHourlyFlow * bar.weight);
              const heightPct = Math.max(18, Math.round(bar.weight * 100));
              return (
                <button
                  key={bar.hour}
                  type="button"
                  onClick={() => {
                    onSelectBarWeight(bar.weight);
                    onChangeTimeSlot(bar.slot);
                  }}
                  className="flex-1 flex flex-col items-center justify-end h-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded-md"
                  title={`${bar.hour}: ~${val} pessoas/h`}
                >
                  <span
                    className={`text-[10px] font-bold mb-1 transition-opacity ${
                      isSelectedSlot
                        ? 'text-[#111318] opacity-100'
                        : 'text-stone-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {val}
                  </span>
                  <div
                    className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                      isSelectedSlot
                        ? 'bg-[#E2A83B] shadow-sm'
                        : 'bg-[#111318]/15 group-hover:bg-[#111318]/35'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </button>
              );
            })}
          </div>
          <div className="flex justify-between gap-1.5 sm:gap-2 px-1 pt-2">
            {HOURLY_PROFILE.map((bar) => (
              <span
                key={bar.hour}
                className={`flex-1 text-center text-[10px] font-bold ${
                  bar.slot === factors.timeSlot ? 'text-[#B45309]' : 'text-stone-400'
                }`}
              >
                {bar.hour}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resumo dos Turnos em Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {TIME_SLOTS.map((slot) => {
          const active = factors.timeSlot === slot.value;
          return (
            <button
              key={slot.value}
              type="button"
              onClick={() => onChangeTimeSlot(slot.value)}
              className={`px-3 py-2 rounded-xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] ${
                active
                  ? 'bg-[#111318] border-[#111318] text-white'
                  : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-stone-400'
              }`}
            >
              <span
                className={`text-[10px] font-bold block ${
                  active ? 'text-[#E2A83B]' : 'text-stone-400'
                }`}
              >
                {slot.range}
              </span>
              <span className="text-xs font-extrabold">{slot.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
