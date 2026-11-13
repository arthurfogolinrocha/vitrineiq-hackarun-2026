import React from 'react';
import { Compass, Flame, MapPin, Store, TrendingUp } from 'lucide-react';
import {
  CrossSegmentRoute,
  FloorId,
  ShoppingZone,
  ZoneId,
} from '../types';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import { LOST_SALE_LABELS } from '../data/shoppingData';

interface ShoppingMapProps {
  floor: FloorId;
  onFloorChange: (floor: FloorId) => void;
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  routes: CrossSegmentRoute[];
}

function getHeatColors(score: number, isSelected: boolean) {
  if (score >= 70) {
    return {
      fill: isSelected ? 'rgba(245, 158, 11, 0.32)' : 'rgba(245, 158, 11, 0.16)',
      stroke: isSelected ? '#fbbf24' : '#d97706',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      label: 'Alta Demanda',
    };
  }
  if (score >= 45) {
    return {
      fill: isSelected ? 'rgba(16, 185, 129, 0.30)' : 'rgba(16, 185, 129, 0.14)',
      stroke: isSelected ? '#34d399' : '#059669',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      label: 'Oportunidade Ativa',
    };
  }
  return {
    fill: isSelected ? 'rgba(56, 189, 248, 0.30)' : 'rgba(56, 189, 248, 0.12)',
    stroke: isSelected ? '#38bdf8' : '#0284c7',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    label: 'Fluxo Estável',
  };
}

export const ShoppingMap: React.FC<ShoppingMapProps> = ({
  floor,
  onFloorChange,
  zonesTelemetry,
  selectedZoneId,
  onSelectZone,
  routes,
}) => {
  const floorZones = zonesTelemetry.filter((t) => t.zone.floor === floor);
  const selectedTelemetry =
    zonesTelemetry.find((t) => t.zone.id === selectedZoneId) || zonesTelemetry[0];

  const handleZonePick = (zone: ShoppingZone) => {
    if (zone.floor !== floor) {
      onFloorChange(zone.floor);
    }
    onSelectZone(zone.id);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Mapa + Troca de Pavimento */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400" aria-hidden="true" />
              Mapa de Calor &amp; Rotas — Capim Dourado Shopping
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Planta esquemática inspirada nos 2 pavimentos oficiais (38.800 m²) com telemetria anônima por ala (LGPD).
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800" role="group" aria-label="Selecionar pavimento do shopping">
            <button
              type="button"
              onClick={() => {
                onFloorChange('L1');
                if (selectedTelemetry.zone.floor !== 'L1') {
                  onSelectZone('ala-central-ancoras');
                }
              }}
              aria-pressed={floor === 'L1'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                floor === 'L1'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              1º Pavimento — Térreo
            </button>
            <button
              type="button"
              onClick={() => {
                onFloorChange('L2');
                onSelectZone('praca-alimentacao-l2');
              }}
              aria-pressed={floor === 'L2'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                floor === 'L2'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              2º Pavimento — Alimentação
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Planta Esquemática Interativa */}
          <div className="xl:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
              <span>Av. JK (Oeste) ↔ Av. LO 2A (Leste) • Av. NS-05 (Sul)</span>
              <span className="font-mono text-emerald-400">Dados Anônimos em Tempo Real</span>
            </div>

            <svg
              viewBox="0 0 1000 500"
              role="img"
              aria-label={`Planta interativa do ${floor === 'L1' ? '1º Pavimento Térreo' : '2º Pavimento Praça de Alimentação'} do Capim Dourado Shopping`}
              className="w-full h-auto rounded-xl bg-slate-900/60 border border-slate-800/80"
            >
              <title>Mapa Esquemático de Fluxo e Oportunidades — Capim Dourado Shopping</title>
              {/* Contorno arquitetônico estilizado do Shopping */}
              <path
                d="M 40 215 L 300 120 L 630 85 L 955 70 L 955 455 L 630 460 L 310 465 L 40 430 Z"
                fill="rgba(15, 23, 42, 0.85)"
                stroke="#334155"
                strokeWidth="2.5"
              />

              {/* Corredor Principal L1 */}
              {floor === 'L1' && (
                <>
                  <path
                    d="M 110 330 Q 460 315 800 280"
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.25)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray="10 10"
                  />
                  {/* Rótulos de Avenidas */}
                  <text x="22" y="330" fill="#64748b" fontSize="11" transform="rotate(-90 22 330)">
                    AVENIDA JK
                  </text>
                  <text x="450" y="488" fill="#64748b" fontSize="11">
                    AVENIDA NS-05
                  </text>
                  <text x="975" y="300" fill="#64748b" fontSize="11" transform="rotate(-90 975 300)">
                    AVENIDA LO 2A
                  </text>
                </>
              )}

              {/* Desenho das Zonas do Pavimento Atual */}
              {floorZones.map((telemetry) => {
                const { zone, opportunityScore, footTraffic } = telemetry;
                const isSelected = zone.id === selectedZoneId;
                const colors = getHeatColors(opportunityScore, isSelected);
                const { x, y, w, h } = zone.mapRect;

                return (
                  <g
                    key={zone.id}
                    onClick={() => handleZonePick(zone)}
                    className="cursor-pointer transition-opacity hover:opacity-95"
                  >
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={14}
                      fill={colors.fill}
                      stroke={colors.stroke}
                      strokeWidth={isSelected ? 3.5 : 2}
                    />
                    <text
                      x={x + 16}
                      y={y + 30}
                      fill="#f8fafc"
                      fontSize="15"
                      fontWeight="700"
                    >
                      {zone.shortName}
                    </text>
                    <text x={x + 16} y={y + 52} fill="#cbd5e1" fontSize="12">
                      {zone.anchors.slice(0, 3).join(' • ')}
                    </text>
                    <text
                      x={x + 16}
                      y={y + h - 22}
                      fill="#34d399"
                      fontSize="13"
                      fontWeight="700"
                    >
                      Score IQ: {opportunityScore} • Fluxo/h: {footTraffic}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Controles acessíveis por teclado para selecionar cada ala */}
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Atalhos acessíveis das alas do shopping">
              {zonesTelemetry.map((telemetry) => {
                const isSelected = telemetry.zone.id === selectedZoneId;
                const colors = getHeatColors(telemetry.opportunityScore, isSelected);
                return (
                  <button
                    key={telemetry.zone.id}
                    type="button"
                    onClick={() => handleZonePick(telemetry.zone)}
                    aria-pressed={isSelected}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center gap-2 ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400 text-white shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span>{telemetry.zone.shortName}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded border ${colors.badgeClass}`}>
                      {telemetry.opportunityScore}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalhes da Zona Selecionada + Espaços Vagos */}
          <aside className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {selectedTelemetry.zone.floor === 'L1' ? '1º Pavimento (Térreo)' : '2º Pavimento'}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {selectedTelemetry.zone.name}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedTelemetry.zone.segment}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                  IQ {selectedTelemetry.opportunityScore}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Fluxo/hora</span>
                  <strong className="text-lg text-white">{selectedTelemetry.footTraffic}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Paradas Vitrine</span>
                  <strong className="text-lg text-emerald-400">{selectedTelemetry.vitrineStops}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Buscas QR</span>
                  <strong className="text-lg text-sky-400">{selectedTelemetry.qrSearchCount}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Vendas Perdidas</span>
                  <strong className="text-lg text-rose-400">{selectedTelemetry.lostSalesCount}</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                  <Flame className="w-4 h-4" aria-hidden="true" />
                  Maior Gargalo Atual:
                </div>
                <p className="text-slate-200">{LOST_SALE_LABELS[selectedTelemetry.dominantReason]}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                  <Store className="w-4 h-4" aria-hidden="true" />
                  Oportunidade em {selectedTelemetry.zone.vacantSpacesCount} Espaço(s) Vago(s) da Planta:
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {selectedTelemetry.zone.vacantOpportunityHint}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Âncoras mapeadas: <span className="text-slate-200">{selectedTelemetry.zone.anchors.join(', ')}</span>
            </div>
          </aside>
        </div>
      </div>

      {/* Rotas Cross-Segmentos */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          Fluxo &amp; Rotas Quentes Entre Segmentos (Inédito no Mercado)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routes.map((route) => (
            <article
              key={route.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sky-300">
                  {route.fromLabel} → {route.toLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                  {route.sharePercent}%
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">{route.insight}</p>
              <div className="pt-2 border-t border-slate-800/80 text-amber-300 font-medium">
                Combo IA: {route.recommendedCombo}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

