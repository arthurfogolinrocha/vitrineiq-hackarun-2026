import React, { useEffect, useState } from 'react';
import {
  Filter,
  Gift,
  MapPin,
  Navigation,
  QrCode,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Ticket,
} from 'lucide-react';
import {
  ConsumerSignal,
  FlashCampaign,
  FloorId,
  SegmentCategory,
  ShoppingZone,
  StoreTenant,
  ZoneId,
} from '../types';
import { SEGMENT_LABELS, findStoreByName } from '../data/shoppingData';
import { StoreAvatar } from './StoreAvatar';

interface ConsumerConciergeProps {
  zones: ShoppingZone[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  campaigns: FlashCampaign[];
  signals: ConsumerSignal[];
  onSubmitConsumerSignal: (
    zoneId: ZoneId,
    query: string,
    budget: ConsumerSignal['budget'],
    segmento?: string,
    originZone?: ZoneId
  ) => Promise<ConsumerSignal>;
  onNavigateToStore?: (storeName: string, floor?: FloorId) => void;
  activeTenant?: StoreTenant | null;
  originZone?: ZoneId;
}

const QUICK_CHIPS = [
  'Presente criativo até R$ 150',
  'Tênis confortável / academia',
  'Almoço rápido sem fila no 2º piso',
  'Algo gelado pro calor de Palmas',
];

const ORIGIN_PINS: { label: string; zoneId: ZoneId }[] = [
  { label: 'Cinemark L2', zoneId: 'ala-lazer-cinema' },
  { label: 'Detran / PF / É Pra Já', zoneId: 'ala-sul-esporte' },
  { label: 'Praça L2', zoneId: 'praca-alimentacao-l2' },
  { label: 'Portaria P1 / Central', zoneId: 'ala-central-ancoras' },
];

function matchesOriginTrigger(
  campaign: FlashCampaign,
  originZoneId: ZoneId,
  originLabel?: string
): boolean {
  const trigger = (campaign.triggerOrigin ?? '').trim().toLowerCase();
  if (!trigger) return false;
  const targets = [originZoneId.toLowerCase(), (originLabel ?? '').toLowerCase()].filter(Boolean);
  return targets.some(
    (t) => trigger === t || (trigger.length >= 4 && (t.includes(trigger) || trigger.includes(t)))
  );
}

function resolveStoreFromOfferText(offerText: string, fallbackStore?: string): {
  storeName: string;
  logoUrl?: string;
} {
  const fromFull = findStoreByName(offerText);
  if (fromFull) return { storeName: fromFull.storeName, logoUrl: fromFull.logoUrl };

  const cleaned = offerText
    .replace(/^🎁\s*Bônus de Rota\s*•\s*/i, '')
    .split('—')[0]
    ?.split('•')[0]
    ?.replace(/Sugestão em/i, '')
    .trim();

  if (cleaned) {
    const fromPart = findStoreByName(cleaned);
    if (fromPart) return { storeName: fromPart.storeName, logoUrl: fromPart.logoUrl };
    return { storeName: cleaned, logoUrl: undefined };
  }

  if (fallbackStore) {
    const fromFallback = findStoreByName(fallbackStore);
    return { storeName: fromFallback?.storeName || fallbackStore, logoUrl: fromFallback?.logoUrl };
  }

  return { storeName: 'Capim Dourado', logoUrl: undefined };
}

export const ConsumerConcierge: React.FC<ConsumerConciergeProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  campaigns,
  signals,
  onSubmitConsumerSignal,
  onNavigateToStore,
  activeTenant,
  originZone,
}) => {
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState<ConsumerSignal['budget']>('80_200');
  const [segmentFilter, setSegmentFilter] = useState<SegmentCategory>('todos');
  const [selectedOriginZone, setSelectedOriginZone] = useState<ZoneId>(originZone ?? selectedZoneId);
  const [focusActiveTenant, setFocusActiveTenant] = useState<boolean>(Boolean(activeTenant));
  const [queryTouched, setQueryTouched] = useState(false);
  const [latestReward, setLatestReward] = useState<ConsumerSignal | null>(null);
  const [liveStatus, setLiveStatus] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminDemo, setShowAdminDemo] = useState(false);

  useEffect(() => {
    if (originZone) {
      setSelectedOriginZone(originZone);
    }
  }, [originZone]);

  useEffect(() => {
    setFocusActiveTenant(Boolean(activeTenant));
  }, [activeTenant?.id]);

  const isQueryInvalid = queryTouched && query.trim().length < 3;
  const activeOriginPin = ORIGIN_PINS.find((p) => p.zoneId === selectedOriginZone);

  const ofertasDaAla = campaigns
    .filter((c) => {
      if (!c.active) return false;
      if (focusActiveTenant && activeTenant) {
        const sameStore =
          c.storeName.trim().toLowerCase() === activeTenant.storeName.trim().toLowerCase();
        if (!sameStore) return false;
      } else {
        const isInZone = c.zoneId === selectedZoneId;
        const isRouteAlliance = matchesOriginTrigger(
          c,
          selectedOriginZone,
          activeOriginPin?.label
        );
        if (!isInZone && !isRouteAlliance) return false;
      }

      if (segmentFilter === 'todos') return true;
      const textMatch = `${c.storeName} ${c.title} ${c.whatsappCopy}`.toLowerCase();
      const segLabel = (SEGMENT_LABELS[segmentFilter] ?? '').toLowerCase();
      return (
        c.segmento === segmentFilter ||
        textMatch.includes(segmentFilter) ||
        (segLabel && textMatch.includes(segLabel.split(' ')[0]))
      );
    })
    .sort((a, b) => {
      const aBonus = matchesOriginTrigger(a, selectedOriginZone, activeOriginPin?.label) ? 1 : 0;
      const bBonus = matchesOriginTrigger(b, selectedOriginZone, activeOriginPin?.label) ? 1 : 0;
      return bBonus - aBonus;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQueryTouched(true);
    setSubmitError(null);
    if (query.trim().length < 3) {
      setLiveStatus('Erro: informe o que você procura com pelo menos 3 caracteres.');
      return;
    }
    if (isSubmitting) return;
    const targetZoneId = focusActiveTenant && activeTenant ? activeTenant.zoneId : selectedZoneId;
    setIsSubmitting(true);
    try {
      const created = await onSubmitConsumerSignal(
        targetZoneId,
        query.trim(),
        budget,
        segmentFilter === 'todos' ? undefined : segmentFilter,
        selectedOriginZone
      );
      setLatestReward(created);
      setLiveStatus(
        created.couponCode
          ? `Oferta encontrada: ${created.matchedOffer}. Cupom ${created.couponCode} liberado.`
          : 'Busca registrada. Nenhuma oferta ativa agora; avisaremos aqui quando uma loja publicar.'
      );
      setQuery('');
      setQueryTouched(false);
    } catch {
      const msg = 'Não foi possível buscar ofertas agora. Verifique sua conexão e tente novamente.';
      setSubmitError(msg);
      setLiveStatus(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const rewardStoreInfo = latestReward
    ? resolveStoreFromOfferText(
        latestReward.matchedOffer,
        focusActiveTenant && activeTenant ? activeTenant.storeName : undefined
      )
    : null;

  const rewardHasRouteBonus = Boolean(
    latestReward &&
      (latestReward.bonusRota ||
        latestReward.matchedOffer.toLowerCase().includes('bônus de rota') ||
        ofertasDaAla.some(
          (c) =>
            c.couponCode === latestReward.couponCode &&
            matchesOriginTrigger(c, selectedOriginZone, activeOriginPin?.label)
        ))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start panel-enter">
      <div className="visually-hidden" aria-live="polite">
        {liveStatus}
      </div>

      {/* Simulador Mobile-First Limpo (Ponta do Consumidor) */}
      <section className="lg:col-span-5 bento-card-cream rounded-3xl p-4 sm:p-6 space-y-5 max-w-md mx-auto w-full border-[#E2A83B]/35">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#0B0D12] border border-[#E2A83B]/40 text-[#F5C76B] shrink-0">
              <QrCode className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-[#0B0D12]">Concierge QR — Capim Dourado</h2>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Sem baixar app • Zero cadastro
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-mono font-bold border border-stone-200 shrink-0 whitespace-nowrap">
            Sem cadastro
          </span>
        </div>

        {activeTenant && (
          <div className="rounded-2xl bg-[#0B0D12] text-white border border-[#E2A83B]/45 p-3.5 space-y-2.5">
            <div className="flex items-center gap-3">
              <StoreAvatar
                storeName={activeTenant.storeName}
                logoUrl={activeTenant.logoUrl}
                variant="wide"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5C76B] flex items-center gap-1">
                  <Store className="w-3 h-3" aria-hidden="true" />
                  Loja Ativa no Totem
                </span>
                <strong className="text-xs font-extrabold text-white block truncate">
                  {activeTenant.storeName}
                </strong>
                <span className="text-[11px] text-stone-300 block truncate">
                  {activeTenant.floorLabel}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Escopo das ofertas do Concierge">
              <button
                type="button"
                aria-pressed={focusActiveTenant}
                onClick={() => setFocusActiveTenant(true)}
                className={`min-h-[44px] px-2.5 py-2 rounded-xl text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  focusActiveTenant
                    ? 'gold-pill-metallic'
                    : 'bg-white/10 text-stone-200 hover:bg-white/20'
                }`}
              >
                Focar {activeTenant.storeName}
              </button>
              <button
                type="button"
                aria-pressed={!focusActiveTenant}
                onClick={() => setFocusActiveTenant(false)}
                className={`min-h-[44px] px-2.5 py-2 rounded-xl text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  !focusActiveTenant
                    ? 'gold-pill-metallic'
                    : 'bg-white/10 text-stone-200 hover:bg-white/20'
                }`}
              >
                Ver todas do shopping
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
          <div className="space-y-2">
            <label htmlFor="qr-zone" className="block font-bold text-stone-700">
              Onde você está agora no shopping? (Origem / Aliança de Corredor)
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Atalhos de origem no Capim Dourado">
              {ORIGIN_PINS.map((pin) => {
                const isSelected = selectedOriginZone === pin.zoneId;
                return (
                  <button
                    key={pin.label}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedOriginZone(pin.zoneId);
                      if (!focusActiveTenant) {
                        onSelectZone(pin.zoneId);
                      }
                    }}
                    className={`min-h-[40px] px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      isSelected
                        ? 'bg-[#0B0D12] text-[#F5C76B] border-[#E2A83B]'
                        : 'bg-[#FAF8F5] text-stone-700 border-stone-300 hover:border-[#7A4B0A]'
                    }`}
                  >
                    <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{pin.label}</span>
                  </button>
                );
              })}
            </div>
            <select
              id="qr-zone"
              value={selectedZoneId}
              onChange={(e) => {
                const next = e.target.value as ZoneId;
                setSelectedOriginZone(next);
                onSelectZone(next);
              }}
              className="w-full min-h-[44px] bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2.5 text-[#0B0D12] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.shortName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="qr-segment" className="font-bold text-stone-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#7A4B0A]" aria-hidden="true" />
              <span>Filtrar por Segmento</span>
            </label>
            <select
              id="qr-segment"
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value as SegmentCategory)}
              className="w-full min-h-[44px] bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-[#0B0D12] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {Object.entries(SEGMENT_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="qr-query" className="block font-bold text-stone-700 mb-1">
              O que você procura ou achou das lojas hoje?
            </label>
            <span id="qr-query-hint" className="block text-[11px] text-stone-600 mb-1.5">
              Mínimo de 3 caracteres. Sua busca libera cupons na hora (não pedimos nome nem contato; não escreva dados pessoais).
            </span>
            <input
              id="qr-query"
              type="text"
              required
              minLength={3}
              aria-describedby={isQueryInvalid ? 'qr-query-hint qr-query-error' : 'qr-query-hint'}
              aria-invalid={isQueryInvalid ? 'true' : 'false'}
              data-error="qr-query-error"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (submitError) setSubmitError(null);
              }}
              onBlur={() => setQueryTouched(true)}
              onInvalid={() => setQueryTouched(true)}
              placeholder="Ex: Presente até R$ 150 ou camisa tamanho M"
              className={`w-full min-h-[44px] bg-[#FAF8F5] border rounded-xl px-3.5 py-2.5 text-[#0B0D12] placeholder-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isQueryInvalid ? 'user-invalid-fallback border-rose-500' : 'border-stone-300'
              }`}
            />
            <div
              id="qr-query-error"
              className={`error-msg text-[11px] text-rose-700 font-semibold mt-1 ${
                isQueryInvalid ? 'block' : 'hidden'
              }`}
            >
              <span role="img" aria-label="Erro">⚠️</span> Digite pelo menos 3 caracteres do que você procura.
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sugestões rápidas de busca">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setQuery(chip);
                  setQueryTouched(false);
                  setSubmitError(null);
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-[11px] text-stone-800 font-medium text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {chip}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="qr-budget" className="block font-bold text-stone-700 mb-1.5">
              Faixa de valor desejada
            </label>
            <select
              id="qr-budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value as ConsumerSignal['budget'])}
              className="w-full min-h-[44px] bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2.5 text-[#0B0D12] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <option value="ate_80">Até R$ 80</option>
              <option value="80_200">Entre R$ 80 e R$ 200</option>
              <option value="acima_200">Acima de R$ 200</option>
            </select>
          </div>

          {submitError && (
            <p
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
            >
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full min-h-[44px] py-3 rounded-xl gold-pill-metallic text-xs font-extrabold flex items-center justify-center gap-2 transition disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>{isSubmitting ? 'Buscando ofertas...' : 'Buscar oferta'}</span>
          </button>
        </form>

        {/* Cupons publicados pelo lojista chegam aqui pelo polling, sem o visitante recarregar (passo 5 do ciclo) */}
        {ofertasDaAla.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 text-xs" aria-live="polite">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-amber-600" aria-hidden="true" />
              {focusActiveTenant && activeTenant
                ? `Ofertas ativas de ${activeTenant.storeName}`
                : 'Ofertas relâmpago na sua rota agora'}
            </span>
            <div className="space-y-2.5">
              {ofertasDaAla.map((c) => {
                const isRouteBonus = matchesOriginTrigger(
                  c,
                  selectedOriginZone,
                  activeOriginPin?.label
                );
                const storeMeta = findStoreByName(c.storeName);
                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border bg-white space-y-2 transition ${
                      isRouteBonus
                        ? 'border-[#E2A83B] shadow-sm ring-1 ring-[#E2A83B]/35'
                        : 'border-amber-200/80'
                    }`}
                  >
                    {isRouteBonus && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0B0D12] text-[#F5C76B] border border-[#E2A83B]/50 text-[10px] font-extrabold">
                        <span>🎁 Bônus de Rota Desbloqueado</span>
                        {activeOriginPin && (
                          <span className="text-stone-300 font-semibold">
                            • Saída {activeOriginPin.label}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StoreAvatar
                          storeName={c.storeName}
                          logoUrl={storeMeta?.logoUrl}
                          variant="wide"
                        />
                        <div className="min-w-0">
                          <strong className="text-slate-900 block truncate">{c.storeName}</strong>
                          <span className="text-slate-700 font-medium block break-words">
                            {c.title} ({c.discountBadge})
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-black px-2 py-1 rounded-lg bg-amber-500 text-slate-950 shrink-0">
                        {c.couponCode}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {latestReward && !latestReward.couponCode && (
          <p role="status" className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            Busca registrada. Nenhuma oferta ativa nesta ala agora: se uma loja publicar, o cupom aparece aqui.
          </p>
        )}

        {latestReward && latestReward.couponCode && rewardStoreInfo && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                Cupom Desbloqueado!
              </span>
              <span className="font-mono font-black px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white">
                {latestReward.couponCode}
              </span>
            </div>

            {rewardHasRouteBonus && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0B0D12] text-[#F5C76B] border border-[#E2A83B]/50 text-[10px] font-extrabold">
                <span>🎁 Bônus de Rota Desbloqueado</span>
              </div>
            )}

            <div className="flex items-center gap-3 bg-white/80 rounded-xl p-2.5 border border-emerald-200/80">
              <StoreAvatar
                storeName={rewardStoreInfo.storeName}
                logoUrl={rewardStoreInfo.logoUrl}
                variant="wide"
              />
              <div className="min-w-0">
                <strong className="text-slate-900 block truncate">
                  {rewardStoreInfo.storeName}
                </strong>
                <p className="text-slate-700 font-semibold leading-snug">
                  {latestReward.matchedOffer}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-600">
              Sinal enviado anonimamente ao painel da ala em tempo real.
            </p>
            {onNavigateToStore && (
              <button
                type="button"
                onClick={() => {
                  const targetZone = zones.find((z) => z.id === latestReward.zoneId);
                  const store = rewardStoreInfo.storeName || targetZone?.anchors[0] || 'Renner';
                  const targetFloor = targetZone?.floor || 'L1';
                  onNavigateToStore(store, targetFloor);
                }}
                className="w-full min-h-[44px] mt-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Como Chegar / Ver no Mapa 3D</span>
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px]">
          <span className="text-slate-600">Fluxo público do totem</span>
          <button
            type="button"
            aria-expanded={showAdminDemo}
            onClick={() => setShowAdminDemo(!showAdminDemo)}
            className="min-h-[44px] px-2.5 py-1.5 rounded-lg font-bold text-amber-800 hover:text-amber-950 hover:bg-amber-50 flex items-center gap-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
            <span>{showAdminDemo ? 'Ocultar Painel Admin' : 'Modo Demonstração Admin'}</span>
          </button>
        </div>
      </section>

      {/* Explicação ao vivo do ciclo + feed de sinais recebidos (Visão Administrativa) */}
      {showAdminDemo ? (
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" aria-hidden="true" />
              Duas Pontas Conectadas (Cliente + Lojista)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ao enviar uma busca no <strong>Concierge QR</strong>, o visitante recebe um cupom na hora sem instalar aplicativo, enquanto o <strong>Painel do Lojista e o Mapa 3D</strong> recebem o sinal de demanda instantaneamente.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>Privacidade Garantida: nenhum nome, telefone ou CPF é solicitado ao consumidor.</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Gift className="w-4 h-4 text-blue-600" aria-hidden="true" />
              Últimas Buscas &amp; Cupons Liberados ({campaigns.filter((c) => c.active).length} cupons ativos)
            </h3>
            <ul className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 text-xs">
              {signals.map((sig) => {
                const sigStore = resolveStoreFromOfferText(sig.matchedOffer);
                return (
                  <li
                    key={sig.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <StoreAvatar
                        storeName={sigStore.storeName}
                        logoUrl={sigStore.logoUrl}
                        variant="wide"
                      />
                      <div className="min-w-0">
                        <strong className="text-slate-900 block">&ldquo;{sig.query}&rdquo;</strong>
                        <span className="text-slate-600 block truncate">{sig.matchedOffer}</span>
                        {sig.bonusRota && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#0B0D12] text-[#F5C76B] text-[10px] font-bold">
                            🎁 Bônus de Rota Desbloqueado
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-200 font-mono text-[11px] font-bold shrink-0">
                      {sig.couponCode}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <div className="lg:col-span-7 hidden lg:flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3 min-h-[360px]">
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700">
            <QrCode className="w-7 h-7" aria-hidden="true" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-sm font-extrabold text-slate-800">Visualização Pública do Totem / QR</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No totem do shopping, os controles de governança e os sinais de outros usuários ficam ocultos por padrão para preservar a privacidade e o foco do cliente.
            </p>
          </div>
          <button
            type="button"
            aria-expanded={showAdminDemo}
            onClick={() => setShowAdminDemo(true)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-xs flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            <span>Ativar Modo Demonstração Administrativa (2 Pontas)</span>
          </button>
        </div>
      )}
    </div>
  );
};
