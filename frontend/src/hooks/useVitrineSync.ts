import { useCallback, useEffect, useRef, useState } from 'react';
import {
  api,
  CicloEstado,
  LiveContextPayload,
  Papel,
  Sessao,
  VitrineAlerta,
  VitrineResumo,
} from '../services/api';
import {
  ConsumerSignal,
  CrowdDropState,
  FlashCampaign,
  LostSaleEvent,
  ShopContextFactors,
  StoreTenant,
  SystemAuditLog,
  ZoneId,
} from '../types';
import { useOfflineQueue } from './useOfflineQueue';

interface UseVitrineSyncOptions {
  sessao: Sessao | null;
  demo: boolean;
  conciergePublico: boolean;
  selectedZoneId: ZoneId;
  papel: Papel | null;
  activeTenant: StoreTenant | null;
  appendAudit: (action: string, details: string, status?: SystemAuditLog['status']) => void;
}

/**
 * Sincroniza estado compartilhado com a API (/api/estado, /api/contexto), gerencia polling
 * e coordena a fila offline de eventos do balcão.
 */
export function useVitrineSync({
  sessao,
  demo,
  conciergePublico,
  selectedZoneId,
  papel,
  activeTenant,
  appendAudit,
}: UseVitrineSyncOptions) {
  const [online, setOnline] = useState(false);
  const [lostSales, setLostSales] = useState<LostSaleEvent[]>([]);
  const [completedSalesByZone, setCompletedSalesByZone] = useState<Partial<Record<ZoneId, number>>>({});
  const [campaigns, setCampaigns] = useState<FlashCampaign[]>([]);
  const [signals, setSignals] = useState<ConsumerSignal[]>([]);
  const [vitrine, setVitrine] = useState<Partial<Record<ZoneId, VitrineResumo>>>({});
  const [crowdDropByZone, setCrowdDropByZone] = useState<Partial<Record<ZoneId, CrowdDropState>>>({});
  const [alertas, setAlertas] = useState<VitrineAlerta[]>([]);
  const [porHora, setPorHora] = useState<CicloEstado['porHora']>({});
  const [liveContext, setLiveContext] = useState<LiveContextPayload | null>(null);
  const [isContextAuto, setIsContextAuto] = useState(true);
  const [isSyncingContext, setIsSyncingContext] = useState(false);
  const [factors, setFactors] = useState<ShopContextFactors>({
    weather: 'calor_38c',
    timeSlot: 'pos_cinema_20h',
    mallEvent: 'estreia_cinemark',
  });

  const pendingCampaignsRef = useRef<FlashCampaign[]>([]);
  const toggledCampaignsRef = useRef<Record<string, boolean>>({});
  const deletedCampaignIdsRef = useRef<Set<string>>(new Set());
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const { pendingCount, enqueueSale, enqueueLoss, flushQueue } = useOfflineQueue({
    enabled: Boolean(sessao && !demo),
    onFlushed: (count) => {
      appendAudit('OFFLINE_QUEUE_SYNCED', `${count} registro(s) do balcão reenviado(s) após reconexão`);
      void refreshRef.current();
    },
  });

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
        const filtro =
          papel === 'admin' && activeTenant
            ? { loja: activeTenant.storeName, ala: activeTenant.zoneId }
            : undefined;
        const e = await api.estado(filtro);
        setLostSales(e.lostSales);
        setCompletedSalesByZone(e.completedSalesByZone);
        setSignals(e.signals);

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
      } else {
        return;
      }
      setOnline(true);
      if (sessao && !demo) {
        void flushQueue();
      }
    } catch {
      setOnline(false);
    }
  }, [conciergePublico, sessao, demo, selectedZoneId, papel, activeTenant, flushQueue]);

  refreshRef.current = refresh;

  useEffect(() => {
    if (demo || (!sessao && !conciergePublico)) return;
    refresh();
    syncLiveContext(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, 3000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refresh, syncLiveContext, demo, sessao, conciergePublico]);

  const viaApi = useCallback(
    (chamada: () => Promise<unknown>, local: () => void) => {
      if (!online) return local();
      chamada()
        .then(refresh)
        .catch(() => {
          setOnline(false);
          local();
        });
    },
    [online, refresh]
  );

  const limparDados = useCallback(() => {
    setLostSales([]);
    setCompletedSalesByZone({});
    setSignals([]);
    setCampaigns([]);
    setVitrine({});
    setAlertas([]);
    setPorHora({});
    setOnline(false);
  }, []);

  return {
    online,
    setOnline,
    lostSales,
    setLostSales,
    completedSalesByZone,
    setCompletedSalesByZone,
    campaigns,
    setCampaigns,
    signals,
    setSignals,
    vitrine,
    crowdDropByZone,
    alertas,
    setAlertas,
    porHora,
    liveContext,
    isContextAuto,
    isSyncingContext,
    factors,
    syncLiveContext,
    handleManualFactorsChange,
    pendingCampaignsRef,
    toggledCampaignsRef,
    deletedCampaignIdsRef,
    refresh,
    viaApi,
    limparDados,
    pendingCount,
    enqueueSale,
    enqueueLoss,
  };
}
