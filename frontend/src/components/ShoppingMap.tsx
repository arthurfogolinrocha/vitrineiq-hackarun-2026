import React, { Suspense, lazy, useCallback, useMemo, useState } from 'react';
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
import { CrossSegmentRoute, FlashCampaign, FloorId, StoreTenant, ZoneId } from '../types';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import { LOST_SALE_LABELS } from '../data/shoppingData';
import { StoreAvatar } from './StoreAvatar';

const ShoppingMap3D = lazy(() =>
  import('./ShoppingMap3D').then((m) => ({ default: m.ShoppingMap3D }))
);

const L1_SVG_ZONES: ReadonlyArray<{
  id: ZoneId;
  title: string;
  sub: string;
  x: number;
  y: number;
  w: number;
  h: number;
}> = [
  {
    id: 'ala-sul-esporte',
    title: 'Ala Sul (Curva JK)',
    sub: 'Renner • Centauro • PF • Stilo A',
    x: 84,
    y: 342,
    w: 225,
    h: 102,
  },
  {
    id: 'alameda-gourmet',
    title: 'Alameda Gourmet (P1)',
    sub: 'Outback • Madero • Marisa • Camicado',
    x: 325,
    y: 342,
    w: 265,
    h: 102,
  },
  {
    id: 'ala-central-ancoras',
    title: 'Ala Central (P2 / P3)',
    sub: 'C&A • Riachuelo • Leitura • Polo Wear',
    x: 185,
    y: 178,
    w: 410,
    h: 112,
  },
  {
    id: 'ala-lazer-cinema',
    title: 'Ala Norte PC (LO-2A)',
    sub: 'Cinemark • Big • Super Big • WoW • Morofit',
    x: 654,
    y: 52,
    w: 268,
    h: 392,
  },
];

const FLOOR_LABELS: Record<FloorId, string> = {
  L1: 'Térreo (L1)',
  L2: '2º Piso (L2)',
  SS1: 'Subsolo (SS1)',
};

interface ShoppingMapProps {
  floor: FloorId;
  onFloorChange: (floor: FloorId) => void;
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  routes: CrossSegmentRoute[];
  selectedStoreName?: string | null;
  onSelectStoreName?: (name: string | null) => void;
  campaigns?: FlashCampaign[];
  activeTenant?: StoreTenant | null;
}

export const ShoppingMap: React.FC<ShoppingMapProps> = ({
  floor,
  onFloorChange,
  zonesTelemetry,
  selectedZoneId,
  onSelectZone,
  routes,
  selectedStoreName,
  onSelectStoreName,
  campaigns,
  activeTenant,
}) => {
  const [renderMode, setRenderMode] = useState<'3d' | '2d'>('3d');

  const zoneById = useMemo(() => {
    const map = new Map<ZoneId, ZoneLiveTelemetry>();
    for (const item of zonesTelemetry) {
      map.set(item.zone.id, item);
    }
    return map;
  }, [zonesTelemetry]);

  const floorZones = useMemo(
    () => zonesTelemetry.filter((item) => item.zone.floor === floor),
    [zonesTelemetry, floor]
  );

  const selected = useMemo(
    () => zoneById.get(selectedZoneId) ?? floorZones[0] ?? zonesTelemetry[0],
    [zoneById, selectedZoneId, floorZones, zonesTelemetry]
  );

  const selectedStoreNormalized = useMemo(
    () => selectedStoreName?.trim().toLowerCase() ?? '',
    [selectedStoreName]
  );

  const handleSetMode3D = useCallback(() => setRenderMode('3d'), []);
  const handleSetMode2D = useCallback(() => setRenderMode('2d'), []);
  const handleFloorL1 = useCallback(() => onFloorChange('L1'), [onFloorChange]);
  const handleFloorL2 = useCallback(() => onFloorChange('L2'), [onFloorChange]);
  const handleFloorSS1 = useCallback(() => onFloorChange('SS1'), [onFloorChange]);
  const handleClearStore = useCallback(() => onSelectStoreName?.(null), [onSelectStoreName]);
  const handleFocusActiveTenant = useCallback(() => {
    if (activeTenant) {
      onSelectStoreName?.(activeTenant.storeName);
    }
  }, [activeTenant, onSelectStoreName]);
  const handleJumpToZone = useCallback(
    (zoneFloor: FloorId, zoneId: ZoneId) => {
      onFloorChange(zoneFloor);
      onSelectZone(zoneId);
    },
    [onFloorChange, onSelectZone]
  );
  const handleSvgZoneKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGGElement>, zoneId: ZoneId) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectZone(zoneId);
      }
    },
    [onSelectZone]
  );

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
            Explore Corredores em 3D, Busque Lojas e Suba ao 2º Piso
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Use a <strong className="text-white">Maquete 3D</strong> (com atalhos de setor, Raio-X Subsolo e Tour Guiado) ou ative{' '}
            <strong className="text-[#E2A83B]">Street View</strong> para caminhar pelas vitrines e trocar de andar.
          </p>
        </div>

        {/* Seletor 3D Real vs Planta 2D Técnica + Piso */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="inline-flex bg-white/10 p-1 rounded-xl border border-white/10" role="group" aria-label="Modo de Visualização do Mapa">
            <button
              type="button"
              aria-pressed={renderMode === '3d'}
              onClick={handleSetMode3D}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
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
              aria-pressed={renderMode === '2d'}
              onClick={handleSetMode2D}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                renderMode === '2d'
                  ? 'bg-white text-[#111318] shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Planta 2D Técnica</span>
            </button>
          </div>

          <div className="inline-flex flex-wrap bg-white/10 p-1 rounded-xl border border-white/10" role="group" aria-label="Pavimento">
            <button
              type="button"
              aria-pressed={floor === 'L1'}
              onClick={handleFloorL1}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                floor === 'L1'
                  ? 'bg-emerald-400 text-[#111318]'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Térreo (L1)
            </button>
            <button
              type="button"
              aria-pressed={floor === 'L2'}
              onClick={handleFloorL2}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                floor === 'L2'
                  ? 'bg-emerald-400 text-[#111318]'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              2º Piso (L2)
            </button>
            <button
              type="button"
              aria-pressed={floor === 'SS1'}
              onClick={handleFloorSS1}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                floor === 'SS1'
                  ? 'bg-emerald-400 text-[#111318]'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Subsolo (356 Vagas)
            </button>
          </div>
        </div>
      </div>

      {/* Palco Principal + Aside Bento */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Área do Mapa (8 cols) */}
        <div className="xl:col-span-8">
          {renderMode === '3d' ? (
            <Suspense
              fallback={
                <div className="h-[500px] sm:h-[580px] rounded-2xl bg-[#080B10] border border-[#E2A83B]/30 flex items-center justify-center p-6 text-center text-xs font-bold tracking-wider uppercase text-[#E2A83B]">
                  Inicializando Maquete 3D Obsidian • Capim Dourado...
                </div>
              }
            >
              <ShoppingMap3D
                floor={floor}
                onFloorChange={onFloorChange}
                zonesTelemetry={zonesTelemetry}
                selectedZoneId={selectedZoneId}
                onSelectZone={onSelectZone}
                selectedStoreName={selectedStoreName}
                onSelectStoreName={onSelectStoreName}
                routes={routes}
                campaigns={campaigns}
                activeTenant={activeTenant}
              />
            </Suspense>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-[#111318]">
                    Planta Esquemática — {floor === 'L1' ? 'Pavimento Térreo (L1)' : floor === 'L2' ? '2º Pavimento / Praça (L2)' : 'Subsolo 1 & 2 (356 Vagas)'}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-stone-500">
                  Clique sobre qualquer ala para atualizar o painel lateral
                </span>
              </div>

              {selectedStoreName && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs shadow-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#B45309] shrink-0" aria-hidden="true" />
                    <span>
                      Loja em Foco: <strong>{selectedStoreName}</strong> ({floor === 'L1' ? 'Térreo L1' : floor === 'L2' ? '2º Piso L2' : 'Subsolo SS1'}) — Ala {selected.zone.shortName}
                    </span>
                  </div>
                  {onSelectStoreName && (
                    <button
                      type="button"
                      onClick={handleClearStore}
                      className="text-[11px] font-bold text-stone-600 hover:text-stone-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded"
                    >
                      Limpar Foco
                    </button>
                  )}
                </div>
              )}

              <div className="rounded-xl bg-[#FAF8F5] border border-stone-200 p-3">
                <svg
                  viewBox="0 0 1000 540"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Planta técnica 2D fiel à Planta Mix do Capim Dourado Shopping"
                >
                  {/* Vias Reais do Entorno */}
                  <rect x="20" y="480" width="960" height="32" rx="6" fill="#334155" />
                  <line x1="60" y1="496" x2="940" y2="496" stroke="#FACC15" strokeWidth="2.5" strokeDasharray="14 10" />
                  <circle cx="48" cy="496" r="22" fill="#334155" />
                  <circle cx="48" cy="496" r="10" fill="#10B981" />
                  <circle cx="952" cy="496" r="22" fill="#334155" />
                  <circle cx="952" cy="496" r="10" fill="#10B981" />
                  <text x="500" y="501" textAnchor="middle" className="text-[11px] font-bold fill-white tracking-widest">
                    AV. NS-05 (FACHADA LESTE) • PORTARIA P1 • 2 ROTATÓRIAS
                  </text>

                  <rect x="18" y="28" width="28" height="450" rx="6" fill="#334155" />
                  <text x="32" y="255" textAnchor="middle" transform="rotate(-90 32 255)" className="text-[10px] font-bold fill-amber-300 tracking-wider">
                    AV. JK (SUL) • CURVA RENNER / L2
                  </text>

                  <rect x="954" y="28" width="28" height="450" rx="6" fill="#334155" />
                  <text x="968" y="255" textAnchor="middle" transform="rotate(90 968 255)" className="text-[10px] font-bold fill-sky-300 tracking-wider">
                    AV. LO-2A (NORTE) • CINEMARK ↔ MOROFIT
                  </text>

                  {/* Contorno Real da Planta Mix (Curva JK à esquerda + Corpo Central + Braço Norte PC) */}
                  <path
                    d="M 150 458 Q 62 452 62 310 Q 62 180 185 162 L 620 162 L 642 36 L 936 36 L 936 458 L 560 458 Q 490 426 420 458 Z"
                    fill="#EFEBE3"
                    stroke="#C7BEB0"
                    strokeWidth="2.5"
                  />

                  {/* Subsolo 1 & 2 Indicador no Fundo Oeste */}
                  <rect x="330" y="38" width="275" height="92" rx="14" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.8" strokeDasharray="6 4" />
                  <text x="468" y="68" textAnchor="middle" className="text-[12px] font-extrabold fill-sky-900">
                    ESTAC. OESTE + SUBSOLOS 1 &amp; 2 (356 VAGAS)
                  </text>
                  <text x="468" y="90" textAnchor="middle" className="text-[10px] font-semibold fill-sky-700">
                    3 Esteiras Rolantes → Super Big • Zig Zag • Morofit
                  </text>
                  <text x="468" y="110" textAnchor="middle" className="text-[10px] font-bold fill-emerald-700">
                    Portarias P2 &amp; P3 + Motos/Bicicletário NE
                  </text>

                  {/* Corredor Principal L1 */}
                  <path
                    d="M 120 310 L 665 310 L 795 310 L 795 85"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="22"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {floor === 'L1' && (
                    <text x="440" y="314" textAnchor="middle" className="text-[11px] font-bold fill-stone-400 tracking-widest">
                      EIXO PRINCIPAL • PRAÇA OVAL • CORREDOR PC (L1)
                    </text>
                  )}

                  {floor === 'L1' ? (
                    /* Cartões proporcionais das 4 Alas do Térreo (sem vazamento de texto!) */
                    L1_SVG_ZONES.map((box) => {
                      const item = zoneById.get(box.id);
                      if (!item) return null;
                      const isSelected = item.zone.id === selectedZoneId;
                      const heatStroke =
                        item.opportunityScore >= 75
                          ? '#D97706'
                          : item.opportunityScore >= 45
                          ? '#2563EB'
                          : '#059669';

                      return (
                        <g
                          key={item.zone.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Selecionar ${box.title} — IQ ${item.opportunityScore}`}
                          aria-pressed={isSelected}
                          onClick={() => onSelectZone(item.zone.id)}
                          onKeyDown={(e) => handleSvgZoneKeyDown(e, item.zone.id)}
                          className="cursor-pointer focus:outline-none"
                        >
                          <rect
                            x={box.x}
                            y={box.y}
                            width={box.w}
                            height={box.h}
                            rx="14"
                            fill={isSelected ? '#111318' : '#FFFFFF'}
                            stroke={isSelected ? '#E2A83B' : heatStroke}
                            strokeWidth={isSelected ? 4 : 2.2}
                          />
                          <text
                            x={box.x + 14}
                            y={box.y + 28}
                            className={`text-[13px] font-extrabold ${
                              isSelected ? 'fill-[#E2A83B]' : 'fill-[#111318]'
                            }`}
                          >
                            {box.title}
                          </text>
                          <text
                            x={box.x + 14}
                            y={box.y + 50}
                            className={`text-[10.5px] font-semibold ${
                              isSelected ? 'fill-stone-300' : 'fill-stone-500'
                            }`}
                          >
                            {box.sub}
                          </text>
                          <rect
                            x={box.x + box.w - 72}
                            y={box.y + 12}
                            width="60"
                            height="24"
                            rx="12"
                            fill={heatStroke}
                          />
                          <text
                            x={box.x + box.w - 42}
                            y={box.y + 28}
                            textAnchor="middle"
                            className="text-[11px] font-extrabold fill-white"
                          >
                            IQ {item.opportunityScore}
                          </text>
                          <text
                            x={box.x + 14}
                            y={box.y + box.h - 14}
                            className={`text-[11px] font-bold ${
                              isSelected ? 'fill-emerald-300' : 'fill-emerald-700'
                            }`}
                          >
                            {item.footTraffic}/h fluxo • {item.vitrineStops} vitrines
                          </text>
                        </g>
                      );
                    })
                  ) : floor === 'L2' ? (
                    /* 2º Piso Real: Praça de Alimentação Curva JK + Colégio Interação A8 + Unicesumar IOA */
                    <g>
                      {(() => {
                        const l2Item = zoneById.get('praca-alimentacao-l2');
                        const isSelected = l2Item?.zone.id === selectedZoneId;
                        const heatStroke = (l2Item?.opportunityScore ?? 70) >= 75 ? '#D97706' : '#059669';
                        return (
                          <g
                            role="button"
                            tabIndex={0}
                            aria-label="Selecionar Praça de Alimentação L2 (Curva JK)"
                            aria-pressed={isSelected}
                            onClick={() => l2Item && onSelectZone(l2Item.zone.id)}
                            onKeyDown={(e) => l2Item && handleSvgZoneKeyDown(e, l2Item.zone.id)}
                            className="cursor-pointer focus:outline-none"
                          >
                            <path
                              d="M 88 210 Q 52 310 88 415 L 365 415 Q 410 310 365 210 Z"
                              fill={isSelected ? '#111318' : '#FEFCE8'}
                              stroke={isSelected ? '#E2A83B' : heatStroke}
                              strokeWidth={isSelected ? 4 : 2.5}
                            />
                            <text
                              x="220"
                              y="246"
                              textAnchor="middle"
                              className={`text-[14px] font-extrabold ${
                                isSelected ? 'fill-[#E2A83B]' : 'fill-[#111318]'
                              }`}
                            >
                              Praça de Alimentação L2 (Curva JK)
                            </text>
                            <text
                              x="220"
                              y="272"
                              textAnchor="middle"
                              className={`text-[11px] font-semibold ${
                                isSelected ? 'fill-stone-300' : 'fill-stone-600'
                              }`}
                            >
                              McDonald's • Spoletto • Pizza Hut • Divino Fogão
                            </text>
                            <text
                              x="220"
                              y="294"
                              textAnchor="middle"
                              className={`text-[11px] font-semibold ${
                                isSelected ? 'fill-stone-300' : 'fill-stone-600'
                              }`}
                            >
                              Mundo Imersivo • Kin Sui • Giraffas • Subway
                            </text>
                            <text
                              x="220"
                              y="322"
                              textAnchor="middle"
                              className="text-[11px] font-extrabold fill-rose-600"
                            >
                              Vagas Reais: Loja 203 (58 m²) &amp; Loja 205 (35 m²)
                            </text>
                            {l2Item && (
                              <text
                                x="220"
                                y="388"
                                textAnchor="middle"
                                className={`text-[12px] font-extrabold ${
                                  isSelected ? 'fill-emerald-300' : 'fill-emerald-700'
                                }`}
                              >
                                IQ {l2Item.opportunityScore} • {l2Item.footTraffic}/h fluxo • {l2Item.vitrineStops} vitrines
                              </text>
                            )}
                          </g>
                        );
                      })()}

                      <rect x="445" y="195" width="165" height="92" rx="12" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" />
                      <text x="527" y="236" textAnchor="middle" className="text-[12px] font-extrabold fill-sky-900">
                        UNICESUMAR • IOA
                      </text>
                      <text x="527" y="256" textAnchor="middle" className="text-[10px] font-semibold fill-sky-700">
                        L202 • 1.133 m² (2º Piso)
                      </text>

                      <rect x="430" y="340" width="185" height="86" rx="12" fill="#FEF9C3" stroke="#CA8A04" strokeWidth="2" />
                      <text x="522" y="380" textAnchor="middle" className="text-[12px] font-extrabold fill-amber-900">
                        COLÉGIO INTERAÇÃO
                      </text>
                      <text x="522" y="400" textAnchor="middle" className="text-[10px] font-semibold fill-amber-700">
                        Bloco A8 • 950 m² (2º Piso)
                      </text>
                    </g>
                  ) : (
                    /* Subsolo Técnico: 356 Vagas (SS1 140 v. + SS2 216 v.) + 3 Esteiras + Maria Express */
                    <g>
                      <rect x="120" y="150" width="760" height="275" rx="16" fill="#0F172A" stroke="#0284C7" strokeWidth="3" />
                      
                      {/* Vagas SS1 e SS2 */}
                      <rect x="150" y="175" width="340" height="225" rx="12" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" strokeDasharray="6 4" />
                      <text x="320" y="210" textAnchor="middle" className="text-[14px] font-black fill-[#38BDF8]">
                        SUBSOLO 1 — 140 VAGAS COBERTAS
                      </text>
                      <text x="320" y="235" textAnchor="middle" className="text-[11px] font-semibold fill-slate-300">
                        Motos, Bicicletário NE &amp; Acesso Portaria P2 / P3
                      </text>
                      <text x="320" y="260" textAnchor="middle" className="text-[11px] font-bold fill-emerald-400">
                        3 Esteiras Rolantes Diretas para L1 (Super Big / Zig Zag)
                      </text>

                      {/* Operação Comercial SS1: Maria Express */}
                      <g
                        role="button"
                        tabIndex={0}
                        aria-label="Selecionar Maria Express (SS1) — Ala Norte"
                        onClick={() => onSelectZone('ala-lazer-cinema')}
                        onKeyDown={(e) => handleSvgZoneKeyDown(e, 'ala-lazer-cinema')}
                        className="cursor-pointer focus:outline-none"
                      >
                        <rect x="180" y="285" width="280" height="95" rx="10" fill="#FEF3C7" stroke="#D97706" strokeWidth="2" />
                        <text x="320" y="318" textAnchor="middle" className="text-[12px] font-extrabold fill-amber-900">
                          MARIA EXPRESS (SS1) • QSUB1 (51 m²)
                        </text>
                        <text x="320" y="340" textAnchor="middle" className="text-[10px] font-semibold fill-amber-700">
                          Operação Ativa de Alimentação &amp; Conveniência
                        </text>
                        <text x="320" y="362" textAnchor="middle" className="text-[10px] font-bold fill-emerald-800">
                          Subsolo 1 • Conexão Direta Super Big
                        </text>
                      </g>

                      {/* Subsolo 2 */}
                      <rect x="520" y="175" width="330" height="225" rx="12" fill="#1E293B" stroke="#818CF8" strokeWidth="2" strokeDasharray="6 4" />
                      <text x="685" y="210" textAnchor="middle" className="text-[14px] font-black fill-[#818CF8]">
                        SUBSOLO 2 — 216 VAGAS COBERTAS
                      </text>
                      <text x="685" y="235" textAnchor="middle" className="text-[11px] font-semibold fill-slate-300">
                        G2 Coberto • Elevadores Panorâmicos L1 / L2
                      </text>
                      <text x="685" y="260" textAnchor="middle" className="text-[11px] font-bold fill-amber-400">
                        Vagas PNE, Gestantes, Idosos e Neurodiverso
                      </text>
                      <text x="685" y="315" textAnchor="middle" className="text-[12px] font-black fill-emerald-300">
                        Total Geral Subsolo: 356 Vagas Monitoradas
                      </text>
                      <text x="685" y="340" textAnchor="middle" className="text-[10px] font-semibold fill-slate-400">
                        Sensores de Ocupação &amp; Iluminação LED Inteligente
                      </text>
                    </g>
                  )}

                  {/* Selo P1 na Base */}
                  <rect x="435" y="446" width="110" height="24" rx="8" fill="#065F46" />
                  <text x="490" y="462" textAnchor="middle" className="text-[10px] font-extrabold fill-white">
                    🚪 PORTARIA P1
                  </text>
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Aside: Raio-X da Loja/Ala Selecionada (4 cols) */}
        <aside className="xl:col-span-4 space-y-4">
          {/* Card Escuro Destacado da Ala Selecionada */}
          <div className="bg-[#111318] text-white rounded-2xl p-5 shadow-sm border border-white/10 space-y-4">
            {activeTenant && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-[#E2A83B]/35">
                <div className="flex items-center gap-3 min-w-0">
                  <StoreAvatar
                    storeName={activeTenant.storeName}
                    logoUrl={activeTenant.logoUrl}
                    sizeClass="w-12 h-12"
                    roundedClass="rounded-xl"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E2A83B] block">
                      Operação em Foco
                    </span>
                    <h4 className="text-sm font-extrabold text-white truncate">
                      {activeTenant.storeName}
                    </h4>
                    <span className="text-[11px] text-stone-300 block truncate">
                      {activeTenant.floorLabel}
                    </span>
                  </div>
                </div>
                {onSelectStoreName && (
                  <button
                    type="button"
                    onClick={handleFocusActiveTenant}
                    className="px-2.5 py-1.5 rounded-lg bg-[#E2A83B]/20 hover:bg-[#E2A83B] text-[#E2A83B] hover:text-[#111318] text-[10px] font-extrabold border border-[#E2A83B]/40 transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B]"
                  >
                    Focar 3D
                  </button>
                )}
              </div>
            )}

            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#E2A83B]">
                    {FLOOR_LABELS[selected.zone.floor]} • {selected.zone.segment}
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
                {selected.zone.anchors.map((anchor) => {
                  const isMatch =
                    selectedStoreNormalized.length > 0 &&
                    anchor.toLowerCase().includes(selectedStoreNormalized);
                  return (
                    <span
                      key={anchor}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        isMatch
                          ? 'bg-[#E2A83B] text-[#111318] font-black shadow-md ring-2 ring-amber-300'
                          : 'bg-white/10 text-stone-100'
                      }`}
                    >
                      {isMatch ? `🎯 ${anchor}` : anchor}
                    </span>
                  );
                })}
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
                    aria-pressed={active}
                    onClick={() => handleJumpToZone(z.zone.floor, z.zone.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
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
