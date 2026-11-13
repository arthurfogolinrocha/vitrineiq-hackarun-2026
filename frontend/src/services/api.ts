import { ConsumerSignal, FlashCampaign, LostSaleEvent, LostSaleReason, ZoneId } from '../types';
import { resolveApiUrl } from './ai';

/** Resumo da câmera de uma ala, como `GET /api/estado` devolve (api/app/ciclo.py). */
export interface VitrineResumo {
  passantes: number;
  olharam: number;
  taxaAtencao: number;
  pararamSemOlhar: number;
  atencaoMediaS: number;
  picoSimultaneo: number;
  horaPico: number | null;
  porHora: Record<string, number>;
  olharesPorZona: Record<string, number>;
  acoes: string[];
  atualizadoEm: string | null;
}

export interface VitrineAlerta {
  id: string;
  zona: ZoneId;
  evento: 'atencao_alta' | 'lotacao' | 'apontou';
  zonaVitrine?: string;
  olhando_s?: number;
  pessoas?: number;
  timestamp: string;
}

export interface CicloEstado {
  lostSales: LostSaleEvent[];
  completedSalesByZone: Partial<Record<ZoneId, number>>;
  signals: ConsumerSignal[];
  campaigns: FlashCampaign[];
  vitrine: Partial<Record<ZoneId, VitrineResumo>>;
  alertas: VitrineAlerta[];
}

const TIMEOUT_MS = 5000;

async function chamar<T>(caminho: string, method = 'GET', body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${resolveApiUrl()}/api${caminho}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`API ${method} ${caminho}: ${res.status}`);
    return (res.status === 204 ? undefined : await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  estado: () => chamar<CicloEstado>('/estado'),
  registrarVenda: (zoneId: ZoneId, storeName: string) =>
    chamar('/balcao', 'POST', { zoneId, storeName, tipo: 'venda' }),
  registrarPerda: (zoneId: ZoneId, storeName: string, reason: LostSaleReason, note?: string) =>
    chamar('/balcao', 'POST', { zoneId, storeName, tipo: 'perdida', reason, note }),
  desfazerBalcao: (id: string) => chamar(`/balcao/${id}`, 'DELETE'),
  buscar: (zoneId: ZoneId, query: string, budget: ConsumerSignal['budget']) =>
    chamar<ConsumerSignal>('/concierge/busca', 'POST', { zoneId, query, budget }),
  publicarCampanha: (draft: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>) =>
    chamar<FlashCampaign>('/campanhas', 'POST', draft),
  alterarCampanha: (id: string, active: boolean) => chamar(`/campanhas/${id}`, 'PATCH', { active }),
  removerCampanha: (id: string) => chamar(`/campanhas/${id}`, 'DELETE'),
};
