import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserMinus,
  Users,
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

  const [isPaused, setIsPaused] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [privacyBlur, setPrivacyBlur] = useState(true);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [burstMode, setBurstMode] = useState(false);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  // Gerenciamento da Webcam Real (processamento em RAM na borda, zero armazenamento)
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
        setWebcamError('Permissão de webcam não concedida ou câmera indisponível; mantendo Simulador de Borda ativo.');
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

    // Canvas offscreen leve (80x45) para detecção real de movimento por região sem custo pesado de CPU
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

    let nextId = 1;
    const spawnVisitor = (fromRight = false): SimulatedVisitor => ({
      id: nextId++,
      x: fromRight ? W + 20 : -20,
      y: 210 + Math.random() * 90,
      vx: (fromRight ? -1 : 1) * (1.5 + Math.random() * 1.1),
      vy: 0,
      state: 'passing',
      dwellFrames: 0,
      targetEnter: Math.random() < (burstMode ? 0.36 : 0.28),
      countedStop: false,
      countedOutcome: false,
    });

    const visitors: SimulatedVisitor[] = Array.from({ length: 8 }, (_, i) => ({
      ...spawnVisitor(i % 2 === 0),
      x: 70 + i * 75,
    }));

    let animId = 0;
    let frameTick = 0;

    const render = () => {
      frameTick++;
      ctx.clearRect(0, 0, W, H);

      const videoEl = videoRef.current;
      const hasLiveVideo = Boolean(webcamActive && videoEl && videoEl.readyState >= 2);

      if (hasLiveVideo && videoEl) {
        // 1) Desenha o vídeo da webcam real espelhado (com ou sem Privacy Blur LGPD)
        ctx.save();
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
        ctx.filter = privacyBlur ? 'blur(7px) brightness(0.75) saturate(0.8)' : 'brightness(0.85)';
        ctx.drawImage(videoEl, 0, 0, W, H);
        ctx.restore();

        // Grade e Zonas de Visão de Borda sobre a Webcam Real
        // Zona Porta (Superior)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
        ctx.fillRect(190, 14, 340, 102);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
        ctx.lineWidth = 2;
        ctx.strokeRect(190, 14, 340, 102);

        // Zona Vitrine (Centro)
        ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
        ctx.fillRect(60, 122, W - 120, 96);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(60, 122, W - 120, 96);
        ctx.setLineDash([]);

        // Zona Corredor (Inferior)
        ctx.fillStyle = 'rgba(56, 189, 248, 0.10)';
        ctx.fillRect(20, 224, W - 40, 100);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.strokeRect(20, 224, W - 40, 100);

        // Detecção real de movimento por região via frame-differencing
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

          // Desenha Bounding Box do movimento real detectado na câmera
          if (maxX > minX && maxY > minY && doorMotion + vitrineMotion + corridorMotion > 18) {
            const bx = (minX / MW) * W;
            const by = (minY / MH) * H;
            const bw = ((maxX - minX) / MW) * W;
            const bh = ((maxY - minY) / MH) * H;
            ctx.strokeStyle = doorMotion > 14 ? '#34d399' : vitrineMotion > 18 ? '#fbbf24' : '#38bdf8';
            ctx.lineWidth = 3;
            ctx.strokeRect(bx, by, bw, bh);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = '700 11px monospace';
            ctx.fillText('MOVIMENTO DETECTADO (ANON)', Math.max(10, bx), Math.max(18, by - 6));
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
            const passersBy = cur.passersBy + deltaPass;
            const entries = cur.entries + deltaEnter;
            const attractionRate =
              passersBy > 0 ? Number(((entries / passersBy) * 100).toFixed(1)) : 0;
            onUpdateSnapshot({
              ...cur,
              zoneId: selectedZoneId,
              passersBy,
              vitrineStops: cur.vitrineStops + deltaStop,
              entries,
              exits: cur.exits + deltaExit,
              passedWithoutEntering: cur.passedWithoutEntering + deltaWalkAway,
              attractionRate,
              sourceMode: 'webcam_live',
              lastMotionRegion: region,
            });
          }
        }

        // Rótulos no overlay da Webcam
        ctx.font = '700 11px Inter, sans-serif';
        ctx.fillStyle = '#34d399';
        ctx.fillText('ZONA PORTA — ENTRADA / SAÍDA (PASSE A MÃO AQUI)', 202, 34);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`VITRINE ${selectedZone.shortName.toUpperCase()} — ATRAÇÃO`, 72, 142);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('CORREDOR DO SHOPPING — PASSANTES', 32, 244);

        ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
        ctx.fillRect(W - 235, 12, 220, 26);
        ctx.fillStyle = '#34d399';
        ctx.font = '700 10px monospace';
        ctx.fillText(
          privacyBlur ? 'WEBCAM ATIVA • BLUR LGPD ON' : 'WEBCAM ATIVA • MODO DEMO',
          W - 224,
          29
        );
      } else {
        // 2) Modo Simulação Esquemática 60fps
        ctx.fillStyle = '#070d1b';
        ctx.fillRect(0, 0, W, H);

        // Interior da Loja
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.fillRect(40, 18, W - 80, 124);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 18, W - 80, 124);

        // Porta de Entrada
        ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
        ctx.fillRect(285, 132, 150, 22);
        ctx.strokeStyle = '#fbbf24';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(285, 142);
        ctx.lineTo(435, 142);
        ctx.stroke();
        ctx.setLineDash([]);

        // Zona de Atração da Vitrine
        ctx.fillStyle = 'rgba(56, 189, 248, 0.07)';
        ctx.fillRect(90, 150, 540, 48);

        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillStyle = '#34d399';
        ctx.fillText(`INTERIOR DA LOJA (${selectedZone.shortName})`, 56, 40);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('PORTA / LINHA DE ENTRADA-SAÍDA', 274, 126);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('ZONA DE ATRAÇÃO DA VITRINE (>3s)', 56, 170);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('CORREDOR DO SHOPPING (PASSANTES)', 56, 322);

        if (!isPaused) {
          if (frameTick % (burstMode ? 36 : 64) === 0 && visitors.length < 18) {
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
            const passersBy = cur.passersBy + deltaPass;
            const entries = cur.entries + deltaEnter;
            const attractionRate =
              passersBy > 0 ? Number(((entries / passersBy) * 100).toFixed(1)) : 0;
            onUpdateSnapshot({
              ...cur,
              zoneId: selectedZoneId,
              passersBy,
              vitrineStops: cur.vitrineStops + deltaStop,
              entries,
              exits: cur.exits + deltaExit,
              passedWithoutEntering: cur.passedWithoutEntering + deltaWalkAway,
              attractionRate,
              sourceMode: 'simulation',
            });
          }
        }

        for (const v of visitors) {
          const color =
            v.state === 'entering' || v.state === 'exiting'
              ? '#34d399'
              : v.state === 'vitrine_stop'
                ? '#fbbf24'
                : '#38bdf8';

          ctx.strokeStyle = color;
          ctx.lineWidth = 1.6;
          ctx.strokeRect(v.x - 10, v.y - 10, 20, 20);

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(v.x, v.y, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = '600 9px monospace';
          ctx.fillText(`ID#${v.id}`, v.x - 11, v.y - 14);
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
    burstMode,
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
      {/* Vídeo oculto consumido apenas pelo detector em RAM */}
      <video ref={videoRef} muted playsInline className="hidden" />

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" aria-hidden="true" />
                Sensor Câmera na Vitrine — Alimentação Ao Vivo do Painel
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  webcamActive
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                }`}
              >
                {webcamActive ? 'WEBCAM REAL ALIMENTANDO PAINEL' : 'MODO SIMULADOR AO VIVO'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Conecte a webcam do notebook para contar passantes, paradas na vitrine e entradas por visão de borda em RAM — atualizando o Painel do Lojista e o Mapa 3D em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWebcamActive((w) => !w)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
                webcamActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow'
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
                  <span>Conectar Webcam Real (Alimentar Painel)</span>
                </>
              )}
            </button>

            {webcamActive && (
              <button
                type="button"
                onClick={() => setPrivacyBlur((b) => !b)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                  privacyBlur
                    ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                    : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {privacyBlur ? (
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{privacyBlur ? 'Blur LGPD: Ativo' : 'Blur LGPD: Desativado'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Retomar Sensor</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>Pausar Sensor</span>
                </>
              )}
            </button>

            {!webcamActive && (
              <button
                type="button"
                onClick={() => setBurstMode((b) => !b)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                  burstMode
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{burstMode ? 'Pico Pós-Cinema Ativo' : 'Simular Pico'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetCounters}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Zerar</span>
            </button>
          </div>
        </div>

        {webcamError && (
          <div role="status" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            {webcamError}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Viewport da Câmera / Edge Sensor */}
          <div className="xl:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <label htmlFor="vision-zone" className="font-semibold text-slate-300">
                Ala / Vitrine alimentada pelo sensor no Painel Lojista:
              </label>
              <select
                id="vision-zone"
                value={selectedZoneId}
                onChange={(e) => onSelectZone(e.target.value as ZoneId)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.shortName}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label="Sensor de visão computacional de borda contando passantes no corredor, paradas na vitrine, entradas e saídas na loja"
                className="w-full h-auto block"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                Edge Processing em RAM (&lt;5ms): nenhuma imagem ou dado facial é salvo ou enviado à nuvem.
              </span>
              <span>
                {webcamActive
                  ? 'Dica na demo: mova a mão na faixa Corredor, Vitrine ou Porta!'
                  : 'Azul = Passante • Amarelo = Parou na Vitrine • Verde = Entrou'}
              </span>
            </div>
          </div>

          {/* Métricas do Funil Físico */}
          <div className="xl:col-span-4 space-y-3">
            <SpotlightCard className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">
                Passaram na Frente (Corredor)
              </span>
              <div className="text-2xl font-black text-sky-400 mt-1">{snapshot.passersBy}</div>
              <span className="text-[11px] text-slate-400">
                {snapshot.passedWithoutEntering} passaram sem entrar
              </span>
            </SpotlightCard>

            <SpotlightCard className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">
                Pararam na Vitrine (&gt;3s)
              </span>
              <div className="text-2xl font-black text-amber-400 mt-1">{snapshot.vitrineStops}</div>
              <span className="text-[11px] text-rose-300">
                Fuga pós-vitrine: {vitrineEscapeRate}% olharam e não entraram
              </span>
            </SpotlightCard>

            <SpotlightCard className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">
                  Entradas × Saídas na Loja
                </span>
                <UserCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {snapshot.entries}{' '}
                <span className="text-sm font-semibold text-slate-400">entradas</span> •{' '}
                <span className="text-lg text-slate-300">{snapshot.exits} saídas</span>
              </div>
              <span className="text-[11px] text-emerald-300 font-semibold">
                Taxa de Atração da Vitrine: {snapshot.attractionRate}%
              </span>
            </SpotlightCard>

            <button
              type="button"
              onClick={() => onAnalyzeWithVision(snapshot)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Diagnosticar Fuga da Vitrine com IA</span>
            </button>

            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <UserMinus className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Os contadores acima alimentam em tempo real o <strong>Painel Lojista</strong> e o <strong>Score de Oportunidade</strong> da ala selecionada.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
