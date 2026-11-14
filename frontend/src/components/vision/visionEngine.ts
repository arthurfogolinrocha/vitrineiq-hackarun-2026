import {
  VisionFunnelSnapshot,
  VitrineAuditResult,
  ZoneId,
} from '../../types';

export interface SimulatedVisitor {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'passing' | 'vitrine_stop' | 'entering' | 'exiting' | 'passed_away';
  dwellFrames: number;
  targetEnter: boolean;
  countedStop: boolean;
  countedOutcome: boolean;
}

export interface MotionBoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MotionAnalysisResult {
  currentLuma: Float32Array;
  doorMotion: number;
  vitrineMotion: number;
  corridorMotion: number;
  bbox: MotionBoundingBox | null;
}

export interface FunnelDelta {
  pass: number;
  stop: number;
  enter: number;
  exit: number;
  walkAway: number;
}

/**
 * Calcula diferença de luminância entre frames consecutivos na grade reduzida (80x45)
 * para classificar movimento entre porta, vitrine e corredor sem armazenar imagem.
 */
export function analyzeMotionFrame(
  imgData: Uint8ClampedArray,
  prevLuma: Float32Array | null,
  width: number,
  height: number,
  lumaThreshold = 24
): MotionAnalysisResult {
  const currentLuma = new Float32Array(width * height);
  let doorMotion = 0;
  let vitrineMotion = 0;
  let corridorMotion = 0;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const p = idx * 4;
      const luma = imgData[p] * 0.299 + imgData[p + 1] * 0.587 + imgData[p + 2] * 0.114;
      currentLuma[idx] = luma;
      if (prevLuma) {
        const diff = Math.abs(luma - prevLuma[idx]);
        if (diff > lumaThreshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          if (y < 15 && x > 20 && x < 60) doorMotion++;
          else if (y >= 15 && y < 30) vitrineMotion++;
          else if (y >= 30) corridorMotion++;
        }
      }
    }
  }

  const totalMotion = doorMotion + vitrineMotion + corridorMotion;
  const bbox =
    maxX > minX && maxY > minY && totalMotion > 18
      ? { minX, maxX, minY, maxY }
      : null;

  return { currentLuma, doorMotion, vitrineMotion, corridorMotion, bbox };
}

/**
 * Aplica incrementos ao funil garantindo a invariante matemática:
 * passersBy >= vitrineStops >= entries.
 */
export function applyFunnelDeltas(
  cur: VisionFunnelSnapshot,
  delta: FunnelDelta,
  zoneId: ZoneId,
  sourceMode: 'webcam_live' | 'simulation',
  lastMotionRegion?: VisionFunnelSnapshot['lastMotionRegion']
): VisionFunnelSnapshot {
  const passersBy = Math.max(0, cur.passersBy + delta.pass);
  const vitrineStops = Math.min(passersBy, Math.max(0, cur.vitrineStops + delta.stop));
  const entries = Math.min(vitrineStops, Math.max(0, cur.entries + delta.enter));
  const exits = cur.exits + delta.exit;
  const passedWithoutEntering = Math.max(0, passersBy - entries);
  const attractionRate = passersBy > 0 ? Number(((entries / passersBy) * 100).toFixed(1)) : 0;

  return {
    ...cur,
    zoneId,
    passersBy,
    vitrineStops,
    entries,
    exits,
    passedWithoutEntering,
    attractionRate,
    sourceMode,
    ...(lastMotionRegion !== undefined ? { lastMotionRegion } : {}),
  };
}

/** Calcula a porcentagem de fuga pós-vitrine (pararam na vitrine mas não entraram). */
export function computeVitrineEscapeRate(snapshot: VisionFunnelSnapshot): number {
  if (snapshot.vitrineStops <= 0) return 0;
  return Math.max(
    0,
    Number((((snapshot.vitrineStops - snapshot.entries) / snapshot.vitrineStops) * 100).toFixed(1))
  );
}

/** Cria um visitante sintético para o simulador de fluxo de borda. */
export function createSimulatedVisitor(
  id: number,
  width: number,
  fromRight = false
): SimulatedVisitor {
  return {
    id,
    x: fromRight ? width + 20 : -20,
    y: 215 + Math.random() * 85,
    vx: (fromRight ? -1 : 1) * (1.5 + Math.random() * 1.1),
    vy: 0,
    state: 'passing',
    dwellFrames: 0,
    targetEnter: Math.random() < 0.3,
    countedStop: false,
    countedOutcome: false,
  };
}

/** Avança a simulação de visitantes em 1 frame e retorna os deltas de contagem gerados. */
export function stepSimulatedVisitors(
  visitors: SimulatedVisitor[],
  width: number,
  frameTick: number,
  allocateId: () => number
): FunnelDelta {
  if (frameTick % 56 === 0 && visitors.length < 16) {
    visitors.push(createSimulatedVisitor(allocateId(), width, Math.random() > 0.5));
  }

  const delta: FunnelDelta = { pass: 0, stop: 0, enter: 0, exit: 0, walkAway: 0 };

  for (let i = visitors.length - 1; i >= 0; i--) {
    const v = visitors[i];
    if (v.state === 'passing') {
      v.x += v.vx;
      if (v.x > 160 && v.x < 560 && !v.countedStop && Math.random() < 0.025) {
        v.state = 'vitrine_stop';
        v.dwellFrames = 0;
        v.countedStop = true;
        delta.stop++;
        delta.pass++;
      } else if ((v.x < -30 || v.x > width + 30) && !v.countedOutcome) {
        v.countedOutcome = true;
        delta.pass++;
        delta.walkAway++;
        visitors.splice(i, 1);
      }
    } else if (v.state === 'vitrine_stop') {
      v.y += (172 - v.y) * 0.08;
      v.dwellFrames++;
      if (v.dwellFrames > 55) {
        if (v.targetEnter) {
          v.state = 'entering';
        } else {
          v.state = 'passed_away';
          if (!v.countedOutcome) {
            v.countedOutcome = true;
            delta.walkAway++;
          }
        }
      }
    } else if (v.state === 'entering') {
      const tx = 360;
      const ty = 80;
      v.x += (tx - v.x) * 0.06;
      v.y += (ty - v.y) * 0.06;
      if (v.y < 118 && !v.countedOutcome) {
        v.countedOutcome = true;
        delta.enter++;
      }
      if (Math.hypot(tx - v.x, ty - v.y) < 12) {
        v.state = 'exiting';
        v.dwellFrames = 0;
      }
    } else if (v.state === 'exiting') {
      v.dwellFrames++;
      if (v.dwellFrames > 45) {
        v.y += 1.7;
        if (v.y > 215) {
          delta.exit++;
          v.state = 'passed_away';
        }
      }
    } else if (v.state === 'passed_away') {
      v.x += v.vx !== 0 ? v.vx * 1.15 : 1.7;
      v.y += (248 - v.y) * 0.04;
      if (v.x < -35 || v.x > width + 35) {
        visitors.splice(i, 1);
      }
    }
  }

  return delta;
}

/** Desenha as 3 zonas virtuais (porta, vitrine, corredor) e bounding box sobre a webcam. */
export function drawWebcamZonesOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  vitrineLabel: string,
  motion: MotionAnalysisResult | null,
  motionW: number,
  motionH: number
): void {
  ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
  ctx.fillRect(190, 14, 340, 102);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.strokeRect(190, 14, 340, 102);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
  ctx.fillRect(60, 122, width - 120, 96);
  ctx.strokeStyle = '#f59e0b';
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(60, 122, width - 120, 96);
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
  ctx.fillRect(20, 224, width - 40, 100);
  ctx.strokeStyle = '#3b82f6';
  ctx.strokeRect(20, 224, width - 40, 100);

  if (motion?.bbox) {
    const { minX, maxX, minY, maxY } = motion.bbox;
    const bx = (minX / motionW) * width;
    const by = (minY / motionH) * height;
    const bw = ((maxX - minX) / motionW) * width;
    const bh = ((maxY - minY) / motionH) * height;
    ctx.strokeStyle =
      motion.doorMotion > 14 ? '#10b981' : motion.vitrineMotion > 18 ? '#f59e0b' : '#2563eb';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);
  }

  ctx.font = '700 11px Inter, sans-serif';
  ctx.fillStyle = '#065f46';
  ctx.fillText('ZONA PORTA — ENTRADA / SAÍDA', 202, 34);
  ctx.fillStyle = '#92400e';
  ctx.fillText(`VITRINE ${vitrineLabel.toUpperCase()} — ATRAÇÃO`, 72, 142);
  ctx.fillStyle = '#1e40af';
  ctx.fillText('CORREDOR DO SHOPPING — PASSANTES', 32, 244);
}

/** Renderiza o cenário esquemático do simulador e os marcadores dos visitantes. */
export function drawSimulatorScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  vitrineLabel: string,
  visitors: SimulatedVisitor[]
): void {
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
  ctx.fillRect(40, 18, width - 80, 124);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 18, width - 80, 124);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
  ctx.fillRect(285, 132, 150, 22);
  ctx.strokeStyle = '#d97706';
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(285, 142);
  ctx.lineTo(435, 142);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
  ctx.fillRect(90, 150, 540, 48);

  ctx.font = '700 11px Inter, sans-serif';
  ctx.fillStyle = '#065f46';
  ctx.fillText(`INTERIOR DA LOJA (${vitrineLabel})`, 56, 40);
  ctx.fillStyle = '#b45309';
  ctx.fillText('PORTA / LINHA DE ENTRADA-SAÍDA', 274, 126);
  ctx.fillStyle = '#1d4ed8';
  ctx.fillText('ZONA DE ATRAÇÃO DA VITRINE (>3s)', 56, 170);
  ctx.fillStyle = '#475569';
  ctx.fillText('CORREDOR DO SHOPPING (PASSANTES)', 56, 322);

  for (const v of visitors) {
    const color =
      v.state === 'entering' || v.state === 'exiting'
        ? '#059669'
        : v.state === 'vitrine_stop'
          ? '#d97706'
          : '#2563eb';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(v.x - 10, v.y - 10, 20, 20);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(v.x, v.y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    const idText = `#${v.id}`;
    ctx.font = '700 9px monospace';
    const textWidth = ctx.measureText(idText).width;
    const badgeW = textWidth + 8;
    const badgeH = 13;
    const badgeX = v.x - badgeW / 2;
    const badgeY = v.y - 25;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(idText, v.x, badgeY + badgeH / 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }
}

/** Gera resultado heurístico local quando a API Gemini Vision está indisponível. */
export function buildLocalAuditFallback(
  vitrineLabel: string,
  attractionRate: number,
  olharesPorZona?: Record<string, number>
): VitrineAuditResult {
  const esq = olharesPorZona?.esquerda ?? 0;
  const cen = olharesPorZona?.centro ?? 0;
  const dir = olharesPorZona?.direita ?? 0;
  const fallbackScore = Math.max(48, Math.min(86, Math.round(58 + attractionRate * 0.6)));

  return {
    success: true,
    score: fallbackScore,
    headline: `Vitrine de ${vitrineLabel} com ponto cego na faixa de altura dos olhos`,
    defects: [
      'Contraste insuficiente entre o item âncora e o fundo da vitrine reduz parada de quem passa rápido.',
      'Ausência de placa de preço/parcelamento visível a 3 metros gera objeção antes da entrada.',
      `Distribuição desigual de olhares (Esquerda ${esq} • Centro ${cen} • Direita ${dir}) desperdiça lateral mais fria.`,
    ],
    zone_moves: [
      `Esquerda: posicionar kit de entrada / oferta âncora com etiqueta grande (olhares atuais: ${esq}).`,
      `Centro: destacar lançamento de maior margem na linha do olhar (1,45m) com iluminação focal (olhares atuais: ${cen}).`,
      `Direita: inserir totem QR do Concierge para resgate imediato sem fila (olhares atuais: ${dir}).`,
    ],
    quick_win: `Fixar QR Code de reserva relâmpago na altura de 1,40m da porta de ${vitrineLabel} nos próximos 15 min.`,
    source: 'FALLBACK_LOCAL',
    latency_ms: 42,
    audit_hash: 'LOCAL-RAM-AUDIT',
  };
}
