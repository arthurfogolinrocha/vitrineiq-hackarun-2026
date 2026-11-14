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
  Hand,
  Image as ImageIcon,
  Lock,
  Megaphone,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
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
  CrowdDropState,
  FlashCampaign,
  MallEvent,
  ShopContextFactors,
  StoreTenant,
  TimeSlot,
  VisionFunnelSnapshot,
  WeatherCondition,
  ZoneId,
} from '../types';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import { LiveContextPayload, VitrineResumo } from '../services/api';
import { LOST_SALE_LABELS, SEGMENT_LABELS, findStoreByName } from '../data/shoppingData';
import { stripMarkdown } from '../services/ai';
import { horasDoGrafico, insightsPorHora, PerfilPorHora } from '../utils/horario';
import { SpotlightCard } from './SpotlightCard';
import { StoreAvatar } from './StoreAvatar';
import { PosterDraft, PromoPosterModal } from './PromoPosterModal';
import { VitrineCrowdDropModal } from './VitrineCrowdDropModal';

/** Hook tático de count-up numérico suave via requestAnimationFrame (respeita reduced-motion). */
function useAnimatedNumber(target: number, durationMs = 420): number {
  const [display, setDisplay] = useState(target);
  const currentRef = useRef(target);

  useEffect(() => {
    const startVal = currentRef.current;
    if (startVal === target) return;
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(startVal + (target - startVal) * eased);
      currentRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}

const ALLIANCE_ORIGINS: { value: string; label: string }[] = [
  { value: '', label: 'Sem vínculo de origem (oferta geral)' },
  { value: 'ala-lazer-cinema', label: 'Aliança Pós-Cinemark / Lazer (Ala Norte)' },
  { value: 'praca-alimentacao-l2', label: 'Aliança Praça de Alimentação (2º Piso)' },
  { value: 'ala-sul-esporte', label: 'Aliança Detran / Polícia Federal (Ala Sul)' },
  { value: 'ala-central-ancoras', label: 'Aliança Portaria P1 / Galeria Central' },
];

interface RetailerCockpitProps {
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  factors: ShopContextFactors;
  onChangeFactors: (next: ShopContextFactors) => void;
  liveContext?: LiveContextPayload | null;
  isContextAuto?: boolean;
  isSyncingContext?: boolean;
  onSyncLiveContext?: () => void;
  activeTenant?: StoreTenant | null;
  vitrineResumo?: VitrineResumo;
  crowdDrop?: CrowdDropState;
  lastPointedPart?: 'esquerda' | 'centro' | 'direita' | null;
  onSimulatePointGesture?: (part: 'esquerda' | 'centro' | 'direita') => void;
  campaigns: FlashCampaign[];
  onLaunchCampaign: (campaign: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>) => void;
  onToggleCampaign?: (id: string) => void;
  onDeleteCampaign?: (id: string) => void;
  onRunCopilot: (telemetry: ZoneLiveTelemetry) => Promise<void>;
  isAnalyzing: boolean;
  lastAnalysis: AIAnalysisResponse | null;
  visionSnapshot?: VisionFunnelSnapshot;
  onOpenVision?: () => void;
  completedSalesByZone: Partial<Record<ZoneId, number>>;
  /** Movimento real de hoje por hora na ala selecionada (câmera, Balcão e Concierge). */
  perfilHoje?: PerfilPorHora;
  /** Lojista logado: a campanha sai sempre em nome da loja dele e a ala não muda. */
  lojaFixa?: string | null;
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
  liveContext,
  isContextAuto = true,
  isSyncingContext = false,
  onSyncLiveContext,
  activeTenant,
  vitrineResumo,
  crowdDrop,
  lastPointedPart,
  onSimulatePointGesture,
  campaigns,
  onLaunchCampaign,
  onToggleCampaign,
  onDeleteCampaign,
  onRunCopilot,
  isAnalyzing,
  lastAnalysis,
  visionSnapshot,
  onOpenVision,
  completedSalesByZone,
  perfilHoje,
  lojaFixa,
}) => {
  const current =
    zonesTelemetry.find((z) => z.zone.id === selectedZoneId) ?? zonesTelemetry[0];

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [storeName, setStoreName] = useState(
    activeTenant?.storeName || current.zone.anchors[0] || 'Loja Âncora'
  );
  const [segmento, setSegmento] = useState<string>(activeTenant?.segment || 'todos');
  const [triggerOrigin, setTriggerOrigin] = useState<string>('');
  const [title, setTitle] = useState('Combo Pós-Cinema 2h Relâmpago');
  const [discountBadge, setDiscountBadge] = useState('15% OFF');
  const [couponCode, setCouponCode] = useState('CAPIM15');
  const [whatsappCopy, setWhatsappCopy] = useState(
    'Só nas próximas 2 horas no Capim Dourado: apresente CAPIM15 e ganhe 15% OFF em peças selecionadas!'
  );
  const [expiresInMinutes, setExpiresInMinutes] = useState(120);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [posterDraft, setPosterDraft] = useState<PosterDraft | null>(null);
  const [publishedNotice, setPublishedNotice] = useState<PosterDraft | null>(null);
  const [crowdDropOpen, setCrowdDropOpen] = useState(false);

  // Fator de escala horária baseado na barra clicada (User Story #01)
  const selectedHourBar = HOURLY_PROFILE.find((b) => b.slot === factors.timeSlot);
  const [selectedBarWeight, setSelectedBarWeight] = useState<number>(
    selectedHourBar?.weight ?? 1.0
  );

  useEffect(() => {
    const match = HOURLY_PROFILE.find((b) => b.slot === factors.timeSlot);
    if (match) setSelectedBarWeight(match.weight);
  }, [factors.timeSlot]);

  // Com dado real por hora, o gráfico mostra o medido e não escala o Score; sem ele, vale o perfil estimado.
  const horasReais = perfilHoje ? horasDoGrafico(perfilHoje) : [];
  const temDadoReal = horasReais.some((x) => Object.values(x.dados).some((n) => n > 0));
  const maxPassaram = Math.max(1, ...horasReais.map((x) => x.dados.passaram));
  const insights = temDadoReal && perfilHoje ? insightsPorHora(perfilHoje) : [];
  const [horaSelecionada, setHoraSelecionada] = useState<number | null>(null);
  const horaDetalhe = horasReais.find((x) => x.hora === horaSelecionada);
  const pesoHora = temDadoReal ? 1 : selectedBarWeight;

  // Recálculo dinâmico do fluxo horário e do Score IQ
  const effectiveFootTraffic = Math.round(current.footTraffic * pesoHora);
  const effectiveScore = Math.max(
    0,
    Math.min(100, Math.round(current.opportunityScore * (0.35 + 0.65 * pesoHora)))
  );

  useEffect(() => {
    setStoreName(activeTenant?.storeName || current.zone.anchors[0] || 'Loja Âncora');
    if (activeTenant?.segment) {
      setSegmento(activeTenant.segment);
    }
  }, [activeTenant, current.zone.id, current.zone.anchors]);

  const openModal = () => {
    setValidationError(null);
    dialogRef.current?.showModal();
  };
  const closeModal = () => {
    setValidationError(null);
    dialogRef.current?.close();
  };

  const lojaCampanha = (lojaFixa ?? storeName).trim();

  const handleSubmitCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      lojaCampanha.length === 0 ||
      title.trim().length === 0 ||
      couponCode.trim().length === 0 ||
      discountBadge.trim().length === 0 ||
      whatsappCopy.trim().length === 0
    ) {
      setValidationError('Todos os campos são obrigatórios e não podem conter apenas espaços em branco.');
      return;
    }
    setValidationError(null);
    const cleanStore = lojaCampanha; // lojista: sempre a loja do login, nunca a digitada
    const cleanTitle = title.trim();
    const cleanBadge = discountBadge.trim() || 'OFERTA';
    const cleanCoupon = couponCode.trim().toUpperCase();
    const cleanCopy = whatsappCopy.trim();

    onLaunchCampaign({
      zoneId: current.zone.id,
      storeName: cleanStore,
      segmento: segmento !== 'todos' ? segmento : activeTenant?.segment,
      triggerOrigin: triggerOrigin || undefined,
      title: cleanTitle,
      discountBadge: cleanBadge,
      couponCode: cleanCoupon,
      whatsappCopy: cleanCopy,
      expiresInMinutes,
    });

    const matchedStore = activeTenant ?? findStoreByName(cleanStore);
    const generatedPoster: PosterDraft = {
      storeName: cleanStore,
      logoUrl: matchedStore?.logoUrl,
      floorLabel: matchedStore?.floorLabel || current.zone.shortName,
      zoneId: current.zone.id,
      title: cleanTitle,
      discountBadge: cleanBadge,
      couponCode: cleanCoupon,
      copyText: cleanCopy,
      expiresInMinutes,
    };

    closeModal();
    setPublishedNotice(generatedPoster);
    setPosterDraft(generatedPoster);
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
      : Math.round(current.vitrineStops * pesoHora);
  const entriesTotal =
    isCamActiveHere && visionSnapshot && visionSnapshot.entries > 0
      ? visionSnapshot.entries
      : Math.max(12, Math.round(stopsTotal * 0.42));
  // RN12: "compraram" vem só do botão "Venda concluída" do Modo Balcão
  const conversionsTotal = completedSalesByZone[current.zone.id] ?? 0;
  const stopRatePct = corridorTotal > 0 ? Math.min(100, Math.round((stopsTotal / corridorTotal) * 100)) : 0;
  const entryRatePct = corridorTotal > 0 ? Math.min(100, Math.round((entriesTotal / corridorTotal) * 100)) : 0;
  const convBarPct = corridorTotal > 0 ? Math.min(100, Math.round((conversionsTotal / corridorTotal) * 100)) : 0;

  // Fator de escala para curva horária
  const maxHourlyFlow = Math.max(220, Math.round(current.footTraffic * 1.15));

  // Vitrine Viva + Taxímetro "Dinheiro na Mesa" (R$/h) + Micro-Heatmap 3 Terços
  const avgTicket = activeTenant?.avgTicket ?? 185;
  const peopleNotEntered = Math.max(0, corridorTotal - entriesTotal);
  const opportunityLossHour = Math.round(peopleNotEntered * 0.14 * avgTicket);
  const animatedScore = useAnimatedNumber(clampedScore);
  const animatedFootTraffic = useAnimatedNumber(effectiveFootTraffic);
  const animatedLossHour = useAnimatedNumber(opportunityLossHour);
  const tercos = vitrineResumo?.olharesPorZona ?? { esquerda: 0, centro: 0, direita: 0 };
  const apontaramCount = vitrineResumo?.apontaram ?? 0;
  const noCelularCount = vitrineResumo?.noCelular ?? 0;
  const voltaramCount = vitrineResumo?.voltaramOlhar ?? 0;
  const maxTerco = Math.max(1, tercos.esquerda, tercos.centro, tercos.direita);
  const activeDisplayStoreName = activeTenant?.storeName ?? storeName;
  const activeDisplayStoreLogo = (activeTenant ?? findStoreByName(activeDisplayStoreName))?.logoUrl;

  const handleRescueVitrine = (part: 'esquerda' | 'centro' | 'direita') => {
    const partLabel =
      part === 'esquerda' ? 'Vitrine Esquerda' : part === 'centro' ? 'Vitrine Central' : 'Vitrine Direita';
    const nextCode = `VITRINE${part.slice(0, 3).toUpperCase()}15`;
    setTitle(`Resgate Ao Vivo — ${partLabel}`);
    setDiscountBadge('15% OFF');
    setCouponCode(nextCode);
    setWhatsappCopy(
      `Vimos você curtindo nossa ${partLabel} no Capim Dourado! Apresente ${nextCode} nos próximos 45 min e garanta 15% OFF exclusivo.`
    );
    setExpiresInMinutes(45);
    openModal();
  };

  return (
    <div className="space-y-5">
      {publishedNotice && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl px-4 py-3 bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-sm flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>
              <strong>Oferta publicada no Shopping e no Concierge QR!</strong> Cupom{' '}
              <span className="font-mono font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded">
                {publishedNotice.couponCode}
              </span>{' '}
              ativo para <strong>{publishedNotice.storeName}</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPosterDraft(publishedNotice)}
              className="px-3 py-1.5 rounded-xl bg-[#0B0D12] text-[#F5C76B] text-xs font-extrabold flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Abrir Cartaz com Logo</span>
            </button>
            <button
              type="button"
              onClick={() => setPublishedNotice(null)}
              aria-label="Fechar aviso"
              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100"
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

      {/* LINHA 1: HERO BENTO (8 cols Obsidian + 4 cols Funil Físico) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* HERO CARD OBSIDIAN & CHAMPAGNE GOLD */}
        <SpotlightCard
          tilt3d
          beam={effectiveScore >= 75}
          hudCorners
          className="xl:col-span-8 bento-card-obsidian grain-overlay text-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-6 relative overflow-hidden"
        >
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
                  {activeTenant
                    ? `${activeTenant.floorLabel} • ${SEGMENT_LABELS[activeTenant.segment]}`
                    : `${current.zone.floor === 'L1' ? 'Térreo • L1' : '2º Piso • L2'} — ${current.zone.segment}`}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-stone-200 text-[11px] font-semibold font-mono">
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

              <div className="flex items-center gap-4">
                {activeTenant && (
                  <StoreAvatar
                    storeName={activeTenant.storeName}
                    logoUrl={activeTenant.logoUrl}
                    variant="hero"
                    roundedClass="rounded-2xl"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {activeTenant ? activeTenant.storeName : current.zone.name}
                  </h2>
                  {activeTenant ? (
                    <p className="text-xs sm:text-sm text-stone-300 mt-1">
                      Vitrine exclusiva em{' '}
                      <strong className="text-[#F5C76B]">
                        {current.zone.shortName.replace(/\s*\([^)]*\)/g, '').trim()}
                      </strong>{' '}
                      • Ticket médio{' '}
                      <strong className="text-white">R$ {activeTenant.avgTicket}</strong>
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-stone-300 mt-1">
                      Lojas âncoras monitoradas:{' '}
                      <strong className="text-white">{current.zone.anchors.join(' • ')}</strong>
                    </p>
                  )}
                </div>
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

            {/* CIRCULAR SVG RADAR ORBITAL GAUGE: SCORE IQ */}
            <div className="flex items-center gap-4 md:flex-col md:text-center bg-white/5 border border-[#E2A83B]/25 rounded-2xl p-4 shrink-0">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-32 h-32" viewBox="0 0 136 136" aria-hidden="true">
                  <defs>
                    <linearGradient id="iqGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F5C76B" />
                      <stop offset="55%" stopColor="#E2A83B" />
                      <stop offset="100%" stopColor="#D97706" />
                    </linearGradient>
                  </defs>
                  {/* 24 Ticks de Radar Externo */}
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const angle = (idx * 360) / 24;
                    const activeTick = idx / 24 <= clampedScore / 100;
                    return (
                      <line
                        key={idx}
                        x1="68"
                        y1="5"
                        x2="68"
                        y2={idx % 6 === 0 ? '11' : '9'}
                        stroke={activeTick ? '#F5C76B' : 'rgba(255,255,255,0.16)'}
                        strokeWidth={idx % 6 === 0 ? '2' : '1.2'}
                        transform={`rotate(${angle} 68 68)`}
                      />
                    );
                  })}
                  {/* Anel orbital pontilhado sutil */}
                  <circle
                    cx="68"
                    cy="68"
                    r="58"
                    fill="none"
                    stroke="rgba(226,168,59,0.28)"
                    strokeWidth="1"
                    strokeDasharray="3 5"
                    className="origin-center animate-[spin_20s_linear_infinite]"
                  />
                  <g transform="rotate(-90 68 68)">
                    <circle
                      cx="68"
                      cy="68"
                      r={radius}
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="68"
                      cy="68"
                      r={radius}
                      fill="none"
                      stroke="url(#iqGoldGrad)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      style={{
                        transition: 'stroke-dashoffset 450ms ease-out',
                        filter: 'drop-shadow(0 0 8px rgba(226,168,59,0.55))',
                      }}
                    />
                  </g>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    IQ Score
                  </span>
                  <strong className="text-3xl font-black text-white leading-none kpi-metric">
                    {animatedScore}
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
              <strong className="text-xl font-extrabold text-white mt-1 block kpi-metric">
                {animatedFootTraffic}
                <span className="text-xs font-normal text-stone-400">/h</span>
              </strong>
            </div>
            <div className="bg-white/5 rounded-2xl p-3">
              <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#E2A83B]" aria-hidden="true" />
                Paradas Vitrine
              </span>
              <strong className="text-xl font-extrabold text-white mt-1 block kpi-metric">
                {stopsTotal}
              </strong>
            </div>
            <div className="bg-white/5 rounded-2xl p-3">
              <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                Conversão Ala
              </span>
              <strong className="text-xl font-extrabold text-emerald-400 mt-1 block kpi-metric">
                {current.conversionRate}%
              </strong>
            </div>
            <div className="bg-white/5 rounded-2xl p-3">
              <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
                Perdas Balcão
              </span>
              <strong className="text-xl font-extrabold text-rose-300 mt-1 block kpi-metric">
                {current.lostSalesCount}
                <span className="text-[10px] font-medium text-stone-400 ml-1">
                  {current.lostSalesCount === 0
                    ? '(Sem perdas)'
                    : `(${LOST_SALE_LABELS[current.dominantReason].split(' ')[0]})`}
                </span>
              </strong>
            </div>
          </div>
        </SpotlightCard>

        {/* RIGHT BENTO: FUNIL FÍSICO DE VITRINE */}
        <section className="xl:col-span-4 bento-card-cream rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4">
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
                  {conversionsTotal} ({convBarPct}%)
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

      {/* DIFERENCIAL: VITRINE VIVA + TAXÍMETRO DINHEIRO NA MESA (R$/h) + RADAR 3 TERÇOS + CROWD-DROP */}
      <SpotlightCard
        tilt3d
        beam
        hudCorners
        className="bento-card-obsidian grain-overlay text-white rounded-3xl p-5 sm:p-6 border border-[#E2A83B]/35"
      >
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
          {/* Taxímetro R$/h */}
          <div className="xl:col-span-4 space-y-2.5 border-b xl:border-b-0 xl:border-r border-white/10 pb-4 xl:pb-0 xl:pr-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#F5C76B]">
              <span className="live-status-dot" aria-hidden="true" />
              Vitrine Viva • Dinheiro na Mesa
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-3xl sm:text-4xl font-black text-white kpi-metric">
                R$ {animatedLossHour.toLocaleString('pt-BR')}
              </strong>
              <span className="text-xs font-bold text-[#F5C76B]">/ hora</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              {peopleNotEntered} passantes saíram sem entrar agora (ticket médio R$ {avgTicket}). Aponte a câmera YOLO na vitrine para capturar quem aponta para os produtos.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-[#F5C76B] border border-[#E2A83B]/30 font-bold flex items-center gap-1">
                <Hand className="w-3.5 h-3.5" aria-hidden="true" />
                {apontaramCount} apontaram
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10 font-semibold flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                {noCelularCount} no celular
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10 font-semibold flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                {voltaramCount} voltaram
              </span>
            </div>
          </div>

          {/* Micro-Heatmap 3 Terços + Radar Visual da Vitrine */}
          <div className="xl:col-span-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-white">
                Radar de Vitrine (Esquerda • Centro • Direita)
              </h3>
              <span className="text-[11px] font-mono text-[#F5C76B]">
                {crowdDrop ? `CROWD ${crowdDrop.peopleNow}P • ${crowdDrop.discountPct}%` : 'LIVE FOV 110°'}
              </span>
            </div>

            {/* Radar SVG em Perspectiva com Feixes + Scanline */}
            <div className="relative rounded-2xl bg-[#07090D] border border-[#E2A83B]/25 overflow-hidden px-3 py-2">
              <div className="hud-scanline" aria-hidden="true" />
              <svg viewBox="0 0 360 72" className="w-full h-16" aria-hidden="true">
                {(['esquerda', 'centro', 'direita'] as const).map((part, idx) => {
                  const xCenter = idx === 0 ? 64 : idx === 1 ? 180 : 296;
                  const count = tercos[part];
                  const isPointed = lastPointedPart === part;
                  const fillOpacity = isPointed ? 0.36 : Math.max(0.08, (count / maxTerco) * 0.24);
                  return (
                    <g key={part}>
                      <polygon
                        points={`180,66 ${xCenter - 46},8 ${xCenter + 46},8`}
                        fill={isPointed ? '#F5C76B' : '#E2A83B'}
                        fillOpacity={fillOpacity}
                        stroke={isPointed ? '#F5C76B' : 'rgba(226,168,59,0.35)'}
                        strokeWidth={isPointed ? 1.5 : 0.8}
                      />
                      <rect
                        x={xCenter - 42}
                        y="6"
                        width="84"
                        height="16"
                        rx="6"
                        fill={isPointed ? 'rgba(226,168,59,0.28)' : 'rgba(255,255,255,0.06)'}
                      />
                      <text
                        x={xCenter}
                        y="17"
                        textAnchor="middle"
                        fill={isPointed ? '#F5C76B' : '#d6d3d1'}
                        fontSize="9"
                        fontWeight="700"
                      >
                        {part.toUpperCase()} ({count})
                      </text>
                    </g>
                  );
                })}
                <circle cx="180" cy="64" r="4.5" fill="#10b981" />
                <text x="192" y="67" fill="#6ee7b7" fontSize="8" fontWeight="700">
                  CÂMERA BORDA
                </text>
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'esquerda', label: 'Esquerda', count: tercos.esquerda },
                  { id: 'centro', label: 'Centro', count: tercos.centro },
                  { id: 'direita', label: 'Direita', count: tercos.direita },
                ] as const
              ).map((slot) => {
                const pct = Math.min(100, Math.round((slot.count / maxTerco) * 100));
                const isPointed = lastPointedPart === slot.id;
                return (
                  <div
                    key={slot.id}
                    className={`rounded-2xl p-3 border transition ${
                      isPointed
                        ? 'bg-[#E2A83B]/20 border-[#F5C76B] shadow-lg'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={isPointed ? 'text-[#F5C76B]' : 'text-stone-300'}>
                        {slot.label}
                      </span>
                      <span className="kpi-metric text-white">{slot.count}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#E2A83B] to-[#F5C76B]"
                        style={{ width: `${Math.max(12, pct)}%` }}
                      />
                    </div>
                    {isPointed && (
                      <span className="mt-1.5 inline-block text-[10px] font-extrabold text-[#F5C76B]">
                        👆 Apontada agora!
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gatilho Demo Ao Vivo + CTA Resgate + Crowd-Drop */}
          <div className="xl:col-span-3 flex flex-col gap-2.5">
            {onSimulatePointGesture && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Simular Apontada Ao Vivo (Demo Palco)
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['esquerda', 'centro', 'direita'] as const).map((part) => (
                    <button
                      key={part}
                      type="button"
                      onClick={() => onSimulatePointGesture(part)}
                      className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-[#E2A83B]/25 border border-white/15 hover:border-[#F5C76B] text-[11px] font-bold text-white capitalize transition"
                    >
                      {part}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleRescueVitrine(lastPointedPart ?? 'centro')}
              className="w-full py-2.5 px-3.5 rounded-xl gold-pill-metallic text-xs flex items-center justify-center gap-2 transition"
            >
              <Zap className="w-4 h-4" aria-hidden="true" />
              <span>Resgatar Agora ({lastPointedPart ?? 'Centro'})</span>
            </button>
            <button
              type="button"
              onClick={() => setCrowdDropOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-[#E2A83B]/40 text-[#F5C76B] text-xs font-extrabold flex items-center justify-center gap-2 transition"
            >
              <Flame className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Abrir Telão Crowd-Drop</span>
            </button>
          </div>
        </div>
      </SpotlightCard>

      {/* LINHA 2: GRÁFICO DE HORÁRIO DE PICO (7 cols) + SIMULADOR TÁTIL DE CONTEXTO (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* CURVA DE HORÁRIO DE PICO DO SEGMENTO */}
        <section className="xl:col-span-7 bento-card-cream rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309] flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                User Story #01 • Horário de Pico do Segmento
              </span>
              <h3 className="text-base font-extrabold text-[#111318] mt-0.5">
                {(() => {
                  const zoneTitle = activeTenant
                    ? current.zone.shortName.replace(/\s*\([^)]*\)/g, '').trim()
                    : current.zone.shortName;
                  return temDadoReal
                    ? `Movimento real por hora, hoje (${zoneTitle})`
                    : `Fluxo Estimado de Clientes ao Longo do Dia (${zoneTitle})`;
                })()}
              </h3>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${
                temDadoReal ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {temDadoReal ? 'Medido: câmera, Balcão e Concierge' : 'Estimativa: sem dados reais desta ala hoje'}
            </span>
          </div>

          {temDadoReal ? (
            <div className="pt-2 space-y-3">
              <div className="h-44 flex items-end justify-between gap-1 sm:gap-1.5 px-1 border-b border-stone-200 pb-2">
                {horasReais.map(({ hora, dados: d }) => {
                  const resumo = `${hora}h: ${d.passaram} passaram, ${d.olharam} olharam, ${d.vendas} vendas, ${d.perdidas} perdidas, ${d.buscas} buscas`;
                  const selecionada = hora === horaSelecionada;
                  return (
                    <button
                      key={hora}
                      type="button"
                      onClick={() => setHoraSelecionada(selecionada ? null : hora)}
                      className="flex-1 flex flex-col items-center justify-end h-full group"
                      title={resumo}
                      aria-label={resumo}
                      aria-pressed={selecionada}
                    >
                      <span className="text-[10px] font-bold mb-1 text-stone-500">{d.passaram || ''}</span>
                      <div
                        className={`w-full max-w-[28px] rounded-t-lg relative overflow-hidden transition-all duration-300 ${
                          selecionada ? 'bg-[#111318]/45' : 'bg-[#111318]/15 group-hover:bg-[#111318]/30'
                        }`}
                        style={{ height: `${Math.round((d.passaram / maxPassaram) * 100)}%` }}
                      >
                        <div
                          className="absolute bottom-0 inset-x-0 bg-[#E2A83B]"
                          style={{ height: `${d.passaram ? Math.round((d.olharam / d.passaram) * 100) : 0}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between gap-1 sm:gap-1.5 px-1">
                {horasReais.map(({ hora, dados: d }) => (
                  <span key={hora} className="flex-1 flex flex-col items-center gap-0.5 text-[10px] font-bold text-stone-400">
                    {hora}h
                    <span className="flex gap-0.5 h-1.5" aria-hidden="true">
                      {d.vendas > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      {d.perdidas > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    </span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#111318]/15" />passaram</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#E2A83B]" />olharam a vitrine</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />venda concluída</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />venda perdida</span>
              </div>
              {horaDetalhe && (
                <p className="text-xs font-semibold text-[#111318] bg-[#FAF8F5] border border-stone-200 rounded-xl px-3 py-2">
                  {horaDetalhe.hora}h às {horaDetalhe.hora + 1}h: {horaDetalhe.dados.passaram} passaram · {horaDetalhe.dados.olharam} olharam
                  {horaDetalhe.dados.passaram > 0 &&
                    ` (${Math.round((horaDetalhe.dados.olharam / horaDetalhe.dados.passaram) * 100)}%)`}{' '}
                  · {horaDetalhe.dados.vendas} vendas · {horaDetalhe.dados.perdidas} perdidas · {horaDetalhe.dados.buscas} buscas no Concierge
                </p>
              )}
              {insights.length > 0 && (
                <ul className="space-y-1.5">
                  {insights.map((texto) => (
                    <li key={texto} className="text-xs text-stone-700 flex gap-2">
                      <span className="text-[#B45309] font-bold" aria-hidden="true">→</span>
                      {texto}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
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
          )}

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
        <section className="xl:col-span-5 bento-card-cream rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Contexto em Tempo Real &amp; Simulador
              </span>
              <h3 className="text-base font-extrabold text-[#111318] mt-0.5">
                Troque de Ala ou Condição do Shopping
              </h3>
            </div>
            {onSyncLiveContext && (
              <button
                type="button"
                onClick={onSyncLiveContext}
                disabled={isSyncingContext}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border inline-flex items-center gap-1.5 shrink-0 transition ${
                  isContextAuto && liveContext
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-[#FAF8F5] border-stone-200 text-stone-700 hover:border-stone-400'
                }`}
                title="Sincronizar clima de Palmas (Open-Meteo), feriados (BrasilAPI) e site oficial do Capim Dourado"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isSyncingContext ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>
                  {isSyncingContext
                    ? 'Sincronizando...'
                    : isContextAuto && liveContext
                      ? 'Ao vivo'
                      : 'Voltar ao vivo'}
                </span>
              </button>
            )}
          </div>

          {liveContext && (
            <div className="rounded-2xl bg-[#FAF8F5] border border-stone-200 px-3.5 py-2.5 space-y-1.5 text-[11px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#111318]">
                  Palmas-TO:{' '}
                  {liveContext.temperature_c !== null
                    ? `${liveContext.temperature_c.toFixed(1)}°C`
                    : 'Estimado'}{' '}
                  • {liveContext.weather_description}
                </span>
                <span className="text-stone-500 font-semibold">
                  {liveContext.sources.clima === 'open-meteo' ? 'Open-Meteo' : 'Local'} •{' '}
                  {liveContext.cinema_movies_count > 0
                    ? `${liveContext.cinema_movies_count} filmes Cinemark`
                    : 'Calendário'}
                </span>
              </div>
              <p className="text-stone-600">
                <span className="font-semibold text-[#111318]">Gatilho detectado:</span>{' '}
                {liveContext.event_reason}
                {!isContextAuto && ' (modo simulação manual ativo)'}
              </p>
              {liveContext.active_events.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-stone-500 font-semibold mr-1">Eventos no site:</span>
                  {liveContext.active_events.slice(0, 3).map((ev) => (
                    <span
                      key={ev}
                      className="px-2 py-0.5 rounded-full bg-white border border-stone-200 text-[10px] font-bold text-[#111318]"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Seletor Tátil de Ala */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              {activeTenant && <Lock className="w-3 h-3 text-[#7A4B0A]" aria-hidden="true" />}
              {activeTenant ? `Ala Isolada de ${activeTenant.storeName}` : 'Ala / Loja Monitorada'}
            </span>
            {lojaFixa ? (
              <p className="text-xs font-bold text-[#111318]">
                {lojaFixa} · {current.zone.shortName}
              </p>
            ) : (
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
                    {activeTenant
                      ? `${activeTenant.storeName} • ${z.zone.shortName.replace(/\s*\([^)]*\)/g, '').trim()}`
                      : z.zone.shortName}
                  </button>
                );
              })}
            </div>
            )}
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
        <section className="lg:col-span-6 bento-card-cream rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#111318] text-[#E2A83B] flex items-center justify-center">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#111318]">
                  Agente de IA VitrineIQ (API Python)
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
                {lastAnalysis.source === 'GEMINI_API' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                    Agente de IA (Gemini)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                    Heurística (sem IA)
                  </span>
                )}
                <span>Latência: {lastAnalysis.latencyMs}ms</span>
              </div>
              <div className="text-xs sm:text-sm text-[#111318] leading-relaxed whitespace-pre-line font-medium">
                {stripMarkdown(lastAnalysis.content)}
              </div>
              <div className="pt-2 border-t border-stone-200 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetStore = activeTenant ?? findStoreByName(storeName);
                    const cleanSummary = stripMarkdown(lastAnalysis.content)
                      .split('\n')
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(' • ');
                    setPosterDraft({
                      storeName: targetStore?.storeName || storeName,
                      logoUrl: targetStore?.logoUrl,
                      floorLabel: targetStore?.floorLabel || current.zone.shortName,
                      zoneId: current.zone.id,
                      title: `Estratégia Ativa • ${current.zone.shortName}`,
                      discountBadge: discountBadge || '15% OFF',
                      couponCode: couponCode || 'CAPIM15',
                      copyText: cleanSummary || whatsappCopy,
                      expiresInMinutes,
                      sourceLabel: 'Plano gerado pelo Copiloto IA VitrineIQ',
                    });
                  }}
                  className="px-3 py-2 rounded-xl gold-pill-metallic text-xs font-extrabold flex items-center gap-1.5 transition"
                >
                  <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Criar Cartaz desta Estratégia (com Logo)</span>
                </button>
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
            {campaigns.map((camp) => {
              const storeMeta =
                activeTenant && activeTenant.storeName.toLowerCase() === camp.storeName.toLowerCase()
                  ? activeTenant
                  : findStoreByName(camp.storeName);
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
                        <span className="text-xs font-extrabold text-[#111318]">{camp.storeName}</span>
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

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/80 text-[11px] text-stone-500">
                  <span>Expira em {camp.expiresInMinutes} min</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPosterDraft({
                          storeName: camp.storeName,
                          logoUrl: storeMeta?.logoUrl,
                          floorLabel: storeMeta?.floorLabel || current.zone.shortName,
                          zoneId: camp.zoneId,
                          title: camp.title,
                          discountBadge: camp.discountBadge,
                          couponCode: camp.couponCode,
                          copyText: camp.whatsappCopy,
                          expiresInMinutes: camp.expiresInMinutes,
                        })
                      }
                      className="font-extrabold text-[#7A4B0A] hover:text-[#0B0D12] flex items-center gap-1"
                    >
                      <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Gerar Cartaz</span>
                    </button>
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
              </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* MODAL NATIVO <dialog> PARA NOVA CAMPANHA RELÂMPAGO */}
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
          if (!inside) closeModal();
        }}
        className="w-[min(100%-2rem,32rem)] m-auto rounded-3xl border border-stone-200 bg-white p-0 shadow-2xl"
      >
        <form onSubmit={handleSubmitCampaign} className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-3">
              <StoreAvatar
                storeName={storeName}
                logoUrl={(activeTenant ?? findStoreByName(storeName))?.logoUrl}
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
                value={lojaFixa ?? storeName}
                onChange={(e) => setStoreName(e.target.value)}
                readOnly={Boolean(lojaFixa || activeTenant)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium read-only:bg-amber-50/70"
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
            <span>Segmento da Oferta (Filtro do Concierge QR)</span>
            <select
              value={segmento}
              onChange={(e) => setSegmento(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium"
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
              value={triggerOrigin}
              onChange={(e) => setTriggerOrigin(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-[#FAF8F5] text-sm font-medium"
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

      <PromoPosterModal draft={posterDraft} onClose={() => setPosterDraft(null)} />

      <VitrineCrowdDropModal
        open={crowdDropOpen}
        onClose={() => setCrowdDropOpen(false)}
        zoneId={current.zone.id}
        zoneLabel={activeTenant?.floorLabel || current.zone.shortName}
        storeName={activeDisplayStoreName}
        activeTenant={activeTenant}
        logoUrl={activeDisplayStoreLogo}
        initialPeople={crowdDrop?.peopleNow ?? vitrineResumo?.picoSimultaneo ?? 2}
        onPublishCrowdDrop={(draft) => {
          onLaunchCampaign(draft);
        }}
      />
    </div>
  );
};
