import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Box,
  Camera,
  ClipboardCheck,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Store,
} from 'lucide-react';
import {
  AIAnalysisResponse,
  AccessRole,
  ConsumerSignal,
  CrowdDropState,
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
  CAPIM_DOURADO_STORES,
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
import { api, CicloEstado, LiveContextPayload, VitrineAlerta, VitrineResumo } from './services/api';
import { generateAuditHash } from './utils/security';
import { readTenantUrl, readUrlView } from './utils/urlView';
import { RetailerCockpit } from './components/RetailerCockpit';
import { ShoppingMap } from './components/ShoppingMap';
import { EdgeVisionSensor } from './components/EdgeVisionSensor';
import { CounterQuickLog } from './components/CounterQuickLog';
import { ConsumerConcierge } from './components/ConsumerConcierge';
import { SecurityAuditPanel } from './components/SecurityAuditPanel';
import { UserStoriesBoard, StoryTargetTab } from './components/UserStoriesBoard';
import { StoreTenantSwitcher } from './components/StoreTenantSwitcher';
import { StoreAvatar } from './components/StoreAvatar';

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
    subtitle: 'Registro das ações do sistema e o que coletamos (só contagens)',
  },
};

export function App() {
  // ?tela=concierge|balcao abre a tela sozinha (QR do visitante / aparelho do vendedor)
  const [urlView] = useState(() => readUrlView(window.location.search));
  const [initialTenant] = useState(() => readTenantUrl(window.location.search));
  const kioskTab = urlView.kioskTab;

  const [accessRole, setAccessRole] = useState<AccessRole>(initialTenant.role);
  const [activeStoreId, setActiveStoreId] = useState<string>(
    initialTenant.storeId ?? CAPIM_DOURADO_STORES[0].id
  );
  const activeTenant = useMemo(
    () =>
      accessRole === 'store'
        ? CAPIM_DOURADO_STORES.find((s) => s.id === activeStoreId) ?? CAPIM_DOURADO_STORES[0]
        : null,
    [accessRole, activeStoreId]
  );

  const initialZoneId = activeTenant?.zoneId ?? urlView.zoneId ?? 'ala-central-ancoras';
  const [activeTab, setActiveTab] = useState<ActiveTab>(kioskTab ?? 'cockpit');
  const [floor, setFloor] = useState<FloorId>(
    CAPIM_DOURADO_ZONES.find((z) => z.id === initialZoneId)?.floor ?? 'L1'
  );
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneId>(initialZoneId);
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);
  const [factors, setFactors] = useState<ShopContextFactors>({
    weather: 'calor_38c',
    timeSlot: 'pos_cinema_20h',
    mallEvent: 'estreia_cinemark',
  });

  const [lostSales, setLostSales] = useState<LostSaleEvent[]>(INITIAL_LOST_SALES);
  const [completedSalesByZone, setCompletedSalesByZone] = useState<Partial<Record<ZoneId, number>>>({});
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

  // Ciclo entre aparelhos: com a API no ar, o estado vem de GET /api/estado a cada 3 s.
  // Sem API (offline), tudo continua funcionando só neste navegador, como demo.
  const [online, setOnline] = useState(false);
  const [vitrine, setVitrine] = useState<Partial<Record<ZoneId, VitrineResumo>>>({});
  const [crowdDropByZone, setCrowdDropByZone] = useState<Partial<Record<ZoneId, CrowdDropState>>>({});
  const [alertas, setAlertas] = useState<VitrineAlerta[]>([]);
  const [porHora, setPorHora] = useState<CicloEstado['porHora']>({});
  const [alertasVistos, setAlertasVistos] = useState<string[]>([]);
  const [liveContext, setLiveContext] = useState<LiveContextPayload | null>(null);
  const [isContextAuto, setIsContextAuto] = useState(true);
  const [isSyncingContext, setIsSyncingContext] = useState(false);

  const syncLiveContext = useCallback(async (force = false) => {
    setIsSyncingContext(true);
    try {
      const ctx = await api.contexto(force);
      setLiveContext(ctx);
      setFactors({
        weather: ctx.weather,
        timeSlot: ctx.time_slot,
        mallEvent: ctx.mall_event,
      });
      setIsContextAuto(true);
    } catch {
      // Mantém contexto local atual se a API estiver offline
    } finally {
      setIsSyncingContext(false);
    }
  }, []);

  const handleManualFactorsChange = useCallback((next: ShopContextFactors) => {
    setIsContextAuto(false);
    setFactors(next);
  }, []);

  const pendingCampaignsRef = useRef<FlashCampaign[]>([]);
  const toggledCampaignsRef = useRef<Record<string, boolean>>({});
  const deletedCampaignIdsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const filtro = activeTenant
        ? { loja: activeTenant.storeName, ala: activeTenant.zoneId }
        : undefined;
      const e = await api.estado(filtro);
      setLostSales(e.lostSales);
      setCompletedSalesByZone(e.completedSalesByZone);
      setSignals(e.signals);

      // Mescla campanhas do servidor com publicações locais recentes (evita sumiço entre containers /tmp sem Postgres)
      const deleted = deletedCampaignIdsRef.current;
      const toggled = toggledCampaignsRef.current;
      const serverFiltered = e.campaigns
        .filter((c) => !deleted.has(c.id))
        .map((c) => (c.id in toggled ? { ...c, active: toggled[c.id] } : c));
      const extras = pendingCampaignsRef.current.filter((p) => {
        if (deleted.has(p.id)) return false;
        const alreadyOnServer = serverFiltered.some(
          (s) => s.id === p.id || (s.couponCode === p.couponCode && s.storeName === p.storeName)
        );
        return !alreadyOnServer;
      });
      setCampaigns([...extras, ...serverFiltered]);

      setVitrine(e.vitrine);
      setCrowdDropByZone(e.crowdDrop ?? {});
      setAlertas(e.alertas);
      setPorHora(e.porHora ?? {});
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [activeTenant]);

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

  useEffect(() => {
    refresh();
    syncLiveContext(false);
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, [refresh, syncLiveContext]);

  /** Com a API no ar, grava nela e relê o estado; se a chamada falhar, cai no modo local. */
  const viaApi = (chamada: () => Promise<unknown>, local: () => void) => {
    if (!online) return local();
    chamada()
      .then(refresh)
      .catch(() => {
        setOnline(false);
        local();
      });
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([
    {
      id: 'audit-boot',
      action: 'VITRINEIQ_BOOT_SECURE',
      status: 'SUCCESS',
      details:
        'Gêmeo Digital Capim Dourado Shopping inicializado com backend Python + espelho TS; câmera envia só contagens.',
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

  // Câmera real da ala selecionada (computer-vision → API) tem prioridade sobre o simulador.
  const cameraResumo = vitrine[selectedZoneId];
  const effectiveVision = useMemo<VisionFunnelSnapshot>(() => cameraResumo
    ? {
        zoneId: selectedZoneId,
        passersBy: cameraResumo.passantes,
        vitrineStops: cameraResumo.olharam,
        entries: 0, // shortcut: a câmera ainda não conta entradas; o funil usa a estimativa até a T5
        exits: 0,
        passedWithoutEntering: cameraResumo.passantes,
        attractionRate: cameraResumo.taxaAtencao,
        sourceMode: 'webcam_live',
        lastMotionRegion: 'vitrine',
      }
    : visionSnapshot, [cameraResumo, selectedZoneId, visionSnapshot]);

  const [demoCameraOverlay, setDemoCameraOverlay] = useState<{
    zoneId: ZoneId;
    apontaram: number;
    noCelular: number;
    voltaramOlhar: number;
    olharesPorZona: { esquerda: number; centro: number; direita: number };
    lastPointedPart: 'esquerda' | 'centro' | 'direita' | null;
  } | null>(null);

  const alertaAtivo = alertas.find(
    (a) =>
      (a.evento === 'atencao_alta' || a.evento === 'apontou' || a.evento === 'lotacao') &&
      !alertasVistos.includes(a.id)
  );

  const scopedLostSales = useMemo(
    () =>
      activeTenant
        ? lostSales.filter(
            (ls) => ls.storeName.trim().toLowerCase() === activeTenant.storeName.toLowerCase()
          )
        : lostSales,
    [activeTenant, lostSales]
  );

  const scopedCampaigns = useMemo(
    () =>
      activeTenant
        ? campaigns.filter(
            (c) => c.storeName.trim().toLowerCase() === activeTenant.storeName.toLowerCase()
          )
        : campaigns,
    [activeTenant, campaigns]
  );

  const zonesTelemetry = useMemo(() => {
    const list = activeTenant
      ? CAPIM_DOURADO_ZONES.filter((z) => z.id === activeTenant.zoneId)
      : CAPIM_DOURADO_ZONES;
    return list.map((zone) =>
      computeZoneTelemetry(zone, factors, signals, scopedLostSales, effectiveVision)
    );
  }, [activeTenant, factors, signals, scopedLostSales, effectiveVision]);

  const selectedTelemetry =
    zonesTelemetry.find((z) => z.zone.id === selectedZoneId) ?? zonesTelemetry[0];

  const mergedVitrineResumo = useMemo<VitrineResumo>(() => {
    const base = cameraResumo;
    const demo = demoCameraOverlay?.zoneId === selectedZoneId ? demoCameraOverlay : null;
    const passantes = (base?.passantes ?? effectiveVision.passersBy) + (demo ? 4 : 0);
    const olharam = (base?.olharam ?? effectiveVision.vitrineStops) + (demo ? demo.apontaram : 0);
    const leftBase = base?.olharesPorZona?.esquerda ?? Math.round(olharam * 0.28);
    const centerBase = base?.olharesPorZona?.centro ?? Math.round(olharam * 0.44);
    const rightBase =
      base?.olharesPorZona?.direita ?? Math.max(0, olharam - leftBase - centerBase);
    return {
      passantes,
      olharam,
      taxaAtencao: passantes ? Math.round((olharam * 100) / passantes) : 0,
      pararamSemOlhar: base?.pararamSemOlhar ?? Math.round(passantes * 0.14),
      atencaoMediaS: base?.atencaoMediaS ?? 6.4,
      picoSimultaneo: base?.picoSimultaneo ?? 5,
      apontaram: (base?.apontaram ?? 2) + (demo?.apontaram ?? 0),
      noCelular: (base?.noCelular ?? 3) + (demo?.noCelular ?? 0),
      voltaramOlhar: (base?.voltaramOlhar ?? 2) + (demo?.voltaramOlhar ?? 0),
      chegaramPerto: (base?.chegaramPerto ?? 6) + (demo ? 2 : 0),
      horaPico: base?.horaPico ?? 19,
      porHora: base?.porHora ?? {},
      olharesPorZona: {
        esquerda: leftBase + (demo?.olharesPorZona.esquerda ?? 0),
        centro: centerBase + (demo?.olharesPorZona.centro ?? 0),
        direita: rightBase + (demo?.olharesPorZona.direita ?? 0),
      },
      acoes: base?.acoes ?? [],
      atualizadoEm: base?.atualizadoEm ?? null,
    };
  }, [cameraResumo, demoCameraOverlay, effectiveVision, selectedZoneId]);

  const handleSimulatePointGesture = (part: 'esquerda' | 'centro' | 'direita') => {
    setDemoCameraOverlay((prev) => {
      const sameZone = prev && prev.zoneId === selectedZoneId;
      const baseZona = sameZone ? prev.olharesPorZona : { esquerda: 0, centro: 0, direita: 0 };
      return {
        zoneId: selectedZoneId,
        apontaram: (sameZone ? prev.apontaram : 0) + 1,
        noCelular: (sameZone ? prev.noCelular : 0) + (part === 'centro' ? 1 : 0),
        voltaramOlhar: (sameZone ? prev.voltaramOlhar : 0) + 1,
        olharesPorZona: {
          ...baseZona,
          [part]: baseZona[part] + 3,
        },
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
    setAlertas((prev) => [fakeAlert, ...prev.slice(0, 9)]);
    appendAudit(
      'VITRINE_GESTURE_DETECTED',
      `Pose YOLO detectou cliente apontando para vitrine ${part.toUpperCase()} (${selectedTelemetry.zone.shortName})`
    );
  };

  const handleSelectZone = (zoneId: ZoneId) => {
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

  const handleNavigateFromStory = (target: StoryTargetTab) => {
    setActiveTab(target);
  };

  const handleRunCopilot = async (telemetry: ZoneLiveTelemetry) => {
    setIsAnalyzing(true);
    try {
      const hasCam = effectiveVision.zoneId === telemetry.zone.id;
      const camSummary = hasCam
        ? `Webcam ao vivo na porta: ${effectiveVision.passersBy} passaram, ${effectiveVision.vitrineStops} olharam a vitrine (${effectiveVision.attractionRate}% atração).`
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

  const handleLaunchCampaign = (
    draft: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>
  ) => {
    const created: FlashCampaign = {
      ...draft,
      id: `camp-${Date.now()}`,
      active: true,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    pendingCampaignsRef.current = [created, ...pendingCampaignsRef.current.slice(0, 19)];
    setCampaigns((prev) => [created, ...prev]);

    if (online) {
      api
        .publicarCampanha(draft, draft.triggerOrigin)
        .then((saved) => {
          pendingCampaignsRef.current = pendingCampaignsRef.current.map((c) =>
            c.id === created.id ? saved : c
          );
          setCampaigns((prev) => prev.map((c) => (c.id === created.id ? saved : c)));
          refresh();
        })
        .catch(() => {
          setOnline(false);
        });
    }
    appendAudit(
      'FLASH_CAMPAIGN_PUBLISHED',
      `Oferta "${created.title}" publicada para ${created.storeName} (${created.couponCode})`
    );
  };

  const handleToggleCampaign = (id: string) => {
    const alvo = campaigns.find((c) => c.id === id);
    if (!alvo) return;
    const nextActive = !alvo.active;
    toggledCampaignsRef.current[id] = nextActive;
    pendingCampaignsRef.current = pendingCampaignsRef.current.map((c) =>
      c.id === id ? { ...c, active: nextActive } : c
    );
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, active: nextActive } : c)));
    appendAudit(
      nextActive ? 'FLASH_CAMPAIGN_RESUMED' : 'FLASH_CAMPAIGN_PAUSED',
      `Campanha "${alvo.title}" ${nextActive ? 'retomada' : 'pausada'} (${alvo.couponCode})`,
      'SUCCESS'
    );
    if (online && /^\d+$/.test(id)) {
      api.alterarCampanha(id, nextActive).catch(() => setOnline(false));
    }
  };

  const handleDeleteCampaign = (id: string) => {
    const target = campaigns.find((c) => c.id === id);
    deletedCampaignIdsRef.current.add(id);
    pendingCampaignsRef.current = pendingCampaignsRef.current.filter((c) => c.id !== id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    if (online && /^\d+$/.test(id)) {
      api.removerCampanha(id).catch(() => setOnline(false));
    }
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
    viaApi(
      () => api.registrarPerda(zoneId, storeName, reason, note),
      () => setLostSales((prev) => [entry, ...prev])
    );
    appendAudit('COUNTER_LOST_SALE_LOGGED', `${storeName}: ${LOST_SALE_LABELS[reason]}`);
  };

  const handleLogCompletedSale = (zoneId: ZoneId, storeName: string) => {
    viaApi(
      () => api.registrarVenda(zoneId, storeName),
      () => setCompletedSalesByZone((prev) => ({ ...prev, [zoneId]: (prev[zoneId] ?? 0) + 1 }))
    );
    appendAudit('COUNTER_SALE_COMPLETED', `${storeName}: venda concluída`);
  };

  const handleUndoLostSale = () => {
    if (online && lostSales[0]) {
      const ultimo = lostSales[0];
      viaApi(() => api.desfazerBalcao(ultimo.id), () => undefined);
      appendAudit('COUNTER_LOST_SALE_UNDONE', `Registro desfeito: ${ultimo.storeName}`, 'WARNING');
      return;
    }
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

  const handleSubmitConsumerSignal = async (
    zoneId: ZoneId,
    query: string,
    budget: ConsumerSignal['budget'],
    segmento?: string,
    originZone?: ZoneId
  ): Promise<ConsumerSignal> => {
    if (online) {
      try {
        const salvo = await api.buscar(zoneId, query, budget, segmento, originZone);
        refresh();
        return salvo;
      } catch {
        setOnline(false);
      }
    }
    const zone = CAPIM_DOURADO_ZONES.find((z) => z.id === zoneId) ?? CAPIM_DOURADO_ZONES[0];
    const filteredBySegment =
      segmento && segmento !== 'todos'
        ? campaigns.filter((c) => !c.segmento || c.segmento === segmento)
        : campaigns;
    const allianceCampaign = originZone
      ? filteredBySegment.find((c) => c.active && c.triggerOrigin === originZone)
      : undefined;
    const pool = allianceCampaign
      ? [allianceCampaign, ...filteredBySegment.filter((c) => c.id !== allianceCampaign.id)]
      : filteredBySegment;
    const match = matchConsumerOffer(
      query,
      zone,
      pool.length ? pool : campaigns
    );
    const hasAllianceBonus = Boolean(allianceCampaign && match.couponCode === allianceCampaign.couponCode);
    const signal: ConsumerSignal = {
      id: `sig-${Date.now()}`,
      zoneId,
      query,
      budget,
      segmento,
      originZone,
      bonusRota: hasAllianceBonus,
      preference: zone.segment,
      couponCode: match.couponCode,
      matchedOffer: hasAllianceBonus ? `🎁 Bônus de Rota • ${match.matchedOffer}` : match.matchedOffer,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setSignals((prev) => [signal, ...prev]);
    appendAudit(
      'CONCIERGE_QR_SIGNAL',
      `Busca anônima em ${zone.shortName}: "${query}" -> cupom ${match.couponCode}`
    );
    return signal;
  };

  const handleQuickFlashFromVoice = (voiceNote: string, reason: LostSaleReason) => {
    const targetStore = activeTenant?.storeName || selectedTelemetry.zone.anchors[0] || 'VitrineIQ';
    const zoneId = activeTenant?.zoneId ?? selectedZoneId;
    const discountBadge = reason === 'preco' ? '15% OFF VOZ' : reason === 'estoque_grade' ? 'RESERVA EXPRESSA' : 'ATENDIMENTO VIP';
    const couponCode = `VOZ${Math.floor(100 + Math.random() * 899)}`;
    handleLaunchCampaign({
      zoneId,
      storeName: targetStore,
      segmento: activeTenant?.segment,
      title: `Ação Imediata de Balcão: ${voiceNote.slice(0, 48)}`,
      discountBadge,
      couponCode,
      whatsappCopy: `⚡ Oferta gerada pelo balcão da ${targetStore}: apresente ${couponCode} hoje e aproveite ${discountBadge}!`,
      expiresInMinutes: 60,
    });
    setActiveTab('cockpit');
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
    <div className="min-h-screen bg-[#F6F2EA] text-[#0B0D12] flex flex-col lg:flex-row overflow-x-clip">
      {/* SIDEBAR EXECUTIVA OBSIDIAN + CAPIM DOURADO (DESKTOP) */}
      <aside className={`${kioskTab ? 'hidden' : 'hidden lg:flex'} lg:w-72 lg:shrink-0 lg:flex-col lg:justify-between bg-[#0B0D12] text-white border-r border-[#E2A83B]/20 p-5 sticky top-0 h-screen overflow-y-auto`}>
        <div className="space-y-5">
          {/* Identidade da Marca */}
          <div className="flex items-center gap-3 pb-4 border-b border-[#E2A83B]/15">
            <div className="w-10 h-10 rounded-xl gold-pill-metallic font-black text-lg flex items-center justify-center shrink-0">
              V
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">VitrineIQ</span>
                <span className="live-status-dot live-status-dot--gold" title="Sistema Online" />
              </div>
              <span className="text-[11px] text-[#F5C76B] font-semibold block truncate">
                Capim Dourado • Palmas-TO
              </span>
            </div>
          </div>

          {/* Seletor Multi-Tenant: Admin do Shopping vs Lojista da Loja */}
          <StoreTenantSwitcher
            accessRole={accessRole}
            activeStoreId={activeStoreId}
            activeTenant={activeTenant}
            onChangeRole={setAccessRole}
            onSelectStore={setActiveStoreId}
            variant="sidebar"
          />

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
                      ? 'gold-pill-metallic'
                      : 'text-stone-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.icon}
                    <span className="truncate">{info.label}</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      active ? 'text-[#111318]/80 font-extrabold' : 'text-stone-500'
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
                        ? 'gold-pill-metallic'
                        : 'text-stone-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {item.icon}
                      <span className="truncate">{info.label}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        active ? 'text-[#111318]/80 font-extrabold' : 'text-stone-500'
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

        {/* Cartão de Contexto da Loja ou Ala Ativa no Rodapé da Sidebar */}
        <div className="bg-white/5 border border-[#E2A83B]/25 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-stone-400">
            <span className="flex items-center gap-1">
              <Store className="w-3 h-3 text-[#E2A83B]" aria-hidden="true" />
              {activeTenant ? 'Loja Isolada' : 'Ala Selecionada'}
            </span>
            <span className="text-[#E2A83B] font-mono">IQ {selectedTelemetry.opportunityScore}</span>
          </div>
          {activeTenant ? (
            <div className="flex items-center gap-2.5">
              <StoreAvatar
                storeName={activeTenant.storeName}
                logoUrl={activeTenant.logoUrl}
                variant="wide"
                roundedClass="rounded-xl"
              />
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-white leading-snug truncate">
                  {activeTenant.storeName}
                </p>
                <span className="text-[10px] text-[#F5C76B] block truncate">
                  {activeTenant.floorLabel}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs font-bold text-white leading-snug truncate">
              {selectedTelemetry.zone.shortName}
            </p>
          )}
          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-white/10">
            <span>{selectedTelemetry.zone.floor === 'L1' ? 'Térreo (L1)' : '2º Piso (L2)'}</span>
            <span className="text-emerald-400 font-semibold kpi-metric">
              {selectedTelemetry.footTraffic}/h fluxo
            </span>
          </div>
        </div>
      </aside>

      {/* COLUNA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 min-w-0 max-w-full overflow-x-clip flex flex-col">
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
                    {kioskTab ? 'VitrineIQ' : `${meta.number} / 07`}
                  </span>
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#111318]">
                    {meta.label}
                  </h1>
                </div>
                <p className="text-xs text-stone-500 hidden sm:block">{meta.subtitle}</p>
              </div>
            </div>

            {/* Atalhos Rápidos + Indicador de Conta */}
            <div className="flex flex-wrap items-center gap-2">
              {!kioskTab && (
                <StoreTenantSwitcher
                  accessRole={accessRole}
                  activeStoreId={activeStoreId}
                  activeTenant={activeTenant}
                  onChangeRole={setAccessRole}
                  onSelectStore={setActiveStoreId}
                  variant="compact"
                />
              )}
              {kioskTab && activeTab !== kioskTab && (
                <button
                  type="button"
                  onClick={() => setActiveTab(kioskTab)}
                  className="px-3 py-1.5 rounded-xl bg-[#111318] text-white text-xs font-bold shadow-sm"
                >
                  ← Voltar
                </button>
              )}
              {!kioskTab && activeTab !== 'map' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-xs font-bold text-[#111318] flex items-center gap-1.5 shadow-sm"
                >
                  <Box className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                  <span>Abrir Tour 3D</span>
                </button>
              )}
              {!kioskTab && activeTab !== 'vision' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('vision')}
                  className="px-3 py-1.5 rounded-xl bg-[#111318] hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-[#E2A83B]" aria-hidden="true" />
                  <span>Webcam</span>
                </button>
              )}
              <span
                role="status"
                title={online ? 'Dados compartilhados entre aparelhos pela API' : 'API fora do ar: os dados ficam só neste navegador'}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${
                  online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {online ? 'Ao vivo' : 'Modo demo (offline)'}
              </span>
            </div>
          </div>

          {/* Barra de Navegação Horizontal para Mobile/Tablet */}
          <nav
            aria-label="Navegação Mobile"
            className={`${kioskTab ? 'hidden' : 'lg:hidden flex'} items-center gap-1.5 overflow-x-auto pt-3 pb-1`}
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
            {!kioskTab && alertaAtivo && (
              <div
                role="alert"
                className="mb-5 p-4 rounded-2xl bento-card-obsidian text-white flex flex-wrap items-center justify-between gap-3"
              >
                <span className="text-sm font-bold flex items-center gap-2">
                  <span className="live-status-dot live-status-dot--gold shrink-0" />
                  <span>
                    {alertaAtivo.evento === 'apontou'
                      ? `👉 Cliente APONTOU para a vitrine${alertaAtivo.zonaVitrine ? ` (${alertaAtivo.zonaVitrine.toUpperCase()})` : ''}`
                      : alertaAtivo.evento === 'lotacao'
                        ? `🔥 Pico de concentração na frente da loja${alertaAtivo.pessoas ? ` (${alertaAtivo.pessoas} pessoas)` : ''}`
                        : '👀 Cliente olhando a vitrine agora'}
                    {' — '}
                    {CAPIM_DOURADO_ZONES.find((z) => z.id === alertaAtivo.zona)?.shortName ?? alertaAtivo.zona}
                    {alertaAtivo.olhando_s ? ` (${alertaAtivo.olhando_s} s)` : ''}. Hora de liberar oferta relâmpago!
                  </span>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectZone(alertaAtivo.zona);
                      setActiveTab('cockpit');
                      setAlertasVistos((v) => [...v, alertaAtivo.id]);
                    }}
                    className="px-3 py-1.5 rounded-xl gold-pill-metallic text-xs font-extrabold"
                  >
                    Criar campanha
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertasVistos((v) => [...v, alertaAtivo.id])}
                    className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold"
                  >
                    Dispensar
                  </button>
                </span>
              </div>
            )}

            {activeTab === 'cockpit' && (
              <RetailerCockpit
                zonesTelemetry={zonesTelemetry}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                factors={factors}
                onChangeFactors={handleManualFactorsChange}
                liveContext={liveContext}
                isContextAuto={isContextAuto}
                isSyncingContext={isSyncingContext}
                onSyncLiveContext={() => syncLiveContext(true)}
                activeTenant={activeTenant}
                vitrineResumo={mergedVitrineResumo}
                crowdDrop={crowdDropByZone[selectedZoneId]}
                lastPointedPart={
                  demoCameraOverlay?.zoneId === selectedZoneId
                    ? demoCameraOverlay.lastPointedPart
                    : (alertaAtivo?.evento === 'apontou' ? (alertaAtivo.zonaVitrine as 'esquerda' | 'centro' | 'direita' | undefined) ?? null : null)
                }
                onSimulatePointGesture={handleSimulatePointGesture}
                campaigns={scopedCampaigns}
                onLaunchCampaign={handleLaunchCampaign}
                onToggleCampaign={handleToggleCampaign}
                onDeleteCampaign={handleDeleteCampaign}
                onRunCopilot={handleRunCopilot}
                isAnalyzing={isAnalyzing}
                lastAnalysis={lastAnalysis}
                visionSnapshot={effectiveVision}
                onOpenVision={() => setActiveTab('vision')}
                completedSalesByZone={completedSalesByZone}
                perfilHoje={porHora[selectedZoneId]}
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
                campaigns={campaigns}
                activeTenant={activeTenant}
                selectedStoreName={selectedStoreName}
                onSelectStoreName={setSelectedStoreName}
              />
            )}

            {activeTab === 'vision' && (
              <EdgeVisionSensor
                zones={
                  activeTenant
                    ? CAPIM_DOURADO_ZONES.filter((z) => z.id === activeTenant.zoneId)
                    : CAPIM_DOURADO_ZONES
                }
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                snapshot={visionSnapshot}
                onUpdateSnapshot={setVisionSnapshot}
                onAnalyzeWithVision={handleAnalyzeWithVision}
                activeTenant={activeTenant}
                olharesPorZona={mergedVitrineResumo.olharesPorZona}
                onAuditComplete={(res) =>
                  appendAudit(
                    'VITRINE_VISION_AUDIT',
                    `Raio-X Multimodal (${activeTenant?.storeName ?? selectedTelemetry.zone.shortName}): Nota ${res.score}/100 [${res.source}]`,
                    res.source === 'BLOCKED' ? 'WARNING' : 'SUCCESS'
                  )
                }
              />
            )}

            {activeTab === 'counter' && (
              <CounterQuickLog
                zones={
                  activeTenant
                    ? CAPIM_DOURADO_ZONES.filter((z) => z.id === activeTenant.zoneId)
                    : CAPIM_DOURADO_ZONES
                }
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                lostSales={scopedLostSales}
                lockedStoreName={activeTenant?.storeName}
                activeTenant={activeTenant}
                onLogLostSale={handleLogLostSale}
                onUndoLostSale={handleUndoLostSale}
                onLogCompletedSale={handleLogCompletedSale}
                onQuickFlashFromVoice={handleQuickFlashFromVoice}
                completedSalesCount={completedSalesByZone[selectedZoneId] ?? 0}
              />
            )}

            {activeTab === 'concierge' && (
              <ConsumerConcierge
                zones={CAPIM_DOURADO_ZONES}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                campaigns={campaigns}
                signals={signals}
                activeTenant={activeTenant}
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
