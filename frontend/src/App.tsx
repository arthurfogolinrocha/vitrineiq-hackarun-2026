import { useEffect, useMemo, useState } from 'react';
import {
  AIAnalysisResponse,
  AccessRole,
  FloorId,
  VisionFunnelSnapshot,
  ZoneId,
} from './types';
import {
  CAPIM_DOURADO_STORES,
  CAPIM_DOURADO_ZONES,
  INITIAL_FLASH_CAMPAIGNS,
  INITIAL_LOST_SALES,
  LOST_SALE_LABELS,
} from './data/shoppingData';
import { computeZoneTelemetry, ZoneLiveTelemetry } from './services/opportunityEngine';
import { analyzeWithAI } from './services/ai';
import {
  api,
  definirAoExpirar,
  lerSessao,
  salvarSessao,
  Sessao,
  VitrineAlerta,
} from './services/api';
import { readUrlView } from './utils/urlView';
import { abasPermitidas, ActiveTab } from './utils/acesso';
import { LoginScreen } from './components/LoginScreen';
import { SextaFeira13 } from './components/SextaFeira13';
import { StoriesRoletaModal } from './components/StoriesRoletaModal';
import { useAuditLogs } from './hooks/useAuditLogs';
import { useIdlePrefetch } from './hooks/useIdlePrefetch';
import { useStoreActions } from './hooks/useStoreActions';
import { useVitrineSync } from './hooks/useVitrineSync';
import { AlarmsBanner } from './components/app/AlarmsBanner';
import { AppSidebar } from './components/app/AppSidebar';
import { AppTabContent } from './components/app/AppTabContent';
import { AppTopHeader } from './components/app/AppTopHeader';
import { buildNavItems, SINAL_DEMO } from './components/app/appNavigation';
import {
  buildMergedVitrineResumo,
  DemoCameraOverlay,
  resolveActiveTenant,
} from './components/app/appTelemetryHelpers';

export function App() {
  // ?tela=concierge|balcao abre a tela sozinha (QR do visitante / aparelho do vendedor)
  const [urlView] = useState(() => readUrlView(window.location.search));
  const kioskTab = urlView.kioskTab;
  // O QR do visitante é público: nunca usa sessão nem /api/estado.
  const conciergePublico = kioskTab === 'concierge';
  const [sessao, setSessao] = useState<Sessao | null>(() => (conciergePublico ? null : lerSessao()));
  const [demo, setDemo] = useState(false);
  const [avisoLogin, setAvisoLogin] = useState<string | null>(null);
  const papel = sessao?.usuario.papel ?? null;
  const zonaFixa = papel === 'lojista' ? sessao?.usuario.zoneId ?? null : null;
  const lojaFixa = papel === 'lojista' ? sessao?.usuario.lojaNome ?? null : null;

  // Lojista: a loja vem da conta (token). Admin e demo podem "ver como loja" pelo seletor, só como filtro.
  const [accessRole, setAccessRole] = useState<AccessRole>('admin');
  const [activeStoreId, setActiveStoreId] = useState<string>(CAPIM_DOURADO_STORES[0].id);
  const activeTenant = useMemo(
    () => resolveActiveTenant(papel, lojaFixa, zonaFixa, accessRole, activeStoreId),
    [papel, lojaFixa, zonaFixa, accessRole, activeStoreId]
  );

  const initialZoneId = urlView.zoneId ?? 'ala-central-ancoras';
  const [activeTab, setActiveTab] = useState<ActiveTab>(kioskTab ?? 'cockpit');
  const [floor, setFloor] = useState<FloorId>(
    CAPIM_DOURADO_ZONES.find((z) => z.id === initialZoneId)?.floor ?? 'L1'
  );
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneId>(initialZoneId);
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);

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

  const [alertasVistos, setAlertasVistos] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [demoCameraOverlay, setDemoCameraOverlay] = useState<DemoCameraOverlay | null>(null);
  const [storiesOpen, setStoriesOpen] = useState(false);

  const { auditLogs, appendAudit } = useAuditLogs();
  const sync = useVitrineSync({
    sessao,
    demo,
    conciergePublico,
    selectedZoneId,
    papel,
    activeTenant,
    appendAudit,
  });

  // Prefetch ocioso de RetailerCockpit e ShoppingMap após login ou modo demo
  useIdlePrefetch(Boolean(sessao || demo));

  useEffect(() => {
    if (activeTenant) {
      setSelectedZoneId(activeTenant.zoneId);
      setSelectedStoreName(activeTenant.storeName);
      setVisionSnapshot((prev) => ({ ...prev, zoneId: activeTenant.zoneId }));
      const z = CAPIM_DOURADO_ZONES.find((item) => item.id === activeTenant.zoneId);
      if (z) setFloor(z.floor);
    } else {
      setSelectedStoreName(null);
    }
  }, [activeTenant]);

  const resetarWorkspace = () => {
    sync.limparDados();
    setAlertasVistos([]);
    setLastAnalysis(null);
  };

  const entrar = (nova: Sessao) => {
    resetarWorkspace();
    salvarSessao(nova);
    setSessao(nova);
    setDemo(false);
    setAvisoLogin(null);
  };

  const sair = (aviso: string | null = null) => {
    salvarSessao(null);
    setSessao(null);
    setDemo(false);
    resetarWorkspace();
    setAvisoLogin(aviso);
  };

  const entrarDemo = () => {
    sync.setLostSales(INITIAL_LOST_SALES);
    sync.setCampaigns(INITIAL_FLASH_CAMPAIGNS);
    sync.setSignals([SINAL_DEMO]);
    setAvisoLogin(null);
    setDemo(true);
  };

  // Qualquer 401 numa rota autenticada derruba a sessão. Ao abrir, confere o token salvo.
  useEffect(() => {
    definirAoExpirar(() => sair('Sessão expirada. Entre de novo.'));
    if (sessao) {
      api.eu().then(
        (usuario) => {
          const atual = { token: sessao.token, usuario };
          salvarSessao(atual);
          setSessao(atual);
        },
        () => undefined // 401 já saiu pelo definirAoExpirar; com a rede fora, mantém a sessão salva
      );
    }
    return () => definirAoExpirar(null);
  }, []);

  // Lojista: a ala vem da conta e não muda.
  useEffect(() => {
    if (!zonaFixa) return;
    setSelectedZoneId(zonaFixa);
    setLastAnalysis(null);
    setFloor(CAPIM_DOURADO_ZONES.find((z) => z.id === zonaFixa)?.floor ?? 'L1');
  }, [zonaFixa]);

  // Câmera real da ala selecionada (computer-vision → API). O simulador só entra na demonstração offline.
  const cameraResumo = sync.vitrine[selectedZoneId];
  const effectiveVision = useMemo<VisionFunnelSnapshot | undefined>(
    () =>
      cameraResumo
        ? {
            zoneId: selectedZoneId,
            passersBy: cameraResumo.passantes,
            vitrineStops: cameraResumo.olharam,
            entries: 0, // a câmera não conta entradas: o funil mostra "não medido"
            exits: 0,
            passedWithoutEntering: cameraResumo.passantes,
            attractionRate: cameraResumo.taxaAtencao,
            sourceMode: 'webcam_live',
            lastMotionRegion: 'vitrine',
          }
        : demo
          ? visionSnapshot
          : undefined,
    [cameraResumo, selectedZoneId, visionSnapshot, demo]
  );

  // Alerta da câmera que o lojista transformou em campanha: o Painel abre o modal já preenchido.
  const [campanhaAlerta, setCampanhaAlerta] = useState<VitrineAlerta | null>(null);

  const alertaAtivo = sync.alertas.find(
    (a) =>
      (a.evento === 'atencao_alta' || a.evento === 'apontou' || a.evento === 'lotacao') &&
      !alertasVistos.includes(a.id)
  );

  const scopedLostSales = useMemo(
    () =>
      activeTenant
        ? sync.lostSales.filter(
            (ls) => ls.storeName.trim().toLowerCase() === activeTenant.storeName.toLowerCase()
          )
        : sync.lostSales,
    [activeTenant, sync.lostSales]
  );

  const scopedCampaigns = useMemo(
    () =>
      activeTenant
        ? sync.campaigns.filter(
            (c) => c.storeName.trim().toLowerCase() === activeTenant.storeName.toLowerCase()
          )
        : sync.campaigns,
    [activeTenant, sync.campaigns]
  );

  const zonesTelemetry = useMemo(() => {
    const list = activeTenant
      ? CAPIM_DOURADO_ZONES.filter((z) => z.id === activeTenant.zoneId)
      : CAPIM_DOURADO_ZONES;
    // Logado, o Score usa só o medido (câmera, Concierge e Balcão); as bases fictícias ficam na demonstração.
    return list.map((zone) =>
      computeZoneTelemetry(
        zone,
        sync.factors,
        sync.signals,
        scopedLostSales,
        effectiveVision,
        demo
          ? undefined
          : { vitrine: sync.vitrine[zone.id], vendasConcluidas: sync.completedSalesByZone[zone.id] ?? 0 }
      )
    );
  }, [
    activeTenant,
    sync.factors,
    sync.signals,
    scopedLostSales,
    effectiveVision,
    demo,
    sync.vitrine,
    sync.completedSalesByZone,
  ]);

  const selectedTelemetry =
    zonesTelemetry.find((z) => z.zone.id === selectedZoneId) ?? zonesTelemetry[0];

  // Logado: só o que a câmera mediu, sem completar com valores padrão.
  const mergedVitrineResumo = useMemo(
    () =>
      demo
        ? buildMergedVitrineResumo(cameraResumo, demoCameraOverlay, effectiveVision ?? visionSnapshot, selectedZoneId)
        : cameraResumo,
    [cameraResumo, demoCameraOverlay, effectiveVision, visionSnapshot, selectedZoneId, demo]
  );

  const actions = useStoreActions({
    sessao,
    demo,
    online: sync.online,
    setOnline: sync.setOnline,
    activeTenant,
    selectedZoneId,
    selectedTelemetry,
    campaigns: sync.campaigns,
    setCampaigns: sync.setCampaigns,
    lostSales: sync.lostSales,
    setLostSales: sync.setLostSales,
    setCompletedSalesByZone: sync.setCompletedSalesByZone,
    setSignals: sync.setSignals,
    pendingCampaignsRef: sync.pendingCampaignsRef,
    toggledCampaignsRef: sync.toggledCampaignsRef,
    deletedCampaignIdsRef: sync.deletedCampaignIdsRef,
    refresh: sync.refresh,
    viaApi: sync.viaApi,
    enqueueSale: sync.enqueueSale,
    enqueueLoss: sync.enqueueLoss,
    appendAudit,
    setActiveTab,
  });

  const handleSimulatePointGesture = (part: 'esquerda' | 'centro' | 'direita') => {
    setDemoCameraOverlay((prev) => {
      const sameZone = prev && prev.zoneId === selectedZoneId;
      const baseZona = sameZone ? prev.olharesPorZona : { esquerda: 0, centro: 0, direita: 0 };
      return {
        zoneId: selectedZoneId,
        apontaram: (sameZone ? prev.apontaram : 0) + 1,
        noCelular: (sameZone ? prev.noCelular : 0) + (part === 'centro' ? 1 : 0),
        voltaramOlhar: (sameZone ? prev.voltaramOlhar : 0) + 1,
        olharesPorZona: { ...baseZona, [part]: baseZona[part] + 3 },
        lastPointedPart: part,
      };
    });
    const fakeAlert: VitrineAlerta = {
      id: `sim-apontou-${Date.now()}`,
      zona: selectedZoneId,
      evento: 'apontou',
      zonaVitrine: part,
      olhando_s: 4.5,
      timestamp: new Date().toISOString(),
    };
    sync.setAlertas((prev) => [fakeAlert, ...prev.slice(0, 9)]);
    appendAudit(
      'VITRINE_GESTURE_DETECTED',
      `Pose YOLO detectou cliente apontando para vitrine ${part.toUpperCase()} (${selectedTelemetry.zone.shortName})`
    );
  };

  const handleSelectZone = (zoneId: ZoneId) => {
    if (zonaFixa) return;
    if (activeTenant && zoneId !== activeTenant.zoneId) return;
    if (zoneId !== selectedZoneId) {
      setSelectedZoneId(zoneId);
      setLastAnalysis(null);
      const zone = CAPIM_DOURADO_ZONES.find((z) => z.id === zoneId);
      if (zone && zone.floor !== floor) {
        setFloor(zone.floor);
      }
    }
  };

  const handleRunCopilot = async (telemetry: ZoneLiveTelemetry) => {
    setIsAnalyzing(true);
    try {
      const camSummary = effectiveVision && effectiveVision.zoneId === telemetry.zone.id
        ? `Webcam ao vivo na porta: ${effectiveVision.passersBy} passaram, ${effectiveVision.vitrineStops} olharam a vitrine (${effectiveVision.attractionRate}% atração).`
        : '';

      const response = await analyzeWithAI(
        {
          category: telemetry.zone.segment,
          context: `Ala: ${telemetry.zone.name} | Clima: ${sync.factors.weather} | Turno: ${sync.factors.timeSlot} | Evento: ${sync.factors.mallEvent} | Gargalo: ${LOST_SALE_LABELS[telemetry.dominantReason]} | IQ: ${telemetry.opportunityScore}. ${camSummary}`,
          prompt: `Gere ações imediatas de vitrine, estoque e abordagem para aumentar a conversão em ${telemetry.zone.shortName} no Capim Dourado Shopping considerando o gargalo "${LOST_SALE_LABELS[telemetry.dominantReason]}" e buscas quentes (${telemetry.zone.hotSearches.join(', ')}).`,
        },
        demo ? '' : undefined
      );
      setLastAnalysis(response);
      const auditStatus =
        response.source === 'FALLBACK_LOCAL' || response.source === 'BACKEND_FALLBACK'
          ? 'FALLBACK_LOCAL'
          : 'SUCCESS';
      appendAudit(
        'COPILOT_STRATEGY_GENERATED',
        `Plano IA gerado para ${telemetry.zone.shortName} (IQ ${telemetry.opportunityScore}) [${response.source ?? 'BLOQUEADO'}]`,
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

  const handleNavigateToStore = (storeName: string, targetFloor: FloorId = 'L1') => {
    setSelectedStoreName(storeName);
    setFloor(targetFloor);
    setActiveTab('map');
    appendAudit('CONCIERGE_ROUTE_REQUESTED', `Navegação até ${storeName} (${targetFloor}) iniciada`);
  };

  const abas: ActiveTab[] = kioskTab
    ? [kioskTab]
    : demo
      ? abasPermitidas('admin').filter((a) => a !== 'lojistas')
      : abasPermitidas(papel);
  const aba = abas.includes(activeTab) ? activeTab : abas[0];
  const getTabNumber = (id: ActiveTab) => String(abas.indexOf(id) + 1).padStart(2, '0');
  const navItems = buildNavItems(abas);

  if (!conciergePublico && !sessao && !demo) {
    return (
      <LoginScreen
        onEntrar={entrar}
        onDemo={entrarDemo}
        aviso={avisoLogin}
        destino={kioskTab === 'counter' ? 'Entre com a conta da loja para abrir o Modo Balcão' : undefined}
      />
    );
  }

  const lastPointedPart =
    demoCameraOverlay?.zoneId === selectedZoneId
      ? demoCameraOverlay.lastPointedPart
      : alertaAtivo?.evento === 'apontou'
        ? ((alertaAtivo.zonaVitrine as 'esquerda' | 'centro' | 'direita' | undefined) ?? null)
        : null;

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#0B0D12] flex flex-col lg:flex-row overflow-x-clip">
      <AppSidebar
        kioskTab={kioskTab}
        papel={papel}
        accessRole={accessRole}
        activeStoreId={activeStoreId}
        activeTenant={activeTenant}
        onChangeRole={setAccessRole}
        onSelectStore={setActiveStoreId}
        navItems={navItems}
        activeTab={aba}
        onSelectTab={setActiveTab}
        getTabNumber={getTabNumber}
        selectedTelemetry={selectedTelemetry}
        onOpenStories={() => setStoriesOpen(true)}
      />

      <div className="flex-1 min-w-0 max-w-full overflow-x-clip flex flex-col">
        <AppTopHeader
          kioskTab={kioskTab}
          activeTab={aba}
          totalTabs={abas.length}
          getTabNumber={getTabNumber}
          papel={papel}
          lojaFixa={lojaFixa}
          accessRole={accessRole}
          activeStoreId={activeStoreId}
          activeTenant={activeTenant}
          onChangeRole={setAccessRole}
          onSelectStore={setActiveStoreId}
          demo={demo}
          online={sync.online}
          pendingOfflineCount={sync.pendingCount}
          conciergePublico={conciergePublico}
          sessao={sessao}
          onLogout={() => sair()}
          navItems={navItems}
          onSelectTab={setActiveTab}
          onOpenStories={() => setStoriesOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {!kioskTab && alertaAtivo && (
              <AlarmsBanner
                alerta={alertaAtivo}
                onCreateCampaign={(zoneId, alertId) => {
                  handleSelectZone(zoneId);
                  setActiveTab('cockpit');
                  setCampanhaAlerta(alertaAtivo);
                  setAlertasVistos((v) => [...v, alertId]);
                }}
                onDismiss={(alertId) => setAlertasVistos((v) => [...v, alertId])}
              />
            )}

            <AppTabContent
              activeTab={aba}
              allowedTabs={abas}
              onSelectTab={setActiveTab}
              zonesTelemetry={zonesTelemetry}
              selectedZoneId={selectedZoneId}
              onSelectZone={handleSelectZone}
              floor={floor}
              onFloorChange={setFloor}
              selectedStoreName={selectedStoreName}
              onSelectStoreName={setSelectedStoreName}
              factors={sync.factors}
              onChangeFactors={sync.handleManualFactorsChange}
              liveContext={sync.liveContext}
              isContextAuto={sync.isContextAuto}
              isSyncingContext={sync.isSyncingContext}
              onSyncLiveContext={() => sync.syncLiveContext(true)}
              activeTenant={activeTenant}
              mergedVitrineResumo={mergedVitrineResumo}
              crowdDrop={sync.crowdDropByZone[selectedZoneId]}
              lastPointedPart={lastPointedPart}
              onSimulatePointGesture={demo ? handleSimulatePointGesture : undefined}
              campanhaAlerta={campanhaAlerta}
              onCampanhaAlertaAberta={() => setCampanhaAlerta(null)}
              scopedCampaigns={scopedCampaigns}
              campaigns={sync.campaigns}
              onLaunchCampaign={actions.handleLaunchCampaign}
              onToggleCampaign={actions.handleToggleCampaign}
              onDeleteCampaign={actions.handleDeleteCampaign}
              onRunCopilot={handleRunCopilot}
              isAnalyzing={isAnalyzing}
              lastAnalysis={lastAnalysis}
              effectiveVision={effectiveVision}
              visionSnapshot={visionSnapshot}
              onUpdateVisionSnapshot={setVisionSnapshot}
              onAnalyzeWithVision={handleAnalyzeWithVision}
              onAuditComplete={(res) =>
                appendAudit(
                  'VITRINE_VISION_AUDIT',
                  `Raio-X Multimodal (${activeTenant?.storeName ?? selectedTelemetry.zone.shortName}): Nota ${res.score}/100 [${res.source}]`,
                  res.source === 'BLOCKED' ? 'WARNING' : 'SUCCESS'
                )
              }
              completedSalesByZone={sync.completedSalesByZone}
              perfilHoje={sync.porHora[selectedZoneId]}
              lojaFixa={lojaFixa}
              scopedLostSales={scopedLostSales}
              onLogLostSale={actions.handleLogLostSale}
              onUndoLostSale={actions.handleUndoLostSale}
              onLogCompletedSale={actions.handleLogCompletedSale}
              onQuickFlashFromVoice={actions.handleQuickFlashFromVoice}
              signals={sync.signals}
              onSubmitConsumerSignal={actions.handleSubmitConsumerSignal}
              onNavigateToStore={handleNavigateToStore}
              auditLogs={auditLogs}
            />
            {!conciergePublico && (
              <SextaFeira13
                visivel={aba === 'cockpit' && !kioskTab}
                lostSales={scopedLostSales}
                zone={selectedTelemetry.zone}
                storeName={activeTenant?.storeName ?? selectedTelemetry.zone.anchors[0] ?? 'Loja Âncora'}
                segmento={activeTenant?.segment}
                onLaunchCampaign={actions.handleLaunchCampaign}
              />
            )}
          </div>
        </main>
      </div>

      <StoriesRoletaModal
        open={storiesOpen}
        onClose={() => setStoriesOpen(false)}
        allowedTabs={abas}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setStoriesOpen(false);
        }}
      />
    </div>
  );
}

export default App;
