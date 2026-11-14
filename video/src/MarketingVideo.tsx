import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { perspectiveFly } from './transitions/perspectiveFlyTransition';
import { CapimMall3D } from './scenes3d/CapimMall3D';
import { BrandWatermark, SubtitlePill } from './components/UiOverlays';
import {
  CardFan3D,
  FloatingTelemetryPill,
  IPhone3DStage,
  KineticPillHeadline,
  MacBook3DStage,
  StudioGridBackdrop,
  TopKeynotePill,
} from './components/StudioMockups';
import { FONTS, PALETTE } from './designSystem';
import timingsRaw from './timingsMarketing.json';

export interface TimingItem {
  id: string;
  durationSec: number;
  frames: number;
}

const TIMINGS = timingsRaw as TimingItem[];
const framesOf = (id: string, fallback: number, pad = 48) =>
  (TIMINGS.find((t) => t.id === id)?.frames ?? fallback) + pad;

export const MKT_SCENES = {
  m01_hook: framesOf('m01_hook', 397, 48),
  m02_dor: framesOf('m02_dor', 446, 46),
  m03_revelacao: framesOf('m03_revelacao', 493, 48),
  m04_cockpit_3d: framesOf('m04_cockpit_3d', 735, 50),
  m05_crowddrop: framesOf('m05_crowddrop', 559, 48),
  m06_raiox_lgpd: framesOf('m06_raiox_lgpd', 569, 48),
  m07_balcao_qr: framesOf('m07_balcao_qr', 795, 50),
  m08_cta: framesOf('m08_cta', 491, 68),
};

export const MKT_TRANSITION = 16;
const MKT_DURATIONS = [
  MKT_SCENES.m01_hook,
  MKT_SCENES.m02_dor,
  MKT_SCENES.m03_revelacao,
  MKT_SCENES.m04_cockpit_3d,
  MKT_SCENES.m05_crowddrop,
  MKT_SCENES.m06_raiox_lgpd,
  MKT_SCENES.m07_balcao_qr,
  MKT_SCENES.m08_cta,
];
export const MKT_TOTAL_FRAMES =
  MKT_DURATIONS.reduce((acc, v) => acc + v, 0) - 7 * MKT_TRANSITION;

function computeMusicDuckVolume(
  f: number,
  durations: number[],
  transitionFrames: number,
  totalFrames: number
): number {
  let cursor = 0;
  let speechActive = 0;
  for (const dur of durations) {
    const voiceStart = cursor + 22;
    const voiceEnd = cursor + dur - 18;
    const rampIn = interpolate(f, [voiceStart - 10, voiceStart + 4], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const rampOut = interpolate(f, [voiceEnd - 6, voiceEnd + 10], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    speechActive = Math.max(speechActive, Math.min(rampIn, rampOut));
    cursor += dur - transitionFrames;
  }
  const bed = interpolate(speechActive, [0, 1], [0.23, 0.085]);
  const fadeOut = interpolate(f, [totalFrames - 72, totalFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return bed * fadeOut;
}

/** Cena 1 — Cold Open Pattern Interrupt + Corredor 3D iluminado */
const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const passers = Math.round(
    interpolate(frame, [6, 74], [0, 123], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const flashOp = interpolate(frame, [0, 12, 30], [0.42, 0.12, 0], { extrapolateRight: 'clamp' });
  const punchScale = spring({ frame: Math.max(0, frame - 46), fps, config: { damping: 14, stiffness: 190 } });

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.55} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_mkt/m01_hook.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="cold-open-dive" localFrame={frame} flowMood="loss" />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(244,63,94,0.10) 0%, rgba(6,7,11,0.52) 64%, rgba(6,7,11,0.88) 100%)',
        }}
      />
      <AbsoluteFill style={{ backgroundColor: '#F43F5E', opacity: flashOp, pointerEvents: 'none' }} />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 24,
          padding: '0 80px',
        }}
      >
        <TopKeynotePill label="ALERTA DE FATURAMENTO INVISÍVEL" color={PALETTE.rose} />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 32 }}>
          <span
            style={{
              fontFamily: FONTS.display,
              fontWeight: 800,
              fontSize: 160,
              lineHeight: 0.9,
              letterSpacing: '-0.055em',
              color: PALETTE.rose,
              textShadow: '0 0 60px rgba(244,63,94,0.65)',
            }}
          >
            {passers}
          </span>
          <span
            style={{
              fontFamily: FONTS.display,
              fontWeight: 800,
              fontSize: 54,
              color: '#F8FAFC',
              letterSpacing: '-0.03em',
              textShadow: '0 8px 30px rgba(0,0,0,0.8)',
            }}
          >
            passaram na porta.
          </span>
        </div>

        <div
          style={{
            opacity: interpolate(punchScale, [0, 1], [0, 1]),
            transform: `scale(${interpolate(punchScale, [0, 1], [0.85, 1])})`,
          }}
        >
          <KineticPillHeadline
            words={['ZERO', 'dados.', 'Dinheiro', 'evaporando.']}
            pillWord="ZERO"
            pillColor={PALETTE.rose}
            startFrame={46}
            fontSize={62}
          />
        </div>
      </AbsoluteFill>

      <SubtitlePill
        badge="R$ 3.315 / HORA"
        accent={PALETTE.rose}
        caption="Cada vitrine sem leitura perde compradores silenciosamente todo dia."
      />
    </AbsoluteFill>
  );
};

/** Cena 2 — Contraste Brutal: E-commerce vs Loja Física */
const Scene2Contrast: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [
    {
      badge: 'E-COMMERCE DIGITAL',
      metric: '100%',
      title: 'Cada clique é rastreado',
      desc: 'Sabe quem entrou, onde olhou, o que faltou e por que abandonou o carrinho.',
      accent: PALETTE.cyan,
    },
    {
      badge: 'VAREJO FÍSICO HOJE',
      metric: '0%',
      title: 'Cego antes do caixa',
      desc: 'Só enxerga a nota fiscal. Zero leitura da vitrine, fila ou objeção no balcão.',
      accent: PALETTE.rose,
    },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_mkt/m02_dor.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.rose} />

      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 38,
          padding: '0 90px',
        }}
      >
        <TopKeynotePill label="O ABISMO DA LOJA FÍSICA" color={PALETTE.gold} />
        <KineticPillHeadline
          words={['No', 'digital', 'você', 'mede', 'tudo.', 'Na', 'loja,', 'opera', 'no', 'ESCURO.']}
          pillWord="ESCURO"
          pillColor={PALETTE.rose}
          startFrame={6}
          fontSize={58}
        />

        <div style={{ display: 'flex', gap: 32, width: '100%', maxWidth: 1280 }}>
          {cards.map((c, idx) => {
            const op = interpolate(frame, [26 + idx * 14, 46 + idx * 14], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const ty = interpolate(frame, [26 + idx * 14, 46 + idx * 14], [36, 0], {
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={c.title}
                style={{
                  flex: 1,
                  opacity: op,
                  transform: `translateY(${ty}px) perspective(1200px) rotateY(${idx === 0 ? 5 : -5}deg)`,
                  background: 'linear-gradient(155deg, rgba(19,23,35,0.92) 0%, rgba(9,11,17,0.9) 100%)',
                  border: `1.5px solid ${c.accent}66`,
                  borderRadius: 26,
                  padding: '32px 34px',
                  boxShadow: `0 28px 70px rgba(0,0,0,0.75), 0 0 40px ${c.accent}1f`,
                }}
              >
                <div style={{ fontFamily: FONTS.mono, fontSize: 12, fontWeight: 700, color: c.accent, letterSpacing: '0.16em' }}>
                  {c.badge}
                </div>
                <div style={{ fontFamily: FONTS.display, fontSize: 78, fontWeight: 800, color: c.accent, margin: '8px 0' }}>
                  {c.metric}
                </div>
                <div style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 700, color: '#FFF', marginBottom: 8 }}>
                  {c.title}
                </div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 18, color: '#94A3B8', lineHeight: 1.45 }}>
                  {c.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Cena 3 — A Virada Apple-Style: Gêmeo Digital 3D do Capim Dourado luminoso com arcos + placas 3D */
const Scene3Revelacao: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.55} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_mkt/m03_revelacao.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="reveal-dolly" localFrame={frame} flowMood="live" />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(8,9,13,0.06) 0%, rgba(8,9,13,0.52) 72%, rgba(8,9,13,0.82) 100%)',
        }}
      />
      <BrandWatermark />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 22, padding: '0 80px' }}>
        <div
          style={{
            padding: '10px 26px',
            borderRadius: 999,
            background: 'rgba(8,9,13,0.86)',
            border: `1.5px solid ${PALETTE.gold}`,
            fontFamily: FONTS.mono,
            fontSize: 15,
            fontWeight: 700,
            color: PALETTE.goldBright,
            letterSpacing: '0.18em',
          }}
        >
          188 LOJAS CONECTADAS • 38.800 m² EM 3D
        </div>
        <KineticPillHeadline
          words={['VitrineIQ:', 'o', 'GOOGLE ANALYTICS', 'do', 'varejo', 'físico.']}
          pillWord="GOOGLE ANALYTICS"
          pillColor={PALETTE.gold}
          startFrame={10}
          fontSize={68}
        />
      </AbsoluteFill>

      <SubtitlePill
        badge="TEMPO REAL"
        caption="Cada corredor, vitrine e balcão medido ao vivo no Capim Dourado Shopping."
      />
    </AbsoluteFill>
  );
};

/** Cena 4 — MacBook 3D Real UI + Subsolo 356 Vagas + Z-Layer Explosion Cards */
const Scene4CockpitAnd3D: React.FC = () => {
  const frame = useCurrentFrame();
  const showMap = frame >= 360;

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_mkt/m04_cockpit_3d.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.gold} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill
          label={showMap ? 'GÊMEO DIGITAL 3D • L1, L2 & SUBSOLO 356' : 'PAINEL EXECUTIVO & CLIMA'}
          color={showMap ? PALETTE.cyan : PALETTE.gold}
        />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            key={showMap ? 'map3d' : 'cockpit'}
            words={
              showMap
                ? ['Explore', 'L1,', 'Praça L2', 'e', 'SUBSOLO 356', 'em', '3D.']
                : ['IQ', 'Score,', 'clima', 'e', 'PICO', 'por', 'hora.']
            }
            pillWord={showMap ? 'SUBSOLO 356' : 'PICO'}
            pillColor={showMap ? PALETTE.cyan : PALETTE.gold}
            startFrame={0}
            fontSize={48}
          />
        </div>

        <div style={{ marginTop: 22, position: 'relative' }}>
          <MacBook3DStage
            capturePath="captures/ui_01_cockpit.png"
            secondaryCapturePath="captures/ui_04b_map3d_subsolo.png"
            switchAtFrame={360}
            rotateY={showMap ? 5 : -5}
            zoomFrom={1}
            zoomTo={1.18}
            zoomStartFrame={showMap ? 375 : 48}
            zoomEndFrame={showMap ? 560 : 250}
            focusX={showMap ? 48 : 54}
            focusY={showMap ? 54 : 36}
            cursorWaypoints={[
              { frame: 24, x: 24, y: 26 },
              { frame: 130, x: 32, y: 44, click: true },
              { frame: 350, x: 11, y: 31, click: true },
            ]}
            explosionCards={
              showMap
                ? [
                    {
                      badge: 'SUBSOLO RAIO-X',
                      value: '356 Vagas',
                      sub: 'SS1 + SS2 e Esteiras Super Big',
                      accent: PALETTE.emerald,
                      side: 'left',
                      top: 390,
                      delay: 375,
                    },
                  ]
                : [
                    {
                      badge: 'JANELA ATIVA',
                      value: 'IQ Score 75',
                      sub: 'Clima 24°C + 12 filmes Cinemark',
                      accent: PALETTE.goldBright,
                      side: 'right',
                      top: 380,
                      delay: 64,
                    },
                  ]
            }
            widthPx={1040}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="DINHEIRO NA MESA"
        value="R$ 3.315 / h"
        accent={PALETTE.emerald}
        delay={24}
        style={{ position: 'absolute', left: 48, top: 390 }}
      />
      <FloatingTelemetryPill
        kicker="MAPA ESPACIAL"
        value="38.800 m² • 3D"
        accent={PALETTE.cyan}
        delay={42}
        style={{ position: 'absolute', right: 48, top: 470 }}
      />
    </AbsoluteFill>
  );
};

/** Cena 5 — Crowd-Drop: Onda dourada GLSL + Telão Real 30% OFF */
const Scene5CrowdDrop: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.55} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_mkt/m05_crowddrop.wav')} volume={1} />
      </Sequence>

      <CapimMall3D
        cameraMode="crowddrop-aerial"
        localFrame={frame}
        showCrowdDropWave
        flowMood="gold"
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(90deg, rgba(6,7,11,0.82) 0%, rgba(6,7,11,0.34) 50%, rgba(6,7,11,0.58) 100%)',
        }}
      />
      <BrandWatermark />

      <div
        style={{
          position: 'absolute',
          left: 60,
          top: 170,
          width: 660,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <TopKeynotePill label="INOVAÇÃO EXCLUSIVA • CROWD-DROP" color={PALETTE.goldBright} />
        <KineticPillHeadline
          words={['Juntou', 'gente', 'na', 'porta?', '30% OFF', 'automático.']}
          pillWord="30% OFF"
          pillColor={PALETTE.gold}
          align="left"
          startFrame={8}
          fontSize={56}
        />
        <p style={{ fontFamily: FONTS.sans, fontSize: 22, color: '#CBD5E1', lineHeight: 1.45, margin: 0 }}>
          Quanto mais pessoas param juntas na vitrine, maior o desconto coletivo desbloqueado no QR do telão por 15 minutos.
        </p>
      </div>

      <div style={{ position: 'absolute', right: 54, top: 185 }}>
        <MacBook3DStage
          capturePath="captures/ui_02_crowddrop.png"
          rotateY={-10}
          rotateX={3}
          zoomFrom={1.02}
          zoomTo={1.16}
          zoomStartFrame={24}
          zoomEndFrame={210}
          focusX={52}
          focusY={42}
          cursorWaypoints={[
            { frame: 32, x: 48, y: 70 },
            { frame: 130, x: 69, y: 61, click: true },
          ]}
          explosionCards={[
            {
              badge: 'GATILHO COLETIVO',
              value: '30% OFF NO TELÃO',
              sub: 'Ativado por 5+ pessoas na vitrine',
              accent: PALETTE.goldBright,
              side: 'left',
              top: 400,
              delay: 52,
            },
          ]}
          widthPx={900}
        />
      </div>

      <SubtitlePill
        badge="PRECIFICAÇÃO COLETIVA"
        caption="Transforme aglomeração na vitrine em corrida imediata para o caixa."
      />
    </AbsoluteFill>
  );
};

/** Cena 6 — Sensor Webcam LGPD Zero-PII -> Raio-X Multimodal Gemini Vision */
const Scene6RaioXLGPD: React.FC = () => {
  const frame = useCurrentFrame();
  const showRaiox = frame >= 270;

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_mkt/m06_raiox_lgpd.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="showcase-vitrine" localFrame={frame} showScanner flowMood="live" />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(6,7,11,0.82) 0%, rgba(6,7,11,0.38) 48%, rgba(6,7,11,0.86) 100%)',
        }}
      />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill
          label={showRaiox ? 'RAIO-X MULTIMODAL • GEMINI VISION' : 'EDGE COMPUTER VISION • 100% LGPD'}
          color={showRaiox ? PALETTE.goldBright : PALETTE.cyan}
        />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            key={showRaiox ? 'raiox' : 'sensor'}
            words={
              showRaiox
                ? ['Raio-X', 'detecta', '3 DEFEITOS', 'em', 'segundos.']
                : ['Webcam', 'comum.', 'ZERO', 'rostos', 'gravados.']
            }
            pillWord={showRaiox ? '3 DEFEITOS' : 'ZERO'}
            pillColor={showRaiox ? PALETTE.gold : PALETTE.emerald}
            startFrame={0}
            fontSize={52}
          />
        </div>
        <div style={{ marginTop: 22 }}>
          <MacBook3DStage
            capturePath="captures/ui_05_sensor_lgpd.png"
            secondaryCapturePath="captures/ui_11_raiox.png"
            switchAtFrame={270}
            rotateY={5}
            zoomFrom={1}
            zoomTo={1.18}
            zoomStartFrame={showRaiox ? 285 : 32}
            zoomEndFrame={showRaiox ? 480 : 210}
            focusX={52}
            focusY={52}
            cursorWaypoints={[
              { frame: 24, x: 38, y: 50 },
              { frame: 180, x: 82, y: 71, click: true },
            ]}
            explosionCards={
              showRaiox
                ? [
                    {
                      badge: 'DIAGNÓSTICO IA',
                      value: 'Nota 42 / 100',
                      sub: 'Frame descartado da RAM após leitura',
                      accent: PALETTE.goldBright,
                      side: 'right',
                      top: 380,
                      delay: 286,
                    },
                  ]
                : []
            }
            widthPx={1010}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="LATÊNCIA NA BORDA"
        value="< 5 ms em RAM"
        accent={PALETTE.cyan}
        delay={18}
        style={{ position: 'absolute', left: 48, top: 410 }}
      />
      <FloatingTelemetryPill
        kicker="RAIO-X GEMINI"
        value="Auditoria + Quick Win"
        accent={PALETTE.emerald}
        delay={34}
        style={{ position: 'absolute', right: 48, top: 480 }}
      />
    </AbsoluteFill>
  );
};

/** Cena 7 — Balcão Voz 4s + Concierge QR no iPhone 3D Titanium (Dynamic Island segura) */
const Scene7BalcaoAndQR: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_mkt/m07_balcao_qr.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.emerald} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill label="BALCÃO VOZ 4S • CONCIERGE QR SEM CPF" color={PALETTE.emerald} />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            words={['Venda', 'perdida', 'em', '4s.', 'Cupom', 'no', 'QR', 'sem', 'app.']}
            pillWord="4s"
            pillColor={PALETTE.gold}
            startFrame={4}
            fontSize={50}
          />
        </div>

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 44,
            width: '100%',
            padding: '0 70px',
          }}
        >
          <MacBook3DStage
            capturePath="captures/ui_06_balcao_voz.png"
            rotateY={7}
            zoomFrom={1}
            zoomTo={1.18}
            zoomStartFrame={24}
            zoomEndFrame={210}
            focusX={40}
            focusY={34}
            cursorWaypoints={[
              { frame: 28, x: 55, y: 45 },
              { frame: 130, x: 31, y: 31, click: true },
            ]}
            explosionCards={[
              {
                badge: 'MODO BALCÃO',
                value: 'Voz 4s + Offline',
                sub: 'Motivo real gravado antes do cliente sair',
                accent: PALETTE.emerald,
                side: 'left',
                top: 390,
                delay: 64,
              },
            ]}
            widthPx={980}
          />
          <IPhone3DStage capturePath="captures/ui_09_concierge_mobile.png" rotateY={-11} widthPx={310} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Cena 8 — Clímax Leque 3D + Lockup Apple-Style vivo até o frame final */
const Scene8CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame: Math.max(0, frame - 64), fps, config: { damping: 18, stiffness: 120 } });
  const ctaPulse = 1 + 0.025 * Math.sin(frame / 18);

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.55} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_mkt/m08_cta.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="outro" localFrame={frame} showCrowdDropWave flowMood="gold" />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(8,9,13,0.45) 0%, rgba(6,7,11,0.92) 86%)',
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 34,
          padding: '0 80px',
        }}
      >
        <CardFan3D
          cards={[
            {
              badge: 'ATRAÇÃO DE VITRINE',
              metric: '100%',
              title: 'Edge LGPD + Raio-X IA',
              desc: 'Webcam sem gravação + auditoria instantânea da vitrine.',
              accent: PALETTE.cyan,
            },
            {
              badge: 'CONVERSÃO COLETIVA',
              metric: '30% OFF',
              title: 'Crowd-Drop & Concierge QR',
              desc: 'Transforma passantes em compradores sem baixar app.',
              accent: PALETTE.goldBright,
            },
            {
              badge: 'OPERACIONAL NO BALCÃO',
              metric: '4s Voz',
              title: 'Motivo Real + Fila Offline',
              desc: 'Nunca mais perca o porquê da venda não fechada.',
              accent: PALETTE.emerald,
            },
          ]}
        />

        <div
          style={{
            opacity: interpolate(logoS, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(logoS, [0, 1], [26, 0])}px)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #F5C76B 0%, #D97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONTS.display,
                fontWeight: 800,
                fontSize: 38,
                color: '#08090D',
                boxShadow: '0 14px 40px rgba(226,168,59,0.55)',
              }}
            >
              V
            </div>
            <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 68, color: '#FFF', letterSpacing: '-0.03em' }}>
              Vitrine<span style={{ color: PALETTE.goldBright }}>IQ</span>
            </span>
          </div>

          <div
            style={{
              padding: '12px 32px',
              borderRadius: 16,
              transform: `scale(${ctaPulse})`,
              background: 'linear-gradient(135deg, #E2A83B 0%, #FDE68A 100%)',
              color: '#08090D',
              fontFamily: FONTS.mono,
              fontSize: 22,
              fontWeight: 700,
              boxShadow: '0 14px 40px rgba(226,168,59,0.45)',
            }}
          >
            vitrineiq-capim-dourado.vercel.app ↗
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const MarketingVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio
        src={staticFile('sfx/music_studio_124bpm.wav')}
        volume={(f) =>
          computeMusicDuckVolume(f, MKT_DURATIONS, MKT_TRANSITION, MKT_TOTAL_FRAMES)
        }
      />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m01_hook}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'bank-left' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m02_dor}>
          <Scene2Contrast />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'forward' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m03_revelacao}>
          <Scene3Revelacao />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'bank-right' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m04_cockpit_3d}>
          <Scene4CockpitAnd3D />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'bank-left' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m05_crowddrop}>
          <Scene5CrowdDrop />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'forward' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m06_raiox_lgpd}>
          <Scene6RaioXLGPD />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'bank-right' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m07_balcao_qr}>
          <Scene7BalcaoAndQR />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'forward' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m08_cta}>
          <Scene8CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
