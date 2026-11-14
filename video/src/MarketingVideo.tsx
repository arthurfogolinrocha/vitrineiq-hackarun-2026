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
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
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
const framesOf = (id: string, fallback: number, pad = 64) =>
  (TIMINGS.find((t) => t.id === id)?.frames ?? fallback) + pad;

export const MKT_SCENES = {
  m01_hook: framesOf('m01_hook', 301, 56),
  m02_dor: framesOf('m02_dor', 372, 56),
  m03_revelacao: framesOf('m03_revelacao', 412, 60),
  m04_cockpit_3d: framesOf('m04_cockpit_3d', 448, 70),
  m05_crowddrop: framesOf('m05_crowddrop', 440, 68),
  m06_raiox_lgpd: framesOf('m06_raiox_lgpd', 420, 64),
  m07_balcao_qr: framesOf('m07_balcao_qr', 420, 68),
  m08_cta: framesOf('m08_cta', 390, 96),
};

export const MKT_TRANSITION = 14;
export const MKT_TOTAL_FRAMES =
  Object.values(MKT_SCENES).reduce((acc, v) => acc + v, 0) - 7 * MKT_TRANSITION;

/** Cena 1 — Cold Open Pattern Interrupt (0–3s prende imediatamente) */
const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const passers = Math.round(
    interpolate(frame, [2, 68], [0, 123], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const flashOp = interpolate(frame, [0, 12, 32], [0.55, 0.14, 0], { extrapolateRight: 'clamp' });
  const punchScale = spring({ frame: Math.max(0, frame - 42), fps, config: { damping: 14, stiffness: 190 } });

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.85} />
      <Sequence from={40}>
        <Audio src={staticFile('sfx/whip.wav')} volume={0.62} />
      </Sequence>
      <Sequence from={14}>
        <Audio src={staticFile('audio_mkt/m01_hook.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="cold-open-dive" localFrame={frame} flowMood="loss" />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(244,63,94,0.16) 0%, rgba(6,7,11,0.78) 62%, rgba(6,7,11,0.95) 100%)',
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
              fontSize: 158,
              lineHeight: 0.9,
              letterSpacing: '-0.055em',
              color: PALETTE.rose,
              textShadow: '0 0 60px rgba(244,63,94,0.55)',
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
            startFrame={42}
            fontSize={62}
          />
        </div>
      </AbsoluteFill>

      <SubtitlePill
        badge="R$ 3.186 / HORA"
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
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.6} />
      <Sequence from={12}>
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
          words={['No', 'site', 'você', 'mede', 'tudo.', 'Na', 'loja,', 'opera', 'no', 'ESCURO.']}
          pillWord="ESCURO"
          pillColor={PALETTE.rose}
          startFrame={4}
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
                  transform: `translateY(${ty}px) perspective(1200px) rotateY(${idx === 0 ? 4 : -4}deg)`,
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

/** Cena 3 — A Virada Apple-Style: Gêmeo Digital 3D do Capim Dourado acende */
const Scene3Revelacao: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.8} />
      <Sequence from={70}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.55} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_mkt/m03_revelacao.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="reveal-dolly" localFrame={frame} flowMood="live" />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 46%, rgba(8,9,13,0.18) 0%, rgba(8,9,13,0.88) 82%)',
        }}
      />
      <BrandWatermark />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 22, padding: '0 80px' }}>
        <div
          style={{
            padding: '10px 26px',
            borderRadius: 999,
            background: 'rgba(8,9,13,0.88)',
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
          startFrame={16}
          fontSize={68}
        />
      </AbsoluteFill>

      <SubtitlePill
        badge="TEMPO REAL"
        caption="Cada corredor, vitrine e balcão medido ao vivo no Capim Dourado."
      />
    </AbsoluteFill>
  );
};

/** Cena 4 — MacBook 3D Real UI: Painel Executivo + Horário de Pico + Shopping 3D Real */
const Scene4CockpitAnd3D: React.FC = () => {
  const frame = useCurrentFrame();
  const showMap = frame >= 245;

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/switch.wav')} volume={0.65} />
      <Sequence from={92}>
        <Audio src={staticFile('sfx/mouse-click.wav')} volume={0.75} />
      </Sequence>
      <Sequence from={242}>
        <Audio src={staticFile('sfx/whip.wav')} volume={0.65} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_mkt/m04_cockpit_3d.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.gold} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 28 }}>
        <TopKeynotePill label={showMap ? 'GÊMEO DIGITAL 3D • PISOS L1 & L2' : 'PAINEL EXECUTIVO & CLIMA'} />
        <div style={{ marginTop: 12 }}>
          <KineticPillHeadline
            words={
              showMap
                ? ['Explore', 'os', '2', 'PISOS', 'em', '3D', 'ao', 'vivo.']
                : ['IQ', 'Score,', 'clima', 'e', 'PICO', 'por', 'hora.']
            }
            pillWord={showMap ? 'PISOS' : 'PICO'}
            startFrame={4}
            fontSize={48}
          />
        </div>

        <div style={{ marginTop: 26, position: 'relative' }}>
          <MacBook3DStage
            capturePath="captures/ui_01_cockpit.png"
            secondaryCapturePath="captures/ui_04_map3d_l2.png"
            switchAtFrame={245}
            rotateY={showMap ? 5 : -5}
            zoomFrom={1}
            zoomTo={showMap ? 1.2 : 1.32}
            zoomStartFrame={showMap ? 255 : 40}
            zoomEndFrame={showMap ? 380 : 175}
            focusX={showMap ? 48 : 58}
            focusY={showMap ? 58 : 34}
            cursorWaypoints={[
              { frame: 10, x: 20, y: 20 },
              { frame: 92, x: 30, y: 44, click: true },
              { frame: 235, x: 11, y: 31, click: true },
            ]}
            widthPx={980}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="IQ SCORE ATIVO"
        value="74 / 100"
        accent={PALETTE.gold}
        delay={18}
        style={{ position: 'absolute', left: 54, top: 380 }}
      />
      <FloatingTelemetryPill
        kicker="DINHEIRO NA MESA"
        value="R$ 3.186 / h"
        accent={PALETTE.emerald}
        delay={32}
        style={{ position: 'absolute', right: 54, top: 470 }}
      />
    </AbsoluteFill>
  );
};

/** Cena 5 — Crowd-Drop: Onda dourada GLSL + Telão Real 30% OFF */
const Scene5CrowdDrop: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.85} />
      <Sequence from={115}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.7} />
      </Sequence>
      <Sequence from={10}>
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
            'linear-gradient(90deg, rgba(6,7,11,0.92) 0%, rgba(6,7,11,0.55) 50%, rgba(6,7,11,0.78) 100%)',
        }}
      />
      <BrandWatermark />

      <div
        style={{
          position: 'absolute',
          left: 64,
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

      <div style={{ position: 'absolute', right: 56, top: 195 }}>
        <MacBook3DStage
          capturePath="captures/ui_02_crowddrop.png"
          rotateY={-10}
          rotateX={3}
          zoomFrom={1.04}
          zoomTo={1.2}
          zoomStartFrame={20}
          zoomEndFrame={180}
          focusX={52}
          focusY={42}
          cursorWaypoints={[
            { frame: 30, x: 48, y: 70 },
            { frame: 115, x: 69, y: 61, click: true },
          ]}
          widthPx={860}
        />
      </div>

      <SubtitlePill
        badge="PRECIFICAÇÃO COLETIVA"
        caption="Transforme aglomeração na vitrine em corrida imediata para o caixa."
      />
    </AbsoluteFill>
  );
};

/** Cena 6 — Raio-X Gemini + Sensor Webcam LGPD Zero-PII */
const Scene6RaioXLGPD: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/shutter-modern.wav')} volume={0.7} />
      <Sequence from={10}>
        <Audio src={staticFile('audio_mkt/m06_raiox_lgpd.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="showcase-vitrine" localFrame={frame} showScanner flowMood="live" />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(6,7,11,0.88) 0%, rgba(6,7,11,0.52) 48%, rgba(6,7,11,0.92) 100%)',
        }}
      />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 28 }}>
        <TopKeynotePill label="EDGE COMPUTER VISION • 100% LGPD" color={PALETTE.cyan} />
        <div style={{ marginTop: 12 }}>
          <KineticPillHeadline
            words={['Webcam', 'comum.', 'ZERO', 'rostos', 'gravados.']}
            pillWord="ZERO"
            pillColor={PALETTE.emerald}
            startFrame={4}
            fontSize={52}
          />
        </div>
        <div style={{ marginTop: 24 }}>
          <MacBook3DStage
            capturePath="captures/ui_05_sensor_lgpd.png"
            rotateY={5}
            zoomFrom={1}
            zoomTo={1.24}
            zoomStartFrame={28}
            zoomEndFrame={165}
            focusX={48}
            focusY={50}
            cursorWaypoints={[
              { frame: 20, x: 38, y: 50 },
              { frame: 130, x: 82, y: 78, click: true },
            ]}
            widthPx={940}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="LATÊNCIA NA BORDA"
        value="< 5 ms em RAM"
        accent={PALETTE.cyan}
        delay={18}
        style={{ position: 'absolute', left: 54, top: 410 }}
      />
      <FloatingTelemetryPill
        kicker="RAIO-X GEMINI"
        value="Auditoria em 3s"
        accent={PALETTE.emerald}
        delay={34}
        style={{ position: 'absolute', right: 54, top: 480 }}
      />
    </AbsoluteFill>
  );
};

/** Cena 7 — Balcão Voz 4s + Concierge QR no iPhone 3D Titanium */
const Scene7BalcaoAndQR: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/page-turn.wav')} volume={0.65} />
      <Sequence from={110}>
        <Audio src={staticFile('sfx/mouse-click.wav')} volume={0.75} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_mkt/m07_balcao_qr.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.emerald} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 28 }}>
        <TopKeynotePill label="BALCÃO VOZ 4S • CONCIERGE QR SEM CPF" color={PALETTE.emerald} />
        <div style={{ marginTop: 12 }}>
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
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 48,
            width: '100%',
            padding: '0 80px',
          }}
        >
          <MacBook3DStage
            capturePath="captures/ui_06_balcao_voz.png"
            rotateY={7}
            zoomFrom={1}
            zoomTo={1.24}
            zoomStartFrame={20}
            zoomEndFrame={150}
            focusX={40}
            focusY={34}
            cursorWaypoints={[
              { frame: 20, x: 55, y: 45 },
              { frame: 110, x: 31, y: 31, click: true },
            ]}
            widthPx={940}
          />
          <IPhone3DStage capturePath="captures/ui_09_concierge_mobile.png" rotateY={-11} widthPx={310} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Cena 8 — Clímax Leque 3D + Lockup Apple-Style */
const Scene8CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame: Math.max(0, frame - 90), fps, config: { damping: 18, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.85} />
      <Sequence from={92}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.7} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_mkt/m08_cta.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="outro" localFrame={frame} showCrowdDropWave flowMood="gold" />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(8,9,13,0.68) 0%, rgba(6,7,11,0.95) 85%)',
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
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      {/* Trilha studio 124 BPM com ducking dinâmico sobre cada corte */}
      <Audio
        src={staticFile('sfx/music_studio_124bpm.wav')}
        volume={(f) => {
          const fadeOut = interpolate(f, [MKT_TOTAL_FRAMES - 100, MKT_TOTAL_FRAMES], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          // Mais forte nos primeiros 2.5s (hook) e depois acomoda limpo sob a voz
          const base = f < 140 ? 0.32 : 0.16;
          return base * fadeOut;
        }}
      />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m01_hook}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m02_dor}>
          <Scene2Contrast />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m03_revelacao}>
          <Scene3Revelacao />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m04_cockpit_3d}>
          <Scene4CockpitAnd3D />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m05_crowddrop}>
          <Scene5CrowdDrop />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m06_raiox_lgpd}>
          <Scene6RaioXLGPD />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m07_balcao_qr}>
          <Scene7BalcaoAndQR />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: MKT_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={MKT_SCENES.m08_cta}>
          <Scene8CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
