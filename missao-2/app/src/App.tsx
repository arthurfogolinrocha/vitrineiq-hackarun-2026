import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Box,
  Camera,
  ClipboardCheck,
  LayoutDashboard,
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
import { generateAuditHash } from './utils/security';
import { RetailerCockpit } from './components/RetailerCockpit';
import { ShoppingMap } from './components/ShoppingMap';
import { EdgeVisionSensor } from './components/EdgeVisionSensor';
import { CounterQuickLog } from './components/CounterQuickLog';
import { ConsumerConcierge } from './components/ConsumerConcierge';
import { SecurityAuditPanel } from './components/SecurityAuditPanel';
import { UserStoriesBoard, StoryTargetTab } from './components/UserStoriesBoard';

type ActiveTab = 'cockpit' | 'map' | 'vision' | 'counter' | 'concierge' | 'stories' | 'audit';

const TAB_META: Record<
  ActiveTab,
  { number: string; label: string; shortLabel: string; subtitle: string }
> = {
  cockpit: {
    number: '01',
    label: 'Painel do Lojista',
    shortLabel: 'Painel',
    subtitle: 'Score de oportunidade, horário de pico e planos IA',
  },
  map: {
    number: '02',
    label: 'Shopping 3D (Tour)',
    shortLabel: 'Mapa 3D',
    subtitle: 'Maquete WebGL, Zoom nas lojas, Street View e 2º Piso',
  },
  vision: {
    number: '03',
    label: 'Sensor Webcam',
    shortLabel: 'Câmera',
    subtitle: 'Contagem anônima na porta (quem passa vs. quem entra)',
  },
  counter: {
    number: '04',
    label: 'Modo Balcão',
    shortLabel: 'Balcão',
    subtitle: 'Registro em 1 toque do porquê o cliente não comprou',
  },
  concierge: {
    number: '05',
    label: 'Concierge QR',
    shortLabel: 'QR Cliente',
    subtitle: 'Totem anônimo que capta desejo real e libera cupom',
  },
  stories: {
    number: '06',
    label: 'Stories (Roleta)',
    shortLabel: 'Stories',
    subtitle: 'Histórias de usuário obrigatórias rastreadas na solução',
  },
  audit: {
    number: '07',
    label: 'LGPD & Backend Python',
    shortLabel: 'Auditoria',
    subtitle: 'Trilha de integridade SHA-256 e zero coleta de PII',
  },
};

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cockpit');
  const [floor, setFloor] = useState<FloorId>('L1');
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneId>('ala-central-ancoras');
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);
  const [factors, setFactors] = useState<ShopContextFactors>({
    weather: 'calor_38c',
    timeSlot: 'pos_cinema_20h',
    mallEvent: 'estreia_cinemark',
  });

  const [lostSales, setLostSales] = useState<LostSaleEvent[]>(INITIAL_LOST_SALES);
  const [campaigns, setCampaigns] = useState<FlashCampaign[]>(INITIAL_FLASH_CAMPAIGNS);
  const [signals, setSignals] = useState<ConsumerSignal[]>([
    {
      id: 'sig-init-1',
      zoneId: 'ala-central-ancoras',
      query: 'Presente masculino até R$ 150',
      budget: '80_200',
      preference: 'Moda rápida com troca garantida',
      couponCode: 'VITRINE-QR10',
      matchedOffer: 'Ala Central • Âncoras e Alameda das Cores',
      timestamp: '20:54',
    },
  ]);

  const [visionSnapshot, setVisionSnapshot] = useState<VisionFunnelSnapshot>({
    zoneId: 'ala-central-ancoras',
    passersBy: 142,
    vitrineStops: 46,
    entries: 19,
    exits: 14,
    passedWithoutEntering: 123,
    attractionRate: 32,
    sourceMode: 'simulation',
    lastMotionRegion: 'vitrine',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([
    {
      id: 'audit-boot',
      action: 'VITRINEIQ_BOOT_SECURE',
      status: 'SUCCESS',
      details:
        'Gêmeo Digital Capim Dourado Shopping inicializado com backend Python + espelho TS e conformidade LGPD.',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      securityHash: generateAuditHash('VITRINEIQ_BOOT_SECURE:CAPIM_DOURADO', 'GENESIS_BLOCK_0000', 'audit-boot', '00:00'),
      prevHash: 'GENESIS_BLOCK_0000',
    },
  ]);

  const appendAudit = (
    action: string,
    details: string,
    status: SystemAuditLog['status'] = 'SUCCESS'
  ) => {
    setAuditLogs((prev) => {
      const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const prevHash = prev[0]?.securityHash || 'GENESIS_BLOCK_0000';
      const securityHash = generateAuditHash(`${action}:${details}`, prevHash, id, timestamp);
      return [
        {
          id,
          action,
          status,
          details,
          timestamp,
          securityHash,
          prevHash,
        },
        ...prev.slice(0, 29),
      ];
    });
  };

  const zonesTelemetry = useMemo(
    () =>
      CAPIM_DOURADO_ZONES.map((zone) =>
        computeZoneTelemetry(zone, factors, signals, lostSales, visionSnapshot)
      ),
    [factors, signals, lostSales, visionSnapshot]
  );

  const selectedTelemetry =
    zonesTelemetry.find((z) => z.zone.id === selectedZoneId) ?? zonesTelemetry[0];

  const handleSelectZone = (zoneId: ZoneId) => {
    if (zoneId !== selectedZoneId) {
      setSelectedZoneId(zoneId);
      setLastAnalysis(null);
      const zone = CAPIM_DOURADO_ZONES.find((z) => z.id === zoneId);
      if (zone && zone.floor !== floor) {
        setFloor(zone.floor);
      }
    }
  };

  const handleNavigateFromStory = (target: StoryTargetTab) => {
    setActiveTab(target);
  };

  const handleRunCopilot = async (telemetry: ZoneLiveTelemetry) => {
    setIsAnalyzing(true);
    try {
      const hasCam = visionSnapshot.zoneId === telemetry.zone.id;
      const camSummary = hasCam
        ? `Webcam ao vivo na porta: ${visionSnapshot.passersBy} passaram, ${visionSnapshot.vitrineStops} pararam na vitrine, ${visionSnapshot.entries} entraram (${visionSnapshot.attractionRate}% atração).`
        : '';

      const response = await analyzeWithAI({
        category: telemetry.zone.segment,
        context: `Ala: ${telemetry.zone.name} | Clima: ${factors.weather} | Turno: ${factors.timeSlot} | Evento: ${factors.mallEvent} | Gargalo: ${LOST_SALE_LABELS[telemetry.dominantReason]} | IQ: ${telemetry.opportunityScore}. ${camSummary}`,
        prompt: `Gere ações imediatas de vitrine, estoque e abordagem para aumentar a conversão em ${telemetry.zone.shortName} no Capim Dourado Shopping considerando o gargalo "${LOST_SALE_LABELS[telemetry.dominantReason]}" e buscas quentes (${telemetry.zone.hotSearches.join(', ')}).`,
      });
      setLastAnalysis(response);
      const auditStatus =
        response.source === 'FALLBACK_LOCAL' || response.source === 'BACKEND_FALLBACK'
          ? 'FALLBACK_LOCAL'
          : 'SUCCESS';
      appendAudit(
        'COPILOT_STRATEGY_GENERATED',
        `Plano IA gerado para ${telemetry.zone.shortName} (IQ ${telemetry.opportunityScore}) [${response.source || 'GEMINI_API'}]`,
        auditStatus
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeWithVision = async (snapshot: VisionFunnelSnapshot) => {
    setVisionSnapshot(snapshot);
    setSelectedZoneId(snapshot.zoneId);
    const targetZone =
      zonesTelemetry.find((z) => z.zone.id === snapshot.zoneId) ?? zonesTelemetry[0];
    setActiveTab('cockpit');
    await handleRunCopilot(targetZone);
  };

  const handleLaunchCampaign = (
    draft: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>
  ) => {
    const created: FlashCampaign = {
      ...draft,
      id: `camp-${Date.now()}`,
      active: true,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setCampaigns((prev) => [created, ...prev]);
    appendAudit(
      'FLASH_CAMPAIGN_PUBLISHED',
      `Oferta "${created.title}" publicada para ${created.storeName} (${created.couponCode})`
    );
  };

  const handleToggleCampaign = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextActive = !c.active;
          appendAudit(
            nextActive ? 'FLASH_CAMPAIGN_RESUMED' : 'FLASH_CAMPAIGN_PAUSED',
            `Campanha "${c.title}" ${nextActive ? 'retomada' : 'pausada'} (${c.couponCode})`,
            'SUCCESS'
          );
          return { ...c, active: nextActive };
        }
        return c;
      })
    );
  };

  const handleDeleteCampaign = (id: string) => {
    const target = campaigns.find((c) => c.id === id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    if (target) {
      appendAudit(
        'FLASH_CAMPAIGN_DELETED',
        `Campanha "${target.title}" removida (${target.couponCode})`,
        'WARNING'
      );
    }
  };

  const handleLogLostSale = (
    zoneId: ZoneId,
    storeName: string,
    reason: LostSaleReason,
    note?: string
  ) => {
    const entry: LostSaleEvent = {
      id: `ls-${Date.now()}`,
      zoneId,
      storeName,
      reason,
      note,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setLostSales((prev) => [entry, ...prev]);
    appendAudit('COUNTER_LOST_SALE_LOGGED', `${storeName}: ${LOST_SALE_LABELS[reason]}`);
  };

  const handleUndoLostSale = () => {
    setLostSales((prev) => {
      if (prev.length === 0) return prev;
      const [removed, ...rest] = prev;
      appendAudit(
        'COUNTER_LOST_SALE_UNDONE',
        `Registro desfeito: ${removed.storeName} (${LOST_SALE_LABELS[removed.reason]})`,
        'WARNING'
      );
      return rest;
    });
  };

  const handleSubmitConsumerSignal = (
    zoneId: ZoneId,
    query: string,
    budget: ConsumerSignal['budget']
  ): ConsumerSignal => {
    const zone = CAPIM_DOURADO_ZONES.find((z) => z.id === zoneId) ?? CAPIM_DOURADO_ZONES[0];
    const match = matchConsumerOffer(query, zone, campaigns);
    const signal: ConsumerSignal = {
      id: `sig-${Date.now()}`,
      zoneId,
      query,
      budget,
      preference: zone.segment,
      couponCode: match.couponCode,
      matchedOffer: match.matchedOffer,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setSignals((prev) => [signal, ...prev]);
    appendAudit(
      'CONCIERGE_QR_SIGNAL',
      `Busca anônima em ${zone.shortName}: "${query}" -> cupom ${match.couponCode}`
    );
    return signal;
  };

  const handleNavigateToStore = (storeName: string, targetFloor: FloorId = 'L1') => {
    setSelectedStoreName(storeName);
    setFloor(targetFloor);
    setActiveTab('map');
    appendAudit('CONCIERGE_ROUTE_REQUESTED', `Navegação até ${storeName} (${targetFloor}) iniciada`);
  };

  const navItems: { id: ActiveTab; icon: React.ReactNode }[] = [
    { id: 'cockpit', icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> },
    { id: 'map', icon: <Box className="w-4 h-4" aria-hidden="true" /> },
    { id: 'vision', icon: <Camera className="w-4 h-4" aria-hidden="true" /> },
    { id: 'counter', icon: <ClipboardCheck className="w-4 h-4" aria-hidden="true" /> },
    { id: 'concierge', icon: <QrCode className="w-4 h-4" aria-hidden="true" /> },
    { id: 'stories', icon: <BookOpen className="w-4 h-4" aria-hidden="true" /> },
    { id: 'audit', icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" /> },
  ];

  const meta = TAB_META[activeTab];

  return (
    <div className="min-h-screen bg-[#F4F2EE] text-[#111318] flex flex-col lg:flex-row">
      {/* SIDEBAR EXECUTIVA OBSIDIAN (DESKTOP) */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:justify-between bg-[#111318] text-white border-r border-white/10 p-5 sticky top-0 h-screen">
        <div className="space-y-6">
          {/* Identidade da Marca */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#E2A83B] text-[#111318] font-black text-lg flex items-center justify-center shadow-sm">
              V
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">VitrineIQ</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sistema Online" />
              </div>
              <span className="text-[11px] text-stone-400 block truncate">
                Capim Dourado • Palmas-TO
              </span>
            </div>
          </div>

          {/* Navegação Numerada Principal */}
          <nav aria-label="Módulos do VitrineIQ" className="space-y-1">
            <span className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-stone-500 block mb-2">
              Operação do Lojista
            </span>
            {navItems.slice(0, 5).map((item) => {
              const info = TAB_META[item.id];
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition ${
                    active
                      ? 'bg-[#E2A83B] text-[#111318] shadow-sm'
                      : 'text-stone-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.icon}
                    <span className="truncate">{info.label}</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      active ? 'text-[#111318]/75 font-extrabold' : 'text-stone-500'
                    }`}
                  >
                    {info.number}
                  </span>
                </button>
              );
            })}

            <div className="pt-4">
              <span className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-stone-500 block mb-2">
                Governança & Roleta
              </span>
              {navItems.slice(5).map((item) => {
                const info = TAB_META[item.id];
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition ${
                      active
                        ? 'bg-[#E2A83B] text-[#111318] shadow-sm'
                        : 'text-stone-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {item.icon}
                      <span className="truncate">{info.label}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        active ? 'text-[#111318]/75 font-extrabold' : 'text-stone-500'
                      }`}
                    >
                      {info.number}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Cartão de Contexto da Ala Ativa no Rodapé da Sidebar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-stone-400">
            <span className="flex items-center gap-1">
              <Store className="w-3 h-3 text-[#E2A83B]" aria-hidden="true" />
              Ala Selecionada
            </span>
            <span className="text-[#E2A83B]">IQ {selectedTelemetry.opportunityScore}</span>
          </div>
          <p className="text-xs font-bold text-white leading-snug truncate">
            {selectedTelemetry.zone.shortName}
          </p>
          <div className="flex items-center justify-between text-[11px] text-stone-400">
            <span>{selectedTelemetry.zone.floor === 'L1' ? 'Térreo (L1)' : '2º Piso (L2)'}</span>
            <span className="text-emerald-400 font-semibold">
              {selectedTelemetry.footTraffic}/h fluxo
            </span>
          </div>
        </div>
      </aside>

      {/* COLUNA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* TOPBAR COMPACTA (MOBILE NAV + CONTEXTO EXECUTIVO NO DESKTOP) */}
        <header className="sticky top-0 z-30 bg-[#F4F2EE]/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Marca visível apenas no mobile/tablet */}
              <div className="lg:hidden w-9 h-9 rounded-xl bg-[#111318] text-[#E2A83B] font-black text-base flex items-center justify-center">
                V
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-[#B45309]">
                    {meta.number} / 07
                  </span>
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#111318]">
                    {meta.label}
                  </h1>
                </div>
                <p className="text-xs text-stone-500 hidden sm:block">{meta.subtitle}</p>
              </div>
            </div>

            {/* Atalhos Rápidos */}
            <div className="flex items-center gap-2">
              {activeTab !== 'map' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-xs font-bold text-[#111318] flex items-center gap-1.5 shadow-sm"
                >
                  <Box className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                  <span>Abrir Tour 3D</span>
                </button>
              )}
              {activeTab !== 'vision' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('vision')}
                  className="px-3 py-1.5 rounded-xl bg-[#111318] hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-[#E2A83B]" aria-hidden="true" />
                  <span>Webcam</span>
                </button>
              )}
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                Zero PII • LGPD
              </span>
            </div>
          </div>

          {/* Barra de Navegação Horizontal para Mobile/Tablet */}
          <nav
            aria-label="Navegação Mobile"
            className="lg:hidden flex items-center gap-1.5 overflow-x-auto pt-3 pb-1"
          >
            {navItems.map((item) => {
              const info = TAB_META[item.id];
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition ${
                    active
                      ? 'bg-[#111318] text-[#E2A83B]'
                      : 'bg-white border border-stone-200 text-stone-700'
                  }`}
                >
                  {item.icon}
                  <span>{info.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* WORKSPACE PRINCIPAL */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'cockpit' && (
              <RetailerCockpit
                zonesTelemetry={zonesTelemetry}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                factors={factors}
                onChangeFactors={setFactors}
                campaigns={campaigns}
                onLaunchCampaign={handleLaunchCampaign}
                onToggleCampaign={handleToggleCampaign}
                onDeleteCampaign={handleDeleteCampaign}
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
                onSelectZone={handleSelectZone}
                routes={CROSS_SEGMENT_ROUTES}
                selectedStoreName={selectedStoreName}
                onSelectStoreName={setSelectedStoreName}
              />
            )}

            {activeTab === 'vision' && (
              <EdgeVisionSensor
                zones={CAPIM_DOURADO_ZONES}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                snapshot={visionSnapshot}
                onUpdateSnapshot={setVisionSnapshot}
                onAnalyzeWithVision={handleAnalyzeWithVision}
              />
            )}

            {activeTab === 'counter' && (
              <CounterQuickLog
                zones={CAPIM_DOURADO_ZONES}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                lostSales={lostSales}
                onLogLostSale={handleLogLostSale}
                onUndoLostSale={handleUndoLostSale}
              />
            )}

            {activeTab === 'concierge' && (
              <ConsumerConcierge
                zones={CAPIM_DOURADO_ZONES}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                campaigns={campaigns}
                signals={signals}
                onSubmitConsumerSignal={handleSubmitConsumerSignal}
                onNavigateToStore={handleNavigateToStore}
              />
            )}

            {activeTab === 'stories' && (
              <UserStoriesBoard onNavigateTab={handleNavigateFromStory} />
            )}

            {activeTab === 'audit' && <SecurityAuditPanel auditLogs={auditLogs} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
