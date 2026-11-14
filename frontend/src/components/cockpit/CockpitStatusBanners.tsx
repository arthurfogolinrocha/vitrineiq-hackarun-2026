import React from 'react';
import { Check, Image as ImageIcon, Lock, ShieldCheck, X } from 'lucide-react';
import { StoreTenant } from '../../types';
import { PosterDraft } from '../PromoPosterModal';
import { StoreAvatar } from '../StoreAvatar';

interface CockpitStatusBannersProps {
  publishedNotice: PosterDraft | null;
  onOpenPoster: (draft: PosterDraft) => void;
  onDismissNotice: () => void;
  activeTenant?: StoreTenant | null;
}

/** Banners de status do topo do Cockpit: confirmação de oferta publicada e isolamento multi-tenant. */
export const CockpitStatusBanners: React.FC<CockpitStatusBannersProps> = ({
  publishedNotice,
  onOpenPoster,
  onDismissNotice,
  activeTenant,
}) => {
  return (
    <>
      {publishedNotice && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl px-4 py-3 bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-sm flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>
              <strong>Oferta publicada no Shopping e no Concierge QR!</strong> Código{' '}
              <span className="font-mono font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded">
                {publishedNotice.couponCode}
              </span>{' '}
              ativo para <strong>{publishedNotice.storeName}</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenPoster(publishedNotice)}
              className="px-3 py-1.5 rounded-xl bg-[#0B0D12] text-[#F5C76B] text-xs font-extrabold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B] focus-visible:ring-offset-2"
            >
              <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Abrir Cartaz com Logo</span>
            </button>
            <button
              type="button"
              onClick={onDismissNotice}
              aria-label="Fechar aviso"
              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {activeTenant ? (
        <div
          role="status"
          className="rounded-2xl px-4 py-3.5 bg-[#0B0D12] text-white border border-[#E2A83B]/45 shadow-sm flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3.5 text-xs">
            <StoreAvatar
              storeName={activeTenant.storeName}
              logoUrl={activeTenant.logoUrl}
              variant="wide"
              roundedClass="rounded-xl"
            />
            <div>
              <strong className="text-[#F5C76B] flex items-center gap-1.5 text-sm">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                Painel Exclusivo da Loja: {activeTenant.storeName}
              </strong>
              <span className="text-stone-300 block sm:inline">
                {activeTenant.floorLabel} • Ticket médio R$ {activeTenant.avgTicket} — Concorrentes ocultos por isolamento multi-tenant.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Tenant Isolado
          </span>
        </div>
      ) : (
        <div
          role="status"
          className="rounded-2xl px-4 py-2.5 bg-amber-50/80 border border-[#E2A83B]/35 text-xs flex flex-wrap items-center justify-between gap-2 text-[#0B0D12]"
        >
          <span className="font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#7A4B0A]" aria-hidden="true" />
            <strong>Modo Admin do Shopping:</strong> Visão consolidada das 5 alas do Capim Dourado Shopping.
          </span>
          <span className="text-[11px] text-[#7A4B0A] font-bold">
            Troque para Modo Lojista no topo para isolar uma única loja
          </span>
        </div>
      )}
    </>
  );
};
