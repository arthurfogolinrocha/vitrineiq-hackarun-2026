import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  VitrineThird,
  buildVitrineRescueDraft,
  buildWhatsappOfferCopy,
  cleanWingLabel,
  computeCockpitMetrics,
  getScoreStatusLabel,
  resolveStoreMeta,
} from '../components/cockpit/cockpitHelpers';
import { CAPIM_DOURADO_ZONES } from '../data/shoppingData';
import { api, CicloEstado, salvarSessao, Sessao } from '../services/api';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import { StoreTenant, VisionFunnelSnapshot } from '../types';
import { generateAuditHash } from '../utils/security';

interface VercelHeaderEntry {
  key: string;
  value: string;
}

interface VercelHeaderRule {
  source: string;
  headers: VercelHeaderEntry[];
}

interface VercelConfig {
  headers?: VercelHeaderRule[];
}

function makeTelemetry(overrides: Partial<ZoneLiveTelemetry> = {}): ZoneLiveTelemetry {
  return {
    zone: CAPIM_DOURADO_ZONES[0],
    footTraffic: 400,
    vitrineStops: 100,
    conversionRate: 0.2,
    qrSearchCount: 10,
    lostSalesCount: 4,
    dominantReason: 'estoque_grade',
    opportunityScore: 80,
    multiplier: 1.2,
    cameraFeedLinked: false,
    ...overrides,
  };
}

describe('cockpitHelpers — funções puras do Cockpit', () => {
  it('cleanWingLabel remove sufixos entre parênteses e normaliza espaços', () => {
    expect(cleanWingLabel('Ala Sul JK (Renner / Centauro)')).toBe('Ala Sul JK');
    expect(cleanWingLabel('  Ala Central (C&A) (Piso L1)  ')).toBe('Ala Central');
    expect(cleanWingLabel('Alameda Gourmet')).toBe('Alameda Gourmet');
  });

  it('getScoreStatusLabel classifica corretamente os intervalos 0–100', () => {
    expect(getScoreStatusLabel(100)).toBe('Janela de Ouro Ativa');
    expect(getScoreStatusLabel(75)).toBe('Janela de Ouro Ativa');
    expect(getScoreStatusLabel(74)).toBe('Demanda Moderada');
    expect(getScoreStatusLabel(45)).toBe('Demanda Moderada');
    expect(getScoreStatusLabel(44)).toBe('Momento de Atração');
    expect(getScoreStatusLabel(0)).toBe('Momento de Atração');
  });

  it('buildWhatsappOfferCopy usa os valores fornecidos e aplica fallback padrão quando vazios', () => {
    const custom = buildWhatsappOfferCopy('VIP25', '25% OFF');
    expect(custom).toContain('VIP25');
    expect(custom).toContain('25% OFF');
    expect(custom).toContain('Capim Dourado');

    const fallback = buildWhatsappOfferCopy('', '');
    expect(fallback).toContain('CAPIM15');
    expect(fallback).toContain('15% OFF');
  });

  it('buildVitrineRescueDraft gera rascunhos consistentes para esquerda, centro e direita', () => {
    const expected: Record<VitrineThird, { label: string; code: string }> = {
      esquerda: { label: 'Vitrine Esquerda', code: 'VITRINEESQ15' },
      centro: { label: 'Vitrine Central', code: 'VITRINECEN15' },
      direita: { label: 'Vitrine Direita', code: 'VITRINEDIR15' },
    };

    (['esquerda', 'centro', 'direita'] as VitrineThird[]).forEach((part) => {
      const draft = buildVitrineRescueDraft(part);
      expect(draft.title).toBe(`Resgate Ao Vivo — ${expected[part].label}`);
      expect(draft.discountBadge).toBe('15% OFF');
      expect(draft.couponCode).toBe(expected[part].code);
      expect(draft.expiresInMinutes).toBe(45);
      expect(draft.whatsappCopy).toContain(expected[part].label);
      expect(draft.whatsappCopy).toContain(expected[part].code);
    });
  });

  it('resolveStoreMeta prioriza activeTenant correspondente, respeita fallback e consulta catálogo', () => {
    const customTenant: StoreTenant = {
      id: 'custom-centauro',
      storeName: 'Centauro',
      zoneId: 'ala-sul-esporte',
      segment: 'esportes',
      avgTicket: 350,
      floorLabel: 'Térreo • VIP',
    };

    expect(resolveStoreMeta('centauro', customTenant)).toEqual(customTenant);

    const otherTenant: StoreTenant = {
      id: 'custom-loja-x',
      storeName: 'Loja Exclusiva X',
      zoneId: 'ala-central-ancoras',
      segment: 'moda',
      avgTicket: 210,
      floorLabel: 'L1',
    };

    expect(resolveStoreMeta('Centauro', otherTenant, false)?.id).toBe('centauro');
    expect(resolveStoreMeta('Desconhecida', otherTenant, true)).toEqual(otherTenant);
    expect(resolveStoreMeta('Loja Totalmente Inexistente XYZ', null, false)).toBeUndefined();
  });

  it('computeCockpitMetrics calcula métricas com peso horário simulado e com dado real', () => {
    const current = makeTelemetry({ footTraffic: 400, vitrineStops: 100, opportunityScore: 80 });

    const simulated = computeCockpitMetrics({
      current,
      temDadoReal: false,
      selectedBarWeight: 0.5,
      completedSalesByZone: { 'ala-sul-esporte': 6 },
    });

    expect(simulated.pesoHora).toBe(0.5);
    expect(simulated.effectiveFootTraffic).toBe(200);
    // 80 * (0.35 + 0.65 * 0.5) = 80 * 0.675 = 54
    expect(simulated.effectiveScore).toBe(54);
    expect(simulated.clampedScore).toBe(54);
    expect(simulated.isCamActiveHere).toBe(false);
    expect(simulated.corridorTotal).toBe(200);
    expect(simulated.stopsTotal).toBe(50);
    // round(50 * 0.42) = 21 (>= 12)
    expect(simulated.entriesTotal).toBe(21);
    expect(simulated.conversionsTotal).toBe(6);
    expect(simulated.stopRatePct).toBe(25);
    expect(simulated.entryRatePct).toBe(11);
    expect(simulated.convBarPct).toBe(3);
    expect(simulated.maxHourlyFlow).toBe(460);
    expect(simulated.avgTicket).toBe(185);
    expect(simulated.peopleNotEntered).toBe(179);
    expect(simulated.opportunityLossHour).toBe(Math.round(179 * 0.14 * 185));

    const realData = computeCockpitMetrics({
      current,
      temDadoReal: true,
      selectedBarWeight: 0.25,
      completedSalesByZone: {},
    });

    expect(realData.pesoHora).toBe(1);
    expect(realData.effectiveFootTraffic).toBe(400);
    expect(realData.effectiveScore).toBe(80);
    expect(realData.conversionsTotal).toBe(0);
  });

  it('computeCockpitMetrics aplica VisionFunnelSnapshot apenas quando a zona coincide e trata zero fluxo', () => {
    const activeTenant: StoreTenant = {
      id: 'outback',
      storeName: 'Outback',
      zoneId: 'ala-sul-esporte',
      segment: 'alimentacao',
      avgTicket: 220,
      floorLabel: 'L1',
    };

    const snapshot: VisionFunnelSnapshot = {
      zoneId: 'ala-sul-esporte',
      passersBy: 300,
      vitrineStops: 90,
      entries: 45,
      exits: 40,
      passedWithoutEntering: 255,
      attractionRate: 30,
      sourceMode: 'webcam_live',
    };

    const withCam = computeCockpitMetrics({
      current: makeTelemetry({ opportunityScore: 150 }),
      temDadoReal: true,
      selectedBarWeight: 1,
      visionSnapshot: snapshot,
      completedSalesByZone: { 'ala-sul-esporte': 9 },
      activeTenant,
    });

    expect(withCam.isCamActiveHere).toBe(true);
    expect(withCam.clampedScore).toBe(100);
    expect(withCam.corridorTotal).toBe(300);
    expect(withCam.stopsTotal).toBe(90);
    expect(withCam.entriesTotal).toBe(45);
    expect(withCam.avgTicket).toBe(220);
    expect(withCam.stopRatePct).toBe(30);
    expect(withCam.entryRatePct).toBe(15);
    expect(withCam.convBarPct).toBe(3);

    const otherZoneSnapshot: VisionFunnelSnapshot = {
      ...snapshot,
      zoneId: 'praca-alimentacao-l2',
    };
    const zeroFlow = computeCockpitMetrics({
      current: makeTelemetry({ footTraffic: 0, vitrineStops: 0, opportunityScore: 0 }),
      temDadoReal: false,
      selectedBarWeight: 1,
      visionSnapshot: otherZoneSnapshot,
      completedSalesByZone: {},
    });

    expect(zeroFlow.isCamActiveHere).toBe(false);
    expect(zeroFlow.corridorTotal).toBe(0);
    expect(zeroFlow.stopRatePct).toBe(0);
    expect(zeroFlow.entryRatePct).toBe(0);
    expect(zeroFlow.convBarPct).toBe(0);
    expect(zeroFlow.maxHourlyFlow).toBe(220);
    expect(zeroFlow.peopleNotEntered).toBe(0);
  });
});

describe('Contrato de segurança e cache do frontend/vercel.json', () => {
  const vercelPath = fileURLToPath(new URL('../../vercel.json', import.meta.url));
  const vercelConfig = JSON.parse(readFileSync(vercelPath, 'utf-8')) as VercelConfig;

  const getHeaderMap = (sourcePattern: string): Map<string, string> => {
    const rule = vercelConfig.headers?.find((entry) => entry.source === sourcePattern);
    expect(rule, `Regra para "${sourcePattern}" deve existir em vercel.json`).toBeDefined();
    return new Map((rule?.headers ?? []).map((h) => [h.key, h.value]));
  };

  it('define Cache-Control imutável para /assets/(.*)', () => {
    const assetHeaders = getHeaderMap('/assets/(.*)');
    expect(assetHeaders.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('define todos os cabeçalhos de segurança obrigatórios e consistentes para /(.*)', () => {
    const globalHeaders = getHeaderMap('/(.*)');

    expect(globalHeaders.get('X-Content-Type-Options')).toBe('nosniff');
    expect(globalHeaders.get('X-Frame-Options')).toBe('DENY');
    expect(globalHeaders.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

    const hsts = globalHeaders.get('Strict-Transport-Security') ?? '';
    expect(hsts).toContain('max-age=');
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toContain('preload');

    const permissions = globalHeaders.get('Permissions-Policy') ?? '';
    expect(permissions).toContain('geolocation=()');
    expect(permissions).toContain('payment=()');
    expect(permissions).toContain('usb=()');

    const csp = globalHeaders.get('Content-Security-Policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain('https://vitrineiq-hackarun-2026-api.vercel.app');
    expect(csp).not.toContain('default-src *');
    expect(csp).not.toContain('script-src *');
    expect(csp).not.toContain('fonts.googleapis.com');
    expect(csp).not.toContain('fonts.gstatic.com');

    const directives = new Map(
      csp
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [name, ...values] = part.split(/\s+/);
          return [name, values.join(' ')];
        })
    );

    const scriptSrc = directives.get('script-src') ?? '';
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(directives.get('style-src')).toBe("'self' 'unsafe-inline'");
    expect(directives.get('font-src')).toBe("'self' data:");
  });
});

function makeEstadoPayload(overrides: Partial<CicloEstado> = {}): CicloEstado {
  return {
    lostSales: [],
    completedSalesByZone: { 'ala-sul-esporte': 3 },
    signals: [],
    campaigns: [],
    vitrine: {},
    alertas: [],
    porHora: {},
    ...overrides,
  };
}

function makeMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
}

describe('Cliente API — suporte a ETag / 304 Not Modified e trocarSenha', () => {
  afterEach(() => {
    salvarSessao(null, makeMemoryStorage());
    vi.unstubAllGlobals();
  });

  it('armazena ETag, envia If-None-Match e reaproveita payload cacheado em 304 Not Modified', async () => {
    const payloadV1 = makeEstadoPayload({ completedSalesByZone: { 'ala-sul-esporte': 7 } });
    const payloadV2 = makeEstadoPayload({ completedSalesByZone: { 'ala-sul-esporte': 12 } });
    const json304Spy = vi.fn(async () => {
      throw new Error('304 não deve tentar parsear JSON');
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ ETag: '"estado-v1"' }),
        json: async () => payloadV1,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 304,
        headers: new Headers({ ETag: '"estado-v1"' }),
        json: json304Spy,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ ETag: '"estado-v2"' }),
        json: async () => payloadV2,
      });

    vi.stubGlobal('fetch', fetchMock);

    const first = await api.estado({ ala: 'ala-sul-esporte' });
    expect(first).toEqual(payloadV1);

    const second = await api.estado({ ala: 'ala-sul-esporte' });
    expect(second).toEqual(payloadV1);
    expect(json304Spy).not.toHaveBeenCalled();

    const secondInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect((secondInit.headers as Record<string, string>)['If-None-Match']).toBe('"estado-v1"');

    // Invalidação ao salvar sessão limpa o cache e evita enviar If-None-Match antigo
    const sessao: Sessao = {
      token: 'tok-abc',
      usuario: {
        nome: 'admin',
        papel: 'admin',
        lojaId: null,
        lojaNome: null,
        zoneId: null,
      },
    };
    salvarSessao(sessao, makeMemoryStorage());

    const third = await api.estado({ ala: 'ala-sul-esporte' });
    expect(third).toEqual(payloadV2);

    const thirdInit = fetchMock.mock.calls[2][1] as RequestInit;
    expect((thirdInit.headers as Record<string, string>)['If-None-Match']).toBeUndefined();
    expect((thirdInit.headers as Record<string, string>).Authorization).toBe('Bearer tok-abc');
  });

  it('invalida o cache de estado após mutação e tolera mocks sem headers', async () => {
    const payloadV1 = makeEstadoPayload({ completedSalesByZone: { 'ala-sul-esporte': 2 } });
    const payloadV2 = makeEstadoPayload({ completedSalesByZone: { 'ala-sul-esporte': 3 } });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ ETag: 'W/"mut-1"' }),
        json: async () => payloadV1,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        // Mock mínimo sem `.headers`
        json: async () => payloadV2,
      });

    vi.stubGlobal('fetch', fetchMock);

    await api.estado();
    await api.registrarVenda('ala-sul-esporte', 'Centauro');
    const afterMutation = await api.estado();

    expect(afterMutation).toEqual(payloadV2);
    const thirdInit = fetchMock.mock.calls[2][1] as RequestInit;
    expect((thirdInit.headers as Record<string, string>)['If-None-Match']).toBeUndefined();
  });

  it('envia PATCH /api/auth/senha em api.trocarSenha', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await api.trocarSenha('senhaAntiga', 'novaSenha123');
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/auth\/senha$/);
    expect((init as RequestInit).method).toBe('PATCH');
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      senhaAtual: 'senhaAntiga',
      novaSenha: 'novaSenha123',
    });
  });
});

describe('Consistência de generateAuditHash (src/utils/security.ts)', () => {
  it('é determinístico para o mesmo payload e metadados', () => {
    const h1 = generateAuditHash('evento:cupom:CAPIM15', 'GENESIS_BLOCK_0000', 'id-1', '2026-11-14T00:00:00Z');
    const h2 = generateAuditHash('evento:cupom:CAPIM15', 'GENESIS_BLOCK_0000', 'id-1', '2026-11-14T00:00:00Z');

    expect(h1).toBe(h2);
    expect(h1).toMatch(/^SEC-SHA-[0-9A-F]{16}$/);
  });

  it('produz hashes distintos quando payload, prevHash, id ou timestamp mudam', () => {
    const base = generateAuditHash('payload-A', 'PREV-0', 'id-1', '2026-11-14T00:00:00Z');
    const diffPayload = generateAuditHash('payload-B', 'PREV-0', 'id-1', '2026-11-14T00:00:00Z');
    const diffPrev = generateAuditHash('payload-A', 'PREV-1', 'id-1', '2026-11-14T00:00:00Z');
    const diffId = generateAuditHash('payload-A', 'PREV-0', 'id-2', '2026-11-14T00:00:00Z');
    const diffTs = generateAuditHash('payload-A', 'PREV-0', 'id-1', '2026-11-14T00:00:01Z');

    const unique = new Set([base, diffPayload, diffPrev, diffId, diffTs]);
    expect(unique.size).toBe(5);
  });
});
