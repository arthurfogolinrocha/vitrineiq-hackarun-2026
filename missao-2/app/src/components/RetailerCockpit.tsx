import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Camera,
  Check,
  CloudRain,
  Clock,
  Copy,
  Eye,
  Flame,
  Footprints,
  Megaphone,
  Pause,
  Play,
  Search,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  Users,
  X,
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
import { stripMarkdown } from '../services/ai';

interface RetailerCockpitProps {
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  factors: ShopContextFactors;
  onChangeFactors: (next: ShopContextFactors) => void;
  campaigns: FlashCampaign[];
  onLaunchCampaign: (campaign: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>) => void;
  onToggleCampaign?: (id: string) => void;
  onDeleteCampaign?: (id: string) => void;
  onRunCopilot: (telemetry: ZoneLiveTelemetry) => Promise<void>;
  isAnalyzing: boolean;
  lastAnalysis: AIAnalysisResponse | null;
  visionSnapshot?: VisionFunnelSnapshot;
  onOpenVision?: () => void;
}

const WEATHER_OPTIONS: { value: WeatherCondition; label: string; icon: 'sun' | 'rain' | 'mild' }[] = [
  { value: 'calor_38c', label: 'Sol 38°C', icon: 'sun' },
  { value: 'chuva_forte', label: 'Chuva Forte', icon: 'rain' },
  { value: 'ameno', label: 'Ameno', icon: 'mild' },
];

const TIME_SLOTS: { value: TimeSlot; label: string; range: string }[] = [
  { value: 'manha', label: 'Manhã', range: '10h–12h' },
  { value: 'almoco', label: 'Almoço', range: '12h–15h' },
  { value: 'pos_trabalho', label: 'Tarde', range: '16h–19h' },
  { value: 'pos_cinema_20h', label: 'Pico Noite', range: '19h–22h' },
];

const EVENT_OPTIONS: { value: MallEvent; label: string }[] = [
  { value: 'estreia_cinemark', label: 'Estreia Cinemark' },
  { value: 'fim_de_semana', label: 'Fim de Semana' },
  { value: 'dia_pagamento', label: 'Dia de Pagamento' },
  { value: 'fluxo_normal', label: 'Fluxo Normal' },
];

const HOURLY_PROFILE: { hour: string; slot: TimeSlot; weight: number }[] = [
  { hour: '10h', slot: 'manha', weight: 0.36 },
  { hour: '11h', slot: 'manha', weight: 0.48 },
  { hour: '12h', slot: 'almoco', weight: 0.78 },
  { hour: '13h', slot: 'almoco', weight: 0.86 },
  { hour: '14h', slot: 'almoco', weight: 0.65 },
  { hour: '15h', slot: 'pos_trabalho', weight: 0.58 },
  { hour: '16h', slot: 'pos_trabalho', weight: 0.68 },
  { hour: '17h', slot: 'pos_trabalho', weight: 0.81 },
  { hour: '18h', slot: 'pos_trabalho', weight: 0.92 },
  { hour: '19h', slot: 'pos_cinema_20h', weight: 1.0 },
  { hour: '20h', slot: 'pos_cinema_20h', weight: 0.96 },
  { hour: '21h', slot: 'pos_cinema_20h', weight: 0.74 },
  { hour: '22h', slot: 'pos_cinema_20h', weight: 0.44 },
];

export const RetailerCockpit: React.FC<RetailerCockpitProps> = ({
  zonesTelemetry,
  selectedZoneId,
  onSelectZone,
  factors,
  onChangeFactors,
  campaigns,
  onLaunchCampaign,
  onToggleCampaign,
  onDeleteCampaign,
  onRunCopilot,
  isAnalyzing,
  lastAnalysis,
  visionSnapshot,
  onOpenVision,
}) => {
  const current =
    zonesTelemetry.find((z) => z.zone.id === selectedZoneId) ?? zonesTelemetry[0];

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [storeName, setStoreName] = useState(current.zone.anchors[0] || 'Loja Âncora');
  const [title, setTitle] = useState('Combo Pós-Cinema 2h Relâmpago');
  const [discountBadge, setDiscountBadge] = useState('15% OFF');
  const [couponCode, setCouponCode] = useState('CAPIM15');
  const [whatsappCopy, setWhatsappCopy] = useState(
    'Só nas próximas 2 horas no Capim Dourado: apresente CAPIM15 e ganhe 15% OFF em peças selecionadas!'
  );
  const [expiresInMinutes, setExpiresInMinutes] = useState(120);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fator de escala horária baseado na barra clicada (User Story #01)
  const selectedHourBar = HOURLY_PROFILE.find((b) => b.slot === factors.timeSlot);
  const [selectedBarWeight, setSelectedBarWeight] = useState<number>(
    selectedHourBar?.weight ?? 1.0
  );

  useEffect(() => {
    const match = HOURLY_PROFILE.find((b) => b.slot === factors.timeSlot);
    if (match) setSelectedBarWeight(match.weight);
  }, [factors.timeSlot]);

  // Recálculo dinâmico do fluxo horário e do Score IQ
  const effectiveFootTraffic = Math.round(current.footTraffic * selectedBarWeight);
  const effectiveScore = Math.max(
    0,
    Math.min(100, Math.round(current.opportunityScore * (0.35 + 0.65 * selectedBarWeight)))
  );

  useEffect(() => {
    setStoreName(current.zone.anchors[0] || 'Loja Âncora');
  }, [current.zone.id, current.zone.anchors]);

  const openModal = () => {
    setValidationError(null);
    dialogRef.current?.showModal();
  };
  const closeModal = () => {
    setValidationError(null);
    dialogRef.current?.close();
  };

  const handleSubmitCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      storeName.trim().length === 0 ||
      title.trim().length === 0 ||
      couponCode.trim().length === 0 ||
      discountBadge.trim().length === 0 ||
      whatsappCopy.trim().length === 0
    ) {
      setValidationError('Todos os campos são obrigatórios e não podem conter apenas espaços em branco.');
      return;
    }
    setValidationError(null);
    onLaunchCampaign({
      zoneId: current.zone.id,
      storeName: storeName.trim(),
      title: title.trim(),
      discountBadge: discountBadge.trim() || 'OFERTA',
      couponCode: couponCode.trim().toUpperCase(),
      whatsappCopy: whatsappCopy.trim(),
      expiresInMinutes,
    });
    closeModal();
  };

  const handleCopyCopywriting = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(id);
    }
  };

  // Medidor Circular SVG (Score IQ 0-100)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, effectiveScore));
  const strokeOffset = circumference - (clampedScore / 100) * circumference;

  // Dados do Funil Físico (Câmera ao vivo ou projeção estatística da ala com peso horário)
  const isCamActiveHere = Boolean(visionSnapshot && visionSnapshot.zoneId === current.zone.id);
  const corridorTotal =
    isCamActiveHere && visionSnapshot && visionSnapshot.passersBy > 0
      ? visionSnapshot.passersBy
      : effectiveFootTraffic;
  const stopsTotal =
    isCamActiveHere && visionSnapshot && visionSnapshot.vitrineStops > 0
      ? visionSnapshot.vitrineStops
      : Math.round(current.vitrineStops * selectedBarWeight);
  const entriesTotal =
    isCamActiveHere && visionSnapshot && visionSnapshot.entries > 0
      ? visionSnapshot.entries
      : Math.max(12, Math.round(stopsTotal * 0.42));
  const conversionsTotal = Math.max(
    4,
    Math.round((entriesTotal * current.conversionRate) / 100)
  );
  const stopRatePct = corridorTotal > 0 ? Math.min(100, Math.round((stopsTotal / corridorTotal) * 100)) : 0;
  const entryRatePct = corridorTotal > 0 ? Math.min(100, Math.round((entriesTotal / corridorTotal) * 100)) : 0;
  const convBarPct = corridorTotal > 0 ? Math.min(100, Math.round((conversionsTotal / corridorTotal) * 100)) : 0;

  // Fator de escala para curva horária
  const maxHourlyFlow = Math.max(220, Math.round(current.footTraffic * 1.15));

  return (
    <div className="space-y-5">
      {/* LINHA 1: HERO BENTO (8 cols Obsidian + 4 cols Funil Físico) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* HERO CARD OBSIDIAN & CHAMPAGNE GOLD */}
        <section className="xl:col-span-8 bg-[#111318] text-white rounded-3xl p-6 sm:p-7 shadow-md border border-white/10 flex flex-col justify-between gap-6 relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #E2A83B 0%, transparent 70%)',
            }}
          />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#E2A83B]/15 text-[#E2A83B] border border-[#E2A83B]/30 text-[11px] font-bold uppercase tracking-wider">
                  {current.zone.floor === 'L1' ? 'Térreo • L1' : '2º Piso • L2'} — {current.zone.segment}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-stone-200 text-[11px] font-semibold">
                  Contexto {current.multiplier}x
                </span>
                {isCamActiveHere ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Webcam Integrada ao Vivo
                  </span>
                ) : (
                  onOpenVision && (
                    <button
                      type="button"
                      onClick={onOpenVision}
                      className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-stone-300 border border-white/10 text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <Camera className="w-3 h-3 text-[#E2A83B]" aria-hidden="true" />
                      Conectar Câmera da Vitrine
                    </button>
                  )
                )}
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {current.zone.name}
                </h2>
                <p className="text-xs sm:text-sm text-stone-300 mt-1">
                  Lojas âncoras monitoradas:{' '}
                  <strong className="text-white">{current.zone.anchors.join(' • ')}</strong>
                </p>
              </div>

              {/* Ações Principais */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onRunCopilot(current)}
                  disabled={isAnalyzing}
                  className="px-4 py-2.5 rounded-xl bg-[#E2A83B] hover:bg-[#eab858] disabled:opacity-60 text-[#111318] text-xs font-extrabold flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>{isAnalyzing ? 'Calculando Plano IA...' : 'Gerar Estratégia IA'}</span>
                </button>
                <button
                  type="button"
                  onClick={openModal}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold flex items-center gap-2"
                >
                  <Megaphone className="w-4 h-4 text-[#E2A83B]" aria-hidden="true" />
                  <span>Lançar Oferta Relâmpago</span>
                </button>
              </div>
            </div>

            {/* CIRCULAR SVG GAUGE: SCORE IQ */}
            <div className="flex items-center gap-4 md:flex-col md:text-center bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#E2A83B"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    style={{ transition: 'stroke-dashoffset 450ms ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    IQ Score
                  </span>
                  <strong className="text-3xl font-black text-white leading-none">
                    {effectiveScore}
                  </strong>
                </div>
              </div>
              <div className="text-left md:text-center">
                <span className="text-xs font-bold text-[#E2A83B] block">
                  {effectiveScore >= 75
                    ? 'Janela de Ouro Ativa'
                    : effectiveScore >= 45
                    ? 'Demanda Moderada'
                    : 'Momento de Atração'}
                </span>
                <span className="text-[11px] text-stone-400">Índice em tempo real (0–100)</span>
              </div>
            </div>
          </div>

          {/* 4 KPIs Limpos na Base do Hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 relative z-10">
            <div className="bg-white/5 rounded-2xl p-3">
              <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                Fluxo Corredor
              </span>
              <strong className="text-xl font-extrabold text-white mt-1 block">
                {effectiveFootTraffic}
                <span className="text-xs font-normal text-stone-400">/h</span>
              </strong>
            </div>
            <div className="bg-white/5 rounded-2xl p-3">
              <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#E2A83B]" aria-hidden="true" />
                Paradas Vitrine
              </span>
              <strong className="text-xl font-extrabold text-white mt-1 block">
                {stopsTotal}
              </strong>
            </div>
            <div className="bg-white/5 rounded-2xl p-3">
              <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                Conversão Ala
              </span>
              <strong className="text-xl font-extrabold text-emerald-400 mt-1 block">
                {current.conversionRate}%
              </strong>
            </div>
            <div className="bg-white/5 rounded-2xl p-3">
              <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                Perdas Balcão
              </span>
              <strong className="text-xl font-extrabold text-rose-300 mt-1 block">
                {current.lostSalesCount}
                <span className="text-[10px] font-medium text-stone-400 ml-1">
                  {current.lostSalesCount === 0
                    ? '(Sem perdas)'
                    : `(${LOST_SALE_LABELS[current.dominantReason].split(' ')[0]})`}
                </span>
              </strong>
            </div>
          </div>
        </section>

        {/* RIGHT BENTO: FUNIL FÍSICO DE VITRINE */}
        <section className="xl:col-span-4 bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
                Conversão Física da Porta
              </span>
              <h3 className="text-base font-extrabold text-[#111318] mt-0.5">
                Quem Passa vs. Quem Entra
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-stone-100 text-[10px] font-bold text-stone-700">
              {isCamActiveHere ? 'Sensor Webcam' : 'Projeção da Ala'}
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Passo 1 */}
            <div>
              <div className="flex justify-between text-xs font-bold text-[#111318] mb-1">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-stone-500" aria-hidden="true" />
                  1. Passaram na Frente
                </span>
                <span>{corridorTotal} pessoas (100%)</span>
              </div>
              <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full bg-[#111318] rounded-full w-full" />
              </div>
            </div>

            {/* Passo 2 */}
            <div>
              <div className="flex justify-between text-xs font-bold text-[#111318] mb-1">
                <span>2. Pararam / Olharam Vitrine</span>
                <span className="text-[#B45309]">
                  {stopsTotal} ({stopRatePct}%)
                </span>
              </div>
              <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-[#E2A83B] rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(12, stopRatePct)}%` }}
                />
              </div>
            </div>

            {/* Passo 3 */}
            <div>
              <div className="flex justify-between text-xs font-bold text-[#111318] mb-1">
                <span>3. Entraram na Loja</span>
                <span className="text-blue-700">
                  {entriesTotal} ({entryRatePct}%)
                </span>
              </div>
              <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(8, entryRatePct)}%` }}
                />
              </div>
            </div>

            {/* Passo 4 */}
            <div>
              <div className="flex justify-between text-xs font-bold text-[#111318] mb-1">
                <span>4. Compra Concluída</span>
                <span className="text-emerald-700">
                  ~{conversionsTotal} ({convBarPct}%)
                </span>
              </div>
              <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, convBarPct)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#FAF8F5] border border-stone-200 p-3.5 text-xs text-stone-700">
            <strong className="text-[#111318] block mb-0.5">Leitura para o Lojista:</strong>
            {corridorTotal - entriesTotal > 0
              ? `${corridorTotal - entriesTotal} pessoas passaram na frente sem entrar. Use uma oferta relâmpago ou QR na vitrine para capturar essa demanda.`
              : 'Ótima taxa de atração na porta nesta janela horária.'}
          </div>
        </section>
      </div>

      {/* LINHA 2: GRÁFICO DE HORÁRIO DE PICO (7 cols) + SIMULADOR TÁTIL DE CONTEXTO (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* CURVA DE HORÁRIO DE PICO DO SEGMENTO */}
        <section className="xl:col-span-7 bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309] flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                User Story #01 • Horário de Pico do Segmento
              </span>
              <h3 className="text-base font-extrabold text-[#111318] mt-0.5">
                Fluxo Estimado de Clientes ao Longo do Dia ({current.zone.shortName})
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-stone-500">
              Clique em uma barra para simular o turno
            </span>
          </div>

          {/* Gráfico em Barras Interativo */}
          <div className="pt-2">
            <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-2 px-1 border-b border-stone-200 pb-2">
              {HOURLY_PROFILE.map((bar) => {
                const isSelectedSlot = bar.slot === factors.timeSlot;
                const val = Math.round(maxHourlyFlow * bar.weight);
                const heightPct = Math.max(18, Math.round(bar.weight * 100));
                return (
                  <button
                    key={bar.hour}
                    type="button"
                    onClick={() => {
                      setSelectedBarWeight(bar.weight);
                      onChangeFactors({ ...factors, timeSlot: bar.slot });
                    }}
                    className="flex-1 flex flex-col items-center justify-end h-full group"
                    title={`${bar.hour}: ~${val} pessoas/h`}
                  >
                    <span
                      className={`text-[10px] font-bold mb-1 transition-opacity ${
                        isSelectedSlot
                          ? 'text-[#111318] opacity-100'
                          : 'text-stone-400 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {val}
                    </span>
                    <div
                      className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                        isSelectedSlot
                          ? 'bg-[#E2A83B] shadow-sm'
                          : 'bg-[#111318]/15 group-hover:bg-[#111318]/35'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between gap-1.5 sm:gap-2 px-1 pt-2">
              {HOURLY_PROFILE.map((bar) => (
                <span
                  key={bar.hour}
                  className={`flex-1 text-center text-[10px] font-bold ${
                    bar.slot === factors.timeSlot ? 'text-[#B45309]' : 'text-stone-400'
                  }`}
                >
                  {bar.hour}
                </span>
              ))}
            </div>
          </div>

          {/* Resumo dos Turnos em Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {TIME_SLOTS.map((slot) => {
              const active = factors.timeSlot === slot.value;
              return (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => onChangeFactors({ ...factors, timeSlot: slot.value })}
                  className={`px-3 py-2 rounded-xl border text-left transition ${
                    active
                      ? 'bg-[#111318] border-[#111318] text-white'
                      : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <span className={`text-[10px] font-bold block ${active ? 'text-[#E2A83B]' : 'text-stone-400'}`}>
                    {slot.range}
                  </span>
                  <span className="text-xs font-extrabold">{slot.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* CONTROLES TÁTEIS DE ALA, CLIMA E EVENTO */}
        <section className="xl:col-span-5 bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Simulador de Cenário Real
            </span>
            <h3 className="text-base font-extrabold text-[#111318] mt-0.5">
              Troque de Ala ou Condição do Shopping
            </h3>
          </div>

          {/* Seletor Tátil de Ala */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
              Ala / Loja Monitorada
            </span>
            <div className="flex flex-wrap gap-1.5">
              {zonesTelemetry.map((z) => {
                const active = z.zone.id === current.zone.id;
                return (
                  <button
                    key={z.zone.id}
                    type="button"
                    onClick={() => onSelectZone(z.zone.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      active
                        ? 'bg-[#111318] border-[#111318] text-[#E2A83B]'
                        : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {z.zone.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clima em Palmas */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
              Clima Externo (Palmas-TO)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {WEATHER_OPTIONS.map((w) => {
                const active = factors.weather === w.value;
                return (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => onChangeFactors({ ...factors, weather: w.value })}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      active
                        ? 'bg-[#E2A83B] border-[#E2A83B] text-[#111318]'
                        : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {w.icon === 'sun' && <Sun className="w-3.5 h-3.5" aria-hidden="true" />}
                    {w.icon === 'rain' && <CloudRain className="w-3.5 h-3.5" aria-hidden="true" />}
                    {w.icon === 'mild' && <Clock className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>{w.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evento do Shopping */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
              Gatilho do Shopping
            </span>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_OPTIONS.map((ev) => {
                const active = factors.mallEvent === ev.value;
                return (
                  <button
                    key={ev.value}
                    type="button"
                    onClick={() => onChangeFactors({ ...factors, mallEvent: ev.value })}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold text-left transition ${
                      active
                        ? 'bg-[#111318] border-[#111318] text-white'
                        : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {ev.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* LINHA 3: COPILOTO IA + BUSCAS QUENTES QR + CAMPANHAS RELÂMPAGO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Plano Estratégico IA (6 cols) */}
        <section className="lg:col-span-6 bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#111318] text-[#E2A83B] flex items-center justify-center">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#111318]">
                  Copiloto VitrineIQ (Gemini Flash)
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
              className="px-3 py-1.5 rounded-xl bg-[#111318] hover:bg-stone-800 text-[#E2A83B] text-xs font-bold disabled:opacity-60"
            >
              {isAnalyzing ? 'Gerando...' : 'Atualizar Plano'}
            </button>
          </div>

          {lastAnalysis ? (
            <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-stone-500 font-semibold">
                <span>Confiança: {Math.round(lastAnalysis.confidence * 100)}%</span>
                <span>Latência: {lastAnalysis.latencyMs}ms</span>
              </div>
              <div className="text-xs sm:text-sm text-[#111318] leading-relaxed whitespace-pre-line font-medium">
                {stripMarkdown(lastAnalysis.content)}
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

        {/* Campanhas Relâmpago Ativas (6 cols) */}
        <section className="lg:col-span-6 bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
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
                  Cupons ativos no Concierge QR e prontos para disparo no WhatsApp
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openModal}
              className="px-3 py-1.5 rounded-xl bg-[#E2A83B] hover:bg-[#eab858] text-[#111318] text-xs font-extrabold flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Criar</span>
            </button>
          </div>

          <div className="space-y-3">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className={`rounded-2xl border p-4 flex flex-col gap-2 transition ${
                  camp.active
                    ? 'bg-[#FAF8F5] border-stone-200'
                    : 'bg-stone-50/70 border-stone-200/60 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          camp.active
                            ? 'bg-[#111318] text-[#E2A83B]'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {camp.active ? camp.discountBadge : 'PAUSADA'}
                      </span>
                      <span className="text-xs font-extrabold text-[#111318]">{camp.storeName}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#111318] mt-1">{camp.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 font-mono text-xs font-extrabold text-[#111318]">
                      {camp.couponCode}
                    </span>
                    {onToggleCampaign && (
                      <button
                        type="button"
                        onClick={() => onToggleCampaign(camp.id)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${
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
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                        title="Excluir campanha"
                        aria-label="Excluir campanha"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">{camp.whatsappCopy}</p>

                <div className="flex items-center justify-between pt-2 border-t border-stone-200/80 text-[11px] text-stone-500">
                  <span>Expira em {camp.expiresInMinutes} min</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCopywriting(camp.id, camp.whatsappCopy)}
                    className="font-bold text-[#111318] hover:text-[#B45309] flex items-center gap-1"
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
            ))}
          </div>
        </section>
      </div>

      {/* MODAL NATIVO <dialog> PARA NOVA CAMPANHA RELÂMPAGO */}
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeModal();
        }}
        className="w-[min(100%-2rem,32rem)] m-auto rounded-3xl border border-stone-200 bg-white p-0 shadow-2xl"
      >
        <form onSubmit={handleSubmitCampaign} className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                Ativação Imediata no Shopping
              </span>
              <h3 className="text-lg font-extrabold text-[#111318]">Nova Oferta Relâmpago</h3>
            </div>
            <button
              type="button"
              aria-label="Fechar janela"
              onClick={closeModal}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {validationError && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              ⚠️ {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-[#111318] space-y-1 block">
              <span>Loja</span>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium"
              />
            </label>
            <label className="text-xs font-bold text-[#111318] space-y-1 block">
              <span>Selo do Desconto</span>
              <input
                type="text"
                required
                value={discountBadge}
                onChange={(e) => {
                  const nextBadge = e.target.value;
                  setDiscountBadge(nextBadge);
                  setWhatsappCopy(
                    `Só nas próximas 2 horas no Capim Dourado: apresente ${couponCode || 'CAPIM15'} e garanta ${nextBadge || '15% OFF'} em peças selecionadas!`
                  );
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium"
              />
            </label>
          </div>

          <label className="text-xs font-bold text-[#111318] space-y-1 block">
            <span>Título da Campanha</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-[#111318] space-y-1 block">
              <span>Código do Cupom</span>
              <input
                type="text"
                required
                value={couponCode}
                onChange={(e) => {
                  const nextCode = e.target.value.toUpperCase();
                  setCouponCode(nextCode);
                  setWhatsappCopy(
                    `Só nas próximas 2 horas no Capim Dourado: apresente ${nextCode || 'CAPIM15'} e garanta ${discountBadge || '15% OFF'} em peças selecionadas!`
                  );
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-mono uppercase"
              />
            </label>
            <label className="text-xs font-bold text-[#111318] space-y-1 block">
              <span>Duração (minutos)</span>
              <input
                type="number"
                min={15}
                max={720}
                value={expiresInMinutes}
                onChange={(e) => setExpiresInMinutes(Number(e.target.value) || 60)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium"
              />
            </label>
          </div>

          <label className="text-xs font-bold text-[#111318] space-y-1 block">
            <span>Texto Pronto para WhatsApp & Concierge QR</span>
            <textarea
              rows={3}
              required
              value={whatsappCopy}
              onChange={(e) => setWhatsappCopy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#111318] hover:bg-stone-800 text-[#E2A83B] text-xs font-extrabold"
            >
              Publicar no Shopping
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};
