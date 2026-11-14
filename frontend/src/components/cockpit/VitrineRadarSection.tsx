import React from 'react';
import { Flame, Hand, RotateCcw, Smartphone, Zap } from 'lucide-react';
import { VitrineResumo } from '../../services/api';
import { CrowdDropState } from '../../types';
import { SpotlightCard } from '../SpotlightCard';
import { VitrineThird, useAnimatedNumber } from './cockpitHelpers';

interface VitrineRadarSectionProps {
  vitrineResumo?: VitrineResumo;
  crowdDrop?: CrowdDropState;
  lastPointedPart?: VitrineThird | null;
  onSimulatePointGesture?: (part: VitrineThird) => void;
  onRescueVitrine: (part: VitrineThird) => void;
  onOpenCrowdDrop: () => void;
  opportunityLossHour: number;
  peopleNotEntered: number;
  avgTicket: number;
}

/** Seção Vitrine Viva: taxímetro R$/h, radar de 3 terços (esquerda/centro/direita) e gatilho Crowd-Drop. */
export const VitrineRadarSection: React.FC<VitrineRadarSectionProps> = ({
  vitrineResumo,
  crowdDrop,
  lastPointedPart,
  onSimulatePointGesture,
  onRescueVitrine,
  onOpenCrowdDrop,
  opportunityLossHour,
  peopleNotEntered,
  avgTicket,
}) => {
  const animatedLossHour = useAnimatedNumber(opportunityLossHour);
  const tercos = vitrineResumo?.olharesPorZona ?? { esquerda: 0, centro: 0, direita: 0 };
  const apontaramCount = vitrineResumo?.apontaram ?? 0;
  const noCelularCount = vitrineResumo?.noCelular ?? 0;
  const voltaramCount = vitrineResumo?.voltaramOlhar ?? 0;
  const maxTerco = Math.max(1, tercos.esquerda, tercos.centro, tercos.direita);

  const thirdSlots = [
    { id: 'esquerda' as const, label: 'Esquerda', count: tercos.esquerda },
    { id: 'centro' as const, label: 'Centro', count: tercos.centro },
    { id: 'direita' as const, label: 'Direita', count: tercos.direita },
  ];

  return (
    <SpotlightCard
      tilt3d
      beam
      hudCorners
      className="bento-card-obsidian grain-overlay text-white rounded-3xl p-5 sm:p-6 border border-[#E2A83B]/35"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* Taxímetro R$/h */}
        <div className="xl:col-span-4 space-y-2.5 border-b xl:border-b-0 xl:border-r border-white/10 pb-4 xl:pb-0 xl:pr-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#F5C76B]">
            <span className="live-status-dot" aria-hidden="true" />
            Vitrine Viva • Dinheiro na Mesa
          </span>
          <div className="flex items-baseline gap-2">
            <strong className="text-3xl sm:text-4xl font-black text-white kpi-metric">
              R$ {animatedLossHour.toLocaleString('pt-BR')}
            </strong>
            <span className="text-xs font-bold text-[#F5C76B]">/ hora</span>
          </div>
          <p className="text-xs text-stone-300 leading-relaxed">
            {peopleNotEntered} passantes saíram sem entrar agora (ticket médio R$ {avgTicket}). Aponte a câmera YOLO na vitrine para capturar quem aponta para os produtos.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-[#F5C76B] border border-[#E2A83B]/30 font-bold flex items-center gap-1">
              <Hand className="w-3.5 h-3.5" aria-hidden="true" />
              {apontaramCount} apontaram
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10 font-semibold flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              {noCelularCount} no celular
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10 font-semibold flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              {voltaramCount} voltaram
            </span>
          </div>
        </div>

        {/* Micro-Heatmap 3 Terços + Radar Visual da Vitrine */}
        <div className="xl:col-span-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-white">
              Radar de Vitrine (Esquerda • Centro • Direita)
            </h3>
            <span className="text-[11px] font-mono text-[#F5C76B]">
              {crowdDrop ? `CROWD ${crowdDrop.peopleNow}P • NÍVEL ${crowdDrop.tier}` : 'LIVE FOV 110°'}
            </span>
          </div>

          <div className="relative rounded-2xl bg-[#07090D] border border-[#E2A83B]/25 overflow-hidden px-3 py-2">
            <div className="hud-scanline" aria-hidden="true" />
            <svg viewBox="0 0 360 72" className="w-full h-16" aria-hidden="true">
              {(['esquerda', 'centro', 'direita'] as const).map((part, idx) => {
                const xCenter = idx === 0 ? 64 : idx === 1 ? 180 : 296;
                const count = tercos[part];
                const isPointed = lastPointedPart === part;
                const fillOpacity = isPointed ? 0.36 : Math.max(0.08, (count / maxTerco) * 0.24);
                return (
                  <g key={part}>
                    <polygon
                      points={`180,66 ${xCenter - 46},8 ${xCenter + 46},8`}
                      fill={isPointed ? '#F5C76B' : '#E2A83B'}
                      fillOpacity={fillOpacity}
                      stroke={isPointed ? '#F5C76B' : 'rgba(226,168,59,0.35)'}
                      strokeWidth={isPointed ? 1.5 : 0.8}
                    />
                    <rect
                      x={xCenter - 42}
                      y="6"
                      width="84"
                      height="16"
                      rx="6"
                      fill={isPointed ? 'rgba(226,168,59,0.28)' : 'rgba(255,255,255,0.06)'}
                    />
                    <text
                      x={xCenter}
                      y="17"
                      textAnchor="middle"
                      fill={isPointed ? '#F5C76B' : '#d6d3d1'}
                      fontSize="9"
                      fontWeight="700"
                    >
                      {part.toUpperCase()} ({count})
                    </text>
                  </g>
                );
              })}
              <circle cx="180" cy="64" r="4.5" fill="#10b981" />
              <text x="192" y="67" fill="#6ee7b7" fontSize="8" fontWeight="700">
                CÂMERA BORDA
              </text>
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {thirdSlots.map((slot) => {
              const pct = Math.min(100, Math.round((slot.count / maxTerco) * 100));
              const isPointed = lastPointedPart === slot.id;
              return (
                <div
                  key={slot.id}
                  className={`rounded-2xl p-3 border transition ${
                    isPointed
                      ? 'bg-[#E2A83B]/20 border-[#F5C76B] shadow-lg'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className={isPointed ? 'text-[#F5C76B]' : 'text-stone-300'}>
                      {slot.label}
                    </span>
                    <span className="kpi-metric text-white">{slot.count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#E2A83B] to-[#F5C76B]"
                      style={{ width: `${Math.max(12, pct)}%` }}
                    />
                  </div>
                  {isPointed && (
                    <span className="mt-1.5 inline-block text-[10px] font-extrabold text-[#F5C76B]">
                      👆 Apontada agora!
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Gatilho Demo Ao Vivo + CTA Resgate + Crowd-Drop */}
        <div className="xl:col-span-3 flex flex-col gap-2.5">
          {onSimulatePointGesture && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Simular Apontada Ao Vivo (Demo Palco)
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['esquerda', 'centro', 'direita'] as const).map((part) => (
                  <button
                    key={part}
                    type="button"
                    onClick={() => onSimulatePointGesture(part)}
                    className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-[#E2A83B]/25 border border-white/15 hover:border-[#F5C76B] text-[11px] font-bold text-white capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C76B]"
                  >
                    {part}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => onRescueVitrine(lastPointedPart ?? 'centro')}
            className="w-full py-2.5 px-3.5 rounded-xl gold-pill-metallic text-xs flex items-center justify-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C76B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D12]"
          >
            <Zap className="w-4 h-4" aria-hidden="true" />
            <span>Resgatar Agora ({lastPointedPart ?? 'Centro'})</span>
          </button>
          <button
            type="button"
            onClick={onOpenCrowdDrop}
            className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-[#E2A83B]/40 text-[#F5C76B] text-xs font-extrabold flex items-center justify-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C76B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D12]"
          >
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Abrir Telão Crowd-Drop</span>
          </button>
        </div>
      </div>
    </SpotlightCard>
  );
};
