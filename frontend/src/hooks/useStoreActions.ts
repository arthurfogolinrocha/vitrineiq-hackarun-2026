import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { LOST_SALE_LABELS } from '../data/shoppingData';
import { api, Sessao } from '../services/api';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import {
  ConsumerSignal,
  FlashCampaign,
  LostSaleEvent,
  LostSaleReason,
  StoreTenant,
  SystemAuditLog,
  ZoneId,
} from '../types';
import { ActiveTab } from '../utils/acesso';
import { buildLocalConsumerSignal } from '../components/app/appTelemetryHelpers';
import { isClientHttpError } from './useOfflineQueue';

interface UseStoreActionsOptions {
  sessao: Sessao | null;
  demo: boolean;
  online: boolean;
  setOnline: Dispatch<SetStateAction<boolean>>;
  activeTenant: StoreTenant | null;
  selectedZoneId: ZoneId;
  selectedTelemetry: ZoneLiveTelemetry;
  campaigns: FlashCampaign[];
  setCampaigns: Dispatch<SetStateAction<FlashCampaign[]>>;
  lostSales: LostSaleEvent[];
  setLostSales: Dispatch<SetStateAction<LostSaleEvent[]>>;
  setCompletedSalesByZone: Dispatch<SetStateAction<Partial<Record<ZoneId, number>>>>;
  setSignals: Dispatch<SetStateAction<ConsumerSignal[]>>;
  pendingCampaignsRef: MutableRefObject<FlashCampaign[]>;
  toggledCampaignsRef: MutableRefObject<Record<string, boolean>>;
  deletedCampaignIdsRef: MutableRefObject<Set<string>>;
  refresh: () => Promise<void>;
  viaApi: (chamada: () => Promise<unknown>, local: () => void) => void;
  enqueueSale: (zoneId: ZoneId, storeName: string) => void;
  enqueueLoss: (zoneId: ZoneId, storeName: string, reason: LostSaleReason, note?: string) => void;
  appendAudit: (action: string, details: string, status?: SystemAuditLog['status']) => void;
  setActiveTab: Dispatch<SetStateAction<ActiveTab>>;
}

/** Agrupa ações operacionais de campanhas, modo balcão (com fila offline) e concierge QR. */
export function useStoreActions({
  sessao,
  demo,
  online,
  setOnline,
  activeTenant,
  selectedZoneId,
  selectedTelemetry,
  campaigns,
  setCampaigns,
  lostSales,
  setLostSales,
  setCompletedSalesByZone,
  setSignals,
  pendingCampaignsRef,
  toggledCampaignsRef,
  deletedCampaignIdsRef,
  refresh,
  viaApi,
  enqueueSale,
  enqueueLoss,
  appendAudit,
  setActiveTab,
}: UseStoreActionsOptions) {
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
        .catch(() => setOnline(false));
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
    const applyLocal = () => setLostSales((prev) => [entry, ...prev]);

    if (demo || !sessao) {
      applyLocal();
    } else if (!online) {
      applyLocal();
      enqueueLoss(zoneId, storeName, reason, note);
    } else {
      api
        .registrarPerda(zoneId, storeName, reason, note)
        .then(() => refresh())
        .catch((err) => {
          if (isClientHttpError(err)) return;
          setOnline(false);
          applyLocal();
          enqueueLoss(zoneId, storeName, reason, note);
        });
    }
    appendAudit('COUNTER_LOST_SALE_LOGGED', `${storeName}: ${LOST_SALE_LABELS[reason]}`);
  };

  const handleLogCompletedSale = (zoneId: ZoneId, storeName: string) => {
    const applyLocal = () =>
      setCompletedSalesByZone((prev) => ({ ...prev, [zoneId]: (prev[zoneId] ?? 0) + 1 }));

    if (demo || !sessao) {
      applyLocal();
    } else if (!online) {
      applyLocal();
      enqueueSale(zoneId, storeName);
    } else {
      api
        .registrarVenda(zoneId, storeName)
        .then(() => refresh())
        .catch((err) => {
          if (isClientHttpError(err)) return;
          setOnline(false);
          applyLocal();
          enqueueSale(zoneId, storeName);
        });
    }
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
    const { signal, zoneShortName } = buildLocalConsumerSignal(
      zoneId,
      query,
      budget,
      campaigns,
      segmento,
      originZone
    );
    setSignals((prev) => [signal, ...prev]);
    appendAudit(
      'CONCIERGE_QR_SIGNAL',
      `Busca anônima em ${zoneShortName}: "${query}" -> cupom ${signal.couponCode}`
    );
    return signal;
  };

  const handleQuickFlashFromVoice = (voiceNote: string, reason: LostSaleReason) => {
    const targetStore = activeTenant?.storeName || selectedTelemetry.zone.anchors[0] || 'VitrineIQ';
    const zoneId = activeTenant?.zoneId ?? selectedZoneId;
    const discountBadge =
      reason === 'preco'
        ? '15% OFF VOZ'
        : reason === 'estoque_grade'
          ? 'RESERVA EXPRESSA'
          : 'ATENDIMENTO VIP';
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

  return {
    handleLaunchCampaign,
    handleToggleCampaign,
    handleDeleteCampaign,
    handleLogLostSale,
    handleLogCompletedSale,
    handleUndoLostSale,
    handleSubmitConsumerSignal,
    handleQuickFlashFromVoice,
  };
}
