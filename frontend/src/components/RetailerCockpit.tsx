import React, { useEffect, useRef, useState } from 'react';
import {
  AIAnalysisResponse,
  CrowdDropState,
  FlashCampaign,
  ShopContextFactors,
  StoreTenant,
  VisionFunnelSnapshot,
  ZoneId,
} from '../types';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import { LiveContextPayload, VitrineResumo } from '../services/api';
import { horasDoGrafico, insightsPorHora, PerfilPorHora } from '../utils/horario';
import { PosterDraft, PromoPosterModal } from './PromoPosterModal';
import { VitrineCrowdDropModal } from './VitrineCrowdDropModal';
import { CampaignManagerSection } from './cockpit/CampaignManagerSection';
import { CockpitStatusBanners } from './cockpit/CockpitStatusBanners';
import { ContextSimulatorCard } from './cockpit/ContextSimulatorCard';
import { CopilotAnalysisSection } from './cockpit/CopilotAnalysisSection';
import { DoorFunnelCard } from './cockpit/DoorFunnelCard';
import { HourlyPeakSection } from './cockpit/HourlyPeakSection';
import { NewCampaignModal } from './cockpit/NewCampaignModal';
import { OpportunityScoreCard } from './cockpit/OpportunityScoreCard';
import { VitrineRadarSection } from './cockpit/VitrineRadarSection';
import {
  CampaignDraftForm,
  HOURLY_PROFILE,
  VitrineThird,
  buildVitrineRescueDraft,
  buildWhatsappOfferCopy,
  computeCockpitMetrics,
  resolveStoreMeta,
} from './cockpit/cockpitHelpers';

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

/** Cockpit tático do lojista/shopping: orquestra KPIs, funil, Vitrine Viva, gráficos, IA e campanhas. */
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
  const [campaignForm, setCampaignForm] = useState<CampaignDraftForm>(() => ({
    storeName: activeTenant?.storeName || current.zone.anchors[0] || 'Loja Âncora',
    segmento: activeTenant?.segment || 'todos',
    triggerOrigin: '',
    title: 'Combo Pós-Cinema 2h Relâmpago',
    discountBadge: '15% OFF',
    couponCode: 'CAPIM15',
    whatsappCopy: buildWhatsappOfferCopy('CAPIM15', '15% OFF'),
    expiresInMinutes: 120,
  }));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [posterDraft, setPosterDraft] = useState<PosterDraft | null>(null);
  const [publishedNotice, setPublishedNotice] = useState<PosterDraft | null>(null);
  const [crowdDropOpen, setCrowdDropOpen] = useState(false);

  const selectedHourBar = HOURLY_PROFILE.find((b) => b.slot === factors.timeSlot);
  const [selectedBarWeight, setSelectedBarWeight] = useState<number>(
    selectedHourBar?.weight ?? 1.0
  );

  useEffect(() => {
    const match = HOURLY_PROFILE.find((b) => b.slot === factors.timeSlot);
    if (match) setSelectedBarWeight(match.weight);
  }, [factors.timeSlot]);

  useEffect(() => {
    setCampaignForm((prev) => ({
      ...prev,
      storeName: activeTenant?.storeName || current.zone.anchors[0] || 'Loja Âncora',
      segmento: activeTenant?.segment ?? prev.segmento,
    }));
  }, [activeTenant, current.zone.id, current.zone.anchors]);

  const updateCampaignForm = (patch: Partial<CampaignDraftForm>) => {
    setCampaignForm((prev) => ({ ...prev, ...patch }));
  };

  // Com dado real por hora, o gráfico mostra o medido e não escala o Score; sem ele, vale o perfil estimado.
  const horasReais = perfilHoje ? horasDoGrafico(perfilHoje) : [];
  const temDadoReal = horasReais.some((x) => Object.values(x.dados).some((n) => n > 0));
  const maxPassaram = Math.max(1, ...horasReais.map((x) => x.dados.passaram));
  const insights = temDadoReal && perfilHoje ? insightsPorHora(perfilHoje) : [];

  const metrics = computeCockpitMetrics({
    current,
    temDadoReal,
    selectedBarWeight,
    visionSnapshot,
    completedSalesByZone,
    activeTenant,
  });

  const openModal = () => {
    setValidationError(null);
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    setValidationError(null);
    dialogRef.current?.close();
  };

  const lojaCampanha = (lojaFixa ?? campaignForm.storeName).trim();

  const handleSubmitCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      lojaCampanha.length === 0 ||
      campaignForm.title.trim().length === 0 ||
      campaignForm.couponCode.trim().length === 0 ||
      campaignForm.discountBadge.trim().length === 0 ||
      campaignForm.whatsappCopy.trim().length === 0
    ) {
      setValidationError(
        'Todos os campos são obrigatórios e não podem conter apenas espaços em branco.'
      );
      return;
    }
    setValidationError(null);

    const cleanStore = lojaCampanha; // lojista: sempre a loja do login, nunca a digitada
    const cleanTitle = campaignForm.title.trim();
    const cleanBadge = campaignForm.discountBadge.trim() || 'OFERTA';
    const cleanCoupon = campaignForm.couponCode.trim().toUpperCase();
    const cleanCopy = campaignForm.whatsappCopy.trim();

    onLaunchCampaign({
      zoneId: current.zone.id,
      storeName: cleanStore,
      segmento: campaignForm.segmento !== 'todos' ? campaignForm.segmento : activeTenant?.segment,
      triggerOrigin: campaignForm.triggerOrigin || undefined,
      title: cleanTitle,
      discountBadge: cleanBadge,
      couponCode: cleanCoupon,
      whatsappCopy: cleanCopy,
      expiresInMinutes: campaignForm.expiresInMinutes,
    });

    const matchedStore = resolveStoreMeta(cleanStore, activeTenant, true);
    const generatedPoster: PosterDraft = {
      storeName: cleanStore,
      logoUrl: matchedStore?.logoUrl,
      floorLabel: matchedStore?.floorLabel || current.zone.shortName,
      zoneId: current.zone.id,
      title: cleanTitle,
      discountBadge: cleanBadge,
      couponCode: cleanCoupon,
      copyText: cleanCopy,
      expiresInMinutes: campaignForm.expiresInMinutes,
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

  const handleRescueVitrine = (part: VitrineThird) => {
    updateCampaignForm(buildVitrineRescueDraft(part));
    openModal();
  };

  const activeDisplayStoreName = activeTenant?.storeName ?? campaignForm.storeName;
  const activeDisplayStoreLogo = resolveStoreMeta(
    activeDisplayStoreName,
    activeTenant,
    true
  )?.logoUrl;

  return (
    <div className="space-y-5">
      <CockpitStatusBanners
        publishedNotice={publishedNotice}
        onOpenPoster={setPosterDraft}
        onDismissNotice={() => setPublishedNotice(null)}
        activeTenant={activeTenant}
      />

      {/* LINHA 1: HERO BENTO (8 cols Obsidian + 4 cols Funil Físico) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <OpportunityScoreCard
          current={current}
          activeTenant={activeTenant}
          isCamActiveHere={metrics.isCamActiveHere}
          onOpenVision={onOpenVision}
          onRunCopilot={onRunCopilot}
          isAnalyzing={isAnalyzing}
          onOpenCampaignModal={openModal}
          effectiveScore={metrics.effectiveScore}
          clampedScore={metrics.clampedScore}
          effectiveFootTraffic={metrics.effectiveFootTraffic}
          stopsTotal={metrics.stopsTotal}
        />

        <DoorFunnelCard
          isCamActiveHere={metrics.isCamActiveHere}
          corridorTotal={metrics.corridorTotal}
          stopsTotal={metrics.stopsTotal}
          entriesTotal={metrics.entriesTotal}
          conversionsTotal={metrics.conversionsTotal}
          stopRatePct={metrics.stopRatePct}
          entryRatePct={metrics.entryRatePct}
          convBarPct={metrics.convBarPct}
        />
      </div>

      {/* DIFERENCIAL: VITRINE VIVA + TAXÍMETRO DINHEIRO NA MESA (R$/h) + RADAR 3 TERÇOS + CROWD-DROP */}
      <VitrineRadarSection
        vitrineResumo={vitrineResumo}
        crowdDrop={crowdDrop}
        lastPointedPart={lastPointedPart}
        onSimulatePointGesture={onSimulatePointGesture}
        onRescueVitrine={handleRescueVitrine}
        onOpenCrowdDrop={() => setCrowdDropOpen(true)}
        opportunityLossHour={metrics.opportunityLossHour}
        peopleNotEntered={metrics.peopleNotEntered}
        avgTicket={metrics.avgTicket}
      />

      {/* LINHA 2: GRÁFICO DE HORÁRIO DE PICO (7 cols) + SIMULADOR TÁTIL DE CONTEXTO (5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <HourlyPeakSection
          zoneShortName={current.zone.shortName}
          activeTenant={activeTenant}
          horasReais={horasReais}
          temDadoReal={temDadoReal}
          maxPassaram={maxPassaram}
          insights={insights}
          maxHourlyFlow={metrics.maxHourlyFlow}
          factors={factors}
          onChangeTimeSlot={(slot) => onChangeFactors({ ...factors, timeSlot: slot })}
          onSelectBarWeight={setSelectedBarWeight}
        />

        <ContextSimulatorCard
          zonesTelemetry={zonesTelemetry}
          current={current}
          onSelectZone={onSelectZone}
          factors={factors}
          onChangeFactors={onChangeFactors}
          liveContext={liveContext}
          isContextAuto={isContextAuto}
          isSyncingContext={isSyncingContext}
          onSyncLiveContext={onSyncLiveContext}
          activeTenant={activeTenant}
          lojaFixa={lojaFixa}
        />
      </div>

      {/* LINHA 3: COPILOTO IA + BUSCAS QUENTES QR + CAMPANHAS RELÂMPAGO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <CopilotAnalysisSection
          current={current}
          activeTenant={activeTenant}
          campaignForm={campaignForm}
          onRunCopilot={onRunCopilot}
          isAnalyzing={isAnalyzing}
          lastAnalysis={lastAnalysis}
          onCreatePosterFromStrategy={setPosterDraft}
        />

        <CampaignManagerSection
          campaigns={campaigns}
          activeTenant={activeTenant}
          currentZoneShortName={current.zone.shortName}
          copiedId={copiedId}
          onOpenModal={openModal}
          onToggleCampaign={onToggleCampaign}
          onDeleteCampaign={onDeleteCampaign}
          onOpenPoster={setPosterDraft}
          onCopyCopywriting={handleCopyCopywriting}
        />
      </div>

      <NewCampaignModal
        dialogRef={dialogRef}
        form={campaignForm}
        onUpdateForm={updateCampaignForm}
        activeTenant={activeTenant}
        lojaFixa={lojaFixa}
        validationError={validationError}
        onSubmit={handleSubmitCampaign}
        onClose={closeModal}
      />

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
