import {
  ConsumerSignal,
  FlashCampaign,
  LostSaleEvent,
  LostSaleReason,
  ShopContextFactors,
  ShoppingZone,
  VisionFunnelSnapshot,
  ZoneId,
} from '../types';

/**
 * Espelho determinístico do backend Python (`api/app/engine.py`).
 * Garante paridade matemática entre a API FastAPI e a interface web.
 */
export function calculateRetailOpportunityScore(
  vitrineStops: number,
  qrSearches: number,
  lostSales: number,
  contextMultiplier: number
): number {
  const clampedMult = Math.min(2.0, Math.max(0.5, contextMultiplier));
  const rawDemand = vitrineStops * 0.15 + qrSearches * 2.4 + lostSales * 3.8;
  const weighted = rawDemand * clampedMult;
  return Math.round(Math.min(100, Math.max(0, weighted)) * 10) / 10;
}

export function computeContextMultiplier(
  zoneId: ZoneId,
  factors: ShopContextFactors
): number {
  let mult = 1.0;

  // Fator clima de Palmas-TO
  if (factors.weather === 'calor_38c') {
    if (zoneId === 'ala-central-ancoras' || zoneId === 'praca-alimentacao-l2') mult += 0.25;
    if (zoneId === 'ala-sul-esporte') mult += 0.15;
  } else if (factors.weather === 'chuva_forte') {
    if (zoneId === 'ala-lazer-cinema' || zoneId === 'praca-alimentacao-l2') mult += 0.2;
  }

  // Fator horário
  if (factors.timeSlot === 'almoco' && zoneId === 'praca-alimentacao-l2') mult += 0.35;
  if (factors.timeSlot === 'pos_trabalho') mult += 0.15;
  if (
    factors.timeSlot === 'pos_cinema_20h' &&
    (zoneId === 'ala-lazer-cinema' || zoneId === 'alameda-gourmet' || zoneId === 'praca-alimentacao-l2')
  ) {
    mult += 0.35;
  }

  // Fator evento no shopping
  if (factors.mallEvent === 'estreia_cinemark' && zoneId === 'ala-lazer-cinema') mult += 0.3;
  if (factors.mallEvent === 'fim_de_semana') mult += 0.2;
  if (factors.mallEvent === 'dia_pagamento') mult += 0.25;

  return Math.min(2.0, Number(mult.toFixed(2)));
}

export interface ZoneLiveTelemetry {
  zone: ShoppingZone;
  footTraffic: number;
  vitrineStops: number;
  conversionRate: number;
  qrSearchCount: number;
  lostSalesCount: number;
  dominantReason: LostSaleReason;
  opportunityScore: number;
  multiplier: number;
  cameraFeedLinked: boolean;
}

export function computeZoneTelemetry(
  zone: ShoppingZone,
  factors: ShopContextFactors,
  signals: ConsumerSignal[],
  lostSales: LostSaleEvent[],
  visionSnapshot?: VisionFunnelSnapshot
): ZoneLiveTelemetry {
  const multiplier = computeContextMultiplier(zone.id, factors);
  const zoneSignals = signals.filter((s) => s.zoneId === zone.id);
  const zoneLost = lostSales.filter((l) => l.zoneId === zone.id);

  const cameraFeedLinked = Boolean(visionSnapshot && visionSnapshot.zoneId === zone.id);
  const extraPassers = cameraFeedLinked && visionSnapshot ? visionSnapshot.passersBy : 0;
  const extraStops = cameraFeedLinked && visionSnapshot ? visionSnapshot.vitrineStops : 0;
  const extraEntries = cameraFeedLinked && visionSnapshot ? visionSnapshot.entries : 0;

  const footTraffic = Math.round(zone.baseFootTraffic * multiplier) + extraPassers;
  const vitrineStops =
    Math.round(zone.baseVitrineStops * multiplier) + zoneSignals.length * 3 + extraStops;
  const totalEntries = zone.conversions + extraEntries;
  const conversionRate =
    vitrineStops > 0 ? Number(((totalEntries / vitrineStops) * 100).toFixed(1)) : 0;

  const reasonCounts: Record<LostSaleReason, number> = {
    preco: 0,
    estoque_grade: 0,
    pesquisando: 0,
    fila_atendimento: 0,
  };
  for (const item of zoneLost) {
    reasonCounts[item.reason] += 1;
  }

  let dominantReason: LostSaleReason = zone.topObjection;
  let maxCount = 0;
  for (const [reason, count] of Object.entries(reasonCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantReason = reason as LostSaleReason;
    }
  }

  const opportunityScore = calculateRetailOpportunityScore(
    vitrineStops,
    zoneSignals.length + zone.hotSearches.length,
    zoneLost.length + 2,
    multiplier
  );

  return {
    zone,
    footTraffic,
    vitrineStops,
    conversionRate,
    qrSearchCount: zoneSignals.length,
    lostSalesCount: zoneLost.length,
    dominantReason,
    opportunityScore,
    multiplier,
    cameraFeedLinked,
  };
}

export function matchConsumerOffer(
  _query: string,
  zone: ShoppingZone,
  campaigns: FlashCampaign[]
): { couponCode: string; matchedOffer: string } {
  const activeInZone = campaigns.find((c) => c.zoneId === zone.id && c.active);
  if (activeInZone) {
    return {
      couponCode: activeInZone.couponCode,
      matchedOffer: `${activeInZone.storeName} — ${activeInZone.title} (${activeInZone.discountBadge})`,
    };
  }

  const anyActive = campaigns.find((c) => c.active);

  if (anyActive) {
    return {
      couponCode: anyActive.couponCode,
      matchedOffer: `Sugestão em ${zone.shortName}: ${anyActive.storeName} — ${anyActive.title}`,
    };
  }

  return {
    couponCode: '',
    matchedOffer: `Lojas da ${zone.shortName}: ${zone.anchors.slice(0, 2).join(', ')}`,
  };
}

  // Sem campanha no ar não há cupom nem desconto: só indica as lojas da ala.
