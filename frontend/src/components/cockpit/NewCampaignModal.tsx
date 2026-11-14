import React from 'react';
import { X } from 'lucide-react';
import { SEGMENT_LABELS } from '../../data/shoppingData';
import { StoreTenant } from '../../types';
import { StoreAvatar } from '../StoreAvatar';
import {
  ALLIANCE_ORIGINS,
  CampaignDraftForm,
  RESGATE_OPTIONS,
  buildWhatsappOfferCopy,
  resolveStoreMeta,
} from './cockpitHelpers';

interface NewCampaignModalProps {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  form: CampaignDraftForm;
  onUpdateForm: (patch: Partial<CampaignDraftForm>) => void;
  activeTenant?: StoreTenant | null;
  lojaFixa?: string | null;
  validationError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/** Modal nativo <dialog> para criação e publicação imediata de Oferta Relâmpago. */
export const NewCampaignModal: React.FC<NewCampaignModalProps> = ({
  dialogRef,
  form,
  onUpdateForm,
  activeTenant,
  lojaFixa,
  validationError,
  onSubmit,
  onClose,
}) => {
  const storeMeta = resolveStoreMeta(form.storeName, activeTenant, true);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="campaign-modal-title"
      onClick={(e) => {
        const dialog = dialogRef.current;
        if (!dialog || e.target !== dialog || 'closedBy' in HTMLDialogElement.prototype) return;
        const r = dialog.getBoundingClientRect();
        const inside =
          r.top <= e.clientY &&
          e.clientY <= r.top + r.height &&
          r.left <= e.clientX &&
          e.clientX <= r.left + r.width;
        if (!inside) onClose();
      }}
      className="w-[min(100%-2rem,32rem)] m-auto rounded-3xl border border-stone-200 bg-white p-0 shadow-2xl"
    >
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-3">
            <StoreAvatar
              storeName={form.storeName}
              logoUrl={storeMeta?.logoUrl}
              variant="wide"
              roundedClass="rounded-xl"
            />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                Ativação Imediata no Shopping + Cartaz com Logo
              </span>
              <h3 id="campaign-modal-title" className="text-lg font-extrabold text-[#111318]">
                Nova Oferta Relâmpago
              </h3>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar janela"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {validationError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
          >
            ⚠️ {validationError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-[#111318] space-y-1 block">
            <span>Loja</span>
            <input
              type="text"
              required
              value={lojaFixa ?? form.storeName}
              onChange={(e) => onUpdateForm({ storeName: e.target.value })}
              readOnly={Boolean(lojaFixa || activeTenant)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium read-only:bg-amber-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
            />
          </label>
          <label className="text-xs font-bold text-[#111318] space-y-1 block">
            <span>Oferta de Resgate (sem desconto)</span>
            <select
              required
              value={form.discountBadge}
              onChange={(e) => {
                const nextBadge = e.target.value;
                onUpdateForm({
                  discountBadge: nextBadge,
                  whatsappCopy: buildWhatsappOfferCopy(form.couponCode, nextBadge),
                });
              }}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
            >
              {RESGATE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-xs font-bold text-[#111318] space-y-1 block">
          <span>Segmento da Oferta (Filtro do Concierge QR)</span>
          <select
            value={form.segmento}
            onChange={(e) => onUpdateForm({ segmento: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
          >
            {Object.entries(SEGMENT_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-bold text-[#111318] space-y-1 block">
          <span>Aliança de Corredor (Puxar Fluxo de Outra Âncora no Mapa 3D)</span>
          <select
            value={form.triggerOrigin}
            onChange={(e) => onUpdateForm({ triggerOrigin: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
          >
            {ALLIANCE_ORIGINS.map((item) => (
              <option key={item.value || 'none'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-bold text-[#111318] space-y-1 block">
          <span>Título da Campanha</span>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => onUpdateForm({ title: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-[#111318] space-y-1 block">
            <span>Código de Resgate</span>
            <input
              type="text"
              required
              value={form.couponCode}
              onChange={(e) => {
                const nextCode = e.target.value.toUpperCase();
                onUpdateForm({
                  couponCode: nextCode,
                  whatsappCopy: buildWhatsappOfferCopy(nextCode, form.discountBadge),
                });
              }}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-mono uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
            />
          </label>
          <label className="text-xs font-bold text-[#111318] space-y-1 block">
            <span>Duração (minutos)</span>
            <input
              type="number"
              min={15}
              max={720}
              value={form.expiresInMinutes}
              onChange={(e) => onUpdateForm({ expiresInMinutes: Number(e.target.value) || 60 })}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
            />
          </label>
        </div>

        <label className="text-xs font-bold text-[#111318] space-y-1 block">
          <span>Texto Pronto para WhatsApp &amp; Concierge QR</span>
          <textarea
            rows={3}
            required
            value={form.whatsappCopy}
            onChange={(e) => onUpdateForm({ whatsappCopy: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309]"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#111318] hover:bg-stone-800 text-[#E2A83B] text-xs font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2A83B]"
          >
            Publicar no Shopping
          </button>
        </div>
      </form>
    </dialog>
  );
};
