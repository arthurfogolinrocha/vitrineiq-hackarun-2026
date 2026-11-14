import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { ShoppingZone, StoreTenant, ZoneId } from '../../types';

interface VisionCameraViewportProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  zones: ShoppingZone[];
  effectiveZoneId: ZoneId;
  activeTenant?: StoreTenant | null;
  onSelectZone: (zoneId: ZoneId) => void;
}

/** Viewport do sensor de visão computacional com seletor de ala e legenda LGPD. */
export const VisionCameraViewport: React.FC<VisionCameraViewportProps> = ({
  canvasRef,
  zones,
  effectiveZoneId,
  activeTenant,
  onSelectZone,
}) => {
  return (
    <div className="xl:col-span-8 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <label htmlFor="vision-zone" className="font-bold text-slate-700 flex items-center gap-1.5">
          {activeTenant && <Lock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />}
          <span>
            {activeTenant
              ? `Vitrine Isolada: ${activeTenant.storeName}`
              : 'Ala vinculada no Painel Lojista:'}
          </span>
        </label>
        <select
          id="vision-zone"
          value={effectiveZoneId}
          disabled={Boolean(activeTenant)}
          onChange={(e) => onSelectZone(e.target.value as ZoneId)}
          className="w-full sm:w-auto max-w-full min-h-[44px] bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-amber-50/70 disabled:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          {activeTenant ? (
            <option value={activeTenant.zoneId}>
              {activeTenant.storeName} — {activeTenant.floorLabel}
            </option>
          ) : (
            zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.shortName}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-300 bg-slate-50 shadow-sm">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Sensor de câmera contando passantes no corredor, paradas na vitrine, entradas e saídas na loja"
          className="w-full h-auto block"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          Processamento em RAM (&lt;5ms): nenhuma imagem é gravada.
        </span>
        <span>Azul = Passante • Amarelo = Parou na Vitrine • Verde = Entrou</span>
      </div>
    </div>
  );
};
