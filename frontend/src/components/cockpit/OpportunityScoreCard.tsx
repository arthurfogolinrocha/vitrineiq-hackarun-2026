import React from 'react';
import {
  AlertTriangle,
  Camera,
  Eye,
  Footprints,
  Megaphone,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { LOST_SALE_LABELS, SEGMENT_LABELS } from '../../data/shoppingData';
import { ZoneLiveTelemetry } from '../../services/opportunityEngine';
import { StoreTenant } from '../../types';
import { SpotlightCard } from '../SpotlightCard';
import { StoreAvatar } from '../StoreAvatar';
import { cleanWingLabel, getScoreStatusLabel, useAnimatedNumber } from './cockpitHelpers';

interface OpportunityScoreCardProps {
  current: ZoneLiveTelemetry;
  activeTenant?: StoreTenant | null;
  isCamActiveHere: boolean;
  onOpenVision?: () => void;
  onRunCopilot: (telemetry: ZoneLiveTelemetry) => Promise<void>;
  isAnalyzing: boolean;
  onOpenCampaignModal: () => void;
  effectiveScore: number;
  clampedScore: number;
  effectiveFootTraffic: number;
  stopsTotal: number;
  /** Pessoas na frente da vitrine agora (ainda não contadas em Passaram). */
  pessoasAgora?: number;
}

/** Card principal Obsidian Bento com Gauge Orbital do IQ Score, ações táticas e 4 KPIs da ala. */
export const OpportunityScoreCard: React.FC<OpportunityScoreCardProps> = ({
  current,
  activeTenant,
  isCamActiveHere,
  onOpenVision,
  onRunCopilot,
  isAnalyzing,
  onOpenCampaignModal,
  effectiveScore,
  clampedScore,
  effectiveFootTraffic,
  stopsTotal,
  pessoasAgora = 0,
}) => {
  const animatedScore = useAnimatedNumber(clampedScore);
  const animatedFootTraffic = useAnimatedNumber(effectiveFootTraffic);

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (clampedScore / 100) * circumference;

  return (
    <SpotlightCard
      tilt3d
      beam={effectiveScore >= 75}
      hudCorners
      className="xl:col-span-8 bento-card-obsidian grain-overlay text-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-6 relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #E2A83B 0%, transparent 70%)',
        }}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#E2A83B]/15 text-[#E2A83B] border border-[#E2A83B]/30 text-[11px] font-bold uppercase tracking-wider">
              {activeTenant
                ? `${activeTenant.floorLabel} • ${SEGMENT_LABELS[activeTenant.segment]}`
                : `${current.zone.floor === 'L1' ? 'Térreo • L1' : '2º Piso • L2'} — ${current.zone.segment}`}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-stone-200 text-[11px] font-semibold font-mono">
              Contexto {current.multiplier}x
            </span>
            {isCamActiveHere ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Webcam Integrada ao Vivo
              </span>
            ) : (
              onOpenVision && (
                <button
                  type="button"
                  onClick={onOpenVision}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-stone-300 border border-white/10 text-[11px] font-semibold flex items-center gap-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B]"
                >
                  <Camera className="w-3 h-3 text-[#E2A83B]" aria-hidden="true" />
                  Conectar Câmera da Vitrine
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-4">
            {activeTenant && (
              <StoreAvatar
                storeName={activeTenant.storeName}
                logoUrl={activeTenant.logoUrl}
                variant="hero"
                roundedClass="rounded-2xl"
              />
            )}
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {activeTenant ? activeTenant.storeName : current.zone.name}
              </h2>
              {activeTenant ? (
                <p className="text-xs sm:text-sm text-stone-300 mt-1">
                  Vitrine exclusiva em{' '}
                  <strong className="text-[#F5C76B]">
                    {cleanWingLabel(current.zone.shortName)}
                  </strong>{' '}
                  • Ticket médio{' '}
                  <strong className="text-white">R$ {activeTenant.avgTicket}</strong>
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-stone-300 mt-1">
                  Lojas âncoras monitoradas:{' '}
                  <strong className="text-white">{current.zone.anchors.join(' • ')}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onRunCopilot(current)}
              disabled={isAnalyzing}
              className="px-4 py-2.5 rounded-xl bg-[#E2A83B] hover:bg-[#eab858] disabled:opacity-60 text-[#111318] text-xs font-extrabold flex items-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C76B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D12]"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>{isAnalyzing ? 'Calculando Plano IA...' : 'Gerar Estratégia IA'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenCampaignModal}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D12]"
            >
              <Megaphone className="w-4 h-4 text-[#E2A83B]" aria-hidden="true" />
              <span>Lançar Oferta Relâmpago</span>
            </button>
          </div>
        </div>

        {/* Medidor Circular SVG Radar Orbital: Score IQ */}
        <div className="flex items-center gap-4 md:flex-col md:text-center bg-white/5 border border-[#E2A83B]/25 rounded-2xl p-4 shrink-0">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-32 h-32" viewBox="0 0 136 136" aria-hidden="true">
              <defs>
                <linearGradient id="iqGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5C76B" />
                  <stop offset="55%" stopColor="#E2A83B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
              {Array.from({ length: 24 }).map((_, idx) => {
                const angle = (idx * 360) / 24;
                const activeTick = idx / 24 <= clampedScore / 100;
                return (
                  <line
                    key={idx}
                    x1="68"
                    y1="5"
                    x2="68"
                    y2={idx % 6 === 0 ? '11' : '9'}
                    stroke={activeTick ? '#F5C76B' : 'rgba(255,255,255,0.16)'}
                    strokeWidth={idx % 6 === 0 ? '2' : '1.2'}
                    transform={`rotate(${angle} 68 68)`}
                  />
                );
              })}
              <circle
                cx="68"
                cy="68"
                r="58"
                fill="none"
                stroke="rgba(226,168,59,0.28)"
                strokeWidth="1"
                strokeDasharray="3 5"
                className="origin-center animate-[spin_20s_linear_infinite]"
              />
              <g transform="rotate(-90 68 68)">
                <circle
                  cx="68"
                  cy="68"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="10"
                />
                <circle
                  cx="68"
                  cy="68"
                  r={radius}
                  fill="none"
                  stroke="url(#iqGoldGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  style={{
                    transition: 'stroke-dashoffset 450ms ease-out',
                    filter: 'drop-shadow(0 0 8px rgba(226,168,59,0.55))',
                  }}
                />
              </g>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                IQ Score
              </span>
              <strong className="text-3xl font-black text-white leading-none kpi-metric">
                {current.semDados ? '—' : animatedScore}
              </strong>
            </div>
          </div>
          <div className="text-left md:text-center" aria-live="polite">
            <span className="text-xs font-bold text-[#E2A83B] block">
              {current.semDados ? 'Sem dados ainda hoje' : getScoreStatusLabel(effectiveScore)}
            </span>
            <span className="text-[11px] text-stone-400">
              {!current.medido
                ? 'Demonstração: dados fictícios'
                : current.semDados
                  ? pessoasAgora > 0
                    ? `${pessoasAgora} na frente da vitrine agora: conta quando sair da imagem`
                    : 'Aguardando câmera, Balcão ou Concierge'
                  : 'Medido hoje: câmera, Concierge e Balcão (0–100)'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 KPIs Limpos na Base do Hero */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 relative z-10">
        <div className="bg-white/5 rounded-2xl p-3">
          <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            Fluxo Corredor
          </span>
          <strong className="text-xl font-extrabold text-white mt-1 block kpi-metric">
            {animatedFootTraffic}
            <span className="text-xs font-normal text-stone-400">{current.medido ? ' hoje' : '/h'}</span>
          </strong>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#E2A83B]" aria-hidden="true" />
            Paradas Vitrine
          </span>
          <strong className="text-xl font-extrabold text-white mt-1 block kpi-metric">
            {stopsTotal}
          </strong>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            Conversão Ala
          </span>
          <strong className="text-xl font-extrabold text-emerald-400 mt-1 block kpi-metric">
            {current.medido && current.vitrineStops === 0 ? '—' : `${current.conversionRate}%`}
          </strong>
        </div>
        <div className="bg-white/5 rounded-2xl p-3">
          <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
            Perdas Balcão
          </span>
          <strong className="text-xl font-extrabold text-rose-300 mt-1 block kpi-metric">
            {current.lostSalesCount}
            <span className="text-[10px] font-medium text-stone-400 ml-1">
              {current.lostSalesCount === 0
                ? '(Sem perdas)'
                : `(${LOST_SALE_LABELS[current.dominantReason].split(' ')[0]})`}
            </span>
          </strong>
        </div>
      </div>
    </SpotlightCard>
  );
};
