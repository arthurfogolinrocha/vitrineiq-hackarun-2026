import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Camera,
  Compass,
  Lock,
  Pause,
  Play,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import {
  AIAnalysisResponse,
  ConsumerSignal,
  FlashCampaign,
  FloorId,
  LostSaleEvent,
  LostSaleReason,
  ShopContextFactors,
  SystemAuditLog,
  VisionFunnelSnapshot,
  ZoneId,
} from './types';
import {
  CAPIM_DOURADO_ZONES,
  CROSS_SEGMENT_ROUTES,
  INITIAL_FLASH_CAMPAIGNS,
  INITIAL_LOST_SALES,
  LOST_SALE_LABELS,
} from './data/shoppingData';
import {
  computeZoneTelemetry,
  matchConsumerOffer,
  ZoneLiveTelemetry,
} from './services/opportunityEngine';
import { analyzeWithAI } from './services/ai';
import { generateAuditHash, sanitizeInput } from './utils/security';
import { RetailerCockpit } from './components/RetailerCockpit';
import { ShoppingMap } from './components/ShoppingMap';
import { CounterQuickLog } from './components/CounterQuickLog';
import { ConsumerConcierge } from './components/ConsumerConcierge';
import { SecurityAuditPanel } from './components/SecurityAuditPanel';
import { EdgeVisionSensor } from './components/EdgeVisionSensor';
import { NeuralMallCanvas } from './components/NeuralMallCanvas';
import { UserStoriesBoard } from './components/UserStoriesBoard';

type ActiveTab = 'cockpit' | 'map' | 'vision' | 'stories' | 'counter' | 'concierge' | 'audit';

const TAB_TITLES: Record<ActiveTab, string> = {
  cockpit: 'Painel do Lojista & IA | VitrineIQ',
  map: 'Mapa Capim Dourado 3D | VitrineIQ',
  vision: 'Sensor Câmera (Borda) | VitrineIQ',
  stories: 'User Stories (Roleta) | VitrineIQ',
  counter: 'Modo Balcão 1-Toque | VitrineIQ',
  concierge: 'Concierge QR Consumidor | VitrineIQ',
  audit: 'Segurança, LGPD & Auditoria | VitrineIQ',
};

function getInitialTab(): ActiveTab {
  if (typeof window === 'undefined') return 'cockpit';
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode === 'consumer' || mode === 'concierge') return 'concierge';
  if (mode === 'counter') return 'counter';
  if (mode === 'map') return 'map';
  if (mode === 'vision') return 'vision';
  if (mode === 'stories') return 'stories';
  return 'cockpit';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [floor, setFloor] = useState<FloorId>('L1');
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneId>('ala-lazer-cinema');
  const [factors, setFactors] = useState<ShopContextFactors>({
    weather: 'calor_38c',
    timeSlot: 'pos_cinema_20h',
    mallEvent: 'estreia_cinemark',
  });

  const [campaigns, setCampaigns] = useState<FlashCampaign[]>(INITIAL_FLASH_CAMPAIGNS);
  const [lostSales, setLostSales] = useState<LostSaleEvent[]>(INITIAL_LOST_SALES);
  const [signals, setSignals] = useState<ConsumerSignal[]>([
    {
      id: 'sig-1',
      zoneId: 'ala-lazer-cinema',
      query: 'Tênis leve e combo pós-cinema',
      budget: '80_200',
      preference: 'Conforto',
      couponCode: 'VITRINE-CINE18',
      matchedOffer: 'Vitrine Calçados & Sport (Demo) — Relâmpago Pós-Cinema: 18% OFF',
      timestamp: '20:54',
    },
    {
      id: 'sig-2',
      zoneId: 'praca-alimentacao-l2',
      query: 'Lanche rápido sem fila',
      budget: 'ate_80',
      preference: 'Rapidez',
      couponCode: 'EXPRESS-PISO2',
      matchedOffer: 'Sabores Express 2º Piso (Demo) — Combo Sem Fila',
      timestamp: '21:05',
    },
  ]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [bgPaused, setBgPaused] = useState(false);
  const [visionSnapshot, setVisionSnapshot] = useState<VisionFunnelSnapshot>({
    zoneId: 'ala-lazer-cinema',
    passersBy: 42,
    vitrineStops: 14,
    entries: 6,
    exits: 4,
    passedWithoutEntering: 36,
    attractionRate: 33,
  });
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([
    {
      id: 'log-001',
      action: 'VITRINEIQ_BOOT_OK',
      status: 'SUCCESS',
      details: 'VitrineIQ inicializado com Planta Mix Capim Dourado (1º e 2º Pavimentos) e Privacy by Design.',
      timestamp: new Date().toLocaleTimeString(),
      securityHash: generateAuditHash('VITRINEIQ_BOOT_OK'),
    },
    {
      id: 'log-002',
      action: 'SECURITY_GUARDRAILS_ON',
      status: 'SUCCESS',
      details: 'Proteção anti-XSS, anti-Prompt Injection e anonimização LGPD ativas.',
      timestamp: new Date().toLocaleTimeString(),
      securityHash: generateAuditHash('SECURITY_GUARDRAILS_ON'),
    },
  ]);

  useEffect(() => {
    document.title = TAB_TITLES[activeTab];
  }, [activeTab]);

  const zonesTelemetry = useMemo(
    () =>
      CAPIM_DOURADO_ZONES.map((zone) =>
        computeZoneTelemetry(zone, factors, signals, lostSales, visionSnapshot)
      ),
    [factors, signals, lostSales, visionSnapshot]
  );

  const appendAudit = (action: string, status: SystemAuditLog['status'], details: string) => {
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now().toString().slice(-4)}`,
        action,
        status,
        details,
        timestamp: new Date().toLocaleTimeString(),
        securityHash: generateAuditHash(`${action}:${details}`),
      },
      ...prev,
    ]);
  };

  const handleRunCopilot = async (telemetry: ZoneLiveTelemetry) => {
    setIsAnalyzing(true);
    try {
      const prompt = `Ala: ${telemetry.zone.name} (${telemetry.zone.segment}). Fluxo/h: ${telemetry.footTraffic}, Paradas na Vitrine: ${telemetry.vitrineStops}, Score IQ: ${telemetry.opportunityScore}/100, Buscas QR: ${telemetry.qrSearchCount}, Vendas Perdidas: ${telemetry.lostSalesCount}, Principal Objeção: ${LOST_SALE_LABELS[telemetry.dominantReason]}. Buscas quentes: ${telemetry.zone.hotSearches.join(', ')}.`;
      const response = await analyzeWithAI({
        prompt,
        category: telemetry.zone.segment,
        context: `Clima=${factors.weather}, Horário=${factors.timeSlot}, Evento=${factors.mallEvent}`,
      });
      setLastAnalysis(response);
      appendAudit(
        response.success ? 'COPILOT_ACTION_GENERATED' : 'COPILOT_BLOCKED_SECURITY',
        response.success ? 'SUCCESS' : 'WARNING',
        `Diagnóstico IA para ${telemetry.zone.shortName} concluído em ${response.latencyMs}ms.`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeWithVision = async (snapshot: VisionFunnelSnapshot) => {
    const zone =
      CAPIM_DOURADO_ZONES.find((z) => z.id === snapshot.zoneId) || CAPIM_DOURADO_ZONES[0];
    setSelectedZoneId(zone.id);
    setActiveTab('cockpit');
    setIsAnalyzing(true);
    try {
      const prompt = `Sensor Câmera na Vitrine (Borda Anônima) — ${zone.name} (${zone.segment}). Passantes no corredor: ${snapshot.passersBy}, Pararam na vitrine (>3s): ${snapshot.vitrineStops} (Atração de Vitrine: ${snapshot.attractionRate}%), Entraram na loja: ${snapshot.entries}, Saíram: ${snapshot.exits}, Passaram direto sem entrar: ${snapshot.passedWithoutEntering}. Gere ação tática para converter quem parou na vitrine em entrada imediata.`;
      const response = await analyzeWithAI({
        prompt,
        category: zone.segment,
        context: `Funil Vitrine Camera Borda • Clima=${factors.weather}, Horário=${factors.timeSlot}`,
      });
      setLastAnalysis(response);
      appendAudit(
        response.success ? 'VISION_EDGE_DIAGNOSTIC' : 'COPILOT_BLOCKED_SECURITY',
        response.success ? 'SUCCESS' : 'WARNING',
        `Funil da vitrine (${snapshot.attractionRate}% atração, ${snapshot.entries} entradas) enviado ao Copiloto.`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLaunchCampaign = (
    draft: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>
  ) => {
    const cleanTitle = sanitizeInput(draft.title);
    const cleanStore = sanitizeInput(draft.storeName);
    const created: FlashCampaign = {
      ...draft,
      id: `camp-${Date.now()}`,
      title: cleanTitle,
      storeName: cleanStore,
      active: true,
      createdAt: new Date().toLocaleTimeString().slice(0, 5),
    };
    setCampaigns((prev) => [created, ...prev]);
    appendAudit(
      'FLASH_CAMPAIGN_PUBLISHED',
      'SUCCESS',
      `Campanha "${cleanTitle}" (${created.couponCode}) ativada no Concierge QR.`
    );
  };

  const handleLogLostSale = (
    zoneId: ZoneId,
    storeName: string,
    reason: LostSaleReason,
    note?: string
  ) => {
    const cleanStore = sanitizeInput(storeName);
    const cleanNote = note ? sanitizeInput(note) : undefined;
    const event: LostSaleEvent = {
      id: `ls-${Date.now()}`,
      zoneId,
      storeName: cleanStore,
      reason,
      note: cleanNote,
      timestamp: new Date().toLocaleTimeString().slice(0, 5),
    };
    setLostSales((prev) => [event, ...prev]);
    appendAudit(
      'COUNTER_LOST_SALE_LOGGED',
      'SUCCESS',
      `Balcão (${cleanStore}): ${LOST_SALE_LABELS[reason]}.`
    );
  };

  const handleSubmitConsumerSignal = (
    zoneId: ZoneId,
    rawQuery: string,
    budget: ConsumerSignal['budget']
  ): ConsumerSignal => {
    const cleanQuery = sanitizeInput(rawQuery);
    const zone = CAPIM_DOURADO_ZONES.find((z) => z.id === zoneId) || CAPIM_DOURADO_ZONES[0];
    const offer = matchConsumerOffer(cleanQuery, zone, campaigns);
    const created: ConsumerSignal = {
      id: `sig-${Date.now()}`,
      zoneId,
      query: cleanQuery,
      budget,
      preference: 'Tempo Real',
      couponCode: offer.couponCode,
      matchedOffer: offer.matchedOffer,
      timestamp: new Date().toLocaleTimeString().slice(0, 5),
    };
    setSignals((prev) => [created, ...prev]);
    appendAudit(
      'CONCIERGE_QR_SIGNAL_RECEIVED',
      'SUCCESS',
      `Busca anônima na ${zone.shortName}: "${cleanQuery}" -> Cupom ${created.couponCode}.`
    );
    return created;
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'cockpit', label: 'Painel Lojista & IA', icon: <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" /> },
    { id: 'map', label: 'Mapa 3D', icon: <Compass className="w-3.5 h-3.5" aria-hidden="true" /> },
    { id: 'vision', label: 'Sensor Câmera', icon: <Camera className="w-3.5 h-3.5" aria-hidden="true" /> },
    { id: 'stories', label: 'User Stories', icon: <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> },
    { id: 'counter', label: 'Modo Balcão', icon: <Store className="w-3.5 h-3.5" aria-hidden="true" /> },
    { id: 'concierge', label: 'Concierge QR', icon: <QrCode className="w-3.5 h-3.5" aria-hidden="true" /> },
    { id: 'audit', label: 'LGPD & Segurança', icon: <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-clip">
      <NeuralMallCanvas paused={bgPaused} />

      <a href="#conteudo-principal" className="skip-link visually-hidden">
        Pular para o conteúdo principal
      </a>

      {/* Top Bar VitrineIQ */}
      <header className="border-b border-slate-800/80 bg-slate-900/75 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-blue-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  VitrineIQ
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  CAPIM DOURADO • DESAFIO 06
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inteligência Comercial em Tempo Real • HackaRun UniCatólica 2026
              </p>
            </div>
          </div>

          {/* Telemetria Rápida + Controle de Movimento (WCAG 2.2.2) */}
          <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
              <Activity className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Tempo Real</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
              <Lock className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              <span>LGPD Zero PII</span>
            </div>
            <button
              type="button"
              onClick={() => setBgPaused((prev) => !prev)}
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-lg border border-slate-700/70 text-slate-200 transition"
            >
              {bgPaused ? (
                <Play className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Pause className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              )}
              <span>{bgPaused ? 'Retomar Fundo 3D' : 'Pausar Fundo 3D'}</span>
            </button>
          </div>

          {/* Navegação Principal */}
          <nav
            aria-label="Principal"
            className="flex flex-wrap items-center gap-1 bg-slate-950/90 border border-slate-800 p-1 rounded-xl"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main id="conteudo-principal" tabIndex={-1} className="relative z-10 max-w-7xl mx-auto w-full p-4 lg:p-8 flex-grow">
        {activeTab === 'cockpit' && (
          <RetailerCockpit
            zonesTelemetry={zonesTelemetry}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            factors={factors}
            onChangeFactors={setFactors}
            campaigns={campaigns}
            onLaunchCampaign={handleLaunchCampaign}
            onRunCopilot={handleRunCopilot}
            isAnalyzing={isAnalyzing}
            lastAnalysis={lastAnalysis}
            visionSnapshot={visionSnapshot}
            onOpenVision={() => setActiveTab('vision')}
          />
        )}

        {activeTab === 'map' && (
          <ShoppingMap
            floor={floor}
            onFloorChange={setFloor}
            zonesTelemetry={zonesTelemetry}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            routes={CROSS_SEGMENT_ROUTES}
          />
        )}

        {activeTab === 'vision' && (
          <EdgeVisionSensor
            zones={CAPIM_DOURADO_ZONES}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            snapshot={visionSnapshot}
            onUpdateSnapshot={setVisionSnapshot}
            onAnalyzeWithVision={handleAnalyzeWithVision}
          />
        )}

        {activeTab === 'stories' && (
          <UserStoriesBoard onNavigateTab={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'counter' && (
          <CounterQuickLog
            zones={CAPIM_DOURADO_ZONES}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            lostSales={lostSales}
            onLogLostSale={handleLogLostSale}
          />
        )}

        {activeTab === 'concierge' && (
          <ConsumerConcierge
            zones={CAPIM_DOURADO_ZONES}
            selectedZoneId={selectedZoneId}
            onSelectZone={setSelectedZoneId}
            campaigns={campaigns}
            signals={signals}
            onSubmitConsumerSignal={handleSubmitConsumerSignal}
          />
        )}

        {activeTab === 'audit' && <SecurityAuditPanel auditLogs={auditLogs} />}
      </main>

      <footer className="relative z-10 border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-400 bg-slate-950/80 backdrop-blur-sm">
        VitrineIQ • 1º HackaRun UniCatólica 2026 • Capim Dourado Shopping — Palmas, TO
      </footer>
    </div>
  );
}
