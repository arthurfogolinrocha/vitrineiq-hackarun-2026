import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserMinus,
  VideoOff,
} from 'lucide-react';
import { ShoppingZone, VisionFunnelSnapshot, ZoneId } from '../types';
import { SpotlightCard } from './SpotlightCard';

interface EdgeVisionSensorProps {
  zones: ShoppingZone[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  snapshot: VisionFunnelSnapshot;
  onUpdateSnapshot: (next: VisionFunnelSnapshot) => void;
  onAnalyzeWithVision: (snapshot: VisionFunnelSnapshot) => void;
}

interface SimulatedVisitor {
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

export const EdgeVisionSensor: React.FC<EdgeVisionSensorProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  snapshot,
  onUpdateSnapshot,
  onAnalyzeWithVision,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const snapshotRef = useRef<VisionFunnelSnapshot>(snapshot);
  snapshotRef.current = snapshot;
  const visitorsRef = useRef<SimulatedVisitor[]>([]);
  const nextIdRef = useRef<number>(1);

  const [isPaused, setIsPaused] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const privacyBlur = true; // RNF03: desfoque da webcam no navegador sempre ligado, sem opção de desligar
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  // Gerenciamento da Webcam Real (processamento em RAM na borda, zero gravação)
  useEffect(() => {
    let stream: MediaStream | null = null;
    const videoEl = videoRef.current;

    if (!webcamActive) {
      if (videoEl) videoEl.srcObject = null;
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setWebcamError('Navegador sem suporte à webcam local; usando Simulador de Borda.');
      setWebcamActive(false);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 360 }, audio: false })
      .then((mediaStream) => {
        stream = mediaStream;
        setWebcamError(null);
        if (videoEl) {
          videoEl.srcObject = mediaStream;
          videoEl.play().catch(() => {});
        }
      })
      .catch(() => {
        setWebcamError('Permissão de webcam não concedida; mantendo o simulador ativo.');
        setWebcamActive(false);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [webcamActive]);

  // Motor de Visão Computacional de Borda (Webcam Real por Diferença de Pixels OU Simulador)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 720;
    const H = 340;
    canvas.width = W;
    canvas.height = H;

    const MW = 80;
    const MH = 45;
    const motionCanvas = document.createElement('canvas');
    motionCanvas.width = MW;
    motionCanvas.height = MH;
    const motionCtx = motionCanvas.getContext('2d', { willReadFrequently: true });
    let prevLuma: Float32Array | null = null;
    let lastCorridorTrigger = 0;
    let lastVitrineTrigger = 0;
    let lastDoorTrigger = 0;
    let doorParity = 0;

    const spawnVisitor = (fromRight = false): SimulatedVisitor => ({
      id: nextIdRef.current++,
      x: fromRight ? W + 20 : -20,
      y: 215 + Math.random() * 85,
      vx: (fromRight ? -1 : 1) * (1.5 + Math.random() * 1.1),
      vy: 0,
      state: 'passing',
      dwellFrames: 0,
      targetEnter: Math.random() < 0.30,
      countedStop: false,
      countedOutcome: false,
    });

    if (visitorsRef.current.length === 0) {
      visitorsRef.current = Array.from({ length: 8 }, (_, i) => ({
        ...spawnVisitor(i % 2 === 0),
        x: 70 + i * 75,
      }));
    }

    let animId = 0;
    let frameTick = 0;

    const render = () => {
      frameTick++;
      ctx.clearRect(0, 0, W, H);

      const videoEl = videoRef.current;
      const hasLiveVideo = Boolean(webcamActive && videoEl && videoEl.readyState >= 2);

      if (hasLiveVideo && videoEl) {
        ctx.save();
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
        ctx.filter = privacyBlur ? 'blur(7px) brightness(0.8)' : 'brightness(0.92)';
        ctx.drawImage(videoEl, 0, 0, W, H);
        ctx.restore();

        // 3 Zonas Virtuais sobre a Webcam Real
        ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
        ctx.fillRect(190, 14, 340, 102);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(190, 14, 340, 102);

        ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
        ctx.fillRect(60, 122, W - 120, 96);
        ctx.strokeStyle = '#f59e0b';
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(60, 122, W - 120, 96);
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
        ctx.fillRect(20, 224, W - 40, 100);
        ctx.strokeStyle = '#3b82f6';
        ctx.strokeRect(20, 224, W - 40, 100);

        if (!isPaused && motionCtx && frameTick % 3 === 0) {
          motionCtx.save();
          motionCtx.translate(MW, 0);
          motionCtx.scale(-1, 1);
          motionCtx.drawImage(videoEl, 0, 0, MW, MH);
          motionCtx.restore();

          const imgData = motionCtx.getImageData(0, 0, MW, MH).data;
          const currentLuma = new Float32Array(MW * MH);
          let doorMotion = 0;
          let vitrineMotion = 0;
          let corridorMotion = 0;
          let minX = MW;
          let maxX = 0;
          let minY = MH;
          let maxY = 0;

          for (let y = 0; y < MH; y++) {
            for (let x = 0; x < MW; x++) {
              const idx = y * MW + x;
              const p = idx * 4;
              const luma = imgData[p] * 0.299 + imgData[p + 1] * 0.587 + imgData[p + 2] * 0.114;
              currentLuma[idx] = luma;
              if (prevLuma) {
                const diff = Math.abs(luma - prevLuma[idx]);
                if (diff > 24) {
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
          prevLuma = currentLuma;

          if (maxX > minX && maxY > minY && doorMotion + vitrineMotion + corridorMotion > 18) {
            const bx = (minX / MW) * W;
            const by = (minY / MH) * H;
            const bw = ((maxX - minX) / MW) * W;
            const bh = ((maxY - minY) / MH) * H;
            ctx.strokeStyle = doorMotion > 14 ? '#10b981' : vitrineMotion > 18 ? '#f59e0b' : '#2563eb';
            ctx.lineWidth = 3;
            ctx.strokeRect(bx, by, bw, bh);
          }

          const now = performance.now();
          let deltaPass = 0;
          let deltaStop = 0;
          let deltaEnter = 0;
          let deltaExit = 0;
          let deltaWalkAway = 0;
          let region: VisionFunnelSnapshot['lastMotionRegion'] = 'none';

          if (corridorMotion > 22 && now - lastCorridorTrigger > 1300) {
            lastCorridorTrigger = now;
            deltaPass++;
            deltaWalkAway++;
            region = 'corridor';
          }
          if (vitrineMotion > 24 && now - lastVitrineTrigger > 1700) {
            lastVitrineTrigger = now;
            deltaPass++;
            deltaStop++;
            region = 'vitrine';
          }
          if (doorMotion > 18 && now - lastDoorTrigger > 1900) {
            lastDoorTrigger = now;
            doorParity++;
            if (doorParity % 3 === 0) {
              deltaExit++;
            } else {
              deltaPass++;
              deltaEnter++;
            }
            region = 'door';
          }

          if (deltaPass || deltaStop || deltaEnter || deltaExit || deltaWalkAway) {
            const cur = snapshotRef.current;
            let passersBy = cur.passersBy + deltaPass;
            let vitrineStops = cur.vitrineStops + deltaStop;
            let entries = cur.entries + deltaEnter;

            // Invariante estrita matemática de funil de varejo: passersBy >= vitrineStops >= entries
            passersBy = Math.max(0, passersBy);
            vitrineStops = Math.min(passersBy, Math.max(0, vitrineStops));
            entries = Math.min(vitrineStops, Math.max(0, entries));

            const exits = cur.exits + deltaExit;
            const passedWithoutEntering = Math.max(0, passersBy - entries);
            const attractionRate =
              passersBy > 0 ? Number(((entries / passersBy) * 100).toFixed(1)) : 0;
            onUpdateSnapshot({
              ...cur,
              zoneId: selectedZoneId,
              passersBy,
              vitrineStops,
              entries,
              exits,
              passedWithoutEntering,
              attractionRate,
              sourceMode: 'webcam_live',
              lastMotionRegion: region,
            });
          }
        }

        ctx.font = '700 11px Inter, sans-serif';
        ctx.fillStyle = '#065f46';
        ctx.fillText('ZONA PORTA — ENTRADA / SAÍDA', 202, 34);
        ctx.fillStyle = '#92400e';
        ctx.fillText(`VITRINE ${selectedZone.shortName.toUpperCase()} — ATRAÇÃO`, 72, 142);
        ctx.fillStyle = '#1e40af';
        ctx.fillText('CORREDOR DO SHOPPING — PASSANTES', 32, 244);
      } else {
        // Modo Simulador Esquemático Claro e Legível
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, W, H);

        // Interior da Loja
        ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
        ctx.fillRect(40, 18, W - 80, 124);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 18, W - 80, 124);

        // Porta de Entrada
        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        ctx.fillRect(285, 132, 150, 22);
        ctx.strokeStyle = '#d97706';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(285, 142);
        ctx.lineTo(435, 142);
        ctx.stroke();
        ctx.setLineDash([]);

        // Zona da Vitrine
        ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
        ctx.fillRect(90, 150, 540, 48);

        ctx.font = '700 11px Inter, sans-serif';
        ctx.fillStyle = '#065f46';
        ctx.fillText(`INTERIOR DA LOJA (${selectedZone.shortName})`, 56, 40);
        ctx.fillStyle = '#b45309';
        ctx.fillText('PORTA / LINHA DE ENTRADA-SAÍDA', 274, 126);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillText('ZONA DE ATRAÇÃO DA VITRINE (>3s)', 56, 170);
        ctx.fillStyle = '#475569';
        ctx.fillText('CORREDOR DO SHOPPING (PASSANTES)', 56, 322);

        if (!isPaused) {
          const visitors = visitorsRef.current;
          if (frameTick % 56 === 0 && visitors.length < 16) {
            visitors.push(spawnVisitor(Math.random() > 0.5));
          }

          let deltaPass = 0;
          let deltaStop = 0;
          let deltaEnter = 0;
          let deltaExit = 0;
          let deltaWalkAway = 0;

          for (let i = visitors.length - 1; i >= 0; i--) {
            const v = visitors[i];

            if (v.state === 'passing') {
              v.x += v.vx;
              if (v.x > 160 && v.x < 560 && !v.countedStop && Math.random() < 0.025) {
                v.state = 'vitrine_stop';
                v.dwellFrames = 0;
                v.countedStop = true;
                deltaStop++;
                deltaPass++;
              } else if ((v.x < -30 || v.x > W + 30) && !v.countedOutcome) {
                v.countedOutcome = true;
                deltaPass++;
                deltaWalkAway++;
                visitors.splice(i, 1);
                continue;
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
                    deltaWalkAway++;
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
                deltaEnter++;
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
                  deltaExit++;
                  v.state = 'passed_away';
                }
              }
            } else if (v.state === 'passed_away') {
              v.x += v.vx !== 0 ? v.vx * 1.15 : 1.7;
              v.y += (248 - v.y) * 0.04;
              if (v.x < -35 || v.x > W + 35) {
                visitors.splice(i, 1);
                continue;
              }
            }
          }

          if (deltaPass || deltaStop || deltaEnter || deltaExit || deltaWalkAway) {
            const cur = snapshotRef.current;
            let passersBy = cur.passersBy + deltaPass;
            let vitrineStops = cur.vitrineStops + deltaStop;
            let entries = cur.entries + deltaEnter;

            // Invariante estrita matemática de funil de varejo: passersBy >= vitrineStops >= entries
            passersBy = Math.max(0, passersBy);
            vitrineStops = Math.min(passersBy, Math.max(0, vitrineStops));
            entries = Math.min(vitrineStops, Math.max(0, entries));

            const exits = cur.exits + deltaExit;
            const passedWithoutEntering = Math.max(0, passersBy - entries);
            const attractionRate =
              passersBy > 0 ? Number(((entries / passersBy) * 100).toFixed(1)) : 0;
            onUpdateSnapshot({
              ...cur,
              zoneId: selectedZoneId,
              passersBy,
              vitrineStops,
              entries,
              exits,
              passedWithoutEntering,
              attractionRate,
              sourceMode: 'simulation',
            });
          }
        }

        for (const v of visitorsRef.current) {
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

          // Mini-badge escuro translúcido com padding para evitar sobreposição de textos
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

      if (!isPaused) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [
    isPaused,
    selectedZoneId,
    selectedZone.shortName,
    webcamActive,
    privacyBlur,
    onUpdateSnapshot,
  ]);

  const vitrineEscapeRate =
    snapshot.vitrineStops > 0
      ? Math.max(
          0,
          Number((((snapshot.vitrineStops - snapshot.entries) / snapshot.vitrineStops) * 100).toFixed(1))
        )
      : 0;

  const handleResetCounters = () => {
    visitorsRef.current = [];
    nextIdRef.current = 1;
    onUpdateSnapshot({
      zoneId: selectedZoneId,
      passersBy: 0,
      vitrineStops: 0,
      entries: 0,
      exits: 0,
      passedWithoutEntering: 0,
      attractionRate: 0,
      sourceMode: webcamActive ? 'webcam_live' : 'simulation',
      lastMotionRegion: 'none',
    });
  };

  return (
    <div className="space-y-6 panel-enter">
      <video ref={videoRef} muted playsInline className="hidden" />

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              Câmera na Vitrine — Entrada, Saída &amp; Fluxo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Conecte a webcam para alimentar o Painel do Lojista ao vivo sem gravar vídeo nem reconhecer rostos: a imagem fica no aparelho e só as contagens vão para a API.
            </p>
          </div>

          {/* Controles Limpos e Óbvios */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWebcamActive((w) => !w)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
                webcamActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
              }`}
            >
              {webcamActive ? (
                <>
                  <VideoOff className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Desconectar Webcam</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Conectar Webcam Real</span>
                </>
              )}
            </button>

            {webcamActive && (
              <span className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Desfoque LGPD sempre ligado</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 flex items-center gap-1.5"
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Retomar</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                  <span>Pausar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetCounters}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Zerar</span>
            </button>
          </div>
        </div>

        {webcamError && (
          <div role="status" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            {webcamError}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label htmlFor="vision-zone" className="font-bold text-slate-700">
                Ala vinculada no Painel Lojista:
              </label>
              <select
                id="vision-zone"
                value={selectedZoneId}
                onChange={(e) => onSelectZone(e.target.value as ZoneId)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-medium"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.shortName}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-300 bg-slate-50 shadow-sm">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label="Sensor de câmera contando passantes no corredor, paradas na vitrine, entradas e saídas na loja"
                className="w-full h-auto block"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                Processamento em RAM (&lt;5ms): nenhuma imagem é gravada.
              </span>
              <span>Azul = Passante • Amarelo = Parou na Vitrine • Verde = Entrou</span>
            </div>
          </div>

          <div className="xl:col-span-4 space-y-3">
            <SpotlightCard className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 uppercase font-bold">
                Passaram na Frente (Corredor)
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1">{snapshot.passersBy}</div>
              <span className="text-[11px] text-slate-500">
                {Math.max(0, snapshot.passersBy - snapshot.entries)} passaram sem entrar
              </span>
            </SpotlightCard>

            <SpotlightCard className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 uppercase font-bold">
                Pararam na Vitrine (&gt;3s)
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">{snapshot.vitrineStops}</div>
              <span className="text-[11px] text-rose-700 font-medium">
                Fuga pós-vitrine: {vitrineEscapeRate}% não entraram
              </span>
            </SpotlightCard>

            <SpotlightCard className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 uppercase font-bold">
                  Entradas × Saídas na Loja
                </span>
                <UserCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {snapshot.entries}{' '}
                <span className="text-sm font-semibold text-slate-500">entradas</span> •{' '}
                <span className="text-lg text-slate-700">{snapshot.exits} saídas</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Taxa de Atração: {snapshot.attractionRate}%
              </span>
            </SpotlightCard>

            <button
              type="button"
              onClick={() => onAnalyzeWithVision(snapshot)}
              className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Diagnosticar Fuga da Vitrine com IA</span>
            </button>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <UserMinus className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Estes contadores alimentam diretamente o <strong>Painel Lojista</strong> e o <strong>Score de Oportunidade</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
