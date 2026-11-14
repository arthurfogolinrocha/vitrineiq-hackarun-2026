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
import timingsRaw from './timingsPitch.json';

interface TimingItem {
  id: string;
  durationSec: number;
  frames: number;
}

const TIMINGS = timingsRaw as TimingItem[];
const framesOf = (id: string, fallback: number, pad = 34) =>
  (TIMINGS.find((t) => t.id === id)?.frames ?? fallback) + pad;

export const PITCH_SCENES = {
  p01_dor: framesOf('p01_dor', 689, 34),
  p02_cockpit: framesOf('p02_cockpit', 844, 34),
  p03_map3d: framesOf('p03_map3d', 767, 34),
  p04_visao_crowddrop: framesOf('p04_visao_crowddrop', 806, 34),
  p05_balcao_concierge: framesOf('p05_balcao_concierge', 854, 34),
  p06_stories_multitenant: framesOf('p06_stories_multitenant', 662, 34),
  p07_engenharia: framesOf('p07_engenharia', 1161, 34),
  p08_fechamento: framesOf('p08_fechamento', 965, 52),
};

export const PITCH_TRANSITION = 14;
const PITCH_DURATIONS = [
  PITCH_SCENES.p01_dor,
  PITCH_SCENES.p02_cockpit,
  PITCH_SCENES.p03_map3d,
  PITCH_SCENES.p04_visao_crowddrop,
  PITCH_SCENES.p05_balcao_concierge,
  PITCH_SCENES.p06_stories_multitenant,
  PITCH_SCENES.p07_engenharia,
  PITCH_SCENES.p08_fechamento,
];
export const PITCH_TOTAL_FRAMES =
  PITCH_DURATIONS.reduce((acc, v) => acc + v, 0) - 7 * PITCH_TRANSITION;

function computePitchDuckVolume(f: number): number {
  let cursor = 0;
  let speechActive = 0;
  for (const dur of PITCH_DURATIONS) {
    const voiceStart = cursor + 22;
    const voiceEnd = cursor + dur - 14;
    const rampIn = interpolate(f, [voiceStart - 10, voiceStart + 4], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const rampOut = interpolate(f, [voiceEnd - 6, voiceEnd + 10], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    speechActive = Math.max(speechActive, Math.min(rampIn, rampOut));
    cursor += dur - PITCH_TRANSITION;
  }
  const bed = interpolate(speechActive, [0, 1], [0.21, 0.08]);
  const fadeOut = interpolate(f, [PITCH_TOTAL_FRAMES - 72, PITCH_TOTAL_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return bed * fadeOut;
}

/** Bloco 1 — Abertura: 4 Perguntas Sem Resposta + Corredor 3D iluminado em modo dor */
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
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.55} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_pitch/p01_dor.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="cold-open-dive" localFrame={frame} flowMood="loss" />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(8,9,13,0.48) 0%, rgba(6,7,11,0.92) 86%)',
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
                  background: 'rgba(13,16,24,0.90)',
                  border: q.active ? `1.5px solid ${PALETTE.gold}` : '1px solid rgba(255,255,255,0.12)',
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

/** Bloco 2 — 01 • Painel do Lojista: IQ Score, Horário de Pico 10h-22h, Clima & Cartaz Stories 9:16 */
const Pitch2Cockpit: React.FC = () => {
  const frame = useCurrentFrame();
  const showCartaz = frame >= 430;

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_pitch/p02_cockpit.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.gold} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill
          label={showCartaz ? '01 / 06 • CARTAZ STORIES 9:16 + QR EM 1 CLIQUE' : '01 / 06 • PAINEL EXECUTIVO + AGENTE IA'}
          color={PALETTE.gold}
        />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            key={showCartaz ? 'cartaz' : 'cockpit'}
            words={
              showCartaz
                ? ['Campanhas', 'e', 'CARTAZ 9:16', 'com', 'QR', 'pronto', 'em', '1', 'clique.']
                : ['IQ', 'Score', 'e', 'funil', 'completo', 'EM TEMPO REAL.']
            }
            pillWord={showCartaz ? 'CARTAZ 9:16' : 'EM TEMPO REAL'}
            startFrame={0}
            fontSize={48}
          />
        </div>
        <div style={{ marginTop: 22 }}>
          <MacBook3DStage
            capturePath="captures/ui_01_cockpit.png"
            secondaryCapturePath="captures/ui_13_cartaz916.png"
            switchAtFrame={430}
            rotateY={-5}
            zoomFrom={1}
            zoomTo={1.18}
            zoomStartFrame={showCartaz ? 445 : 40}
            zoomEndFrame={showCartaz ? 720 : 280}
            focusX={showCartaz ? 46 : 54}
            focusY={showCartaz ? 50 : 34}
            cursorWaypoints={[
              { frame: 24, x: 25, y: 28 },
              { frame: 180, x: 30, y: 44, click: true },
              { frame: 415, x: 75, y: 58, click: true },
            ]}
            explosionCards={
              showCartaz
                ? [
                    {
                      badge: 'ARTE PRONTA 1080p',
                      value: 'Stories 9:16 + QR',
                      sub: 'Logo da loja + cupom rastreável automático',
                      accent: PALETTE.goldBright,
                      side: 'right',
                      top: 390,
                      delay: 448,
                    },
                  ]
                : []
            }
            widthPx={1030}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="CLIMA & EVENTOS"
        value="Palmas 24°C + Cinemark"
        accent={PALETTE.gold}
        delay={18}
        style={{ position: 'absolute', left: 48, top: 380 }}
      />
      <FloatingTelemetryPill
        kicker="HORÁRIO DE PICO"
        value="10h às 22h Ao Vivo"
        accent={PALETTE.emerald}
        delay={34}
        style={{ position: 'absolute', right: 48, top: 470 }}
      />
    </AbsoluteFill>
  );
};

/** Bloco 3 — 02 • Shopping 3D L1, 2º Piso L2, Subsolo 356 Vagas, Street View & Alianças */
const Pitch3Map3D: React.FC = () => {
  const frame = useCurrentFrame();
  const stage = frame >= 500 ? 'subsolo' : frame >= 245 ? 'l2' : 'l1';
  const primaryCapture =
    stage === 'subsolo' ? 'captures/ui_04b_map3d_subsolo.png' : 'captures/ui_03_map3d_l1.png';

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_pitch/p03_map3d.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="tour-l1-to-l2" localFrame={frame} flowMood="live" />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(90deg, rgba(6,7,11,0.82) 0%, rgba(6,7,11,0.34) 48%, rgba(6,7,11,0.68) 100%)',
        }}
      />
      <BrandWatermark />

      <div style={{ position: 'absolute', left: 56, top: 155, width: 610, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <TopKeynotePill label="02 / 06 • GÊMEO DIGITAL 3D (38.800 m²)" color={PALETTE.cyan} />
        <KineticPillHeadline
          words={['Térreo L1,', 'Praça L2,', 'Subsolo 356', 'e', 'STREET VIEW.']}
          pillWord="STREET VIEW"
          pillColor={PALETTE.cyan}
          align="left"
          startFrame={8}
          fontSize={52}
        />
        <p style={{ fontFamily: FONTS.sans, fontSize: 20, color: '#CBD5E1', lineHeight: 1.48, margin: 0 }}>
          4 portarias, 356 vagas no Raio-X do Subsolo (SS1 + SS2), escada rolante ao 2º Piso, salas vagas e alianças entre corredores.
        </p>
      </div>

      <div style={{ position: 'absolute', right: 48, top: 175 }}>
        <MacBook3DStage
          capturePath={primaryCapture}
          secondaryCapturePath="captures/ui_04_map3d_l2.png"
          switchAtFrame={stage === 'l2' ? 245 : 9999}
          rotateY={-8}
          zoomFrom={1.02}
          zoomTo={1.16}
          zoomStartFrame={25}
          zoomEndFrame={480}
          focusX={46}
          focusY={58}
          cursorWaypoints={[
            { frame: 40, x: 46, y: 36 },
            { frame: 240, x: 54, y: 35, click: true },
            { frame: 492, x: 64, y: 35, click: true },
          ]}
          explosionCards={
            stage === 'subsolo'
              ? [
                  {
                    badge: 'RAIO-X SUBSOLO',
                    value: '356 Vagas SS1/SS2',
                    sub: 'Esteiras até Super Big & Morofit',
                    accent: PALETTE.emerald,
                    side: 'left',
                    top: 390,
                    delay: 508,
                  },
                ]
              : []
          }
          widthPx={900}
        />
      </div>

      <SubtitlePill
        badge={
          stage === 'subsolo'
            ? 'SUBSOLO • 356 VAGAS'
            : stage === 'l2'
              ? '2º PISO • PRAÇA L2'
              : 'TÉRREO L1 • ÂNCORAS'
        }
        accent={stage === 'subsolo' ? PALETTE.emerald : PALETTE.cyan}
        caption="Visão espacial completa de rotas quentes, alas, estacionamento e salas disponíveis."
      />
    </AbsoluteFill>
  );
};

/** Bloco 4 — 03 • Sensor Webcam LGPD, Raio-X Multimodal Gemini & Crowd-Drop Coletivo */
const Pitch4VisaoAndCrowdDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const showCrowd = frame >= 390;

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} />
      <Sequence from={22}>
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
            'linear-gradient(180deg, rgba(6,7,11,0.80) 0%, rgba(6,7,11,0.36) 50%, rgba(6,7,11,0.88) 100%)',
        }}
      />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill
          label={showCrowd ? 'CROWD-DROP AO VIVO • CUPOM COLETIVO' : '03 / 06 • SENSOR LGPD & RAIO-X GEMINI'}
          color={showCrowd ? PALETTE.goldBright : PALETTE.cyan}
        />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            key={showCrowd ? 'crowd' : 'raiox'}
            words={
              showCrowd
                ? ['Fluxo', 'na', 'porta', 'dispara', 'CROWD-DROP', '30% OFF.']
                : ['Sensor', 'Zero-PII', 'e', 'RAIO-X', 'Gemini', 'na', 'vitrine.']
            }
            pillWord={showCrowd ? 'CROWD-DROP' : 'RAIO-X'}
            pillColor={showCrowd ? PALETTE.gold : PALETTE.cyan}
            startFrame={0}
            fontSize={48}
          />
        </div>
        <div style={{ marginTop: 22 }}>
          <MacBook3DStage
            capturePath="captures/ui_11_raiox.png"
            secondaryCapturePath="captures/ui_02_crowddrop.png"
            switchAtFrame={390}
            rotateY={showCrowd ? -6 : 6}
            zoomFrom={1}
            zoomTo={1.18}
            zoomStartFrame={showCrowd ? 405 : 32}
            zoomEndFrame={showCrowd ? 650 : 280}
            focusX={52}
            focusY={50}
            cursorWaypoints={[
              { frame: 110, x: 75, y: 66, click: true },
              { frame: 382, x: 69, y: 61, click: true },
            ]}
            explosionCards={
              showCrowd
                ? [
                    {
                      badge: 'CROWD-DROP AO VIVO',
                      value: '5+ Pessoas = 30%',
                      sub: 'QR gerado na vitrine por 15 minutos',
                      accent: PALETTE.goldBright,
                      side: 'left',
                      top: 390,
                      delay: 405,
                    },
                  ]
                : [
                    {
                      badge: 'RAIO-X MULTIMODAL',
                      value: '3 Defeitos + Quick Win',
                      sub: 'Imagem descartada em RAM (<5ms)',
                      accent: PALETTE.cyan,
                      side: 'right',
                      top: 390,
                      delay: 48,
                    },
                  ]
            }
            widthPx={1010}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="BORDA LGPD"
        value="Zero Vídeo Salvo"
        accent={PALETTE.emerald}
        delay={16}
        style={{ position: 'absolute', left: 48, top: 390 }}
      />
      <FloatingTelemetryPill
        kicker="GATILHO COLETIVO"
        value="5+ Pessoas = 30%"
        accent={PALETTE.goldBright}
        delay={390}
        style={{ position: 'absolute', right: 48, top: 470 }}
      />
    </AbsoluteFill>
  );
};

/** Bloco 5 — 04 & 05 • Modo Balcão (1 Toque + Voz 4s + Fila Offline) & Concierge QR */
const Pitch5BalcaoAndConcierge: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} />
      <Sequence from={22}>
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
            zoomTo={1.18}
            zoomStartFrame={24}
            zoomEndFrame={230}
            focusX={40}
            focusY={34}
            cursorWaypoints={[
              { frame: 30, x: 52, y: 50 },
              { frame: 150, x: 31, y: 31, click: true },
            ]}
            explosionCards={[
              {
                badge: 'RESILIÊNCIA OFFLINE',
                value: 'Fila Local + Voz 4s',
                sub: 'Sincroniza assim que a internet volta',
                accent: PALETTE.emerald,
                side: 'left',
                top: 390,
                delay: 54,
              },
            ]}
            widthPx={980}
          />
          <IPhone3DStage capturePath="captures/ui_09_concierge_mobile.png" rotateY={-10} widthPx={305} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Bloco 6 — Prática da Roleta Stories (US-01..US-05) + Multi-Tenant Real (Contas de Lojistas) */
const Pitch6StoriesAndMultiTenant: React.FC = () => {
  const frame = useCurrentFrame();
  const showLojistas = frame >= 340;

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_pitch/p06_stories_multitenant.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.gold} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill
          label={showLojistas ? '07 / 07 • CONTAS DE LOJISTAS MULTI-TENANT' : 'PRÁTICA DA ROLETA • STORIES (US-01..US-05)'}
          color={showLojistas ? PALETTE.cyan : PALETTE.gold}
        />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            key={showLojistas ? 'lojistas' : 'stories'}
            words={
              showLojistas
                ? ['Cada', 'lojista', 'enxerga', 'SÓ', 'a', 'própria', 'loja', 'e', 'ala.']
                : ['5', 'USER STORIES', 'conectadas', 'às', 'telas', 'reais.']
            }
            pillWord={showLojistas ? 'SÓ' : 'USER STORIES'}
            pillColor={showLojistas ? PALETTE.cyan : PALETTE.gold}
            startFrame={0}
            fontSize={50}
          />
        </div>
        <div style={{ marginTop: 22 }}>
          <MacBook3DStage
            capturePath="captures/ui_07_stories_modal.png"
            secondaryCapturePath="captures/ui_10_lojistas.png"
            switchAtFrame={340}
            rotateY={showLojistas ? 5 : -5}
            zoomFrom={1}
            zoomTo={1.16}
            zoomStartFrame={showLojistas ? 355 : 26}
            zoomEndFrame={showLojistas ? 580 : 250}
            focusX={52}
            focusY={44}
            cursorWaypoints={[
              { frame: 25, x: 32, y: 24 },
              { frame: 180, x: 70, y: 34, click: true },
              { frame: 334, x: 11, y: 56, click: true },
            ]}
            explosionCards={
              showLojistas
                ? [
                    {
                      badge: 'ISOLAMENTO POR TENANT',
                      value: 'Admin ≠ Lojista',
                      sub: 'RBAC + PBKDF2-HMAC-SHA256',
                      accent: PALETTE.cyan,
                      side: 'right',
                      top: 390,
                      delay: 356,
                    },
                  ]
                : []
            }
            widthPx={1010}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="ROLETA HACKARUN"
        value="US-01 a US-05"
        accent={PALETTE.gold}
        delay={18}
        style={{ position: 'absolute', left: 48, top: 380 }}
      />
      <FloatingTelemetryPill
        kicker="ISOLAMENTO REAL"
        value="Multi-Tenant RBAC"
        accent={PALETTE.cyan}
        delay={36}
        style={{ position: 'absolute', right: 48, top: 470 }}
      />
    </AbsoluteFill>
  );
};

/** Bloco 7 — 06 • Engenharia, Segurança, 158 Testes, Auditoria 9.8/10 & Transparência IA Artigo 6 */
const Pitch7Engenharia: React.FC = () => {
  const frame = useCurrentFrame();
  const showArt6 = frame >= 430;

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.45} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_pitch/p07_engenharia.wav')} volume={1} />
      </Sequence>
      <StudioGridBackdrop accent={PALETTE.emerald} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 26 }}>
        <TopKeynotePill
          label={showArt6 ? '06 / 06 • TRANSPARÊNCIA IA (ARTIGO 6) & SHA-256' : '06 / 06 • FASTAPI, CSP, ETAG & 158 TESTES'}
          color={PALETTE.emerald}
        />
        <div style={{ marginTop: 10 }}>
          <KineticPillHeadline
            key={showArt6 ? 'art6' : 'eng'}
            words={
              showArt6
                ? ['Artigo 6', 'LGPD,', 'SHA-256', 'e', 'Espelho', 'Python', '+', 'TS.']
                : ['158', 'testes', 'verdes.', 'Auditoria', '9.8 / 10.']
            }
            pillWord={showArt6 ? 'Artigo 6' : '9.8 / 10'}
            pillColor={PALETTE.emerald}
            startFrame={0}
            fontSize={50}
          />
        </div>
        <div style={{ marginTop: 22 }}>
          <MacBook3DStage
            capturePath="captures/ui_08_lgpd_auditoria.png"
            secondaryCapturePath="captures/ui_14_artigo6.png"
            switchAtFrame={430}
            rotateY={4}
            zoomFrom={1}
            zoomTo={1.18}
            zoomStartFrame={showArt6 ? 445 : 30}
            zoomEndFrame={showArt6 ? 860 : 320}
            focusX={52}
            focusY={50}
            explosionCards={
              showArt6
                ? [
                    {
                      badge: 'INTEGRIDADE HASH',
                      value: 'SEC-SHA256 Chain',
                      sub: 'Auditoria verificável + Artigo 6 LGPD',
                      accent: PALETTE.emerald,
                      side: 'right',
                      top: 390,
                      delay: 448,
                    },
                  ]
                : [
                    {
                      badge: 'PARIDADE VALIDADA',
                      value: '107 py + 51 TS = 158',
                      sub: 'Backend Python FastAPI + Espelho TS',
                      accent: PALETTE.cyan,
                      side: 'left',
                      top: 390,
                      delay: 46,
                    },
                  ]
            }
            widthPx={1010}
          />
        </div>
      </AbsoluteFill>

      <FloatingTelemetryPill
        kicker="TESTES VERDES"
        value="107 py + 51 TS"
        accent={PALETTE.emerald}
        delay={14}
        style={{ position: 'absolute', left: 48, top: 375 }}
      />
      <FloatingTelemetryPill
        kicker="BLINDAGEM ATIVA"
        value="CSP • ETag • SHA256"
        accent={PALETTE.cyan}
        delay={30}
        style={{ position: 'absolute', right: 48, top: 470 }}
      />
    </AbsoluteFill>
  );
};

/** Bloco 8 — Clímax ROI + Time Nido King (Arthur, Jessé, Matheus Carvalho, Leonardo) vivo até o fim */
const Pitch8Fechamento: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lockS = spring({ frame: Math.max(0, frame - 22), fps, config: { damping: 18, stiffness: 120 } });
  const ctaPulse = 1 + 0.025 * Math.sin(frame / 18);
  const team = ['Arthur Fogolin', 'Jessé', 'Matheus Carvalho (@MCPS9)', 'Leonardo Capistrano'];

  return (
    <AbsoluteFill style={{ backgroundColor: '#06070B' }}>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.55} />
      <Sequence from={22}>
        <Audio src={staticFile('audio_pitch/p08_fechamento.wav')} volume={1} />
      </Sequence>

      <CapimMall3D cameraMode="outro" localFrame={frame} showCrowdDropWave flowMood="gold" />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(8,9,13,0.48) 0%, rgba(6,7,11,0.92) 86%)',
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 30,
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
              desc: '3D L1/L2/SS, Crowd-Drop, Raio-X Gemini, Balcão Voz e QR.',
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
            transform: `scale(${ctaPulse})`,
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
          {team.map((member, idx) => {
            const mp = spring({ frame: Math.max(0, frame - 40 - idx * 6), fps, config: { damping: 16, stiffness: 140 } });
            return (
              <span
                key={member}
                style={{
                  opacity: interpolate(mp, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(mp, [0, 1], [16, 0])}px)`,
                  padding: '7px 18px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(13,16,24,0.88)',
                  fontFamily: FONTS.sans,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#E2E8F0',
                }}
              >
                {member}
              </span>
            );
          })}
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
        volume={(f) => computePitchDuckVolume(f)}
      />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p01_dor}>
          <Pitch1Dor />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'bank-left' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p02_cockpit}>
          <Pitch2Cockpit />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'forward' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p03_map3d}>
          <Pitch3Map3D />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'bank-right' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p04_visao_crowddrop}>
          <Pitch4VisaoAndCrowdDrop />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'bank-left' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p05_balcao_concierge}>
          <Pitch5BalcaoAndConcierge />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'forward' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p06_stories_multitenant}>
          <Pitch6StoriesAndMultiTenant />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'bank-right' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p07_engenharia}>
          <Pitch7Engenharia />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={perspectiveFly({ direction: 'forward' })}
          timing={linearTiming({ durationInFrames: PITCH_TRANSITION })}
        />

        <TransitionSeries.Sequence durationInFrames={PITCH_SCENES.p08_fechamento}>
          <Pitch8Fechamento />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
