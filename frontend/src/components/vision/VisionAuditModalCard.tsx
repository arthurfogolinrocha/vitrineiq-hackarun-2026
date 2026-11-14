import React from 'react';
import { AlertTriangle, CheckCircle2, MoveHorizontal, ShieldCheck } from 'lucide-react';
import { VitrineAuditResult } from '../../types';

interface VisionAuditModalCardProps {
  vitrineLabel: string;
  auditNotice: string | null;
  auditResult: VitrineAuditResult | null;
  auditSourceMode: 'webcam' | 'simulator' | null;
  olharesPorZona?: Record<string, number>;
}

/** Cartão de diagnóstico do Raio-X Multimodal (Gemini Vision / Heurística Local). */
export const VisionAuditModalCard: React.FC<VisionAuditModalCardProps> = ({
  vitrineLabel,
  auditNotice,
  auditResult,
  auditSourceMode,
  olharesPorZona,
}) => {
  return (
    <>
      {auditNotice && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{auditNotice}</span>
        </div>
      )}

      {auditResult && (
        <section
          aria-label="Resultado do Raio-X Multimodal da Vitrine"
          className="bento-card-obsidian rounded-3xl p-4 sm:p-6 text-white space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/35 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  LGPD: imagem descartada em RAM
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-stone-200 text-[11px] font-mono font-semibold">
                  {auditResult.source === 'GEMINI_API' ? 'Gemini Vision' : 'Heurística Local'} •{' '}
                  {auditResult.latency_ms}ms
                </span>
                {auditSourceMode === 'simulator' && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-[#F5C76B] border border-[#E2A83B]/40 text-[11px] font-semibold">
                    Frame do Simulador de Borda
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white pt-1">
                Raio-X Multimodal — {vitrineLabel}
              </h3>
              <p className="text-xs text-stone-300">{auditResult.headline}</p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-[#E2A83B]/45 px-4 py-3 text-center min-w-[128px]">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#F5C76B] block">
                Nota Visual
              </span>
              <strong className="text-3xl font-black text-white kpi-metric">
                {auditResult.score}
                <span className="text-sm text-stone-400 font-bold">/100</span>
              </strong>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#D99B26] to-[#F5C76B]"
                  style={{ width: `${Math.max(5, Math.min(100, auditResult.score))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 3 Defeitos Invisíveis */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                3 Defeitos Invisíveis Detectados
              </h4>
              <ul className="space-y-2.5">
                {auditResult.defects.slice(0, 3).map((defect, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-200">
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-400/30 font-mono text-[10px] font-bold shrink-0">
                      0{idx + 1}
                    </span>
                    <span>{defect}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reposicionamento Esquerda / Centro / Direita */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#F5C76B] flex items-center gap-1.5">
                <MoveHorizontal className="w-4 h-4" aria-hidden="true" />
                Reposicionamento Esquerda / Centro / Direita
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {['Esquerda', 'Centro', 'Direita'].map((zonaLabel, idx) => {
                  const moveText =
                    auditResult.zone_moves.find((m) =>
                      m.toLowerCase().includes(zonaLabel.toLowerCase())
                    ) ||
                    auditResult.zone_moves[idx] ||
                    `${zonaLabel}: ajustar exposição na altura do olhar.`;
                  const lookCount = olharesPorZona?.[zonaLabel.toLowerCase()];
                  return (
                    <div
                      key={zonaLabel}
                      className="rounded-xl bg-[#0B0D12]/80 border border-white/10 px-3 py-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-extrabold text-[#F5C76B] uppercase text-[10px] tracking-wider">
                          Zona {zonaLabel}
                        </span>
                        {typeof lookCount === 'number' && (
                          <span className="text-[10px] font-mono text-stone-400">
                            {lookCount} olhares
                          </span>
                        )}
                      </div>
                      <p className="text-stone-200 leading-relaxed">{moveText}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {auditResult.quick_win && (
            <div className="rounded-2xl bg-[#E2A83B]/15 border border-[#E2A83B]/45 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-100">
              <CheckCircle2 className="w-4 h-4 text-[#F5C76B] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="text-[#F5C76B] block">Ação Rápida (Quick Win):</strong>
                <span>{auditResult.quick_win}</span>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
};
