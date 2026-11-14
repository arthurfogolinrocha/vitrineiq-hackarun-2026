import React, { useEffect, useRef, useState } from 'react';
import {
  ShoppingZone,
  StoreTenant,
  VisionFunnelSnapshot,
  VitrineAuditResult,
  ZoneId,
} from '../types';
import { api } from '../services/api';
import { VisionAuditModalCard } from './vision/VisionAuditModalCard';
import { VisionCameraViewport } from './vision/VisionCameraViewport';
import { VisionHeaderControls } from './vision/VisionHeaderControls';
import { VisionHeatmapCard } from './vision/VisionHeatmapCard';
import {
  analyzeMotionFrame,
  applyFunnelDeltas,
  buildLocalAuditFallback,
  computeVitrineEscapeRate,
  createSimulatedVisitor,
  drawSimulatorScene,
  drawWebcamZonesOverlay,
  FunnelDelta,
  MotionAnalysisResult,
  SimulatedVisitor,
  stepSimulatedVisitors,
} from './vision/visionEngine';

export interface EdgeVisionSensorProps {
  zones: ShoppingZone[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  snapshot: VisionFunnelSnapshot;
  onUpdateSnapshot: (next: VisionFunnelSnapshot) => void;
  onAnalyzeWithVision: (snapshot: VisionFunnelSnapshot) => void;
  activeTenant?: StoreTenant | null;
  olharesPorZona?: Record<string, number>;
  onAuditComplete?: (res: VitrineAuditResult) => void;
}

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 340;
const MOTION_WIDTH = 80;
const MOTION_HEIGHT = 45;

export const EdgeVisionSensor: React.FC<EdgeVisionSensorProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  snapshot,
  onUpdateSnapshot,
  onAnalyzeWithVision,
  activeTenant,
  olharesPorZona,
  onAuditComplete,
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

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<VitrineAuditResult | null>(null);
  const [auditSourceMode, setAuditSourceMode] = useState<'webcam' | 'simulator' | null>(null);
  const [auditNotice, setAuditNotice] = useState<string | null>(null);

  const effectiveZoneId: ZoneId = activeTenant ? activeTenant.zoneId : selectedZoneId;
  const selectedZone = zones.find((z) => z.id === effectiveZoneId) || zones[0];
  const vitrineLabel = activeTenant ? activeTenant.storeName : selectedZone.shortName;

  useEffect(() => {
    if (activeTenant && selectedZoneId !== activeTenant.zoneId) {
      onSelectZone(activeTenant.zoneId);
    }
  }, [activeTenant, selectedZoneId, onSelectZone]);

  useEffect(() => {
    setAuditResult(null);
    setAuditNotice(null);
  }, [activeTenant?.id, effectiveZoneId]);

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
      .catch((err: unknown) => {
        const errName = err instanceof Error ? err.name : '';
        if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setWebcamError('Nenhuma câmera física encontrada neste dispositivo; mantendo o simulador ativo.');
        } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setWebcamError('Permissão de webcam não concedida; mantendo o simulador ativo.');
        } else {
          setWebcamError('Não foi possível acessar a webcam agora; mantendo o simulador ativo.');
        }
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

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const motionCanvas = document.createElement('canvas');
    motionCanvas.width = MOTION_WIDTH;
    motionCanvas.height = MOTION_HEIGHT;
    const motionCtx = motionCanvas.getContext('2d', { willReadFrequently: true });
    let prevLuma: Float32Array | null = null;
    let lastCorridorTrigger = 0;
    let lastVitrineTrigger = 0;
    let lastDoorTrigger = 0;
    let doorParity = 0;

    if (visitorsRef.current.length === 0) {
      visitorsRef.current = Array.from({ length: 8 }, (_, i) => ({
        ...createSimulatedVisitor(nextIdRef.current++, CANVAS_WIDTH, i % 2 === 0),
        x: 70 + i * 75,
      }));
    }

    let animId = 0;
    let frameTick = 0;

    const render = () => {
      frameTick++;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const videoEl = videoRef.current;
      const hasLiveVideo = Boolean(webcamActive && videoEl && videoEl.readyState >= 2);

      if (hasLiveVideo && videoEl) {
        ctx.save();
        ctx.translate(CANVAS_WIDTH, 0);
        ctx.scale(-1, 1);
        ctx.filter = privacyBlur ? 'blur(7px) brightness(0.8)' : 'brightness(0.92)';
        ctx.drawImage(videoEl, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();

        let motionResult: MotionAnalysisResult | null = null;

        if (!isPaused && motionCtx && frameTick % 3 === 0) {
          motionCtx.save();
          motionCtx.translate(MOTION_WIDTH, 0);
          motionCtx.scale(-1, 1);
          motionCtx.drawImage(videoEl, 0, 0, MOTION_WIDTH, MOTION_HEIGHT);
          motionCtx.restore();

          const imgData = motionCtx.getImageData(0, 0, MOTION_WIDTH, MOTION_HEIGHT).data;
          motionResult = analyzeMotionFrame(imgData, prevLuma, MOTION_WIDTH, MOTION_HEIGHT);
          prevLuma = motionResult.currentLuma;

          const now = performance.now();
          const delta: FunnelDelta = { pass: 0, stop: 0, enter: 0, exit: 0, walkAway: 0 };
          let region: VisionFunnelSnapshot['lastMotionRegion'] = 'none';

          if (motionResult.corridorMotion > 22 && now - lastCorridorTrigger > 1300) {
            lastCorridorTrigger = now;
            delta.pass++;
            delta.walkAway++;
            region = 'corridor';
          }
          if (motionResult.vitrineMotion > 24 && now - lastVitrineTrigger > 1700) {
            lastVitrineTrigger = now;
            delta.pass++;
            delta.stop++;
            region = 'vitrine';
          }
          if (motionResult.doorMotion > 18 && now - lastDoorTrigger > 1900) {
            lastDoorTrigger = now;
            doorParity++;
            if (doorParity % 3 === 0) {
              delta.exit++;
            } else {
              delta.pass++;
              delta.enter++;
            }
            region = 'door';
          }

          if (delta.pass || delta.stop || delta.enter || delta.exit || delta.walkAway) {
            onUpdateSnapshot(
              applyFunnelDeltas(
                snapshotRef.current,
                delta,
                effectiveZoneId,
                'webcam_live',
                region
              )
            );
          }
        }

        drawWebcamZonesOverlay(
          ctx,
          CANVAS_WIDTH,
          CANVAS_HEIGHT,
          vitrineLabel,
          motionResult,
          MOTION_WIDTH,
          MOTION_HEIGHT
        );
      } else {
        if (!isPaused) {
          const delta = stepSimulatedVisitors(
            visitorsRef.current,
            CANVAS_WIDTH,
            frameTick,
            () => nextIdRef.current++
          );
          if (delta.pass || delta.stop || delta.enter || delta.exit || delta.walkAway) {
            onUpdateSnapshot(
              applyFunnelDeltas(snapshotRef.current, delta, effectiveZoneId, 'simulation')
            );
          }
        }

        drawSimulatorScene(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, vitrineLabel, visitorsRef.current);
      }

      if (!isPaused) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [
    isPaused,
    effectiveZoneId,
    vitrineLabel,
    webcamActive,
    privacyBlur,
    onUpdateSnapshot,
  ]);

  const vitrineEscapeRate = computeVitrineEscapeRate(snapshot);

  const handleResetCounters = () => {
    visitorsRef.current = [];
    nextIdRef.current = 1;
    onUpdateSnapshot({
      zoneId: effectiveZoneId,
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

  const handleRunMultimodalAudit = async () => {
    setIsAuditing(true);
    setAuditNotice(null);

    try {
      const videoEl = videoRef.current;
      const hasLiveVideo = Boolean(webcamActive && videoEl && videoEl.readyState >= 2);
      let frameDataUrl = '';

      if (hasLiveVideo && videoEl) {
        const offscreen = document.createElement('canvas');
        offscreen.width = 640;
        offscreen.height = 360;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          // LGPD: o frame vai para a IA na nuvem, então sai com o mesmo desfoque do preview (sem rosto nítido).
          offCtx.filter = 'blur(7px) brightness(0.8)';
          offCtx.drawImage(videoEl, 0, 0, 640, 360);
          frameDataUrl = offscreen.toDataURL('image/jpeg', 0.7);
        }
        setAuditSourceMode('webcam');
      } else if (canvasRef.current) {
        frameDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setAuditSourceMode('simulator');
        setAuditNotice(
          'Webcam real desligada: analisamos 1 frame do Simulador de Borda. Conecte a webcam física para auditar os produtos reais da vitrine.'
        );
      }

      if (!frameDataUrl) {
        setAuditNotice('Não foi possível capturar um frame da vitrine no momento.');
        return;
      }

      try {
        const res = await api.auditarVitrine({
          image_base64: frameDataUrl,
          zone_id: effectiveZoneId,
          store_name: vitrineLabel,
          olhares_por_zona: olharesPorZona ?? {},
          taxa_atencao: Math.round(snapshot.attractionRate),
        });
        setAuditResult(res);
        onAuditComplete?.(res);
      } catch {
        const fallbackRes = buildLocalAuditFallback(
          vitrineLabel,
          snapshot.attractionRate,
          olharesPorZona
        );
        setAuditResult(fallbackRes);
        setAuditNotice(
          'API Gemini Vision indisponível no momento — exibindo auditoria heurística local (frame descartado em RAM).'
        );
        onAuditComplete?.(fallbackRes);
      }
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6 panel-enter">
      <video ref={videoRef} muted playsInline className="hidden" />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
        <VisionHeaderControls
          activeTenant={activeTenant}
          webcamActive={webcamActive}
          isPaused={isPaused}
          webcamError={webcamError}
          onToggleWebcam={() => {
            setWebcamError(null);
            setWebcamActive((w) => !w);
          }}
          onTogglePaused={() => setIsPaused((p) => !p)}
          onResetCounters={handleResetCounters}
          onDismissWebcamError={() => setWebcamError(null)}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <VisionCameraViewport
            canvasRef={canvasRef}
            zones={zones}
            effectiveZoneId={effectiveZoneId}
            activeTenant={activeTenant}
            onSelectZone={onSelectZone}
          />

          <VisionHeatmapCard
            snapshot={snapshot}
            vitrineEscapeRate={vitrineEscapeRate}
            isAuditing={isAuditing}
            onRunMultimodalAudit={handleRunMultimodalAudit}
            onAnalyzeWithVision={() => onAnalyzeWithVision({ ...snapshot, zoneId: effectiveZoneId })}
          />
        </div>

        <VisionAuditModalCard
          vitrineLabel={vitrineLabel}
          auditNotice={auditNotice}
          auditResult={auditResult}
          auditSourceMode={auditSourceMode}
          olharesPorZona={olharesPorZona}
        />
      </div>
    </div>
  );
};
