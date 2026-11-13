import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Eye,
  Pause,
  Play,
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
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [burstMode, setBurstMode] = useState(false);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  // Gerenciamento da Webcam Opcional em modo Privacidade Extrema (sem armazenamento)
  useEffect(() => {
    let stream: MediaStream | null = null;
    const videoEl = videoRef.current;

    if (!webcamActive) {
      if (videoEl) videoEl.srcObject = null;
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setWebcamError('Navegador sem suporte a câmera local; usando Simulador de Borda.');
      setWebcamActive(false);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 180 }, audio: false })
      .then((mediaStream) => {
        stream = mediaStream;
        setWebcamError(null);
        if (videoEl) {
          videoEl.srcObject = mediaStream;
          videoEl.play().catch(() => {});
        }
      })
      .catch(() => {
        setWebcamError('Permissão de câmera não concedida; mantendo Simulador de Visão de Borda ativo.');
        setWebcamActive(false);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [webcamActive]);

  // Motor visual do Sensor de Vitrine (Simulação Edge Computer Vision)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 720;
    const H = 320;
    canvas.width = W;
    canvas.height = H;

    let nextId = 1;
    const spawnVisitor = (fromRight = false): SimulatedVisitor => ({
      id: nextId++,
      x: fromRight ? W + 20 : -20,
      y: 195 + Math.random() * 85,
      vx: (fromRight ? -1 : 1) * (1.5 + Math.random() * 1.1),
      vy: 0,
      state: 'passing',
      dwellFrames: 0,
      targetEnter: Math.random() < (burstMode ? 0.34 : 0.28),
      countedStop: false,
      countedOutcome: false,
    });

    const visitors: SimulatedVisitor[] = Array.from({ length: 9 }, (_, i) => ({
      ...spawnVisitor(i % 2 === 0),
      x: 60 + i * 70,
    }));

    let animId = 0;
    let frameTick = 0;

    const render = () => {
      frameTick++;
      ctx.clearRect(0, 0, W, H);

      // Fundo planta da loja + corredor
      ctx.fillStyle = '#070d1b';
      ctx.fillRect(0, 0, W, H);

      // Interior da Loja (metade superior)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(40, 18, W - 80, 120);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 18, W - 80, 120);

      // Porta de Entrada / Linha Virtual de Contagem
      ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
      ctx.fillRect(285, 128, 150, 22);
      ctx.strokeStyle = '#fbbf24';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(285, 138);
      ctx.lineTo(435, 138);
      ctx.stroke();
      ctx.setLineDash([]);

      // Zona de Atração da Vitrine
      ctx.fillStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.fillRect(90, 145, 540, 44);

      // Rótulos no Canvas
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText(`INTERIOR DA LOJA (${selectedZone.shortName})`, 56, 40);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('PORTA / LINHA DE ENTRADA-SAÍDA', 274, 122);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('ZONA DE ATRAÇÃO DA VITRINE (>3s)', 56, 165);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('CORREDOR DO SHOPPING (PASSANTES)', 56, 304);

      // Opcional: feed local desfocado em miniatura dentro do interior da câmera (Privacy Blur)
      if (webcamActive && videoRef.current && videoRef.current.readyState >= 2) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.filter = 'blur(8px) grayscale(100%)';
        ctx.drawImage(videoRef.current, W - 195, 24, 145, 86);
        ctx.restore();
        ctx.fillStyle = '#34d399';
        ctx.font = '700 10px monospace';
        ctx.fillText('LIVE PIXEL-BLUR (SEM GRAVAÇÃO)', W - 208, 122);
      }

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
            // Chance de parar na frente da vitrine
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
            v.y += (166 - v.y) * 0.08;
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
            const ty = 78;
            v.x += (tx - v.x) * 0.06;
            v.y += (ty - v.y) * 0.06;
            if (v.y < 115 && !v.countedOutcome) {
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
              if (v.y > 205) {
                deltaExit++;
                v.state = 'passed_away';
              }
            }
          } else if (v.state === 'passed_away') {
            v.x += v.vx !== 0 ? v.vx * 1.15 : 1.7;
            v.y += (235 - v.y) * 0.04;
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
          const attractionRate = passersBy > 0 ? Number(((entries / passersBy) * 100).toFixed(1)) : 0;
          onUpdateSnapshot({
            ...cur,
            zoneId: selectedZoneId,
            passersBy,
            vitrineStops: cur.vitrineStops + deltaStop,
            entries,
            exits: cur.exits + deltaExit,
            passedWithoutEntering: cur.passedWithoutEntering + deltaWalkAway,
            attractionRate,
          });
        }
      }

      // Desenhar bounding boxes anônimas de cada visitante
      for (const v of visitors) {
        const color =
          v.state === 'entering' || v.state === 'exiting'
            ? '#34d399'
            : v.state === 'vitrine_stop'
              ? '#fbbf24'
              : '#38bdf8';

        // Silhueta circular + Bounding Box (Visão Computacional Anônima)
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

      if (!isPaused) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isPaused, burstMode, selectedZoneId, selectedZone.shortName, webcamActive, onUpdateSnapshot]);

  const vitrineEscapeRate =
    snapshot.vitrineStops > 0
      ? Math.max(0, Number((((snapshot.vitrineStops - snapshot.entries) / snapshot.vitrineStops) * 100).toFixed(1)))
      : 0;

  return (
    <div className="space-y-6 panel-enter">
      {/* Vídeo oculto usado apenas para processamento local de desfoque se ativado */}
      <video ref={videoRef} muted playsInline className="hidden" />

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-amber-400" aria-hidden="true" />
              Sensor de Visão de Borda — Entrada, Saída &amp; Atração da Vitrine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Analisa em borda quem passa na frente, quem para na vitrine, quem entra e quem sai — sem gravar vídeo ou reconhecer rostos (100% LGPD).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <button
              type="button"
              onClick={() => setBurstMode((b) => !b)}
              aria-pressed={burstMode}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                burstMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{burstMode ? 'Pico Pós-Cinema Ativo' : 'Simular Pico de Fluxo'}</span>
            </button>

            <button
              type="button"
              onClick={() => setWebcamActive((w) => !w)}
              aria-pressed={webcamActive}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                webcamActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {webcamActive ? (
                <>
                  <VideoOff className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Desligar Câmera Local</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                  <span>Testar Câmera Local (Privacy Blur)</span>
                </>
              )}
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
                Vitrine Monitorada:
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
                aria-label="Simulador de visão computacional de borda contando passantes no corredor, paradas na vitrine, entradas e saídas na loja"
                className="w-full h-auto block"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                Edge Processing: descartado em RAM em &lt;5ms — nenhuma imagem é gravada.
              </span>
              <span>Legenda: Azul = Passante • Amarelo = Parou na Vitrine • Verde = Entrou</span>
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
                  Entradas x Saídas na Loja
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
                Cruzando este sensor com o <strong>Modo Balcão</strong> e o <strong>Concierge QR</strong>, o lojista descobre exatamente por que quem parou na vitrine não entrou ou saiu sem comprar.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
