import React from 'react';
import { Clock, CloudRain, Lock, RefreshCw, Sun } from 'lucide-react';
import { LiveContextPayload } from '../../services/api';
import { ZoneLiveTelemetry } from '../../services/opportunityEngine';
import { ShopContextFactors, StoreTenant, ZoneId } from '../../types';
import { EVENT_OPTIONS, WEATHER_OPTIONS, cleanWingLabel } from './cockpitHelpers';

interface ContextSimulatorCardProps {
  zonesTelemetry: ZoneLiveTelemetry[];
  current: ZoneLiveTelemetry;
  onSelectZone: (zoneId: ZoneId) => void;
  factors: ShopContextFactors;
  onChangeFactors: (next: ShopContextFactors) => void;
  liveContext?: LiveContextPayload | null;
  isContextAuto?: boolean;
  isSyncingContext?: boolean;
  onSyncLiveContext?: () => void;
  activeTenant?: StoreTenant | null;
  lojaFixa?: string | null;
}

/** Painel de controles táteis para alternar ala monitorada, clima em Palmas e gatilho do shopping. */
export const ContextSimulatorCard: React.FC<ContextSimulatorCardProps> = ({
  zonesTelemetry,
  current,
  onSelectZone,
  factors,
  onChangeFactors,
  liveContext,
  isContextAuto = true,
  isSyncingContext = false,
  onSyncLiveContext,
  activeTenant,
  lojaFixa,
}) => {
  return (
    <section className="xl:col-span-5 bento-card-cream rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Contexto em Tempo Real &amp; Simulador
          </span>
          <h3 className="text-base font-extrabold text-[#111318] mt-0.5">
            Troque de Ala ou Condição do Shopping
          </h3>
        </div>
        {onSyncLiveContext && (
          <button
            type="button"
            onClick={onSyncLiveContext}
            disabled={isSyncingContext}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border inline-flex items-center gap-1.5 shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] ${
              isContextAuto && liveContext
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-stone-400'
            }`}
            title="Sincronizar clima de Palmas (Open-Meteo), feriados (BrasilAPI) e site oficial do Capim Dourado"
          >
            <RefreshCw
              className={`w-3 h-3 ${isSyncingContext ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>
              {isSyncingContext
                ? 'Sincronizando...'
                : isContextAuto && liveContext
                  ? 'Ao vivo'
                  : 'Voltar ao vivo'}
            </span>
          </button>
        )}
      </div>

      {liveContext && (
        <div className="rounded-2xl bg-[#FAF8F5] border border-stone-200 px-3.5 py-2.5 space-y-1.5 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-[#111318]">
              Palmas-TO:{' '}
              {liveContext.temperature_c !== null
                ? `${liveContext.temperature_c.toFixed(1)}°C`
                : 'Estimado'}{' '}
              • {liveContext.weather_description}
            </span>
            <span className="text-stone-500 font-semibold">
              {liveContext.sources.clima === 'open-meteo' ? 'Open-Meteo' : 'Local'} •{' '}
              {liveContext.cinema_movies_count > 0
                ? `${liveContext.cinema_movies_count} filmes Cinemark`
                : 'Calendário'}
            </span>
          </div>
          <p className="text-stone-600">
            <span className="font-semibold text-[#111318]">Gatilho detectado:</span>{' '}
            {liveContext.event_reason}
            {!isContextAuto && ' (modo simulação manual ativo)'}
          </p>
          {liveContext.active_events.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-stone-500 font-semibold mr-1">Eventos no site:</span>
              {liveContext.active_events.slice(0, 3).map((ev) => (
                <span
                  key={ev}
                  className="px-2 py-0.5 rounded-full bg-white border border-stone-200 text-[10px] font-bold text-[#111318]"
                >
                  {ev}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Seletor Tátil de Ala */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
          {activeTenant && <Lock className="w-3 h-3 text-[#7A4B0A]" aria-hidden="true" />}
          {activeTenant ? `Ala Isolada de ${activeTenant.storeName}` : 'Ala / Loja Monitorada'}
        </span>
        {lojaFixa ? (
          <p className="text-xs font-bold text-[#111318]">
            {lojaFixa} · {current.zone.shortName}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {zonesTelemetry.map((z) => {
              const active = z.zone.id === current.zone.id;
              return (
                <button
                  key={z.zone.id}
                  type="button"
                  onClick={() => onSelectZone(z.zone.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] ${
                    active
                      ? 'bg-[#111318] border-[#111318] text-[#E2A83B]'
                      : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  {activeTenant
                    ? `${activeTenant.storeName} • ${cleanWingLabel(z.zone.shortName)}`
                    : z.zone.shortName}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Clima em Palmas */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
          Clima Externo (Palmas-TO)
        </span>
        <div className="grid grid-cols-3 gap-2">
          {WEATHER_OPTIONS.map((w) => {
            const active = factors.weather === w.value;
            return (
              <button
                key={w.value}
                type="button"
                onClick={() => onChangeFactors({ ...factors, weather: w.value })}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] ${
                  active
                    ? 'bg-[#E2A83B] border-[#E2A83B] text-[#111318]'
                    : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-stone-400'
                }`}
              >
                {w.icon === 'sun' && <Sun className="w-3.5 h-3.5" aria-hidden="true" />}
                {w.icon === 'rain' && <CloudRain className="w-3.5 h-3.5" aria-hidden="true" />}
                {w.icon === 'mild' && <Clock className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{w.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Evento do Shopping */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
          Gatilho do Shopping
        </span>
        <div className="grid grid-cols-2 gap-2">
          {EVENT_OPTIONS.map((ev) => {
            const active = factors.mallEvent === ev.value;
            return (
              <button
                key={ev.value}
                type="button"
                onClick={() => onChangeFactors({ ...factors, mallEvent: ev.value })}
                className={`px-3 py-2 rounded-xl border text-xs font-bold text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] ${
                  active
                    ? 'bg-[#111318] border-[#111318] text-white'
                    : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-stone-400'
                }`}
              >
                {ev.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
