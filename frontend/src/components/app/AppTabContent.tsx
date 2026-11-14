import React, { Suspense, lazy } from 'react';
import {
  AIAnalysisResponse,
  ConsumerSignal,
  CrowdDropState,
  FlashCampaign,
  FloorId,
  LostSaleEvent,
  LostSaleReason,
  ShopContextFactors,
  StoreTenant,
  SystemAuditLog,
  VisionFunnelSnapshot,
  VitrineAuditResult,
  ZoneId,
} from '../../types';
import { CAPIM_DOURADO_ZONES, CROSS_SEGMENT_ROUTES } from '../../data/shoppingData';
import { LiveContextPayload, VitrineResumo } from '../../services/api';
import { ZoneLiveTelemetry } from '../../services/opportunityEngine';
import { PerfilPorHora } from '../../utils/horario';
import { ActiveTab } from '../../utils/acesso';
import { ConsumerConcierge } from '../ConsumerConcierge';

const RetailerCockpit = lazy(() =>
  import('../RetailerCockpit').then((m) => ({ default: m.RetailerCockpit }))
);
const ShoppingMap = lazy(() =>
  import('../ShoppingMap').then((m) => ({ default: m.ShoppingMap }))
);
const EdgeVisionSensor = lazy(() =>
  import('../EdgeVisionSensor').then((m) => ({ default: m.EdgeVisionSensor }))
);
const CounterQuickLog = lazy(() =>
  import('../CounterQuickLog').then((m) => ({ default: m.CounterQuickLog }))
);
const SecurityAuditPanel = lazy(() =>
  import('../SecurityAuditPanel').then((m) => ({ default: m.SecurityAuditPanel }))
);
const LojistasAdmin = lazy(() =>
  import('../LojistasAdmin').then((m) => ({ default: m.LojistasAdmin }))
);

interface AppTabContentProps {
  activeTab: ActiveTab;
  allowedTabs: ActiveTab[];
  onSelectTab: (tab: ActiveTab) => void;
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  floor: FloorId;
  onFloorChange: (floor: FloorId) => void;
  selectedStoreName: string | null;
  onSelectStoreName: (name: string | null) => void;
  factors: ShopContextFactors;
  onChangeFactors: (next: ShopContextFactors) => void;
  liveContext: LiveContextPayload | null;
  isContextAuto: boolean;
  isSyncingContext: boolean;
  onSyncLiveContext: () => void;
  activeTenant: StoreTenant | null;
  mergedVitrineResumo: VitrineResumo;
  crowdDrop?: CrowdDropState;
  lastPointedPart: 'esquerda' | 'centro' | 'direita' | null;
  onSimulatePointGesture: (part: 'esquerda' | 'centro' | 'direita') => void;
  scopedCampaigns: FlashCampaign[];
  campaigns: FlashCampaign[];
  onLaunchCampaign: (draft: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>) => void;
  onToggleCampaign: (id: string) => void;
  onDeleteCampaign: (id: string) => void;
  onRunCopilot: (telemetry: ZoneLiveTelemetry) => Promise<void>;
  isAnalyzing: boolean;
  lastAnalysis: AIAnalysisResponse | null;
  effectiveVision: VisionFunnelSnapshot;
  visionSnapshot: VisionFunnelSnapshot;
  onUpdateVisionSnapshot: (next: VisionFunnelSnapshot) => void;
  onAnalyzeWithVision: (snapshot: VisionFunnelSnapshot) => void;
  onAuditComplete: (res: VitrineAuditResult) => void;
  completedSalesByZone: Partial<Record<ZoneId, number>>;
  perfilHoje?: PerfilPorHora;
  lojaFixa: string | null;
  scopedLostSales: LostSaleEvent[];
  onLogLostSale: (zoneId: ZoneId, storeName: string, reason: LostSaleReason, note?: string) => void;
  onUndoLostSale: () => void;
  onLogCompletedSale: (zoneId: ZoneId, storeName: string) => void;
  onQuickFlashFromVoice: (voiceNote: string, reason: LostSaleReason) => void;
  signals: ConsumerSignal[];
  onSubmitConsumerSignal: (
    zoneId: ZoneId,
    query: string,
    budget: ConsumerSignal['budget'],
    segmento?: string,
    originZone?: ZoneId
  ) => Promise<ConsumerSignal>;
  onNavigateToStore: (storeName: string, targetFloor?: FloorId) => void;
  auditLogs: SystemAuditLog[];
}

/** Roteador de conteúdo dos módulos lazy do workspace VitrineIQ. */
export const AppTabContent: React.FC<AppTabContentProps> = ({
  activeTab,
  allowedTabs,
  onSelectTab,
  zonesTelemetry,
  selectedZoneId,
  onSelectZone,
  floor,
  onFloorChange,
  selectedStoreName,
  onSelectStoreName,
  factors,
  onChangeFactors,
  liveContext,
  isContextAuto,
  isSyncingContext,
  onSyncLiveContext,
  activeTenant,
  mergedVitrineResumo,
  crowdDrop,
  lastPointedPart,
  onSimulatePointGesture,
  scopedCampaigns,
  campaigns,
  onLaunchCampaign,
  onToggleCampaign,
  onDeleteCampaign,
  onRunCopilot,
  isAnalyzing,
  lastAnalysis,
  effectiveVision,
  visionSnapshot,
  onUpdateVisionSnapshot,
  onAnalyzeWithVision,
  onAuditComplete,
  completedSalesByZone,
  perfilHoje,
  lojaFixa,
  scopedLostSales,
  onLogLostSale,
  onUndoLostSale,
  onLogCompletedSale,
  onQuickFlashFromVoice,
  signals,
  onSubmitConsumerSignal,
  onNavigateToStore,
  auditLogs,
}) => {
  const tenantZones = activeTenant
    ? CAPIM_DOURADO_ZONES.filter((z) => z.id === activeTenant.zoneId)
    : CAPIM_DOURADO_ZONES;

  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-amber-500/20 bg-slate-900/60 p-8 text-center text-sm text-amber-200/80 animate-pulse">
          Carregando módulo VitrineIQ…
        </div>
      }
    >
      {activeTab === 'cockpit' && (
        <RetailerCockpit
          zonesTelemetry={zonesTelemetry}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
          factors={factors}
          onChangeFactors={onChangeFactors}
          liveContext={liveContext}
          isContextAuto={isContextAuto}
          isSyncingContext={isSyncingContext}
          onSyncLiveContext={onSyncLiveContext}
          activeTenant={activeTenant}
          vitrineResumo={mergedVitrineResumo}
          crowdDrop={crowdDrop}
          lastPointedPart={lastPointedPart}
          onSimulatePointGesture={onSimulatePointGesture}
          campaigns={scopedCampaigns}
          onLaunchCampaign={onLaunchCampaign}
          onToggleCampaign={onToggleCampaign}
          onDeleteCampaign={onDeleteCampaign}
          onRunCopilot={onRunCopilot}
          isAnalyzing={isAnalyzing}
          lastAnalysis={lastAnalysis}
          visionSnapshot={effectiveVision}
          onOpenVision={allowedTabs.includes('vision') ? () => onSelectTab('vision') : undefined}
          completedSalesByZone={completedSalesByZone}
          perfilHoje={perfilHoje}
          lojaFixa={lojaFixa}
        />
      )}

      {activeTab === 'map' && (
        <ShoppingMap
          floor={floor}
          onFloorChange={onFloorChange}
          zonesTelemetry={zonesTelemetry}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
          routes={CROSS_SEGMENT_ROUTES}
          campaigns={campaigns}
          activeTenant={activeTenant}
          selectedStoreName={selectedStoreName}
          onSelectStoreName={onSelectStoreName}
        />
      )}

      {activeTab === 'vision' && (
        <EdgeVisionSensor
          zones={tenantZones}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
          snapshot={visionSnapshot}
          onUpdateSnapshot={onUpdateVisionSnapshot}
          onAnalyzeWithVision={onAnalyzeWithVision}
          activeTenant={activeTenant}
          olharesPorZona={mergedVitrineResumo.olharesPorZona}
          onAuditComplete={onAuditComplete}
        />
      )}

      {activeTab === 'counter' && (
        <CounterQuickLog
          zones={tenantZones}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
          lostSales={scopedLostSales}
          lockedStoreName={activeTenant?.storeName}
          activeTenant={activeTenant}
          onLogLostSale={onLogLostSale}
          onUndoLostSale={onUndoLostSale}
          onLogCompletedSale={onLogCompletedSale}
          onQuickFlashFromVoice={onQuickFlashFromVoice}
          completedSalesCount={completedSalesByZone[selectedZoneId] ?? 0}
          lojaFixa={lojaFixa}
        />
      )}

      {activeTab === 'concierge' && (
        <ConsumerConcierge
          zones={CAPIM_DOURADO_ZONES}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
          campaigns={campaigns}
          signals={signals}
          activeTenant={activeTenant}
          onSubmitConsumerSignal={onSubmitConsumerSignal}
          onNavigateToStore={allowedTabs.includes('map') ? onNavigateToStore : undefined}
        />
      )}

      {activeTab === 'audit' && <SecurityAuditPanel auditLogs={auditLogs} />}

      {activeTab === 'lojistas' && <LojistasAdmin />}
    </Suspense>
  );
};
