import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  Eye,
  Footprints,
  MapPin,
  Moon,
  MoveDown,
  MoveUp,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { FloorId } from '../../types';
import type { ZoneLiveTelemetry } from '../../services/opportunityEngine';
import {
  CAMERA_PRESETS,
  GUIDED_TOUR_STOPS,
  type SegmentFilter,
} from '../../data/capimDourado3DLayout';
import {
  type SearchHit,
  SEGMENT_FILTER_OPTIONS,
  type VisualTheme,
} from './map3dConfig';

export interface Map3DHudOverlayProps {
  floor: FloorId;
  activeZone: ZoneLiveTelemetry | undefined;
  visualTheme: VisualTheme;
  onToggleTheme: () => void;
  viewMode: 'orbit' | 'walk';
  onToggleViewMode: (mode: 'orbit' | 'walk') => void;
  showSubsoloXray: boolean;
  onToggleSubsoloXray: () => void;
  tourActive: boolean;
  onToggleTour: () => void;
  tourStepIndex: number;
  onNextTourStep: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  searchResults: SearchHit[];
  onPickSearchItem: (item: SearchHit) => void;
  selectedStore: SearchHit | null;
  onCloseSelectedStore: () => void;
  activeSegment: SegmentFilter;
  onSelectSegment: (seg: SegmentFilter) => void;
  onSelectPreset: (preset: (typeof CAMERA_PRESETS)[number]) => void;
  onSwitchFloor: (nextFloor: FloorId) => void;
  onZoom: (factor: number) => void;
  onResetCamera: () => void;
  onNudgeWalk: (forward: number, strafe: number, turnYaw: number) => void;
}

const HUD_GLASS_CLASS =
  'bg-[#0B0D12]/80 backdrop-blur-xl border border-[#E2A83B]/30 text-white shadow-2xl';

/**
 * Camada HUD sobreposta ao canvas WebGL do Mapa 3D: barra superior de telemetria e busca,
 * controles de tema/Raio-X/zoom, card da loja selecionada, tour guiado e joypad Street View.
 */
export const Map3DHudOverlay: React.FC<Map3DHudOverlayProps> = ({
  floor,
  activeZone,
  visualTheme,
  onToggleTheme,
  viewMode,
  onToggleViewMode,
  showSubsoloXray,
  onToggleSubsoloXray,
  tourActive,
  onToggleTour,
  tourStepIndex,
  onNextTourStep,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  onPickSearchItem,
  selectedStore,
  onCloseSelectedStore,
  activeSegment,
  onSelectSegment,
  onSelectPreset,
  onSwitchFloor,
  onZoom,
  onResetCamera,
  onNudgeWalk,
}) => {
  const currentTourStop = GUIDED_TOUR_STOPS[tourStepIndex];
  const isObsidianTheme = visualTheme === 'obsidian';
  const telemetryPillText = `PISO ${floor} • IQ ${activeZone?.opportunityScore ?? '--'} • ${
    isObsidianTheme ? 'OBSIDIAN 3D' : 'DIA 3D'
  }`;

  return (
    <>
      {/* Barra Superior (Telemetria + Modo + Busca Rápida + Tema Obsidian/Dia + Zoom) */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto max-w-full">
          <div className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl ${HUD_GLASS_CLASS}`}>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#E2A83B]/15 border border-[#E2A83B]/40 text-[#E2A83B] font-mono text-[11px] font-bold tracking-wider">
              {telemetryPillText}
            </span>
            {activeZone && (
              <span className="hidden md:inline-flex px-2.5 py-1 rounded-lg bg-white/10 text-stone-100 text-[11px] font-extrabold">
                {activeZone.zone.shortName}
              </span>
            )}
            <button
              type="button"
              aria-pressed={viewMode === 'orbit'}
              onClick={() => onToggleViewMode('orbit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                viewMode === 'orbit'
                  ? 'bg-[#E2A83B] text-[#0B0D12] shadow-sm'
                  : 'text-stone-200 hover:bg-white/10'
              }`}
            >
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Maquete 3D</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'walk'}
              onClick={() => onToggleViewMode('walk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                viewMode === 'walk'
                  ? 'bg-amber-400 text-[#0B0D12] shadow-sm'
                  : 'text-stone-200 hover:bg-white/10'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Street View</span>
            </button>
            <button
              type="button"
              aria-pressed={tourActive}
              onClick={onToggleTour}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                tourActive
                  ? 'bg-[#E2A83B] text-[#0B0D12] shadow-sm'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30'
              }`}
            >
              {tourActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{tourActive ? 'Pausar Tour' : 'Tour Guiado'}</span>
            </button>
          </div>

          {/* Busca Rápida de Loja / Quiosque / Vaga */}
          <div className="relative w-full sm:w-80">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${HUD_GLASS_CLASS}`}>
              <Search className="w-3.5 h-3.5 text-[#E2A83B] shrink-0" aria-hidden="true" />
              <input
                id="map-3d-store-search"
                name="map3dStoreSearch"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Buscar loja, PF, Super Big ou vaga..."
                aria-label="Buscar loja no Mapa 3D"
                className="w-full text-xs text-white bg-transparent focus:outline-none placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => onSearchQueryChange('')}
                  className="text-stone-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-[#0B0D12]/95 backdrop-blur-xl rounded-xl border border-[#E2A83B]/35 shadow-2xl overflow-hidden z-20 divide-y divide-white/10">
                {searchResults.map((hit) => (
                  <button
                    key={hit.label}
                    type="button"
                    onClick={() => onPickSearchItem(hit)}
                    className="w-full text-left px-3 py-2 hover:bg-[#E2A83B]/15 flex items-center justify-between gap-2 transition"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-white block truncate">
                        {hit.label}
                      </span>
                      <span className="text-[10px] text-stone-400 block truncate">
                        {hit.subtitle}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[#E2A83B] font-mono text-[10px] font-bold shrink-0">
                      {hit.floor}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tema Obsidian / Dia + Raio-X + Zoom / Reset */}
        <div
          className={`flex flex-wrap items-center gap-1.5 pointer-events-auto p-1.5 rounded-xl ${HUD_GLASS_CLASS}`}
        >
          <button
            type="button"
            aria-pressed={isObsidianTheme}
            onClick={onToggleTheme}
            aria-label="Alternar modo visual Obsidian ou Dia"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
              isObsidianTheme
                ? 'bg-[#E2A83B]/20 text-[#E2A83B] border-[#E2A83B]/45 hover:bg-[#E2A83B]/30'
                : 'bg-white/15 text-amber-200 border-white/20 hover:bg-white/25'
            }`}
          >
            {isObsidianTheme ? (
              <Moon className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{isObsidianTheme ? 'Obsidian' : 'Dia'}</span>
          </button>
          <button
            type="button"
            aria-pressed={showSubsoloXray}
            onClick={onToggleSubsoloXray}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
              showSubsoloXray
                ? 'bg-sky-500 text-[#0B0D12] border-sky-400 shadow-sm'
                : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-400/30'
            }`}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Raio-X Subsolo</span>
          </button>
          <button
            type="button"
            aria-label="Aproximar Zoom"
            onClick={() => onZoom(0.8)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Afastar Zoom"
            onClick={() => onZoom(1.25)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <ZoomOut className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Resetar Câmera"
            onClick={onResetCamera}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Card Flutuante da Loja Clicada/Buscada */}
      {selectedStore && !tourActive && (
        <div
          className={`hidden sm:block absolute top-24 right-3 w-72 rounded-2xl p-3.5 pointer-events-auto z-10 ${HUD_GLASS_CLASS}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E2A83B] flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {selectedStore.floor} • Portaria{' '}
                {selectedStore.nearestPortal}
              </span>
              <h4 className="text-sm font-extrabold mt-0.5 text-white">{selectedStore.label}</h4>
              <p className="text-[11px] text-stone-300 mt-0.5">{selectedStore.subtitle}</p>
            </div>
            <button
              type="button"
              aria-label="Fechar card da loja"
              onClick={onCloseSelectedStore}
              className="text-stone-400 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {activeZone && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-stone-300">Score IQ ({activeZone.zone.shortName}):</span>
              <strong className="text-[#E2A83B] font-mono font-extrabold">
                {activeZone.opportunityScore} pts
              </strong>
            </div>
          )}
        </div>
      )}

      {/* Overlay do Tour Guiado Automático */}
      {tourActive && (
        <div
          className={`absolute top-24 right-3 left-3 sm:left-auto sm:w-88 rounded-2xl p-4 pointer-events-auto z-10 ${HUD_GLASS_CLASS}`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E2A83B] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Tour Guiado Capim Dourado
            </span>
            <button
              type="button"
              onClick={onNextTourStep}
              className="px-2 py-0.5 rounded bg-[#E2A83B] text-[#0B0D12] text-[10px] font-extrabold"
            >
              Próxima →
            </button>
          </div>
          <h4 className="text-xs font-extrabold text-white">{currentTourStop.title}</h4>
          <p className="text-[11px] text-stone-300 mt-1 leading-relaxed">
            {currentTourStop.description}
          </p>
        </div>
      )}

      {/* Joypad Street View */}
      {viewMode === 'walk' && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
          <div className={`pointer-events-auto px-3.5 py-2.5 rounded-xl text-[11px] max-w-sm ${HUD_GLASS_CLASS}`}>
            <strong className="text-[#E2A83B] block mb-0.5">
              Modo Street View Ativo ({floor === 'L1' ? 'Térreo L1' : '2º Piso Curva JK'})
            </strong>
            Arraste para olhar as vitrines • Use <strong>Scroll / W A S D</strong> ou os botões ao lado.
          </div>

          <div className={`pointer-events-auto flex items-center gap-1.5 p-2 rounded-2xl ${HUD_GLASS_CLASS}`}>
            <button
              type="button"
              aria-label="Virar à esquerda"
              onClick={() => onNudgeWalk(0, 0, 0.35)}
              className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
            >
              ↺ Esq
            </button>
            <button
              type="button"
              aria-label="Andar para frente"
              onClick={() => onNudgeWalk(3.0, 0, 0)}
              className="px-3 py-2 rounded-lg bg-[#E2A83B] hover:bg-amber-400 text-[#0B0D12] text-xs font-extrabold flex items-center gap-1 transition"
            >
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Frente</span>
            </button>
            <button
              type="button"
              aria-label="Recuar"
              onClick={() => onNudgeWalk(-3.0, 0, 0)}
              className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 transition"
            >
              <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Virar à direita"
              onClick={() => onNudgeWalk(0, 0, -0.35)}
              className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
            >
              Dir ↻
            </button>
            <button
              type="button"
              onClick={() => onSwitchFloor(floor === 'L1' ? 'L2' : 'L1')}
              className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0B0D12] text-xs font-extrabold flex items-center gap-1 transition"
            >
              {floor === 'L1' ? (
                <MoveUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <MoveDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{floor === 'L1' ? '2º Piso' : '1º Piso'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra Inferior: Presets de Câmera por Setor + Filtro de Fluxo por Segmento */}
      {viewMode === 'orbit' && (
        <div className="bg-[#0B0D12]/90 backdrop-blur-xl border-t border-[#E2A83B]/30 text-white px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Atalhos de Setor 3D">
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#E2A83B] hover:text-[#0B0D12] text-stone-100 text-[11px] font-bold transition"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filtrar fluxos por segmento"
          >
            {SEGMENT_FILTER_OPTIONS.map((seg) => (
              <button
                key={seg.id}
                type="button"
                aria-pressed={activeSegment === seg.id}
                onClick={() => onSelectSegment(seg.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] ${
                  activeSegment === seg.id
                    ? 'bg-[#E2A83B] text-[#0B0D12] border-[#E2A83B]'
                    : 'bg-white/5 text-stone-200 border-white/15 hover:bg-white/15'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${seg.dot}`} />
                <span>{seg.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
