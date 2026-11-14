import {
  ConsumerSignal,
  CrowdDropState,
  FlashCampaign,
  LostSaleEvent,
  LostSaleReason,
  MallEvent,
  TimeSlot,
  VitrineAuditResult,
  WeatherCondition,
  ZoneId,
} from '../types';
import { PerfilPorHora } from '../utils/horario';

export const DEFAULT_API_URL = 'https://vitrineiq-hackarun-2026-api.vercel.app';

export function resolveApiUrl(): string {
  const metaEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as unknown as { env?: Record<string, string> }).env
      : undefined;
  return (metaEnv?.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
}

export type Papel = 'admin' | 'lojista';

/** Quem está logado, como `POST /api/auth/login` e `GET /api/auth/eu` devolvem. */
export interface Usuario {
  nome: string;
  papel: Papel;
  lojaId: string | null;
  lojaNome: string | null;
  zoneId: ZoneId | null;
}

export interface Sessao {
  token: string;
  usuario: Usuario;
}

export interface Lojista {
  id: string | number;
  usuario: string;
  lojaNome: string;
  zoneId: ZoneId;
  criadoEm: string;
}

/** Erro HTTP da API com a mensagem (`detail`) já pronta para mostrar. */
export class ApiErro extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

const CHAVE_SESSAO = 'vitrineiq.sessao';
let token: string | null = null;
let aoExpirar: (() => void) | null = null;
const estadoCache = new Map<string, { etag: string; data: CicloEstado }>();

/** Lê a sessão salva e passa a usar o token dela. Sem storage (ou JSON inválido), não há sessão. */
export function lerSessao(storage?: Storage): Sessao | null {
  try {
    const s = JSON.parse((storage ?? localStorage).getItem(CHAVE_SESSAO) ?? 'null') as Sessao | null;
    if (!s?.token || (s.usuario?.papel !== 'admin' && s.usuario?.papel !== 'lojista')) return null;
    token = s.token;
    return s;
  } catch {
    return null;
  }
}

/** Grava (ou apaga, com `null`) a sessão. Sem storage, a sessão só dura na memória. */
export function salvarSessao(sessao: Sessao | null, storage?: Storage): void {
  token = sessao?.token ?? null;
  estadoCache.clear();
  try {
    const st = storage ?? localStorage;
    if (sessao) st.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    else st.removeItem(CHAVE_SESSAO);
  } catch {
    // storage bloqueado (modo privado, quiosque): fica só na memória
  }
}

/** O App registra aqui o que fazer quando a API recusar o token (401). */
export function definirAoExpirar(fn: (() => void) | null): void {
  aoExpirar = fn;
}

export function cabecalhoAuth(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 401 com token enviado = sessão expirada ou revogada: limpa e avisa o App. 403 não desloga. */
export function tratar401(): void {
  if (!token) return;
  salvarSessao(null);
  aoExpirar?.();
}

const MENSAGENS: Record<number, string> = {
  401: 'Usuário ou senha inválidos.',
  403: 'Sem permissão para esta ação.',
  429: 'Muitas tentativas. Espere um pouco e tente de novo.',
  503: 'Servidor sem configuração de login.',
};

/** Telemetria real de clima, calendário e eventos de Palmas-TO (`GET /api/contexto`). */
export interface LiveContextPayload {
  weather: WeatherCondition;
  time_slot: TimeSlot;
  mall_event: MallEvent;
  temperature_c: number | null;
  precipitation_mm: number | null;
  weather_code: number | null;
  weather_description: string;
  event_reason: string;
  active_events: string[];
  cinema_movies_count: number;
  cinema_highlights: string[];
  holiday_name: string | null;
  updated_at: string;
  sources: Record<string, string>;
}

/** Resumo da câmera de uma ala, como `GET /api/estado` devolve (api/app/ciclo.py). */
export interface VitrineResumo {
  passantes: number;
  olharam: number;
  taxaAtencao: number;
  pararamSemOlhar: number;
  atencaoMediaS: number;
  picoSimultaneo: number;
  apontaram?: number;
  noCelular?: number;
  voltaramOlhar?: number;
  chegaramPerto?: number;
  horaPico: number | null;
  porHora: Record<string, number>;
  olharesPorZona: Record<string, number>;
  acoes: string[];
  atualizadoEm: string | null;
  /** Pessoas na frente no último resumo (até 30 s); ainda não contam como passantes. */
  agora?: number;
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
  porHora: Partial<Record<ZoneId, PerfilPorHora>>;
  crowdDrop?: Partial<Record<ZoneId, CrowdDropState>>;
}

const TIMEOUT_MS = 5000;

interface ChamadaOpcoes<T> {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
  extraHeaders?: Record<string, string>;
  cachedData?: T;
  onSuccess?: (res: Response, data: T) => void;
}

async function executarChamada<T>(caminho: string, opts: ChamadaOpcoes<T> = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs = TIMEOUT_MS, extraHeaders, cachedData, onSuccess } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${resolveApiUrl()}/api${caminho}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...cabecalhoAuth(),
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (res.status === 304 && cachedData !== undefined) {
      return cachedData;
    }
    if (!res.ok) {
      const detail = await res.json().then((d) => d?.detail, () => undefined);
      if (res.status === 401) tratar401();
      throw new ApiErro(
        res.status,
        typeof detail === 'string' ? detail : MENSAGENS[res.status] ?? `Erro ${res.status} na API.`
      );
    }
    const data = (res.status === 204 ? undefined : await res.json()) as T;
    if (
      cachedData !== undefined &&
      data &&
      typeof data === 'object' &&
      (data as { unchanged?: boolean }).unchanged === true
    ) {
      return cachedData;
    }
    onSuccess?.(res, data);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function chamar<T>(
  caminho: string,
  method = 'GET',
  body?: unknown,
  timeoutMs = TIMEOUT_MS
): Promise<T> {
  return executarChamada<T>(caminho, { method, body, timeoutMs });
}

async function chamarMutacaoEstado<T>(caminho: string, method: string, body?: unknown): Promise<T> {
  const data = await chamar<T>(caminho, method, body);
  estadoCache.clear();
  return data;
}

export interface VitrineAuditPayload {
  image_base64: string;
  zone_id: ZoneId;
  store_name: string;
  olhares_por_zona?: Record<string, number>;
  taxa_atencao?: number;
}

export const api = {
  saude: () => chamar('/health'),
  login: (usuario: string, senha: string) => chamar<Sessao>('/auth/login', 'POST', { usuario, senha }),
  eu: () => chamar<Usuario>('/auth/eu'),
  trocarSenha: (senhaAtual: string, novaSenha: string) =>
    chamar<{ ok: boolean }>('/auth/senha', 'PATCH', { senhaAtual, novaSenha }),
  lojistas: () => chamar<Lojista[]>('/admin/lojistas'),
  criarLojista: (dados: { usuario: string; senha: string; lojaNome: string; zoneId: ZoneId }) =>
    chamar<Lojista>('/admin/lojistas', 'POST', dados),
  removerLojista: (id: Lojista['id']) => chamar(`/admin/lojistas/${encodeURIComponent(String(id))}`, 'DELETE'),
  campanhasAtivas: (zoneId: ZoneId) =>
    chamar<FlashCampaign[]>(`/campanhas/ativas?ala=${encodeURIComponent(zoneId)}`),
  estado: (filtro?: { loja?: string; ala?: ZoneId }) => {
    const q = new URLSearchParams();
    if (filtro?.loja) q.set('loja', filtro.loja);
    if (filtro?.ala) q.set('ala', filtro.ala);
    const cacheKey = `${token ?? 'anon'}|${q.toString()}`;
    const cached = estadoCache.get(cacheKey);
    if (cached) q.set('etag', cached.etag);
    const qs = q.toString();
    return executarChamada<CicloEstado>(qs ? `/estado?${qs}` : '/estado', {
      cachedData: cached?.data,
      onSuccess: (res, data) => {
        const etag = res.headers?.get?.('etag')?.trim();
        if (etag) {
          estadoCache.set(cacheKey, { etag, data });
        } else {
          estadoCache.delete(cacheKey);
        }
      },
    });
  },
  contexto: (force = false) => chamar<LiveContextPayload>(force ? '/contexto?force=true' : '/contexto'),
  registrarVenda: (zoneId: ZoneId, storeName: string) =>
    chamarMutacaoEstado('/balcao', 'POST', { zoneId, storeName, tipo: 'venda' }),
  registrarPerda: (zoneId: ZoneId, storeName: string, reason: LostSaleReason, note?: string) =>
    chamarMutacaoEstado('/balcao', 'POST', { zoneId, storeName, tipo: 'perdida', reason, note }),
  desfazerBalcao: (id: string) => chamarMutacaoEstado(`/balcao/${id}`, 'DELETE'),
  buscar: (
    zoneId: ZoneId,
    query: string,
    budget: ConsumerSignal['budget'],
    segmento?: string,
    originZone?: ZoneId
  ) =>
    chamar<ConsumerSignal>('/concierge/busca', 'POST', {
      zoneId,
      query,
      budget,
      segmento,
      ...(originZone ? { originZone } : {}),
    }),
  publicarCampanha: (
    draft: Omit<FlashCampaign, 'id' | 'active' | 'createdAt'>,
    triggerOrigin?: string
  ) =>
    chamarMutacaoEstado<FlashCampaign>('/campanhas', 'POST', {
      ...draft,
      ...(triggerOrigin !== undefined ? { triggerOrigin } : {}),
    }),
  alterarCampanha: (id: string, active: boolean) =>
    chamarMutacaoEstado(`/campanhas/${id}`, 'PATCH', { active }),
  removerCampanha: (id: string) => chamarMutacaoEstado(`/campanhas/${id}`, 'DELETE'),
  crowdDrop: (ala: ZoneId) =>
    chamar<CrowdDropState>(`/vitrine/crowd-drop?ala=${encodeURIComponent(ala)}`),
  auditarVitrine: (payload: VitrineAuditPayload) =>
    chamar<VitrineAuditResult>('/ia/auditar-vitrine', 'POST', payload, 15000),
};
