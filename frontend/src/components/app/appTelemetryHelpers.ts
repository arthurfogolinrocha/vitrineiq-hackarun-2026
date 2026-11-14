import {
  CAPIM_DOURADO_STORES,
  CAPIM_DOURADO_ZONES,
} from '../../data/shoppingData';
import { Papel, VitrineResumo } from '../../services/api';
import { matchConsumerOffer } from '../../services/opportunityEngine';
import {
  AccessRole,
  ConsumerSignal,
  FlashCampaign,
  StoreTenant,
  VisionFunnelSnapshot,
  ZoneId,
} from '../../types';

export interface DemoCameraOverlay {
  zoneId: ZoneId;
  apontaram: number;
  noCelular: number;
  voltaramOlhar: number;
  olharesPorZona: { esquerda: number; centro: number; direita: number };
  lastPointedPart: 'esquerda' | 'centro' | 'direita' | null;
}

/** Resolve o tenant ativo considerando conta fixa de lojista ou filtro de visualização admin/demo. */
export function resolveActiveTenant(
  papel: Papel | null,
  lojaFixa: string | null,
  zonaFixa: ZoneId | null,
  accessRole: AccessRole,
  activeStoreId: string
): StoreTenant | null {
  if ((papel === 'lojista' || papel === 'vendedor') && lojaFixa && zonaFixa) {
    const doCatalogo = CAPIM_DOURADO_STORES.find(
      (s) => s.storeName.toLowerCase() === lojaFixa.toLowerCase()
    );
    if (doCatalogo) return { ...doCatalogo, zoneId: zonaFixa };
    const zona = CAPIM_DOURADO_ZONES.find((z) => z.id === zonaFixa);
    return {
      id: 'conta',
      storeName: lojaFixa,
      zoneId: zonaFixa,
      segment: CAPIM_DOURADO_STORES.find((s) => s.zoneId === zonaFixa)?.segment ?? 'moda',
      avgTicket: 185,
      floorLabel: zona?.shortName ?? zonaFixa,
    };
  }
  return accessRole === 'store'
    ? CAPIM_DOURADO_STORES.find((s) => s.id === activeStoreId) ?? CAPIM_DOURADO_STORES[0]
    : null;
}

/** Mescla telemetria da câmera real com o simulador de gestos/olhar da ala selecionada. */
export function buildMergedVitrineResumo(
  cameraResumo: VitrineResumo | undefined,
  demoCameraOverlay: DemoCameraOverlay | null,
  effectiveVision: VisionFunnelSnapshot,
  selectedZoneId: ZoneId
): VitrineResumo {
  const demoCam = demoCameraOverlay?.zoneId === selectedZoneId ? demoCameraOverlay : null;
  const passantes = (cameraResumo?.passantes ?? effectiveVision.passersBy) + (demoCam ? 4 : 0);
  const olharam = (cameraResumo?.olharam ?? effectiveVision.vitrineStops) + (demoCam ? demoCam.apontaram : 0);
  const leftBase = cameraResumo?.olharesPorZona?.esquerda ?? Math.round(olharam * 0.28);
  const centerBase = cameraResumo?.olharesPorZona?.centro ?? Math.round(olharam * 0.44);
  const rightBase =
    cameraResumo?.olharesPorZona?.direita ?? Math.max(0, olharam - leftBase - centerBase);

  return {
    passantes,
    olharam,
    taxaAtencao: passantes ? Math.round((olharam * 100) / passantes) : 0,
    pararamSemOlhar: cameraResumo?.pararamSemOlhar ?? Math.round(passantes * 0.14),
    atencaoMediaS: cameraResumo?.atencaoMediaS ?? 6.4,
    picoSimultaneo: cameraResumo?.picoSimultaneo ?? 5,
    apontaram: (cameraResumo?.apontaram ?? 2) + (demoCam?.apontaram ?? 0),
    noCelular: (cameraResumo?.noCelular ?? 3) + (demoCam?.noCelular ?? 0),
    voltaramOlhar: (cameraResumo?.voltaramOlhar ?? 2) + (demoCam?.voltaramOlhar ?? 0),
    chegaramPerto: (cameraResumo?.chegaramPerto ?? 6) + (demoCam ? 2 : 0),
    horaPico: cameraResumo?.horaPico ?? 19,
    porHora: cameraResumo?.porHora ?? {},
    olharesPorZona: {
      esquerda: leftBase + (demoCam?.olharesPorZona.esquerda ?? 0),
      centro: centerBase + (demoCam?.olharesPorZona.centro ?? 0),
      direita: rightBase + (demoCam?.olharesPorZona.direita ?? 0),
    },
    acoes: cameraResumo?.acoes ?? [],
    atualizadoEm: cameraResumo?.atualizadoEm ?? null,
  };
}

/** Constrói sinal anônimo local do Concierge QR quando em modo demo ou offline. */
export function buildLocalConsumerSignal(
  zoneId: ZoneId,
  query: string,
  budget: ConsumerSignal['budget'],
  campaigns: FlashCampaign[],
  segmento?: string,
  originZone?: ZoneId
): { signal: ConsumerSignal; zoneShortName: string } {
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
  const match = matchConsumerOffer(query, zone, pool.length ? pool : campaigns);
  const hasAllianceBonus = Boolean(
    allianceCampaign && match.couponCode === allianceCampaign.couponCode
  );

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

  return { signal, zoneShortName: zone.shortName };
}
