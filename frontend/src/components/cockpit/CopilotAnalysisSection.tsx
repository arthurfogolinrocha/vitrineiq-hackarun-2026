import React from 'react';
import { Image as ImageIcon, Search, Sparkles } from 'lucide-react';
import { stripMarkdown } from '../../services/ai';
import { ZoneLiveTelemetry } from '../../services/opportunityEngine';
import { AIAnalysisResponse, StoreTenant } from '../../types';
import { PosterDraft } from '../PromoPosterModal';
import { CampaignDraftForm, resolveStoreMeta } from './cockpitHelpers';

interface CopilotAnalysisSectionProps {
  current: ZoneLiveTelemetry;
  activeTenant?: StoreTenant | null;
  campaignForm: CampaignDraftForm;
  onRunCopilot: (telemetry: ZoneLiveTelemetry) => Promise<void>;
  isAnalyzing: boolean;
  lastAnalysis: AIAnalysisResponse | null;
  onCreatePosterFromStrategy: (draft: PosterDraft) => void;
}

/** Seção do Copiloto IA VitrineIQ e termos mais buscados no Totem/QR da ala. */
export const CopilotAnalysisSection: React.FC<CopilotAnalysisSectionProps> = ({
  current,
  activeTenant,
  campaignForm,
  onRunCopilot,
  isAnalyzing,
  lastAnalysis,
  onCreatePosterFromStrategy,
}) => {
  const handleCreateStrategyPoster = () => {
    if (!lastAnalysis) return;
    const targetStore = resolveStoreMeta(campaignForm.storeName, activeTenant, true);
    const cleanSummary = stripMarkdown(lastAnalysis.content)
      .split('\n')
      .filter(Boolean)
      .slice(0, 3)
      .join(' • ');

    onCreatePosterFromStrategy({
      storeName: targetStore?.storeName || campaignForm.storeName,
      logoUrl: targetStore?.logoUrl,
      floorLabel: targetStore?.floorLabel || current.zone.shortName,
      zoneId: current.zone.id,
      title: `Estratégia Ativa • ${current.zone.shortName}`,
      discountBadge: campaignForm.discountBadge || '15% OFF',
      couponCode: campaignForm.couponCode || 'CAPIM15',
      copyText: cleanSummary || campaignForm.whatsappCopy,
      expiresInMinutes: campaignForm.expiresInMinutes,
      sourceLabel: 'Plano gerado pelo Copiloto IA VitrineIQ',
    });
  };

  return (
    <section className="lg:col-span-6 bento-card-cream rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#111318] text-[#E2A83B] flex items-center justify-center">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#111318]">
              Agente de IA VitrineIQ (API Python)
            </h3>
            <p className="text-[11px] text-stone-500">
              Plano tático baseado em câmera, clima, perdas e buscas QR
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRunCopilot(current)}
          disabled={isAnalyzing}
          className="px-3 py-1.5 rounded-xl bg-[#111318] hover:bg-stone-800 text-[#E2A83B] text-xs font-bold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B]"
        >
          {isAnalyzing ? 'Gerando...' : 'Atualizar Plano'}
        </button>
      </div>

      {lastAnalysis ? (
        <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-semibold">
            {lastAnalysis.source === 'GEMINI_API' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                Agente de IA (Gemini)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                Heurística (sem IA)
              </span>
            )}
            <span>Latência: {lastAnalysis.latencyMs}ms</span>
          </div>
          <div className="text-xs sm:text-sm text-[#111318] leading-relaxed whitespace-pre-line font-medium">
            {stripMarkdown(lastAnalysis.content)}
          </div>
          <div className="pt-2 border-t border-stone-200 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCreateStrategyPoster}
              className="px-3 py-2 rounded-xl gold-pill-metallic text-xs font-extrabold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
            >
              <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Criar Cartaz desta Estratégia (com Logo)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#FAF8F5] border border-dashed border-stone-300 rounded-2xl p-5 text-center space-y-2">
          <p className="text-xs font-semibold text-stone-600">
            Clique em <strong>“Gerar Estratégia IA”</strong> para receber ações práticas para vitrine, estoque e abordagem da equipe nesta ala.
          </p>
        </div>
      )}

      {/* Termos mais buscados no QR da ala */}
      <div className="pt-2 border-t border-stone-100 space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
          O que os Clientes Mais Buscam no Totem/QR desta Ala ({current.zone.hotSearches.length} buscas ativas • {current.qrSearchCount} sinais)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {current.zone.hotSearches.map((term) => (
            <span
              key={term}
              className="px-3 py-1 rounded-full bg-[#FAF8F5] border border-stone-200 text-xs font-bold text-[#111318]"
            >
              🔥 {term}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
