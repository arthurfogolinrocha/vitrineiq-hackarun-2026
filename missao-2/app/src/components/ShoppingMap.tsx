import React, { useState } from 'react';
import {
  ArrowRight,
  Box,
  Compass,
  Eye,
  Footprints,
  Layers,
  MapPin,
  Radar,
  Store,
  TrendingUp,
} from 'lucide-react';
import { CrossSegmentRoute, FloorId, ZoneId } from '../types';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import { LOST_SALE_LABELS } from '../data/shoppingData';
import { ShoppingMap3D } from './ShoppingMap3D';

interface ShoppingMapProps {
  floor: FloorId;
  onFloorChange: (floor: FloorId) => void;
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  routes: CrossSegmentRoute[];
}

export const ShoppingMap: React.FC<ShoppingMapProps> = ({
  floor,
  onFloorChange,
  zonesTelemetry,
  selectedZoneId,
  onSelectZone,
  routes,
}) => {
  const [renderMode, setRenderMode] = useState<'3d' | '2d'>('3d');

  const floorZones = zonesTelemetry.filter((item) => item.zone.floor === floor);
  const selected =
    zonesTelemetry.find((z) => z.zone.id === selectedZoneId) ??
    floorZones[0] ??
    zonesTelemetry[0];

  return (
    <div className="space-y-5">
      {/* Cabeçalho Editorial do Mapa */}
      <div className="bg-[#111318] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#E2A83B]">
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Gêmeo Digital 3D • Capim Dourado Shopping</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Explore Corredores em 3D, Dê Zoom nas Lojas e Suba ao 2º Piso
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Use o modo <strong className="text-white">Maquete 360°</strong> com scroll para zoom ou ative{' '}
            <strong className="text-[#E2A83B]">Entrar no Shopping (Street View)</strong> para caminhar em primeira pessoa pelas vitrines e trocar de andar.
          </p>
        </div>

        {/* Seletor 3D Real vs Planta 2D Técnica + Piso */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex bg-white/10 p-1 rounded-xl border border-white/10" role="group" aria-label="Modo de Visualização do Mapa">
            <button
              type="button"
              onClick={() => setRenderMode('3d')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                renderMode === '3d'
                  ? 'bg-[#E2A83B] text-[#111318] shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tour 3D Real</span>
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('2d')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                renderMode === '2d'
                  ? 'bg-white text-[#111318] shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Planta 2D Técnica</span>
            </button>
          </div>

          <div className="inline-flex bg-white/10 p-1 rounded-xl border border-white/10" role="group" aria-label="Pavimento">
            <button
              type="button"
              onClick={() => onFloorChange('L1')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                floor === 'L1'
                  ? 'bg-emerald-400 text-[#111318]'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Térreo (L1)
            </button>
            <button
              type="button"
              onClick={() => onFloorChange('L2')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                floor === 'L2'
                  ? 'bg-emerald-400 text-[#111318]'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              2º Piso (L2)
            </button>
          </div>
        </div>
      </div>

      {/* Palco Principal + Aside Bento */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Área do Mapa (8 cols) */}
        <div className="xl:col-span-8">
          {renderMode === '3d' ? (
            <ShoppingMap3D
              floor={floor}
              onFloorChange={onFloorChange}
              zonesTelemetry={zonesTelemetry}
              selectedZoneId={selectedZoneId}
              onSelectZone={onSelectZone}
            />
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-[#111318]">
                    Planta Esquemática — {floor === 'L1' ? 'Pavimento Térreo (L1)' : '2º Pavimento / Praça (L2)'}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-stone-500">
                  Clique sobre qualquer ala para atualizar o painel lateral
                </span>
              </div>

              <div className="rounded-xl bg-[#FAF8F5] border border-stone-200 p-3">
                <svg
                  viewBox="0 0 1000 520"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Planta técnica 2D do Capim Dourado Shopping"
                >
                  <rect x="20" y="20" width="960" height="480" rx="22" fill="#F1EDE6" stroke="#D6CFC2" strokeWidth="2" />
                  <rect x="44" y="218" width="912" height="84" rx="18" fill="#FFFFFF" stroke="#E5DEC9" strokeWidth="2" />
                  <text x="500" y="264" textAnchor="middle" className="text-[13px] font-bold fill-stone-400 tracking-widest">
                    EIXO PRINCIPAL DE CIRCULAÇÃO • CAPIM DOURADO ({floor})
                  </text>

                  {/* Zonas do Piso Selecionado */}
                  {floorZones.map((item) => {
                    const isSelected = item.zone.id === selectedZoneId;
                    const { x, y, w, h } = item.zone.mapRect;
                    const heatStroke =
                      item.opportunityScore >= 75
                        ? '#D97706'
                        : item.opportunityScore >= 45
                        ? '#2563EB'
                        : '#059669';

                    return (
                      <g
                        key={item.zone.id}
                        onClick={() => onSelectZone(item.zone.id)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          rx="16"
                          fill={isSelected ? '#111318' : '#FFFFFF'}
                          stroke={isSelected ? '#E2A83B' : heatStroke}
                          strokeWidth={isSelected ? 4 : 2.5}
                        />
                        <text
                          x={x + 16}
                          y={y + 30}
                          className={`text-[14px] font-extrabold ${
                            isSelected ? 'fill-[#E2A83B]' : 'fill-[#111318]'
                          }`}
                        >
                          {item.zone.shortName}
                        </text>
                        <text
                          x={x + 16}
                          y={y + 52}
                          className={`text-[12px] font-semibold ${
                            isSelected ? 'fill-stone-300' : 'fill-stone-500'
                          }`}
                        >
                          {item.zone.segment}
                        </text>
                        <rect
                          x={x + w - 76}
                          y={y + 14}
                          width="62"
                          height="28"
                          rx="14"
                          fill={heatStroke}
                        />
                        <text
                          x={x + w - 45}
                          y={y + 32}
                          textAnchor="middle"
                          className="text-[12px] font-extrabold fill-white"
                        >
                          IQ {item.opportunityScore}
                        </text>
                        <text
                          x={x + 16}
                          y={y + h - 18}
                          className={`text-[11px] font-bold ${
                            isSelected ? 'fill-emerald-300' : 'fill-emerald-700'
                          }`}
                        >
                          {item.footTraffic}/h fluxo • {item.vitrineStops} vitrines
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Aside: Raio-X da Loja/Ala Selecionada (4 cols) */}
        <aside className="xl:col-span-4 space-y-4">
          {/* Card Escuro Destacado da Ala Selecionada */}
          <div className="bg-[#111318] text-white rounded-2xl p-5 shadow-sm border border-white/10 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#E2A83B]">
                    {selected.zone.floor === 'L1' ? 'Térreo (L1)' : '2º Piso (L2)'} • {selected.zone.segment}
                  </span>
                  {selected.cameraFeedLinked && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                      Webcam ao Vivo
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-extrabold tracking-tight mt-1">
                  {selected.zone.name}
                </h3>
              </div>
              <div className="px-3 py-2 rounded-xl bg-[#E2A83B] text-[#111318] text-center shrink-0">
                <span className="block text-[9px] font-extrabold uppercase tracking-wider">Score IQ</span>
                <span className="text-xl font-black leading-none">{selected.opportunityScore}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="text-[10px] text-stone-400 flex items-center gap-1">
                  <Footprints className="w-3 h-3 text-sky-400" aria-hidden="true" /> Fluxo/h
                </span>
                <strong className="text-base font-extrabold text-white">{selected.footTraffic}</strong>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="text-[10px] text-stone-400 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-[#E2A83B]" aria-hidden="true" /> Vitrines
                </span>
                <strong className="text-base font-extrabold text-white">{selected.vitrineStops}</strong>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="text-[10px] text-stone-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" aria-hidden="true" /> Conversão
                </span>
                <strong className="text-base font-extrabold text-emerald-400">{selected.conversionRate}%</strong>
              </div>
            </div>

            {/* Lojas Âncoras da Ala */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                <Store className="w-3 h-3 text-[#E2A83B]" aria-hidden="true" /> Lojas & Âncoras Monitoradas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selected.zone.anchors.map((anchor) => (
                  <span
                    key={anchor}
                    className="px-2.5 py-1 rounded-lg bg-white/10 text-stone-100 text-[11px] font-semibold"
                  >
                    {anchor}
                  </span>
                ))}
              </div>
            </div>

            {/* Maior gargalo & Oportunidade */}
            <div className="rounded-xl bg-rose-500/15 border border-rose-400/25 p-3 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                Principal Gargalo Reportado no Balcão
              </span>
              <p className="font-semibold text-white">
                {LOST_SALE_LABELS[selected.dominantReason]} ({selected.lostSalesCount} perdas)
              </p>
            </div>

            {selected.zone.vacantSpacesCount > 0 && (
              <div className="rounded-xl bg-amber-500/15 border border-amber-400/30 p-3 text-xs text-amber-100">
                <strong className="block text-[#E2A83B] text-[10px] uppercase tracking-wider mb-0.5">
                  Expansão de Mix ({selected.zone.vacantSpacesCount} salas disponíveis)
                </strong>
                {selected.zone.vacantOpportunityHint}
              </div>
            )}
          </div>

          {/* Lista Rápida de Todas as Alas para Navegação Direta */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Radar className="w-3.5 h-3.5 text-[#111318]" aria-hidden="true" />
              Saltar para Ala no Mapa
            </span>
            <div className="space-y-1.5">
              {zonesTelemetry.map((z) => {
                const active = z.zone.id === selected.zone.id;
                return (
                  <button
                    key={z.zone.id}
                    type="button"
                    onClick={() => {
                      onFloorChange(z.zone.floor);
                      onSelectZone(z.zone.id);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                      active
                        ? 'bg-[#111318] border-[#111318] text-white'
                        : 'bg-[#FAF8F5] border-stone-200 text-[#111318] hover:border-stone-400'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">{z.zone.shortName}</span>
                      <span className={`text-[10px] ${active ? 'text-stone-300' : 'text-stone-500'}`}>
                        {z.zone.floor} • {z.footTraffic}/h fluxo
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                        active
                          ? 'bg-[#E2A83B] text-[#111318]'
                          : 'bg-white border border-stone-200 text-[#111318]'
                      }`}
                    >
                      {z.opportunityScore}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Fluxos Cross-Segment (Deslocamentos dentro do Shopping) */}
      <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
              Inteligência de Deslocamento Cross-Segment
            </span>
            <h3 className="text-base font-extrabold text-[#111318]">
              Rotas de Maior Potencial entre Corredores e Andares
            </h3>
          </div>
          <span className="text-xs font-medium text-stone-500">
            Baseado nas jornadas reais do mix do Capim Dourado
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routes.map((route) => (
            <div
              key={route.id}
              className="rounded-xl bg-[#FAF8F5] border border-stone-200 p-4 flex flex-col justify-between gap-3 hover:border-stone-300 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#111318] text-[#E2A83B] text-[11px] font-extrabold">
                    {route.sharePercent}% do fluxo migra
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#111318]">
                  <span className="truncate">{route.fromLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#B45309] shrink-0" aria-hidden="true" />
                  <span className="truncate">{route.toLabel}</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{route.insight}</p>
              </div>
              <div className="pt-2.5 border-t border-stone-200/80 text-[11px] text-[#111318] font-semibold">
                <span className="text-[10px] uppercase tracking-wider text-emerald-700 block mb-0.5">
                  Combo Sugerido:
                </span>
                {route.recommendedCombo}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
