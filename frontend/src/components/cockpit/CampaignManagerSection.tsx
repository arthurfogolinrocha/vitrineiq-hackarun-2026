import React from 'react';
import { Check, Copy, Flame, Image as ImageIcon, Pause, Play, Trash2, Zap } from 'lucide-react';
import { FlashCampaign, StoreTenant } from '../../types';
import { PosterDraft } from '../PromoPosterModal';
import { StoreAvatar } from '../StoreAvatar';
import { resolveStoreMeta } from './cockpitHelpers';

interface CampaignManagerSectionProps {
  campaigns: FlashCampaign[];
  activeTenant?: StoreTenant | null;
  currentZoneShortName: string;
  copiedId: string | null;
  onOpenModal: () => void;
  onToggleCampaign?: (id: string) => void;
  onDeleteCampaign?: (id: string) => void;
  onOpenPoster: (draft: PosterDraft) => void;
  onCopyCopywriting: (id: string, text: string) => void;
}

/** Lista e gestão de campanhas relâmpago ativas no Concierge QR e WhatsApp. */
export const CampaignManagerSection: React.FC<CampaignManagerSectionProps> = ({
  campaigns,
  activeTenant,
  currentZoneShortName,
  copiedId,
  onOpenModal,
  onToggleCampaign,
  onDeleteCampaign,
  onOpenPoster,
  onCopyCopywriting,
}) => {
  return (
    <section className="lg:col-span-6 bento-card-cream rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#B45309] flex items-center justify-center">
            <Flame className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#111318]">
              Campanhas Relâmpago no Ar
            </h3>
            <p className="text-[11px] text-stone-500">
              Ofertas de resgate ativas no Concierge QR e prontos para disparo no WhatsApp
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="px-3 py-1.5 rounded-xl bg-[#E2A83B] hover:bg-[#eab858] text-[#111318] text-xs font-extrabold flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
        >
          <Zap className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Criar</span>
        </button>
      </div>

      <div className="space-y-3">
        {campaigns.map((camp) => {
          const storeMeta = resolveStoreMeta(camp.storeName, activeTenant, false);
          return (
            <div
              key={camp.id}
              className={`rounded-2xl border p-4 flex flex-col gap-2 transition ${
                camp.active
                  ? 'bg-[#FAF8F5] border-stone-200'
                  : 'bg-stone-50/70 border-stone-200/60 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <StoreAvatar
                    storeName={camp.storeName}
                    logoUrl={storeMeta?.logoUrl}
                    variant="wide"
                    roundedClass="rounded-xl"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          camp.active
                            ? 'bg-[#111318] text-[#E2A83B]'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {camp.active ? camp.discountBadge : 'PAUSADA'}
                      </span>
                      {camp.triggerOrigin && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-[#7A4B0A] border border-[#E2A83B]/40">
                          🎁 Aliança de Corredor
                        </span>
                      )}
                      <span className="text-xs font-extrabold text-[#111318]">
                        {camp.storeName}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#111318] mt-1">{camp.title}</h4>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 font-mono text-xs font-extrabold text-[#111318]">
                    {camp.couponCode}
                  </span>
                  {onToggleCampaign && (
                    <button
                      type="button"
                      onClick={() => onToggleCampaign(camp.id)}
                      className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] ${
                        camp.active
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                      title={camp.active ? 'Pausar oferta no totem' : 'Retomar oferta'}
                      aria-label={camp.active ? 'Pausar oferta' : 'Retomar oferta'}
                    >
                      {camp.active ? (
                        <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Play className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                  )}
                  {onDeleteCampaign && (
                    <button
                      type="button"
                      onClick={() => onDeleteCampaign(camp.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      title="Excluir campanha"
                      aria-label="Excluir campanha"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">{camp.whatsappCopy}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/80 text-[11px] text-stone-500">
                <span>Expira em {camp.expiresInMinutes} min</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenPoster({
                        storeName: camp.storeName,
                        logoUrl: storeMeta?.logoUrl,
                        floorLabel: storeMeta?.floorLabel || currentZoneShortName,
                        zoneId: camp.zoneId,
                        title: camp.title,
                        discountBadge: camp.discountBadge,
                        couponCode: camp.couponCode,
                        copyText: camp.whatsappCopy,
                        expiresInMinutes: camp.expiresInMinutes,
                      })
                    }
                    className="font-extrabold text-[#7A4B0A] hover:text-[#0B0D12] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded"
                  >
                    <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Gerar Cartaz</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopyCopywriting(camp.id, camp.whatsappCopy)}
                    className="font-bold text-[#111318] hover:text-[#B45309] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] rounded"
                  >
                    {copiedId === camp.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copiar Texto WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
