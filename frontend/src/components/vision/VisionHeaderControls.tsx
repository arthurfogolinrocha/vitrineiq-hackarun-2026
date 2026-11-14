import React from 'react';
import {
  AlertTriangle,
  Camera,
  EyeOff,
  Lock,
  Pause,
  Play,
  RotateCcw,
  VideoOff,
  X,
} from 'lucide-react';
import { StoreTenant } from '../../types';
import { StoreAvatar } from '../StoreAvatar';

interface VisionHeaderControlsProps {
  activeTenant?: StoreTenant | null;
  webcamActive: boolean;
  isPaused: boolean;
  webcamError: string | null;
  onToggleWebcam: () => void;
  onTogglePaused: () => void;
  onResetCounters: () => void;
  onDismissWebcamError: () => void;
}

/** Cabeçalho, banner de vitrine isolada e controles WCAG do sensor de visão computacional. */
export const VisionHeaderControls: React.FC<VisionHeaderControlsProps> = ({
  activeTenant,
  webcamActive,
  isPaused,
  webcamError,
  onToggleWebcam,
  onTogglePaused,
  onResetCounters,
  onDismissWebcamError,
}) => {
  return (
    <>
      {activeTenant && (
        <div
          role="status"
          className="rounded-2xl px-4 py-3 bg-[#0B0D12] text-white border border-[#E2A83B]/45 shadow-sm flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <StoreAvatar
              storeName={activeTenant.storeName}
              logoUrl={activeTenant.logoUrl}
              variant="wide"
            />
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#F5C76B] block">
                Sensor Dedicado da Vitrine
              </span>
              <strong className="text-sm sm:text-base font-extrabold text-white block truncate">
                {activeTenant.storeName}
              </strong>
              <span className="text-xs text-stone-300 block truncate">
                {activeTenant.floorLabel} • Ticket médio R$ {activeTenant.avgTicket}
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E2A83B]/15 text-[#F5C76B] border border-[#E2A83B]/40 text-[11px] font-bold shrink-0">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            Vitrine Isolada: {activeTenant.storeName}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>Câmera na Vitrine — {activeTenant ? activeTenant.storeName : 'Entrada, Saída & Fluxo'}</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Conecte a webcam para alimentar o Painel do Lojista ao vivo sem gravar vídeo nem reconhecer rostos: a imagem fica no aparelho e só as contagens vão para a API.
          </p>
        </div>

        {/* Controles Limpos e Óbvios */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            aria-pressed={webcamActive}
            onClick={onToggleWebcam}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              webcamActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
            }`}
          >
            {webcamActive ? (
              <>
                <VideoOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Desconectar Webcam</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Conectar Webcam Real</span>
              </>
            )}
          </button>

          {webcamActive && (
            <span className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Desfoque LGPD sempre ligado</span>
            </span>
          )}

          <button
            type="button"
            aria-pressed={isPaused}
            aria-label={
              isPaused
                ? 'Retomar contagem do sensor de vitrine'
                : 'Pausar contagem do sensor de vitrine'
            }
            onClick={onTogglePaused}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Retomar</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                <span>Pausar</span>
              </>
            )}
          </button>

          <button
            type="button"
            aria-label="Zerar contadores do sensor de vitrine"
            onClick={onResetCounters}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Zerar</span>
          </button>
        </div>
      </div>

      {webcamError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-between gap-2"
        >
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{webcamError}</span>
          </div>
          <button
            type="button"
            onClick={onDismissWebcamError}
            aria-label="Fechar aviso de câmera"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-amber-100 text-amber-900 shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
};
