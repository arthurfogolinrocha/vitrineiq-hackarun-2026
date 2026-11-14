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
import timingsRaw from './timingsPitch.json';

interface TimingItem {
  id: string;
  durationSec: number;
  frames: number;
}

const TIMINGS = timingsRaw as TimingItem[];
const framesOf = (id: string, fallback: number, pad = 54) =>
  (TIMINGS.find((t) => t.id === id)?.frames ?? fallback) + pad;

export const PITCH_SCENES = {
  p01_dor: framesOf('p01_dor', 535, 110),
  p02_cockpit: framesOf('p02_cockpit', 607, 130),
  p03_map3d: framesOf('p03_map3d', 588, 135),
  p04_visao_crowddrop: framesOf('p04_visao_crowddrop', 583, 130),
  p05_balcao_concierge: framesOf('p05_balcao_concierge', 545, 130),
  p06_stories_multitenant: framesOf('p06_stories_multitenant', 516, 125),
  p07_engenharia: framesOf('p07_engenharia', 706, 135),
  p08_fechamento: framesOf('p08_fechamento', 650, 175),
};

export const PITCH_TRANSITION = 12;
export const PITCH_TOTAL_FRAMES =
  Object.values(PITCH_SCENES).reduce((acc, v) => acc + v, 0) - 7 * PITCH_TRANSITION;

/** Bloco 1 — Abertura: 4 Perguntas Sem Resposta + Corredor 3D em modo dor */
const Pitch1Dor: React.FC = () => {
  const frame = useCurrentFrame();
  const questions = [
    { num: '01', title: 'Quantos passaram na frente?', sub: 'Fluxo cego de corredor' },
    { num: '02', title: 'Quantos pararam na vitrine?', sub: 'Atração real sem leitura', active: true },
    { num: '03', title: 'Por que desistiram?', sub: 'Preço, fila ou falta de grade' },
    { num: '04', title: 'Qual o horário de pico?', sub: 'Escala e promoções no escuro' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.85} />
      <Sequence from={10}>
        <Audio src={staticFile('audio_pitch/p01_dor.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="cold-open-dive" localFrame={frame} flowMood="loss" />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(8,9,13,0.72) 0%, rgba(6,7,11,0.95) 85%)',
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 32,
          padding: '0 85px',
        }}
      >
        <TopKeynotePill label="4 PERGUNTAS SEM RESPOSTA NO CAPIM DOURADO" color={PALETTE.rose} />
        <KineticPillHeadline
          words={['Ninguém', 'enxerga', 'o', 'que', 'acontece', 'NA PORTA']}
          pillWord="NA PORTA"
          pillColor={PALETTE.gold}
          startFrame={6}
          fontSize={62}
        />

        <div style={{ display: 'flex', gap: 20, width: '100%', maxWidth: 1460 }}>
          {questions.map((q, idx) => {
            const op = interpolate(frame, [26 + idx * 10, 44 + idx * 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={q.num}
                style={{
                  flex: 1,
                  opacity: op,
                  borderRadius: 20,
                  padding: '24px 22px',
                  background: 'rgba(13,16,24,0.9)',
                  border: q.active ? `1.5px solid ${PALETTE.gold}` : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: q.active ? '0 0 38px rgba(226,168,59,0.28)' : 'none',
                }}
              >
                <div style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: 700, color: PALETTE.gold, marginBottom: 10 }}>
                  {q.num}
                </div>
                <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, color: '#FFF', marginBottom: 8 }}>
                  {q.title}
                </div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 15, color: '#94A3B8' }}>{q.sub}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Bloco 2 — 01 • Painel do Lojista: IQ Score, Horário de Pico 10h-22h, Clima & Agente IA */
const Pitch2Cockpit: React.FC = () => {
  const frame = useCurrentFrame();
  const showChart = frame >= 240;

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.6} />
      <Sequence from={105}>
        <Audio src={staticFile('sfx/mouse-click.wav')} volume={0.75} />
      </Sequence>
      <Sequence from={240}>
        <Audio src={staticFile('sfx/page-turn.wav')} volume={0.65} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_pitch/p02_cockpit.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.gold} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill label="01 / 06 • PAINEL EXECUTIVO + AGENTE IA" color={PALETTE.gold} />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            words={
              showChart
                ? ['Pico', '10h–22h,', 'clima', '38°C', 'e', 'CAMPANHA', 'em', '1', 'clique.']
                : ['IQ', 'Score', 'e', 'funil', 'completo', 'EM TEMPO REAL.']
            }
            pillWord={showChart ? 'CAMPANHA' : 'EM TEMPO REAL'}
            startFrame={4}
            fontSize={48}
          />
        </div>
        <div style={{ marginTop: 24 }}>
          <MacBook3DStage
            capturePath="captures/ui_01_cockpit.png"
            secondaryCapturePath="captures/ui_12_cockpit_chart.png"
            switchAtFrame={240}
            rotateY={-5}
            zoomFrom={1}
            zoomTo={1.26}
            zoomStartFrame={showChart ? 260 : 40}
            zoomEndFrame={showChart ? 420 : 185}
            focusX={showChart ? 52 : 58}
            focusY={showChart ? 54 : 34}
            cursorWaypoints={[
              { frame: 18, x: 25, y: 28 },
              { frame: 105, x: 30, y: 44, click: true },
              { frame: 290, x: 75, y: 58, click: true },
            ]}
            widthPx={980}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="CLIMA & EVENTOS"
        value="38°C + Cinemark"
        accent={PALETTE.gold}
        delay={16}
        style={{ position: 'absolute', left: 52, top: 380 }}
      />
      <FloatingTelemetryPill
        kicker="EXPORTAÇÃO SOCIAL"
        value="Cartaz 9:16 + WA"
        accent={PALETTE.emerald}
        delay={32}
        style={{ position: 'absolute', right: 52, top: 470 }}
      />
    </AbsoluteFill>
  );
};

/** Bloco 3 — 02 • Shopping 3D L1/L2, Subsolo 356 vagas, Street View, Espaços Vagos & Alianças */
const Pitch3Map3D: React.FC = () => {
  const frame = useCurrentFrame();
  const showL2 = frame >= 270;

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whip.wav')} volume={0.65} />
      <Sequence from={268}>
        <Audio src={staticFile('sfx/switch.wav')} volume={0.7} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_pitch/p03_map3d.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="tour-l1-to-l2" localFrame={frame} flowMood="live" />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(90deg, rgba(6,7,11,0.9) 0%, rgba(6,7,11,0.45) 48%, rgba(6,7,11,0.82) 100%)',
        }}
      />
      <BrandWatermark />

      <div style={{ position: 'absolute', left: 60, top: 155, width: 610, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <TopKeynotePill label="02 / 06 • GÊMEO DIGITAL 3D (38.800 m²)" color={PALETTE.cyan} />
        <KineticPillHeadline
          words={['Térreo L1,', 'Praça L2,', 'Subsolo', 'e', 'STREET VIEW.']}
          pillWord="STREET VIEW"
          pillColor={PALETTE.cyan}
          align="left"
          startFrame={8}
          fontSize={52}
        />
        <p style={{ fontFamily: FONTS.sans, fontSize: 20, color: '#CBD5E1', lineHeight: 1.48, margin: 0 }}>
          4 portarias, 356 vagas em Raio-X do Subsolo, escada rolante ao 2º Piso, espaços vagos e alianças entre corredores.
        </p>
      </div>

      <div style={{ position: 'absolute', right: 50, top: 175 }}>
        <MacBook3DStage
          capturePath="captures/ui_03_map3d_l1.png"
          secondaryCapturePath="captures/ui_04_map3d_l2.png"
          switchAtFrame={270}
          rotateY={-8}
          zoomFrom={1.04}
          zoomTo={1.24}
          zoomStartFrame={25}
          zoomEndFrame={230}
          focusX={46}
          focusY={58}
          cursorWaypoints={[
            { frame: 40, x: 46, y: 36 },
            { frame: 266, x: 54, y: 35, click: true },
          ]}
          widthPx={880}
        />
      </div>

      <SubtitlePill
        badge={showL2 ? '2º PISO • PRAÇA L2' : 'TÉRREO L1 • ÂNCORAS'}
        accent={PALETTE.cyan}
        caption="Visão espacial completa de rotas quentes, alas e salas disponíveis."
      />
    </AbsoluteFill>
  );
};

/** Bloco 4 — 03 • Sensor Webcam LGPD, Raio-X Gemini & Crowd-Drop Coletivo */
const Pitch4VisaoAndCrowdDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const showCrowd = frame >= 275;

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/shutter-modern.wav')} volume={0.7} />
      <Sequence from={272}>
        <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.85} />
      </Sequence>
      <Sequence from={360}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.7} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_pitch/p04_visao_crowddrop.wav')} volume={1} />
      </Sequence>

      <CapimMall3D
        cameraMode={showCrowd ? 'crowddrop-aerial' : 'showcase-vitrine'}
        localFrame={frame}
        showScanner={!showCrowd}
        showCrowdDropWave={showCrowd}
        flowMood={showCrowd ? 'gold' : 'live'}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(6,7,11,0.88) 0%, rgba(6,7,11,0.52) 50%, rgba(6,7,11,0.92) 100%)',
        }}
      />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill
          label={showCrowd ? 'CROWD-DROP AO VIVO • CUPOM COLETIVO' : '03 / 06 • SENSOR LGPD & RAIO-X GEMINI'}
          color={showCrowd ? PALETTE.goldBright : PALETTE.cyan}
        />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            words={
              showCrowd
                ? ['Fluxo', 'na', 'porta', 'dispara', 'CROWD-DROP', '30% OFF.']
                : ['Sensor', 'Zero-PII', 'e', 'RAIO-X', 'Gemini', 'na', 'vitrine.']
            }
            pillWord={showCrowd ? 'CROWD-DROP' : 'RAIO-X'}
            pillColor={showCrowd ? PALETTE.gold : PALETTE.cyan}
            startFrame={4}
            fontSize={48}
          />
        </div>
        <div style={{ marginTop: 24 }}>
          <MacBook3DStage
            capturePath="captures/ui_05_sensor_lgpd.png"
            secondaryCapturePath="captures/ui_02_crowddrop.png"
            switchAtFrame={275}
            rotateY={showCrowd ? -6 : 6}
            zoomFrom={1}
            zoomTo={1.22}
            zoomStartFrame={showCrowd ? 285 : 30}
            zoomEndFrame={showCrowd ? 450 : 220}
            focusX={52}
            focusY={46}
            cursorWaypoints={[
              { frame: 90, x: 82, y: 78, click: true },
              { frame: 355, x: 69, y: 61, click: true },
            ]}
            widthPx={970}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="BORDA LGPD"
        value="Zero Vídeo Salvo"
        accent={PALETTE.emerald}
        delay={16}
        style={{ position: 'absolute', left: 52, top: 390 }}
      />
      <FloatingTelemetryPill
        kicker="GATILHO COLETIVO"
        value="5+ Pessoas = 30%"
        accent={PALETTE.goldBright}
        delay={280}
        style={{ position: 'absolute', right: 52, top: 470 }}
      />
    </AbsoluteFill>
  );
};

/** Bloco 5 — 04 & 05 • Modo Balcão (1 Toque + Voz 4s + Fila Offline) & Concierge QR */
const Pitch5BalcaoAndConcierge: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/page-turn.wav')} volume={0.65} />
      <Sequence from={120}>
        <Audio src={staticFile('sfx/mouse-click.wav')} volume={0.75} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_pitch/p05_balcao_concierge.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.emerald} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill label="04 & 05 • MODO BALCÃO 4S + CONCIERGE QR" color={PALETTE.emerald} />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            words={['Voz', 'em', '4s', 'com', 'FILA OFFLINE', 'e', 'QR', 'sem', 'CPF.']}
            pillWord="FILA OFFLINE"
            pillColor={PALETTE.emerald}
            startFrame={4}
            fontSize={48}
          />
        </div>
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 44,
          }}
        >
          <MacBook3DStage
            capturePath="captures/ui_06_balcao_voz.png"
            rotateY={6}
            zoomFrom={1}
            zoomTo={1.25}
            zoomStartFrame={24}
            zoomEndFrame={180}
            focusX={40}
            focusY={34}
            cursorWaypoints={[
              { frame: 30, x: 52, y: 50 },
              { frame: 120, x: 31, y: 31, click: true },
            ]}
            widthPx={940}
          />
          <IPhone3DStage capturePath="captures/ui_09_concierge_mobile.png" rotateY={-10} widthPx={305} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Bloco 6 — Prática da Roleta Stories (US-01..US-05) + Multi-Tenant Isolado */
const Pitch6StoriesAndMultiTenant: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/switch.wav')} volume={0.65} />
      <Sequence from={140}>
        <Audio src={staticFile('sfx/mouse-click.wav')} volume={0.75} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_pitch/p06_stories_multitenant.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.gold} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill label="PRÁTICA DA ROLETA + ISOLAMENTO MULTI-TENANT" color={PALETTE.gold} />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            words={['5', 'USER STORIES', 'conectadas', 'e', 'lojas', 'isoladas.']}
            pillWord="USER STORIES"
            startFrame={4}
            fontSize={50}
          />
        </div>
        <div style={{ marginTop: 24 }}>
          <MacBook3DStage
            capturePath="captures/ui_07_stories_modal.png"
            rotateY={-5}
            zoomFrom={1}
            zoomTo={1.2}
            zoomStartFrame={26}
            zoomEndFrame={210}
            focusX={52}
            focusY={44}
            cursorWaypoints={[
              { frame: 25, x: 32, y: 24 },
              { frame: 140, x: 70, y: 34, click: true },
            ]}
            widthPx={970}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="ROLETA HACKARUN"
        value="US-01 a US-05"
        accent={PALETTE.gold}
        delay={18}
        style={{ position: 'absolute', left: 52, top: 380 }}
      />
      <FloatingTelemetryPill
        kicker="CONTA DA LOJA"
        value="Admin ≠ Lojista"
        accent={PALETTE.cyan}
        delay={36}
        style={{ position: 'absolute', right: 52, top: 470 }}
      />
    </AbsoluteFill>
  );
};

/** Bloco 7 — 06 • Engenharia, Segurança, 158 Testes, Auditoria 9.8/10 & Artigo 6 */
const Pitch7Engenharia: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whip.wav')} volume={0.65} />
      <Sequence from={60}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.65} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_pitch/p07_engenharia.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.emerald} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill label="06 / 06 • SEGURANÇA, LGPD & ARTIGO 6" color={PALETTE.emerald} />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            words={['158', 'testes', 'verdes.', 'Auditoria', '9.8 / 10.']}
            pillWord="9.8 / 10"
            pillColor={PALETTE.emerald}
            startFrame={4}
            fontSize={50}
          />
        </div>
        <div style={{ marginTop: 24 }}>
          <MacBook3DStage
            capturePath="captures/ui_08_lgpd_auditoria.png"
            rotateY={4}
            zoomFrom={1}
            zoomTo={1.22}
            zoomStartFrame={24}
            zoomEndFrame={210}
            focusX={54}
            focusY={45}
            widthPx={970}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="TESTES VERDES"
        value="107 py + 51 TS"
        accent={PALETTE.emerald}
        delay={14}
        style={{ position: 'absolute', left: 52, top: 375 }}
      />
      <FloatingTelemetryPill
        kicker="BLINDAGEM ATIVA"
        value="CSP • ETag • SHA256"
        accent={PALETTE.cyan}
        delay={30}
        style={{ position: 'absolute', right: 52, top: 470 }}
      />
    </AbsoluteFill>
  );
};

/** Bloco 8 — Clímax ROI + Time Nido King (Arthur, Jessé, Matheus Carvalho, Leonardo) */
const Pitch8Fechamento: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lockS = spring({ frame: Math.max(0, frame - 24), fps, config: { damping: 18, stiffness: 120 } });
  const team = ['Arthur Fogolin', 'Jessé', 'Matheus Carvalho (@MCPS9)', 'Leonardo Capistrano'];

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.85} />
      <Sequence from={30}>
        <Audio src={staticFile('sfx/ding.wav')} volume={0.7} />
      </Sequence>
      <Sequence from={10}>
        <Audio src={staticFile('audio_pitch/p08_fechamento.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="outro" localFrame={frame} showCrowdDropWave flowMood="gold" />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(8,9,13,0.72) 0%, rgba(6,7,11,0.96) 86%)',
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 32,
          padding: '0 80px',
        }}
      >
        <TopKeynotePill label="1º HACKARUN UNICATÓLICA 2026 • TIME NIDO KING" color={PALETTE.gold} />

        <div
          style={{
            opacity: interpolate(lockS, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(lockS, [0, 1], [28, 0])}px)`,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #F5C76B 0%, #D97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONTS.display,
              fontWeight: 800,
              fontSize: 44,
              color: '#08090D',
              boxShadow: '0 14px 42px rgba(226,168,59,0.55)',
            }}
          >
            V
          </div>
          <span style={{ fontFamily: FONTS.display, fontWeight: 800, fontSize: 78, color: '#FFF', letterSpacing: '-0.03em' }}>
            Vitrine<span style={{ color: PALETTE.goldBright }}>IQ</span>
          </span>
        </div>

        <CardFan3D
          cards={[
            {
              badge: 'PRODUÇÃO VERIFICADA',
              metric: '9.8 / 10',
              title: 'Auditoria Completa',
              desc: '158 testes + Smoke E2E & WCAG em produção Vercel.',
              accent: PALETTE.emerald,
            },
            {
              badge: 'CAPIM DOURADO',
              metric: '188 Lojas',
              title: 'Do Corredor ao Caixa',
              desc: '3D L1/L2, Crowd-Drop, Raio-X Gemini, Balcão Voz e QR.',
              accent: PALETTE.goldBright,
            },
            {
              badge: 'CONFORMIDADE TOTAL',
              metric: 'Zero PII',
              title: 'LGPD & Artigo 6',
              desc: 'Processamento local em RAM, HMAC-SHA256 e CSP.',
              accent: PALETTE.cyan,
            },
          ]}
        />

        <div
          style={{
            padding: '12px 30px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #E2A83B 0%, #FDE68A 100%)',
            color: '#08090D',
            fontFamily: FONTS.mono,
            fontSize: 22,
            fontWeight: 700,
            boxShadow: '0 14px 36px rgba(226,168,59,0.45)',
          }}
        >
          vitrineiq-capim-dourado.vercel.app ↗
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {team.map((member) => (
            <span
              key={member}
              style={{
                padding: '7px 18px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(13,16,24,0.85)',
                fontFamily: FONTS.sans,
                fontSize: 15,
                fontWeight: 600,
                color: '#E2E8F0',
              }}
            >
              {member}
            </span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const PitchVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio
        src={staticFile('sfx/music_studio_124bpm.wav')}
        volume={(f) => {
          const fadeOut = interpolate(f, [PITCH_TOTAL_FRAMES - 110, PITCH_TOTAL_FRAMES], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (f < 120 ? 0.24 : 0.14) * fadeOut;
        }}
      />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p01_dor}>
          <Pitch1Dor />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p02_cockpit}>
          <Pitch2Cockpit />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p03_map3d}>
          <Pitch3Map3D />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p04_visao_crowddrop}>
          <Pitch4VisaoAndCrowdDrop />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p05_balcao_concierge}>
          <Pitch5BalcaoAndConcierge />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p06_stories_multitenant}>
          <Pitch6StoriesAndMultiTenant />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p07_engenharia}>
          <Pitch7Engenharia />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p08_fechamento}>
          <Pitch8Fechamento />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

