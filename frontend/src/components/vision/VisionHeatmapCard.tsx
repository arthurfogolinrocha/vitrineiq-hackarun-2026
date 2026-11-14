import React from 'react';
import { Scan, Sparkles, UserCheck, UserMinus } from 'lucide-react';
import { VisionFunnelSnapshot } from '../../types';
import { SpotlightCard } from '../SpotlightCard';

interface VisionHeatmapCardProps {
  snapshot: VisionFunnelSnapshot;
  vitrineEscapeRate: number;
  isAuditing: boolean;
  onRunMultimodalAudit: () => void;
  onAnalyzeWithVision: () => void;
}

/** Coluna lateral de KPIs do funil da porta e acionadores de auditoria/diagnóstico IA. */
export const VisionHeatmapCard: React.FC<VisionHeatmapCardProps> = ({
  snapshot,
  vitrineEscapeRate,
  isAuditing,
  onRunMultimodalAudit,
  onAnalyzeWithVision,
}) => {
  return (
    <div className="xl:col-span-4 space-y-3">
      <SpotlightCard className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <span className="text-[11px] text-slate-600 uppercase font-bold">
          Passaram na Frente (Corredor)
        </span>
        <div className="text-2xl font-black text-blue-600 mt-1">{snapshot.passersBy}</div>
        <span className="text-[11px] text-slate-600">
          {Math.max(0, snapshot.passersBy - snapshot.entries)} passaram sem entrar
        </span>
      </SpotlightCard>

      <SpotlightCard className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <span className="text-[11px] text-slate-600 uppercase font-bold">
          Pararam na Vitrine (&gt;3s)
        </span>
        <div className="text-2xl font-black text-amber-600 mt-1">{snapshot.vitrineStops}</div>
        <span className="text-[11px] text-rose-700 font-medium">
          Fuga pós-vitrine: {vitrineEscapeRate}% não entraram
        </span>
      </SpotlightCard>

      <SpotlightCard className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-600 uppercase font-bold">
            Entradas × Saídas na Loja
          </span>
          <UserCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
        </div>
        <div className="text-2xl font-black text-emerald-600 mt-1">
          {snapshot.entries}{' '}
          <span className="text-sm font-semibold text-slate-600">entradas</span> •{' '}
          <span className="text-lg text-slate-700">{snapshot.exits} saídas</span>
        </div>
        <span className="text-[11px] text-emerald-700 font-semibold">
          Taxa de Atração: {snapshot.attractionRate}%
        </span>
      </SpotlightCard>

      <button
        type="button"
        onClick={onRunMultimodalAudit}
        disabled={isAuditing}
        aria-busy={isAuditing}
        className="w-full min-h-[44px] py-3 px-4 rounded-2xl bg-[#0B0D12] hover:bg-slate-900 text-[#F5C76B] border border-[#E2A83B]/50 font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <Scan className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>
          {isAuditing
            ? 'Analisando frame com Gemini Vision...'
            : 'Raio-X Multimodal da Vitrine (Gemini Vision)'}
        </span>
      </button>

      <button
        type="button"
        onClick={onAnalyzeWithVision}
        className="w-full min-h-[44px] py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <Sparkles className="w-4 h-4" aria-hidden="true" />
        <span>Diagnosticar Fuga da Vitrine com IA</span>
      </button>

      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
        <UserMinus className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Estes contadores alimentam diretamente o <strong>Painel Lojista</strong> e o <strong>Score de Oportunidade</strong>.
        </span>
      </div>
    </div>
  );
};
