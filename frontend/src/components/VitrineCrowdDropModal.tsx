import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Flame, Minus, Plus, QrCode, Sparkles, Users, X, Zap } from 'lucide-react';
import { FlashCampaign, StoreTenant, ZoneId } from '../types';
import { StoreAvatar } from './StoreAvatar';

interface VitrineCrowdDropModalProps {
  open: boolean;
  onClose: () => void;
  zoneId: ZoneId;
  zoneLabel: string;
  storeName: string;
  activeTenant?: StoreTenant | null;
  logoUrl?: string;
  initialPeople?: number;
  onPublishCrowdDrop: (campaign: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>) => void;
}

function resolveTier(people: number, zoneId: ZoneId) {
  const prefix = zoneId.split('-')[0].toUpperCase();
  if (people >= 5) {
    return {
      tier: 3,
      discountPct: 30,
      nextTarget: 5,
      headline: 'CROWD-DROP MÁXIMO DESBLOQUEADO!',
      badge: 'EXPERIÊNCIA VIP',
      perk: 'Prova + ajuste + embrulho VIP',
      couponCode: `CROWD-${prefix}-30`,
      tone: 'from-[#E2A83B] via-[#F5C76B] to-amber-300',
    };
  }
  if (people >= 3) {
    return {
      tier: 2,
      discountPct: 20,
      nextTarget: 5,
      headline: 'COMBO COLETIVO ATIVO NA VITRINE',
      badge: 'BRINDE NA COMPRA',
      perk: 'Brinde exclusivo na compra',
      couponCode: `CROWD-${prefix}-20`,
      tone: 'from-amber-500 to-[#F5C76B]',
    };
  }
  if (people >= 1) {
    return {
      tier: 1,
      discountPct: 10,
      nextTarget: 3,
      headline: 'VITRINE DESPERTADA AO VIVO',
      badge: 'PROVA EXPRESSA',
      perk: 'Prova expressa sem fila',
      couponCode: `CROWD-${prefix}-10`,
      tone: 'from-sky-400 to-emerald-400',
    };
  }
  return {
    tier: 0,
    discountPct: 5,
    nextTarget: 1,
    headline: 'AGUARDANDO PRIMEIROS OLHARES NA PORTA',
    badge: 'CONVITE PARA PROVAR',
    perk: 'Convite para provar a novidade',
    couponCode: `CROWD-${prefix}-05`,
    tone: 'from-stone-500 to-stone-400',
  };
}

/**
 * Telão Ao Vivo de Vitrine ("Vitrine Crowd-Drop"):
 * precificação dinâmica coletiva guiada pela quantidade de pessoas olhando a vitrine.
 */
export const VitrineCrowdDropModal: React.FC<VitrineCrowdDropModalProps> = ({
  open,
  onClose,
  zoneId,
  zoneLabel,
  storeName,
  activeTenant,
  logoUrl,
  initialPeople = 2,
  onPublishCrowdDrop,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [peopleNow, setPeopleNow] = useState(Math.max(1, initialPeople));
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    setPeopleNow(Math.max(1, initialPeople));
  }, [initialPeople, open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setPublished(false);
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    const handleNativeClose = () => {
      if (dialog) dialog.returnValue = '';
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    dialog?.addEventListener('close', handleNativeClose);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      dialog?.removeEventListener('close', handleNativeClose);
    };
  }, [open, onClose]);

  const tier = resolveTier(peopleNow, zoneId);
  const progressPct = Math.min(100, Math.round((peopleNow / 5) * 100));
  const missingForNext = Math.max(0, tier.nextTarget - peopleNow);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const baseUrl =
      typeof window !== 'undefined' ? window.location.origin : 'https://vitrineiq-capim-dourado.vercel.app';
    const redeemUrl = `${baseUrl}/?tela=concierge&ala=${encodeURIComponent(zoneId)}&cupom=${encodeURIComponent(tier.couponCode)}`;
    QRCode.toDataURL(redeemUrl, {
      width: 240,
      margin: 1,
      color: { dark: '#0B0D12', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, zoneId, tier.couponCode]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isSyntheticZeroClick = e.clientX === 0 && e.clientY === 0;
    const isOutside =
      isSyntheticZeroClick ||
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (isOutside) {
      onClose();
    }
  };

  const handlePublish = () => {
    onPublishCrowdDrop({
      zoneId,
      storeName,
      segmento: activeTenant?.segment,
      title: `Vitrine Crowd-Drop Ao Vivo (${peopleNow} pessoas na frente)`,
      discountBadge: tier.badge,
      couponCode: tier.couponCode,
      whatsappCopy: `🔥 Crowd-Drop na vitrine da ${storeName} (${zoneLabel})! ${peopleNow} pessoas desbloquearam: ${tier.perk}, pelos próximos 15 min com ${tier.couponCode}.`,
      expiresInMinutes: 15,
    });
    setPublished(true);
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crowd-drop-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      className="w-[min(100%-1.5rem,56rem)] max-h-[90vh] overflow-y-auto m-auto rounded-3xl border border-[#E2A83B]/45 bg-[#0B0D12] text-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop:bg-black/75"
    >
      {open && (
      <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-28 -right-28 w-80 h-80 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #E2A83B 0%, transparent 70%)' }}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <StoreAvatar storeName={storeName} logoUrl={logoUrl} variant="hero" />
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5C76B]">
                <span className="live-status-dot live-status-dot--gold" />
                Modo Telão de Vitrine • Benefício Coletivo
              </span>
              <h2 id="crowd-drop-title" className="text-lg sm:text-2xl font-black text-white mt-0.5 break-words">
                {storeName} — Vitrine Crowd-Drop
              </h2>
              <p className="text-xs text-stone-300 truncate">{zoneLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Corpo Principal do Telão */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center relative z-10">
          <div className="md:col-span-8 space-y-5">
            <div className="rounded-3xl bg-white/5 border border-[#E2A83B]/35 p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <span className="px-3 py-1 rounded-full bg-[#E2A83B]/20 text-[#F5C76B] border border-[#E2A83B]/45 text-xs font-extrabold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {tier.headline}
                </span>
                <span className="text-xs font-mono font-bold text-stone-200" aria-live="polite">
                  Sensor YOLO • {peopleNow} {peopleNow === 1 ? 'pessoa olhando' : 'pessoas olhando'}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-3 sm:gap-4">
                <strong className="text-2xl sm:text-4xl font-black text-white kpi-metric">
                  {tier.perk}
                </strong>
                <div className="text-xs text-stone-200 leading-snug">
                  {peopleNow < 5 ? (
                    <>
                      Chame mais <strong className="text-[#F5C76B]">{missingForNext} pessoa(s)</strong> para
                      olhar a vitrine agora e liberar o próximo benefício!
                    </>
                  ) : (
                    <span className="text-emerald-300 font-bold">
                      Experiência VIP liberada pelos próximos 15 minutos, sem mexer no preço!
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Progresso de Níveis */}
              <div className="space-y-2">
                <div
                  className="h-4 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10"
                  role="progressbar"
                  aria-label="Progresso de pessoas para o benefício coletivo"
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={Math.min(5, peopleNow)}
                >
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${tier.tone} transition-all duration-300`}
                    style={{ width: `${Math.max(8, progressPct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-stone-300">
                  <span className={peopleNow >= 1 ? 'text-white font-bold' : ''}>1+ • Prova</span>
                  <span className={peopleNow >= 3 ? 'text-[#F5C76B] font-bold' : ''}>3+ • Brinde</span>
                  <span className={peopleNow >= 5 ? 'text-emerald-300 font-extrabold' : ''}>5+ • VIP</span>
                </div>
              </div>
            </div>

            {/* Simulador de Palco / Controle Ao Vivo */}
            <div className="rounded-2xl bg-[#12151D] border border-white/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-stone-200">
                <Users className="w-4 h-4 text-[#E2A83B] shrink-0" aria-hidden="true" />
                <span>Simulação ao vivo no palco / calibração webcam:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPeopleNow((p) => Math.max(0, p - 1))}
                  disabled={peopleNow <= 0}
                  aria-label="Diminuir 1 pessoa na vitrine"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>-1</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPeopleNow((p) => Math.min(12, p + 1))}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#E2A83B]/20 hover:bg-[#E2A83B]/35 border border-[#E2A83B]/45 text-[#F5C76B] text-xs font-extrabold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>+1 Pessoa na Vitrine</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPeopleNow(5)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl gold-pill-metallic text-xs font-extrabold flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Disparar Grupo (5+)</span>
                </button>
              </div>
            </div>
          </div>

          {/* QR Code Dinâmico de Resgate */}
          <div className="md:col-span-4 rounded-3xl bg-white text-[#0B0D12] p-5 flex flex-col items-center text-center gap-3 shadow-xl">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#7A4B0A]">
              <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
              Aponte a Câmera e Resgate
            </span>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code Crowd-Drop ${tier.couponCode}`}
                className="w-40 h-40 sm:w-44 sm:h-44 rounded-xl border border-stone-200 p-1 bg-white"
              />
            ) : (
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-xl bg-stone-100 flex items-center justify-center text-xs text-stone-600">
                Gerando QR...
              </div>
            )}
            <div className="w-full rounded-xl bg-[#0B0D12] text-[#F5C76B] py-2 px-3 font-mono text-sm font-black">
              {tier.couponCode}
            </div>
            <button
              type="button"
              onClick={handlePublish}
              className="w-full min-h-[44px] py-2.5 px-3 rounded-xl gold-pill-metallic text-xs font-extrabold flex items-center justify-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Zap className="w-4 h-4" aria-hidden="true" />
              <span>{published ? 'Publicado no Concierge QR!' : 'Publicar Crowd-Drop Agora'}</span>
            </button>
            {published && (
              <p role="status" aria-live="polite" className="text-[11px] font-bold text-emerald-700">
                Convite {tier.couponCode} ativo no Concierge QR.
              </p>
            )}
          </div>
        </div>
      </div>
      )}
    </dialog>
  );
};

