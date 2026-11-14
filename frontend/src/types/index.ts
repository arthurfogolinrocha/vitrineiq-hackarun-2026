export interface MissionItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  priority: 'must' | 'should' | 'could';
  data?: Record<string, unknown>;
}

export interface AIAnalysisRequest {
  prompt: string;
  context?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface AIAnalysisResponse {
  success: boolean;
  content: string;
  latencyMs: number;
  cached?: boolean;
  timestamp: string;
  source?: 'GEMINI_API' | 'BACKEND_FALLBACK' | 'FALLBACK_LOCAL';
}

export interface SystemAuditLog {
  id: string;
  action: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'FALLBACK_LOCAL';
  details: string;
  timestamp: string;
  securityHash: string;
  prevHash?: string;
}

export type FloorId = 'L1' | 'L2' | 'SS1';

export type ZoneId =
  | 'ala-sul-esporte'
  | 'ala-central-ancoras'
  | 'alameda-gourmet'
  | 'ala-lazer-cinema'
  | 'praca-alimentacao-l2';

export type LostSaleReason =
  | 'preco'
  | 'estoque_grade'
  | 'pesquisando'
  | 'fila_atendimento';

export type WeatherCondition = 'calor_38c' | 'chuva_forte' | 'ameno';
export type TimeSlot = 'manha' | 'almoco' | 'pos_trabalho' | 'pos_cinema_20h';
export type MallEvent = 'estreia_cinemark' | 'fim_de_semana' | 'dia_pagamento' | 'fluxo_normal';

export type SegmentCategory =
  | 'todos'
  | 'moda'
  | 'esportes'
  | 'eletronicos'
  | 'alimentacao'
  | 'servicos';

export type AccessRole = 'admin' | 'store';

export interface StoreTenant {
  id: string;
  storeName: string;
  zoneId: ZoneId;
  segment: Exclude<SegmentCategory, 'todos'>;
  avgTicket: number;
  floorLabel: string;
  logoUrl?: string;
}

export interface ShopContextFactors {
  weather: WeatherCondition;
  timeSlot: TimeSlot;
  mallEvent: MallEvent;
}

export interface ShoppingZone {
  id: ZoneId;
  floor: FloorId;
  name: string;
  shortName: string;
  segment: string;
  anchors: string[];
  baseFootTraffic: number;
  baseVitrineStops: number;
  conversions: number;
  vacantSpacesCount: number;
  vacantOpportunityHint: string;
  topObjection: LostSaleReason;
  hotSearches: string[];
  // Coordenadas no mapa SVG esquemático (0..1000 x 0..560)
  mapRect: { x: number; y: number; w: number; h: number };
}

export interface CrossSegmentRoute {
  id: string;
  fromZone: ZoneId;
  toZone: ZoneId;
  fromLabel: string;
  toLabel: string;
  sharePercent: number;
  insight: string;
  recommendedCombo: string;
}

export interface ConsumerSignal {
  id: string;
  zoneId: ZoneId;
  query: string;
  budget: 'ate_80' | '80_200' | 'acima_200';
  segmento?: string;
  preference: string;
  couponCode: string;
  matchedOffer: string;
  timestamp: string;
}

export interface LostSaleEvent {
  id: string;
  zoneId: ZoneId;
  storeName: string;
  reason: LostSaleReason;
  note?: string;
  timestamp: string;
}

export interface FlashCampaign {
  id: string;
  zoneId: ZoneId;
  storeName: string;
  title: string;
  discountBadge: string;
  couponCode: string;
  whatsappCopy: string;
  expiresInMinutes: number;
  segmento?: string;
  active: boolean;
  createdAt: string;
}

export interface VisionFunnelSnapshot {
  zoneId: ZoneId;
  passersBy: number;
  vitrineStops: number;
  entries: number;
  exits: number;
  passedWithoutEntering: number;
  attractionRate: number;
  sourceMode?: 'simulation' | 'webcam_live';
  lastMotionRegion?: 'corridor' | 'vitrine' | 'door' | 'none';
}
