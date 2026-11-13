import React, { useState } from 'react';
import {
  Gift,
  Navigation,
  QrCode,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { ConsumerSignal, FlashCampaign, FloorId, ShoppingZone, ZoneId } from '../types';

interface ConsumerConciergeProps {
  zones: ShoppingZone[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  campaigns: FlashCampaign[];
  signals: ConsumerSignal[];
  onSubmitConsumerSignal: (
    zoneId: ZoneId,
    query: string,
    budget: ConsumerSignal['budget']
  ) => Promise<ConsumerSignal>;
  onNavigateToStore?: (storeName: string, floor?: FloorId) => void;
}

const QUICK_CHIPS = [
  'Presente criativo até R$ 150',
  'Tênis confortável / academia',
  'Almoço rápido sem fila no 2º piso',
  'Algo gelado pro calor de Palmas',
];

export const ConsumerConcierge: React.FC<ConsumerConciergeProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  campaigns,
  signals,
  onSubmitConsumerSignal,
  onNavigateToStore,
}) => {
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState<ConsumerSignal['budget']>('80_200');
  const [queryTouched, setQueryTouched] = useState(false);
  const [latestReward, setLatestReward] = useState<ConsumerSignal | null>(null);
  const [liveStatus, setLiveStatus] = useState('');
  const [showAdminDemo, setShowAdminDemo] = useState(false);

  const isQueryInvalid = queryTouched && query.trim().length < 3;

  const ofertasDaAla = campaigns.filter((c) => c.active && c.zoneId === selectedZoneId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQueryTouched(true);
    if (query.trim().length < 3) {
      setLiveStatus('Erro: informe o que você procura com pelo menos 3 caracteres.');
      return;
    }
    const created = await onSubmitConsumerSignal(selectedZoneId, query.trim(), budget);
    setLatestReward(created);
    setLiveStatus(
      created.couponCode
        ? `Oferta encontrada: ${created.matchedOffer}. Cupom ${created.couponCode} liberado.`
        : 'Busca registrada. Nenhuma oferta ativa agora; avisaremos aqui quando uma loja publicar.'
    );
    setQuery('');
    setQueryTouched(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start panel-enter">
      <div className="visually-hidden" aria-live="polite">
        {liveStatus}
      </div>

      {/* Simulador Mobile-First Limpo (Ponta do Consumidor) */}
      <section className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-5 max-w-md mx-auto w-full">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
              <QrCode className="w-5 h-5 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Concierge QR — Capim Dourado</h2>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Sem baixar app • Zero cadastro
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200 shrink-0 whitespace-nowrap">
            LGPD OK
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
          <div>
            <label htmlFor="qr-zone" className="block font-bold text-slate-700 mb-1.5">
              Onde você está agora no shopping?
            </label>
            <select
              id="qr-zone"
              value={selectedZoneId}
              onChange={(e) => onSelectZone(e.target.value as ZoneId)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.shortName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="qr-query" className="block font-bold text-slate-700 mb-1">
              O que você procura ou achou das lojas hoje?
            </label>
            <span id="qr-query-hint" className="block text-[11px] text-slate-500 mb-1.5">
              Mínimo de 3 caracteres. Sua busca libera cupons na hora (100% anônimo).
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
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setQueryTouched(true)}
              onInvalid={() => setQueryTouched(true)}
              placeholder="Ex: Presente até R$ 150 ou camisa tamanho M"
              className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 ${
                isQueryInvalid ? 'user-invalid-fallback border-rose-500' : 'border-slate-300'
              }`}
            />
            <div
              id="qr-query-error"
              className={`error-msg text-[11px] text-rose-600 font-semibold mt-1 ${
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
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] text-slate-700 font-medium transition"
              >
                {chip}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="qr-budget" className="block font-bold text-slate-700 mb-1.5">
              Faixa de valor desejada
            </label>
            <select
              id="qr-budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value as ConsumerSignal['budget'])}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
            >
              <option value="ate_80">Até R$ 80</option>
              <option value="80_200">Entre R$ 80 e R$ 200</option>
              <option value="acima_200">Acima de R$ 200</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>Buscar oferta</span>
          </button>
        </form>

        {/* Cupons publicados pelo lojista chegam aqui pelo polling, sem o visitante recarregar (passo 5 do ciclo) */}
        {ofertasDaAla.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs" aria-live="polite">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-amber-600" aria-hidden="true" />
              Ofertas relâmpago na sua ala agora
            </span>
            {ofertasDaAla.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <span className="text-slate-900 font-semibold">
                  {c.storeName} — {c.title} ({c.discountBadge})
                </span>
                <span className="font-mono font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950 shrink-0">
                  {c.couponCode}
                </span>
              </div>
            ))}
          </div>
        )}

        {latestReward && !latestReward.couponCode && (
          <p role="status" className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            Busca registrada. Nenhuma oferta ativa nesta ala agora: se uma loja publicar, o cupom aparece aqui.
          </p>
        )}

        {latestReward && latestReward.couponCode && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                Cupom Desbloqueado!
              </span>
              <span className="font-mono font-black px-2 py-0.5 rounded bg-emerald-600 text-white">
                {latestReward.couponCode}
              </span>
            </div>
            <p className="text-slate-900 font-semibold">{latestReward.matchedOffer}</p>
            <p className="text-[11px] text-slate-600">
              Sinal enviado anonimamente ao painel da ala em tempo real.
            </p>
            {onNavigateToStore && (
              <button
                type="button"
                onClick={() => {
                  const rawStore = latestReward.matchedOffer
                    .split('—')[0]
                    ?.split('•')[0]
                    ?.replace('Sugestão em', '')
                    .trim();
                  const targetZone = zones.find((z) => z.id === latestReward.zoneId);
                  const store = rawStore || targetZone?.anchors[0] || 'Renner';
                  const targetFloor = targetZone?.floor || 'L1';
                  onNavigateToStore(store, targetFloor);
                }}
                className="w-full mt-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Como Chegar / Ver no Mapa 3D</span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px]">
          <span className="text-slate-500">Fluxo público do totem</span>
          <button
            type="button"
            onClick={() => setShowAdminDemo(!showAdminDemo)}
            className="font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition"
          >
            <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
            <span>{showAdminDemo ? 'Ocultar Painel Admin' : 'Modo Demonstração Admin'}</span>
          </button>
        </div>
      </section>

      {/* Explicação ao vivo do ciclo + feed de sinais recebidos (Visão Administrativa) */}
      {showAdminDemo ? (
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
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

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Gift className="w-4 h-4 text-blue-600" aria-hidden="true" />
              Últimas Buscas &amp; Cupons Liberados ({campaigns.filter((c) => c.active).length} cupons ativos)
            </h3>
            <ul className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 text-xs">
              {signals.map((sig) => (
                <li
                  key={sig.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div>
                    <strong className="text-slate-900 block">&ldquo;{sig.query}&rdquo;</strong>
                    <span className="text-slate-600">{sig.matchedOffer}</span>
                  </div>
                  <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-200 font-mono text-[11px] font-bold shrink-0">
                    {sig.couponCode}
                  </span>
                </li>
              ))}
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
            <p className="text-xs text-slate-500 leading-relaxed">
              No totem do shopping, os controles de governança e os sinais de outros usuários ficam ocultos por padrão para preservar a privacidade e o foco do cliente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdminDemo(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-xs flex items-center gap-1.5 transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            <span>Ativar Modo Demonstração Administrativa (2 Pontas)</span>
          </button>
        </div>
      )}
    </div>
  );
};
