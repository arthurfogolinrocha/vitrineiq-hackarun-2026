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
      badge: '30% OFF COLETIVO',
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
      badge: '20% OFF COLETIVO',
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
      badge: '10% OFF AGORA',
      couponCode: `CROWD-${prefix}-10`,
      tone: 'from-sky-400 to-emerald-400',
    };
  }
  return {
    tier: 0,
    discountPct: 5,
    nextTarget: 1,
    headline: 'AGUARDANDO PRIMEIROS OLHARES NA PORTA',
    badge: '5% OFF INICIAL',
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
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

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

  if (!open) return null;

  const handlePublish = () => {
    onPublishCrowdDrop({
      zoneId,
      storeName,
      segmento: activeTenant?.segment,
      title: `Vitrine Crowd-Drop Ao Vivo (${peopleNow} pessoas na frente)`,
      discountBadge: tier.badge,
      couponCode: tier.couponCode,
      whatsappCopy: `🔥 Crowd-Drop na vitrine da ${storeName} (${zoneLabel})! ${peopleNow} pessoas desbloquearam ${tier.discountPct}% OFF pelos próximos 15 min com ${tier.couponCode}.`,
      expiresInMinutes: 15,
    });
    setPublished(true);
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      aria-labelledby="crowd-drop-title"
      className="w-[min(100%-1.5rem,56rem)] m-auto rounded-3xl border border-[#E2A83B]/45 bg-[#0B0D12] text-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop:bg-black/75"
    >
      <div className="p-6 sm:p-8 space-y-6 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-28 -right-28 w-80 h-80 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #E2A83B 0%, transparent 70%)' }}
        />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <StoreAvatar storeName={storeName} logoUrl={logoUrl} variant="hero" />
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5C76B]">
                <span className="live-status-dot live-status-dot--gold" />
                Modo Telão de Vitrine • Precificação Coletiva
              </span>
              <h2 id="crowd-drop-title" className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {storeName} — Vitrine Crowd-Drop
              </h2>
              <p className="text-xs text-stone-400">{zoneLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Telão Crowd-Drop"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Corpo Principal do Telão */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          <div className="md:col-span-8 space-y-5">
            <div className="rounded-3xl bg-white/5 border border-[#E2A83B]/35 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="px-3 py-1 rounded-full bg-[#E2A83B]/20 text-[#F5C76B] border border-[#E2A83B]/45 text-xs font-extrabold flex items-center gap-1.5">
                  <Flame className="w-4 h-4" aria-hidden="true" />
                  {tier.headline}
                </span>
                <span className="text-xs font-mono font-bold text-stone-300">
                  Sensor YOLO • {peopleNow} {peopleNow === 1 ? 'pessoa olhando' : 'pessoas olhando'}
                </span>
              </div>

              <div className="flex items-baseline gap-4">
                <strong className="text-5xl sm:text-6xl font-black text-white kpi-metric">
                  {tier.discountPct}% OFF
                </strong>
                <div className="text-xs text-stone-300 leading-snug">
                  {peopleNow < 5 ? (
                    <>
                      Chame mais <strong className="text-[#F5C76B]">{missingForNext} pessoa(s)</strong> para
                      olhar a vitrine agora e subir o desconto!
                    </>
                  ) : (
                    <span className="text-emerald-300 font-bold">
                      Desconto máximo coletivo liberado pelos próximos 15 minutos!
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Progresso de Níveis */}
              <div className="space-y-2">
                <div className="h-4 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${tier.tone} transition-all duration-300`}
                    style={{ width: `${Math.max(8, progressPct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-stone-400">
                  <span className={peopleNow >= 1 ? 'text-white font-bold' : ''}>1+ • 10%</span>
                  <span className={peopleNow >= 3 ? 'text-[#F5C76B] font-bold' : ''}>3+ • 20%</span>
                  <span className={peopleNow >= 5 ? 'text-emerald-300 font-extrabold' : ''}>5+ • 30% MAX</span>
                </div>
              </div>
            </div>

            {/* Simulador de Palco / Controle Ao Vivo */}
            <div className="rounded-2xl bg-[#12151D] border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-stone-300">
                <Users className="w-4 h-4 text-[#E2A83B]" aria-hidden="true" />
                <span>Simulação ao vivo no palco / calibração webcam:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPeopleNow((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1"
                >
                  <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>-1</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPeopleNow((p) => Math.min(12, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-[#E2A83B]/20 hover:bg-[#E2A83B]/35 border border-[#E2A83B]/45 text-[#F5C76B] text-xs font-extrabold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>+1 Pessoa na Vitrine</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPeopleNow(5)}
                  className="px-3 py-1.5 rounded-xl gold-pill-metallic text-xs font-extrabold flex items-center gap-1"
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
                className="w-44 h-44 rounded-xl border border-stone-200 p-1 bg-white"
              />
            ) : (
              <div className="w-44 h-44 rounded-xl bg-stone-100 flex items-center justify-center text-xs text-stone-500">
                Gerando QR...
              </div>
            )}
            <div className="w-full rounded-xl bg-[#0B0D12] text-[#F5C76B] py-2 px-3 font-mono text-sm font-black">
              {tier.couponCode}
            </div>
            <button
              type="button"
              onClick={handlePublish}
              className="w-full py-2.5 px-3 rounded-xl gold-pill-metallic text-xs font-extrabold flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4" aria-hidden="true" />
              <span>{published ? 'Publicado no Concierge QR!' : 'Publicar Crowd-Drop Agora'}</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};

