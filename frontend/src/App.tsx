import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Building2,
  Camera,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Lock,
  QrCode,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import {
  AIAnalysisResponse,
  AccessRole,
  ConsumerSignal,
  FlashCampaign,
  FloorId,
  LostSaleEvent,
  LostSaleReason,
  ShopContextFactors,
  StoreTenant,
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
import {
  api,
  CicloEstado,
  LiveContextPayload,
  definirAoExpirar,
  lerSessao,
  salvarSessao,
  Sessao,
  VitrineAlerta,
  VitrineResumo,
} from './services/api';
import { generateAuditHash } from './utils/security';
import { readUrlView } from './utils/urlView';
import { abasPermitidas, ActiveTab } from './utils/acesso';
import { RetailerCockpit } from './components/RetailerCockpit';
import { ShoppingMap } from './components/ShoppingMap';
import { EdgeVisionSensor } from './components/EdgeVisionSensor';
import { CounterQuickLog } from './components/CounterQuickLog';
import { ConsumerConcierge } from './components/ConsumerConcierge';
import { SecurityAuditPanel } from './components/SecurityAuditPanel';
import { LoginScreen } from './components/LoginScreen';
import { LojistasAdmin } from './components/LojistasAdmin';

const TAB_META: Record<ActiveTab, { label: string; shortLabel: string; subtitle: string }> = {
  cockpit: {
    label: 'Painel do Lojista',
    shortLabel: 'Painel',
    subtitle: 'Score de oportunidade, horário de pico e planos IA',
  },
  map: {
    label: 'Shopping 3D (Tour)',
    shortLabel: 'Mapa 3D',
    subtitle: 'Maquete WebGL, Zoom nas lojas, Street View e 2º Piso',
  },
  vision: {
    label: 'Sensor Webcam',
    shortLabel: 'Câmera',
    subtitle: 'Contagem anônima na porta (quem passa vs. quem entra)',
  },
  counter: {
    label: 'Modo Balcão',
    shortLabel: 'Balcão',
    subtitle: 'Registro em 1 toque do porquê o cliente não comprou',
  },
  concierge: {
    label: 'Concierge QR',
    shortLabel: 'QR Cliente',
    subtitle: 'Totem anônimo que capta desejo real e libera cupom',
  },
  audit: {
    label: 'LGPD & Backend Python',
    shortLabel: 'Auditoria',
    subtitle: 'Registro das ações do sistema e o que coletamos (só contagens)',
  },
  lojistas: {
    label: 'Contas de Lojistas',
    shortLabel: 'Lojistas',
    subtitle: 'Cadastro das contas: cada lojista vê só a loja e a ala dele',
  },
};

const SINAL_DEMO: ConsumerSignal = {
  id: 'sig-init-1',
  zoneId: 'ala-central-ancoras',
  query: 'Presente masculino até R$ 150',
  budget: '80_200',
  preference: 'Moda rápida com troca garantida',
  couponCode: 'VITRINE-QR10',
  matchedOffer: 'Ala Central • Âncoras e Alameda das Cores',
  timestamp: '20:54',
};

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
  const activeTenant = useMemo<StoreTenant | null>(() => {
    if (papel === 'lojista' && lojaFixa && zonaFixa) {
      const doCatalogo = CAPIM_DOURADO_STORES.find((s) => s.storeName.toLowerCase() === lojaFixa.toLowerCase());
      if (doCatalogo) return { ...doCatalogo, zoneId: zonaFixa };
      const zona = CAPIM_DOURADO_ZONES.find((z) => z.id === zonaFixa);
      return {
        id: 'conta',
        storeName: lojaFixa,
        zoneId: zonaFixa,
        segment: CAPIM_DOURADO_STORES.find((s) => s.zoneId === zonaFixa)?.segment ?? 'moda',
        avgTicket: 185, // mesmo padrão do painel quando a loja não está no catálogo
        floorLabel: zona?.shortName ?? zonaFixa,
      };
    }
    return accessRole === 'store'
      ? CAPIM_DOURADO_STORES.find((s) => s.id === activeStoreId) ?? CAPIM_DOURADO_STORES[0]
      : null;
  }, [papel, lojaFixa, zonaFixa, accessRole, activeStoreId]);

  const initialZoneId = urlView.zoneId ?? 'ala-central-ancoras';
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

  // Dados fictícios só entram na demonstração offline; logado, tudo vem da API.
  const [lostSales, setLostSales] = useState<LostSaleEvent[]>([]);
  const [completedSalesByZone, setCompletedSalesByZone] = useState<Partial<Record<ZoneId, number>>>({});
  const [campaigns, setCampaigns] = useState<FlashCampaign[]>([]);
  const [signals, setSignals] = useState<ConsumerSignal[]>([]);

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

  // Ciclo entre aparelhos: logado, o estado vem de GET /api/estado (já filtrado pela API para o
  // lojista) a cada 3 s; no QR público, só as ofertas da ala. Na demonstração offline nada é enviado.
  const [online, setOnline] = useState(false);
  const [vitrine, setVitrine] = useState<Partial<Record<ZoneId, VitrineResumo>>>({});
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

  const refresh = useCallback(async () => {
    try {
      if (conciergePublico) {
        setCampaigns(await api.campanhasAtivas(selectedZoneId));
      } else if (sessao) {
        // Lojista: a API filtra pelo token. Admin "vendo como loja": filtro opcional ?loja=&ala=.
        const filtro = papel === 'admin' && activeTenant
          ? { loja: activeTenant.storeName, ala: activeTenant.zoneId }
          : undefined;
        const e = await api.estado(filtro);
        setLostSales(e.lostSales);
        setCompletedSalesByZone(e.completedSalesByZone);
        setSignals(e.signals);
        setCampaigns(e.campaigns);
        setVitrine(e.vitrine);
        setAlertas(e.alertas);
        setPorHora(e.porHora ?? {});
      } else {
        return;
      }
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [conciergePublico, sessao, selectedZoneId, papel, activeTenant]);

  useEffect(() => {
    if (activeTenant) {
      setSelectedZoneId(activeTenant.zoneId);
      const z = CAPIM_DOURADO_ZONES.find((item) => item.id === activeTenant.zoneId);
      if (z) setFloor(z.floor);
    }
  }, [activeTenant]);

  useEffect(() => {
    if (demo || (!sessao && !conciergePublico)) return;
    refresh();
    syncLiveContext(false);
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, [refresh, syncLiveContext, demo, sessao, conciergePublico]);

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

  const limparDados = () => {
    setLostSales([]);
    setCompletedSalesByZone({});
    setSignals([]);
    setCampaigns([]);
    setVitrine({});
    setAlertas([]);
    setPorHora({});
    setAlertasVistos([]);
    setLastAnalysis(null);
    setOnline(false);
  };

  const entrar = (nova: Sessao) => {
    limparDados();
    salvarSessao(nova);
    setSessao(nova);
    setDemo(false);
    setAvisoLogin(null);
  };

  const sair = (aviso: string | null = null) => {
    salvarSessao(null);
    setSessao(null);
    setDemo(false);
    limparDados();
    setAvisoLogin(aviso);
  };

  const entrarDemo = () => {
    setLostSales(INITIAL_LOST_SALES);
    setCampaigns(INITIAL_FLASH_CAMPAIGNS);
    setSignals([SINAL_DEMO]);
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
      const hasCam = effectiveVision.zoneId === telemetry.zone.id;
      const camSummary = hasCam
        ? `Webcam ao vivo na porta: ${effectiveVision.passersBy} passaram, ${effectiveVision.vitrineStops} olharam a vitrine (${effectiveVision.attractionRate}% atração).`
        : '';

      const response = await analyzeWithAI({
        category: telemetry.zone.segment,
        context: `Ala: ${telemetry.zone.name} | Clima: ${factors.weather} | Turno: ${factors.timeSlot} | Evento: ${factors.mallEvent} | Gargalo: ${LOST_SALE_LABELS[telemetry.dominantReason]} | IQ: ${telemetry.opportunityScore}. ${camSummary}`,
        prompt: `Gere ações imediatas de vitrine, estoque e abordagem para aumentar a conversão em ${telemetry.zone.shortName} no Capim Dourado Shopping considerando o gargalo "${LOST_SALE_LABELS[telemetry.dominantReason]}" e buscas quentes (${telemetry.zone.hotSearches.join(', ')}).`,
      }, demo ? '' : undefined); // demonstração offline: heurística local, nada vai para a API
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
    viaApi(() => api.publicarCampanha(draft), () => setCampaigns((prev) => [created, ...prev]));
    appendAudit(
      'FLASH_CAMPAIGN_PUBLISHED',
      `Oferta "${created.title}" publicada para ${created.storeName} (${created.couponCode})`
    );
  };

  const handleToggleCampaign = (id: string) => {
    const alvo = campaigns.find((c) => c.id === id);
    if (online && alvo) {
      viaApi(() => api.alterarCampanha(id, !alvo.active), () => undefined);
      return;
    }
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
    viaApi(() => api.removerCampanha(id), () => setCampaigns((prev) => prev.filter((c) => c.id !== id)));
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
    segmento?: string
  ): Promise<ConsumerSignal> => {
    if (online) {
      try {
        const salvo = await api.buscar(zoneId, query, budget, segmento);
        refresh();
        return salvo;
      } catch {
        setOnline(false);
      }
    }
    const zone = CAPIM_DOURADO_ZONES.find((z) => z.id === zoneId) ?? CAPIM_DOURADO_ZONES[0];
    const filteredCampaigns =
      segmento && segmento !== 'todos'
        ? campaigns.filter((c) => !c.segmento || c.segmento === segmento)
        : campaigns;
    const match = matchConsumerOffer(
      query,
      zone,
      filteredCampaigns.length ? filteredCampaigns : campaigns
    );
    const signal: ConsumerSignal = {
      id: `sig-${Date.now()}`,
      zoneId,
      query,
      budget,
      segmento,
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

  // Quiosque mostra só a tela dele; a demonstração offline vê tudo menos as contas (precisam da API).
  const abas: ActiveTab[] = kioskTab
    ? [kioskTab]
    : demo
      ? abasPermitidas('admin').filter((a) => a !== 'lojistas')
      : abasPermitidas(papel);
  const aba = abas.includes(activeTab) ? activeTab : abas[0];
  const numero = (id: ActiveTab) => String(abas.indexOf(id) + 1).padStart(2, '0');

  const navItems = (
    [
      { id: 'cockpit', grupo: 'operacao', icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> },
      { id: 'map', grupo: 'operacao', icon: <Box className="w-4 h-4" aria-hidden="true" /> },
      { id: 'vision', grupo: 'operacao', icon: <Camera className="w-4 h-4" aria-hidden="true" /> },
      { id: 'counter', grupo: 'operacao', icon: <ClipboardCheck className="w-4 h-4" aria-hidden="true" /> },
      { id: 'concierge', grupo: 'operacao', icon: <QrCode className="w-4 h-4" aria-hidden="true" /> },
      { id: 'audit', grupo: 'gestao', icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" /> },
      { id: 'lojistas', grupo: 'gestao', icon: <Users className="w-4 h-4" aria-hidden="true" /> },
    ] as { id: ActiveTab; grupo: 'operacao' | 'gestao'; icon: React.ReactNode }[]
  ).filter((item) => abas.includes(item.id));

  const meta = TAB_META[aba];

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

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#0B0D12] flex flex-col lg:flex-row">
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

          {/* Seletor Multi-Tenant: admin/demo podem ver como uma loja (o lojista já vem fixo pelo login) */}
          {papel !== 'lojista' && (
          <div className="rounded-2xl bg-[#12151D] border border-[#E2A83B]/25 p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#F5C76B]">
              <span className="flex items-center gap-1.5">
                {activeTenant ? <Lock className="w-3 h-3" aria-hidden="true" /> : <Building2 className="w-3 h-3" aria-hidden="true" />}
                {activeTenant ? 'Modo Lojista Isolado' : 'Admin Shopping'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-stone-300">
                Multi-Tenant
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setAccessRole('admin')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  accessRole === 'admin'
                    ? 'gold-pill-metallic'
                    : 'bg-white/5 text-stone-300 hover:bg-white/10'
                }`}
              >
                Admin Geral
              </button>
              <button
                type="button"
                onClick={() => setAccessRole('store')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  accessRole === 'store'
                    ? 'gold-pill-metallic'
                    : 'bg-white/5 text-stone-300 hover:bg-white/10'
                }`}
              >
                Ver como loja
              </button>
            </div>
            {accessRole === 'store' && (
              <div className="space-y-1">
                <label htmlFor="tenant-store-select" className="text-[10px] text-stone-400 block">
                  Loja (filtro da visão do admin):
                </label>
                <select
                  id="tenant-store-select"
                  value={activeStoreId}
                  onChange={(e) => setActiveStoreId(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0D12] border border-[#E2A83B]/30 px-2.5 py-1.5 text-xs font-bold text-[#F5C76B]"
                >
                  {CAPIM_DOURADO_STORES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.storeName} ({st.floorLabel.split('•')[1]?.trim() ?? st.zoneId})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          )}

          {/* Navegação Numerada Principal */}
          <nav aria-label="Módulos do VitrineIQ" className="space-y-1">
            {(['operacao', 'gestao'] as const).map((grupo) => {
              const itens = navItems.filter((item) => item.grupo === grupo);
              if (itens.length === 0) return null;
              return (
                <div key={grupo} className={grupo === 'gestao' ? 'pt-4' : undefined}>
                  <span className="px-2.5 text-[10px] font-bold uppercase tracking-widest text-stone-500 block mb-2">
                    {grupo === 'operacao' ? 'Operação do Lojista' : 'Administração'}
                  </span>
                  {itens.map((item) => {
                    const info = TAB_META[item.id];
                    const active = aba === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        aria-current={active ? 'page' : undefined}
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
                          {numero(item.id)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
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
                    {kioskTab ? 'VitrineIQ' : `${numero(aba)} / ${String(abas.length).padStart(2, '0')}`}
                  </span>
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#111318]">
                    {meta.label}
                  </h1>
                </div>
                <p className="text-xs text-stone-500 hidden sm:block">{meta.subtitle}</p>
              </div>
            </div>

            {/* Atalhos Rápidos + visão da conta */}
            <div className="flex flex-wrap items-center gap-2">
              {!kioskTab && papel !== 'lojista' && (
                <button
                  type="button"
                  onClick={() => setAccessRole(accessRole === 'admin' ? 'store' : 'admin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition ${
                    activeTenant
                      ? 'bg-[#0B0D12] border-[#E2A83B]/40 text-[#F5C76B]'
                      : 'bg-white border-stone-200 text-[#0B0D12] hover:border-[#E2A83B]'
                  }`}
                  title="Alternar entre visão Admin do Shopping e visão isolada da Loja"
                >
                  {activeTenant ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-[#E2A83B]" aria-hidden="true" />
                      <span>Loja: {activeTenant.storeName}</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-3.5 h-3.5 text-[#7A4B0A]" aria-hidden="true" />
                      <span>Visão Admin (Todas as Lojas)</span>
                    </>
                  )}
                </button>
              )}
              {abas.includes('map') && aba !== 'map' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-xs font-bold text-[#111318] flex items-center gap-1.5 shadow-sm"
                >
                  <Box className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                  <span>Abrir Tour 3D</span>
                </button>
              )}
              {abas.includes('vision') && aba !== 'vision' && (
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
                title={
                  demo
                    ? 'Dados fictícios; nada é enviado para a API'
                    : online
                      ? 'Dados compartilhados entre aparelhos pela API'
                      : 'API sem resposta: tentando de novo a cada 3 s'
                }
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${
                  online ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {demo ? 'Demonstração offline' : online ? 'Ao vivo' : 'Sem conexão com a API'}
              </span>
              {!conciergePublico && (sessao || demo) && (
                <span className="flex items-center gap-2">
                  {sessao && (
                    <span className="text-[11px] text-stone-600 text-right leading-tight">
                      <strong className="block text-[#111318]">{sessao.usuario.nome}</strong>
                      {papel === 'admin' ? 'Admin' : `Lojista${lojaFixa ? ` · ${lojaFixa}` : ''}`}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => sair()}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-xs font-bold text-[#111318] flex items-center gap-1.5 shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                    <span>{demo ? 'Sair da demonstração' : 'Sair'}</span>
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Barra de Navegação Horizontal para Mobile/Tablet */}
          <nav
            aria-label="Navegação Mobile"
            className={`${kioskTab ? 'hidden' : 'lg:hidden flex'} items-center gap-1.5 overflow-x-auto pt-3 pb-1`}
          >
            {navItems.map((item) => {
              const info = TAB_META[item.id];
              const active = aba === item.id;
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

            {aba === 'cockpit' && (
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
                onOpenVision={abas.includes('vision') ? () => setActiveTab('vision') : undefined}
                completedSalesByZone={completedSalesByZone}
                perfilHoje={porHora[selectedZoneId]}
                lojaFixa={lojaFixa}
              />
            )}

            {aba === 'map' && (
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

            {aba === 'vision' && (
              <EdgeVisionSensor
                zones={CAPIM_DOURADO_ZONES}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                snapshot={visionSnapshot}
                onUpdateSnapshot={setVisionSnapshot}
                onAnalyzeWithVision={handleAnalyzeWithVision}
              />
            )}

            {aba === 'counter' && (
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
                onLogLostSale={handleLogLostSale}
                onUndoLostSale={handleUndoLostSale}
                onLogCompletedSale={handleLogCompletedSale}
                completedSalesCount={completedSalesByZone[selectedZoneId] ?? 0}
                lojaFixa={lojaFixa}
              />
            )}

            {aba === 'concierge' && (
              <ConsumerConcierge
                zones={CAPIM_DOURADO_ZONES}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
                campaigns={campaigns}
                signals={signals}
                onSubmitConsumerSignal={handleSubmitConsumerSignal}
                onNavigateToStore={abas.includes('map') ? handleNavigateToStore : undefined}
              />
            )}

            {aba === 'audit' && <SecurityAuditPanel auditLogs={auditLogs} />}

            {aba === 'lojistas' && <LojistasAdmin />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
