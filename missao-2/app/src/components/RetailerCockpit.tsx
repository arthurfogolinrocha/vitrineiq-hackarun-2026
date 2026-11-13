import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  CloudRain,
  Flame,
  Megaphone,
  Sparkles,
  Sun,
  Thermometer,
  Zap,
} from 'lucide-react';
import {
  AIAnalysisResponse,
  FlashCampaign,
  MallEvent,
  ShopContextFactors,
  TimeSlot,
  WeatherCondition,
  ZoneId,
} from '../types';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import { LOST_SALE_LABELS } from '../data/shoppingData';
import { SpotlightCard } from './SpotlightCard';

interface RetailerCockpitProps {
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  factors: ShopContextFactors;
  onChangeFactors: (next: ShopContextFactors) => void;
  campaigns: FlashCampaign[];
  onLaunchCampaign: (campaign: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>) => void;
  onRunCopilot: (telemetry: ZoneLiveTelemetry) => Promise<void>;
  isAnalyzing: boolean;
  lastAnalysis: AIAnalysisResponse | null;
}

export const RetailerCockpit: React.FC<RetailerCockpitProps> = ({
  zonesTelemetry,
  selectedZoneId,
  onSelectZone,
  factors,
  onChangeFactors,
  campaigns,
  onLaunchCampaign,
  onRunCopilot,
  isAnalyzing,
  lastAnalysis,
}) => {
  const current =
    zonesTelemetry.find((t) => t.zone.id === selectedZoneId) || zonesTelemetry[0];

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [campStore, setCampStore] = useState('Vitrine Piloto — Capim Dourado');
  const [campTitle, setCampTitle] = useState('Oferta Relâmpago: 15% OFF Agora');
  const [campBadge, setCampBadge] = useState('15% OFF (2h)');
  const [campCode, setCampCode] = useState('VITRINE15');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) dialog.close();
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const totalTraffic = zonesTelemetry.reduce((acc, t) => acc + t.footTraffic, 0);
  const totalLost = zonesTelemetry.reduce((acc, t) => acc + t.lostSalesCount, 0);
  const activeCampaignsCount = campaigns.filter((c) => c.active).length;

  const openCampaignModal = () => {
    setCampTitle(`Combo Relâmpago — ${current.zone.shortName}`);
    setCampCode(`VIQ-${current.zone.floor}-${Math.floor(10 + Math.random() * 89)}`);
    dialogRef.current?.showModal();
  };

  const handleConfirmCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campTitle.trim() || !campCode.trim()) return;
    onLaunchCampaign({
      zoneId: current.zone.id,
      storeName: campStore.trim() || 'Loja Capim Dourado',
      title: campTitle.trim(),
      discountBadge: campBadge.trim() || 'OFERTA HOJE',
      couponCode: campCode.trim().toUpperCase(),
      whatsappCopy: `⚡ ${campTitle.trim()} no Capim Dourado Shopping! Use o código ${campCode.trim().toUpperCase()} nas próximas 2 horas.`,
      expiresInMinutes: 120,
    });
    if (dialogRef.current) {
      dialogRef.current.returnValue = '';
      dialogRef.current.close();
    }
  };

  return (
    <div className="space-y-6 panel-enter">
      {/* KPIs Macro do Shopping */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SpotlightCard className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Fluxo Estimado / Hora
          </span>
          <div className="text-2xl font-black text-white mt-1">{totalTraffic}</div>
          <span className="text-[11px] text-emerald-400">Todas as alas monitoradas</span>
        </SpotlightCard>

        <SpotlightCard className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Score Oportunidade ({current.zone.floor})
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {current.opportunityScore}
            <span className="text-xs font-normal text-slate-400"> / 100</span>
          </div>
          <span className="text-[11px] text-slate-400">Multiplicador contextual {current.multiplier}x</span>
        </SpotlightCard>

        <SpotlightCard className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Vendas Perdidas Capturadas
          </span>
          <div className="text-2xl font-black text-rose-400 mt-1">{totalLost}</div>
          <span className="text-[11px] text-slate-400">Objeções reais via Modo Balcão</span>
        </SpotlightCard>

        <SpotlightCard className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            Campanhas Ativas no QR
          </span>
          <div className="text-2xl font-black text-sky-400 mt-1">{activeCampaignsCount}</div>
          <span className="text-[11px] text-slate-400">Visíveis ao consumidor agora</span>
        </SpotlightCard>
      </div>

      {/* Simulador Contextual + Painel de Decisão IA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Contexto do Shopping & Seletor de Ala */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-400" aria-hidden="true" />
              Fatores de Desempenho (Ao Vivo)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Simule mudanças de clima, horário e eventos do shopping para ver a IA recalibrar as prioridades.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label htmlFor="cockpit-zone" className="block font-semibold text-slate-300 mb-1.5">
                Ala / Segmento Analisado
              </label>
              <select
                id="cockpit-zone"
                value={selectedZoneId}
                onChange={(e) => onSelectZone(e.target.value as ZoneId)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100"
              >
                {zonesTelemetry.map((t) => (
                  <option key={t.zone.id} value={t.zone.id}>
                    {t.zone.shortName} (IQ {t.opportunityScore})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ctx-weather" className="block font-semibold text-slate-300 mb-1.5">
                Clima em Palmas - TO
              </label>
              <select
                id="ctx-weather"
                value={factors.weather}
                onChange={(e) =>
                  onChangeFactors({ ...factors, weather: e.target.value as WeatherCondition })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100"
              >
                <option value="calor_38c">Calor Intenso (38°C — Pico em Shopping)</option>
                <option value="chuva_forte">Chuva Forte (Retenção Indoor Cinema/Lazer)</option>
                <option value="ameno">Clima Ameno</option>
              </select>
            </div>

            <div>
              <label htmlFor="ctx-time" className="block font-semibold text-slate-300 mb-1.5">
                Janela de Horário
              </label>
              <select
                id="ctx-time"
                value={factors.timeSlot}
                onChange={(e) =>
                  onChangeFactors({ ...factors, timeSlot: e.target.value as TimeSlot })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100"
              >
                <option value="manha">Manhã (10h – 12h)</option>
                <option value="almoco">Almoço Executivo (12h – 14h)</option>
                <option value="pos_trabalho">Pós-Trabalho (17h – 19h)</option>
                <option value="pos_cinema_20h">Pós-Cinema &amp; Noite (20h – 22h)</option>
              </select>
            </div>

            <div>
              <label htmlFor="ctx-event" className="block font-semibold text-slate-300 mb-1.5">
                Evento / Calendário do Shopping
              </label>
              <select
                id="ctx-event"
                value={factors.mallEvent}
                onChange={(e) =>
                  onChangeFactors({ ...factors, mallEvent: e.target.value as MallEvent })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100"
              >
                <option value="estreia_cinemark">Estreia no Cinemark</option>
                <option value="fim_de_semana">Fim de Semana / Família</option>
                <option value="dia_pagamento">Semana de Pagamento (Quinto Dia Útil)</option>
                <option value="fluxo_normal">Dia Comum</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span>Conversão estimada:</span>
              <strong className="text-emerald-400">{current.conversionRate}%</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Principal objeção:</span>
              <strong className="text-rose-300">{LOST_SALE_LABELS[current.dominantReason]}</strong>
            </div>
            <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
              {factors.weather === 'calor_38c' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              ) : (
                <CloudRain className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              )}
              <span>Buscas quentes: {current.zone.hotSearches.join(' • ')}</span>
            </div>
          </div>
        </section>

        {/* Coluna Direita: Copiloto IA & Ações em 1 Clique */}
        <section className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" aria-hidden="true" />
                  Copiloto Comercial VitrineIQ (Gemini)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cruza buscas anônimas da {current.zone.shortName}, vendas perdidas e contexto para gerar ação imediata.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onRunCopilot(current)}
                  disabled={isAnalyzing}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition"
                >
                  {isAnalyzing ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Gerando Plano...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" aria-hidden="true" />
                      <span>Gerar Plano de Ação com IA</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={openCampaignModal}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition"
                >
                  <Megaphone className="w-4 h-4" aria-hidden="true" />
                  <span>Ativar Campanha Relâmpago</span>
                </button>
              </div>
            </div>

            {lastAnalysis ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {lastAnalysis.content}
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Motor: {lastAnalysis.cached ? 'Heurístico Resiliente VitrineIQ' : 'Google Gemini 3.8 Flash Live'}
                  </span>
                  <span>
                    Latência: {lastAnalysis.latencyMs}ms • Confiança: {Math.round(lastAnalysis.confidence * 100)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950/70 border border-dashed border-slate-700 text-center space-y-2">
                <Flame className="w-8 h-8 text-amber-400 mx-auto" aria-hidden="true" />
                <p className="text-sm font-semibold text-white">
                  Pronto para diagnosticar {current.zone.shortName}
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Clique em <strong>&ldquo;Gerar Plano de Ação com IA&rdquo;</strong> para transformar os {current.qrSearchCount} sinais QR e as {current.lostSalesCount} vendas perdidas em estratégia imediata.
                </p>
              </div>
            )}
          </div>

          {/* Campanhas Ativas */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Campanhas Relâmpago Conectadas ao Concierge QR ({campaigns.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {campaigns.slice(0, 4).map((camp) => (
                <div
                  key={camp.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <strong className="text-white block">{camp.title}</strong>
                    <span className="text-slate-400">{camp.storeName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] shrink-0">
                    {camp.couponCode}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Modal Nativo <dialog> para Ativação de Campanha Relâmpago */}
      <dialog
        ref={dialogRef}
        aria-labelledby="campaign-dialog-title"
        closedby="any"
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 text-slate-100 p-6 shadow-2xl"
      >
        <h2 id="campaign-dialog-title" className="text-base font-bold text-white mb-1">
          Publicar Campanha Relâmpago no Concierge QR
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Assim que publicar, consumidores escaneando o QR Code na <strong>{current.zone.shortName}</strong> já recebem este cupom.
        </p>

        <form onSubmit={handleConfirmCampaign} className="space-y-4 text-xs">
          <div>
            <label htmlFor="camp-store" className="block font-semibold text-slate-300 mb-1">
              Nome da Loja
            </label>
            <input
              id="camp-store"
              type="text"
              required
              autoFocus
              value={campStore}
              onChange={(e) => setCampStore(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="camp-title" className="block font-semibold text-slate-300 mb-1">
              Título da Oferta
            </label>
            <input
              id="camp-title"
              type="text"
              required
              value={campTitle}
              onChange={(e) => setCampTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="camp-badge" className="block font-semibold text-slate-300 mb-1">
                Benefício
              </label>
              <input
                id="camp-badge"
                type="text"
                required
                value={campBadge}
                onChange={(e) => setCampBadge(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="camp-code" className="block font-semibold text-slate-300 mb-1">
                Código do Cupom
              </label>
              <input
                id="camp-code"
                type="text"
                required
                value={campCode}
                onChange={(e) => setCampCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono uppercase text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close('cancel')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              Publicar Agora
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};
