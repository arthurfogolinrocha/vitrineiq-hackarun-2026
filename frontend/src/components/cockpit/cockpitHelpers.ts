import { useEffect, useRef, useState } from 'react';
import { findStoreByName } from '../../data/shoppingData';
import { ZoneLiveTelemetry } from '../../services/opportunityEngine';
import {
  MallEvent,
  StoreTenant,
  TimeSlot,
  VisionFunnelSnapshot,
  WeatherCondition,
  ZoneId,
} from '../../types';

export type VitrineThird = 'esquerda' | 'centro' | 'direita';

export interface CampaignDraftForm {
  storeName: string;
  segmento: string;
  triggerOrigin: string;
  title: string;
  discountBadge: string;
  couponCode: string;
  whatsappCopy: string;
  expiresInMinutes: number;
}

export interface CockpitMetrics {
  pesoHora: number;
  effectiveFootTraffic: number;
  effectiveScore: number;
  clampedScore: number;
  isCamActiveHere: boolean;
  corridorTotal: number;
  stopsTotal: number;
  /** null = não medido (logado: a câmera não conta entradas). */
  entriesTotal: number | null;
  conversionsTotal: number;
  stopRatePct: number;
  entryRatePct: number;
  convBarPct: number;
  maxHourlyFlow: number;
  avgTicket: number;
  peopleNotEntered: number;
  opportunityLossHour: number;
}

export const ALLIANCE_ORIGINS: { value: string; label: string }[] = [
  { value: '', label: 'Sem vínculo de origem (oferta geral)' },
  { value: 'ala-lazer-cinema', label: 'Aliança Pós-Cinemark / Lazer (Ala Norte)' },
  { value: 'praca-alimentacao-l2', label: 'Aliança Praça de Alimentação (2º Piso)' },
  { value: 'ala-sul-esporte', label: 'Aliança Detran / Polícia Federal (Ala Sul)' },
  { value: 'ala-central-ancoras', label: 'Aliança Portaria P1 / Galeria Central' },
];

export const WEATHER_OPTIONS: { value: WeatherCondition; label: string; icon: 'sun' | 'rain' | 'mild' }[] = [
  { value: 'calor_38c', label: 'Sol 38°C', icon: 'sun' },
  { value: 'chuva_forte', label: 'Chuva Forte', icon: 'rain' },
  { value: 'ameno', label: 'Ameno', icon: 'mild' },
];

export const TIME_SLOTS: { value: TimeSlot; label: string; range: string }[] = [
  { value: 'manha', label: 'Manhã', range: '10h–12h' },
  { value: 'almoco', label: 'Almoço', range: '12h–15h' },
  { value: 'pos_trabalho', label: 'Tarde', range: '16h–19h' },
  { value: 'pos_cinema_20h', label: 'Pico Noite', range: '19h–22h' },
];

export const EVENT_OPTIONS: { value: MallEvent; label: string }[] = [
  { value: 'estreia_cinemark', label: 'Estreia Cinemark' },
  { value: 'fim_de_semana', label: 'Fim de Semana' },
  { value: 'dia_pagamento', label: 'Dia de Pagamento' },
  { value: 'fluxo_normal', label: 'Fluxo Normal' },
];

export const HOURLY_PROFILE: { hour: string; slot: TimeSlot; weight: number }[] = [
  { hour: '10h', slot: 'manha', weight: 0.36 },
  { hour: '11h', slot: 'manha', weight: 0.48 },
  { hour: '12h', slot: 'almoco', weight: 0.78 },
  { hour: '13h', slot: 'almoco', weight: 0.86 },
  { hour: '14h', slot: 'almoco', weight: 0.65 },
  { hour: '15h', slot: 'pos_trabalho', weight: 0.58 },
  { hour: '16h', slot: 'pos_trabalho', weight: 0.68 },
  { hour: '17h', slot: 'pos_trabalho', weight: 0.81 },
  { hour: '18h', slot: 'pos_trabalho', weight: 0.92 },
  { hour: '19h', slot: 'pos_cinema_20h', weight: 1.0 },
  { hour: '20h', slot: 'pos_cinema_20h', weight: 0.96 },
  { hour: '21h', slot: 'pos_cinema_20h', weight: 0.74 },
  { hour: '22h', slot: 'pos_cinema_20h', weight: 0.44 },
];

/** Remove sufixos entre parênteses do nome curto da ala para exibição limpa no painel. */
export function cleanWingLabel(shortName: string): string {
  return shortName.replace(/\s*\([^)]*\)/g, '').trim();
}

/** Traduz o Score IQ (0–100) em um rótulo tático legível para o lojista. */
export function getScoreStatusLabel(score: number): string {
  if (score >= 75) return 'Janela de Ouro Ativa';
  if (score >= 45) return 'Demanda Moderada';
  return 'Momento de Atração';
}

/** Gera o texto padrão de WhatsApp & Concierge QR a partir do código e selo da oferta. */
export function buildWhatsappOfferCopy(couponCode: string, discountBadge: string): string {
  const safeCode = couponCode || 'CAPIM15';
  const safeBadge = discountBadge || '15% OFF';
  return `Só nas próximas 2 horas no Capim Dourado: apresente ${safeCode} e garanta ${safeBadge} em peças selecionadas!`;
}

/** Oferta relâmpago curta para a vitrine (resgate ou alerta da câmera); o lojista só confirma. */
export function buildVitrineRescueDraft(
  part: VitrineThird | null,
  minutos = 45,
  ondeSemParte = 'Vitrine'
): Pick<CampaignDraftForm, 'title' | 'discountBadge' | 'couponCode' | 'whatsappCopy' | 'expiresInMinutes'> {
  const onde =
    part === 'esquerda'
      ? 'Vitrine Esquerda'
      : part === 'centro'
        ? 'Vitrine Central'
        : part === 'direita'
          ? 'Vitrine Direita'
          : ondeSemParte;
  // Cupom novo a cada abertura: dois resgates seguidos não publicam o mesmo código.
  const couponCode = `VIQ${Date.now().toString(36).slice(-5).toUpperCase()}`;
  return {
    title: `Relâmpago ao vivo — ${onde}`,
    discountBadge: '15% OFF',
    couponCode,
    whatsappCopy: `Só nos próximos ${minutos} min no Capim Dourado: apresente ${couponCode} e garanta 15% OFF.`,
    expiresInMinutes: minutos,
  };
}

/** Resolve metadados da loja pelo nome, priorizando o tenant ativo quando correspondente. */
export function resolveStoreMeta(
  storeName: string,
  activeTenant?: StoreTenant | null,
  fallbackToActiveTenant = false
): StoreTenant | undefined {
  if (activeTenant && activeTenant.storeName.toLowerCase() === storeName.toLowerCase()) {
    return activeTenant;
  }
  if (fallbackToActiveTenant && activeTenant) {
    return activeTenant;
  }
  return findStoreByName(storeName);
}

/** Calcula os indicadores derivados do Cockpit (fluxo, score efetivo, funil físico e perda horária). */
export function computeCockpitMetrics(params: {
  current: ZoneLiveTelemetry;
  temDadoReal: boolean;
  selectedBarWeight: number;
  visionSnapshot?: VisionFunnelSnapshot;
  completedSalesByZone: Partial<Record<ZoneId, number>>;
  activeTenant?: StoreTenant | null;
}): CockpitMetrics {
  const {
    current,
    temDadoReal,
    selectedBarWeight,
    visionSnapshot,
    completedSalesByZone,
    activeTenant,
  } = params;

  // Logado (medido), o Score e o fluxo nunca são escalados pelo perfil estimado.
  const pesoHora = temDadoReal || current.medido ? 1 : selectedBarWeight;
  const effectiveFootTraffic = Math.round(current.footTraffic * pesoHora);
  const effectiveScore = Math.max(
    0,
    Math.min(100, Math.round(current.opportunityScore * (0.35 + 0.65 * pesoHora)))
  );
  const clampedScore = Math.max(0, Math.min(100, effectiveScore));

  const isCamActiveHere = Boolean(visionSnapshot && visionSnapshot.zoneId === current.zone.id);
  const corridorTotal =
    isCamActiveHere && visionSnapshot && visionSnapshot.passersBy > 0
      ? visionSnapshot.passersBy
      : effectiveFootTraffic;
  const stopsTotal =
    isCamActiveHere && visionSnapshot && visionSnapshot.vitrineStops > 0
      ? visionSnapshot.vitrineStops
      : Math.round(current.vitrineStops * pesoHora);
  // A câmera não conta entradas: com dado real a etapa fica "não medido"; a estimativa só vale na demonstração.
  const entriesTotal: number | null = current.medido
    ? null
    : isCamActiveHere && visionSnapshot && visionSnapshot.entries > 0
      ? visionSnapshot.entries
      : Math.max(12, Math.round(stopsTotal * 0.42));
  // RN12: "compraram" vem só do botão "Venda concluída" do Modo Balcão
  const conversionsTotal = completedSalesByZone[current.zone.id] ?? 0;

  const stopRatePct =
    corridorTotal > 0 ? Math.min(100, Math.round((stopsTotal / corridorTotal) * 100)) : 0;
  const entryRatePct =
    entriesTotal !== null && corridorTotal > 0 ? Math.min(100, Math.round((entriesTotal / corridorTotal) * 100)) : 0;
  const convBarPct =
    corridorTotal > 0 ? Math.min(100, Math.round((conversionsTotal / corridorTotal) * 100)) : 0;

  const maxHourlyFlow = Math.max(220, Math.round(current.footTraffic * 1.15));
  const avgTicket = activeTenant?.avgTicket ?? 185;
  // Medido: sem contagem de entradas, conta quem passou sem olhar a vitrine.
  const peopleNotEntered = Math.max(0, corridorTotal - (entriesTotal ?? stopsTotal));
  const opportunityLossHour = Math.round(peopleNotEntered * 0.14 * avgTicket);

  return {
    pesoHora,
    effectiveFootTraffic,
    effectiveScore,
    clampedScore,
    isCamActiveHere,
    corridorTotal,
    stopsTotal,
    entriesTotal,
    conversionsTotal,
    stopRatePct,
    entryRatePct,
    convBarPct,
    maxHourlyFlow,
    avgTicket,
    peopleNotEntered,
    opportunityLossHour,
  };
}

/** Hook tático de count-up numérico suave via requestAnimationFrame (respeita reduced-motion). */
export function useAnimatedNumber(target: number, durationMs = 420): number {
  const [display, setDisplay] = useState(target);
  const currentRef = useRef(target);

  useEffect(() => {
    const startVal = currentRef.current;
    if (startVal === target) return;
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(startVal + (target - startVal) * eased);
      currentRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}
