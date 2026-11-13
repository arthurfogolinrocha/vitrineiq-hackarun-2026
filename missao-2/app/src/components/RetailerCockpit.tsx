import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Camera,
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
  VisionFunnelSnapshot,
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
  visionSnapshot?: VisionFunnelSnapshot;
  onOpenVision?: () => void;
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
  visionSnapshot,
  onOpenVision,
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
    if (!dialog) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
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
      {/* KPIs Executivos Claros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SpotlightCard className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
            Fluxo Estimado / Hora
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalTraffic}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Todas as alas monitoradas</span>
        </SpotlightCard>

        <SpotlightCard className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
            Score Oportunidade ({current.zone.floor})
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
            {current.opportunityScore}
            <span className="text-xs font-semibold text-slate-400"> / 100</span>
          </div>
          <span className="text-[11px] text-slate-500">Multiplicador contextual {current.multiplier}x</span>
        </SpotlightCard>

        <SpotlightCard className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
            Vendas Perdidas Capturadas
          </span>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">{totalLost}</div>
          <span className="text-[11px] text-slate-500">Objeções reais via Balcão</span>
        </SpotlightCard>

        <SpotlightCard className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
            Campanhas Ativas no QR
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{activeCampaignsCount}</div>
          <span className="text-[11px] text-slate-500">Visíveis ao cliente agora</span>
        </SpotlightCard>
      </div>

      {/* Faixa de Alimentação Ao Vivo da Câmera / Webcam */}
      {visionSnapshot && (
        <div className="bg-white border border-emerald-200 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Câmera na Vitrine ({visionSnapshot.sourceMode === 'webcam_live' ? 'Webcam Real Conectada' : 'Sensor Simulado'})
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Alimentando Painel
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Passantes: <strong className="text-slate-900">{visionSnapshot.passersBy}</strong> • Paradas (&gt;3s): <strong className="text-amber-700">{visionSnapshot.vitrineStops}</strong> • Entradas: <strong className="text-emerald-700">{visionSnapshot.entries}</strong> • Passaram sem entrar: <strong className="text-rose-700">{visionSnapshot.passedWithoutEntering}</strong>
              </p>
            </div>
          </div>

          {onOpenVision && (
            <button
              type="button"
              onClick={onOpenVision}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Abrir Câmera / Webcam</span>
            </button>
          )}
        </div>
      )}

      {/* Simulador Contextual + Painel de Decisão IA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Contexto do Shopping & Seletor de Ala */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-600" aria-hidden="true" />
              Cenário do Shopping
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ajuste clima, horário e eventos para recalibrar prioridades da sua ala.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label htmlFor="cockpit-zone" className="block font-bold text-slate-700 mb-1.5">
                Sua Ala / Segmento
              </label>
              <select
                id="cockpit-zone"
                value={selectedZoneId}
                onChange={(e) => onSelectZone(e.target.value as ZoneId)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
              >
                {zonesTelemetry.map((t) => (
                  <option key={t.zone.id} value={t.zone.id}>
                    {t.zone.shortName} (IQ {t.opportunityScore})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ctx-weather" className="block font-bold text-slate-700 mb-1.5">
                Clima em Palmas - TO
              </label>
              <select
                id="ctx-weather"
                value={factors.weather}
                onChange={(e) =>
                  onChangeFactors({ ...factors, weather: e.target.value as WeatherCondition })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
              >
                <option value="calor_38c">Calor Intenso (38°C — Pico em Shopping)</option>
                <option value="chuva_forte">Chuva Forte (Retenção Cinema/Lazer)</option>
                <option value="ameno">Clima Ameno</option>
              </select>
            </div>

            <div>
              <label htmlFor="ctx-time" className="block font-bold text-slate-700 mb-1.5">
                Horário do Dia
              </label>
              <select
                id="ctx-time"
                value={factors.timeSlot}
                onChange={(e) =>
                  onChangeFactors({ ...factors, timeSlot: e.target.value as TimeSlot })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
              >
                <option value="manha">Manhã (10h – 12h)</option>
                <option value="almoco">Almoço Executivo (12h – 14h)</option>
                <option value="pos_trabalho">Pós-Trabalho (17h – 19h)</option>
                <option value="pos_cinema_20h">Pós-Cinema &amp; Noite (20h – 22h)</option>
              </select>
            </div>

            <div>
              <label htmlFor="ctx-event" className="block font-bold text-slate-700 mb-1.5">
                Evento no Shopping
              </label>
              <select
                id="ctx-event"
                value={factors.mallEvent}
                onChange={(e) =>
                  onChangeFactors({ ...factors, mallEvent: e.target.value as MallEvent })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium"
              >
                <option value="estreia_cinemark">Estreia no Cinemark</option>
                <option value="fim_de_semana">Fim de Semana / Família</option>
                <option value="dia_pagamento">Semana de Pagamento</option>
                <option value="fluxo_normal">Dia Comum</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span>Conversão estimada:</span>
              <strong className="text-emerald-700">{current.conversionRate}%</strong>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>Principal objeção:</span>
              <strong className="text-rose-700">{LOST_SALE_LABELS[current.dominantReason]}</strong>
            </div>
            <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
              {factors.weather === 'calor_38c' ? (
                <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
              ) : (
                <CloudRain className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
              )}
              <span>Em alta: {current.zone.hotSearches.join(' • ')}</span>
            </div>
          </div>
        </section>

        {/* Coluna Direita: Copiloto IA & Ações */}
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" aria-hidden="true" />
                  Copiloto Comercial (IA)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transforma os dados da {current.zone.shortName} em plano prático para vender mais hoje.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onRunCopilot(current)}
                  disabled={isAnalyzing}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 transition"
                >
                  {isAnalyzing ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Gerando Plano...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-400" aria-hidden="true" />
                      <span>Gerar Plano com IA</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={openCampaignModal}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-sm transition"
                >
                  <Megaphone className="w-4 h-4" aria-hidden="true" />
                  <span>Criar Campanha Relâmpago</span>
                </button>
              </div>
            </div>

            {lastAnalysis ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {lastAnalysis.content}
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Motor: {lastAnalysis.cached ? 'Heurístico Resiliente VitrineIQ' : 'Google Gemini 3.8 Flash Live'}
                  </span>
                  <span>
                    Latência: {lastAnalysis.latencyMs}ms • Confiança: {Math.round(lastAnalysis.confidence * 100)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                <Flame className="w-8 h-8 text-amber-600 mx-auto" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-900">
                  Pronto para diagnosticar {current.zone.shortName}
                </p>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Clique em <strong>&ldquo;Gerar Plano com IA&rdquo;</strong> para transformar os {current.qrSearchCount} sinais QR e {current.lostSalesCount} objeções de balcão em ação imediata.
                </p>
              </div>
            )}
          </div>

          {/* Campanhas Ativas */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Campanhas Ativas no Concierge QR ({campaigns.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {campaigns.slice(0, 4).map((camp) => (
                <div
                  key={camp.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <strong className="text-slate-900 block">{camp.title}</strong>
                    <span className="text-slate-500">{camp.storeName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-bold shrink-0">
                    {camp.couponCode}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Modal Nativo <dialog> Claro para Campanha Relâmpago */}
      <dialog
        ref={dialogRef}
        aria-labelledby="campaign-dialog-title"
        closedby="any"
        className="w-full max-w-md rounded-2xl bg-white border border-slate-200 text-slate-900 p-6 shadow-2xl"
      >
        <h2 id="campaign-dialog-title" className="text-base font-extrabold text-slate-900 mb-1">
          Publicar Campanha Relâmpago
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Consumidores escaneando o QR Code na <strong>{current.zone.shortName}</strong> já recebem este cupom na hora.
        </p>

        <form onSubmit={handleConfirmCampaign} className="space-y-4 text-xs">
          <div>
            <label htmlFor="camp-store" className="block font-bold text-slate-700 mb-1">
              Nome da Loja
            </label>
            <input
              id="camp-store"
              type="text"
              required
              autoFocus
              value={campStore}
              onChange={(e) => setCampStore(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="camp-title" className="block font-bold text-slate-700 mb-1">
              Título da Oferta
            </label>
            <input
              id="camp-title"
              type="text"
              required
              value={campTitle}
              onChange={(e) => setCampTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="camp-badge" className="block font-bold text-slate-700 mb-1">
                Benefício
              </label>
              <input
                id="camp-badge"
                type="text"
                required
                value={campBadge}
                onChange={(e) => setCampBadge(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="camp-code" className="block font-bold text-slate-700 mb-1">
                Código do Cupom
              </label>
              <input
                id="camp-code"
                type="text"
                required
                value={campCode}
                onChange={(e) => setCampCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono uppercase text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close('cancel')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold"
            >
              Publicar Agora
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};
