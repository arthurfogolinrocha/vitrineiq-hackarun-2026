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
import {
  BrandWatermark,
  GlassCard3D,
  KineticHeadline,
  SubtitlePill,
} from './components/UiOverlays';
import { FONTS, PALETTE } from './designSystem';

export interface AudioTimingEntry {
  id: string;
  durationSec: number;
  frames: number;
}

// Durações base derivadas de src/audioTimings.json (fallback seguro caso importado antes da geração)
import timingsRaw from './audioTimings.json';
const TIMINGS: AudioTimingEntry[] = timingsRaw as AudioTimingEntry[];

const getFrames = (id: string, fallback: number) =>
  (TIMINGS.find((t) => t.id === id)?.frames ?? fallback) + 42;

export const SCENE_DURATIONS = {
  hook: getFrames('01_hook', 354),
  dor: getFrames('02_dor', 352),
  revelacao: getFrames('03_revelacao', 421),
  raiox: getFrames('04_raiox_lgpd', 427),
  crowddrop: getFrames('05_crowddrop', 399),
  concierge: getFrames('06_concierge_balcao', 391),
  cta: getFrames('07_cta', 460) + 50,
};

export const TRANSITION_FRAMES = 14;
export const TOTAL_DURATION_FRAMES =
  SCENE_DURATIONS.hook +
  SCENE_DURATIONS.dor +
  SCENE_DURATIONS.revelacao +
  SCENE_DURATIONS.raiox +
  SCENE_DURATIONS.crowddrop +
  SCENE_DURATIONS.concierge +
  SCENE_DURATIONS.cta -
  6 * TRANSITION_FRAMES;

const BackdropGlow: React.FC<{ color?: string }> = ({ color = PALETTE.gold }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 50% 42%, ${color}22 0%, rgba(8,9,13,0.92) 56%, #08090D 100%)`,
      pointerEvents: 'none',
    }}
  />
);

const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.round(
    interpolate(frame, [8, 95], [0, 188], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const pulseOpacity = 0.45 + 0.35 * Math.sin((frame / fps) * 3.5);

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.obsidian }}>
      <Sequence from={10}>
        <Audio src={staticFile('audio/01_hook.wav')} volume={1} />
      </Sequence>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.7} />

      <BackdropGlow color={PALETTE.gold} />

      {/* Grid minimalista Obsidian no fundo */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          opacity: 0.65,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 100px',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 16,
            letterSpacing: '0.26em',
            color: PALETTE.gold,
            border: `1px solid ${PALETTE.gold}55`,
            background: `${PALETTE.gold}14`,
            padding: '8px 20px',
            borderRadius: 999,
            opacity: pulseOpacity,
          }}
        >
          CAPIM DOURADO SHOPPING • 38.800 m²
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 28 }}>
          <span
            style={{
              fontFamily: FONTS.display,
              fontWeight: 800,
              fontSize: 146,
              lineHeight: 0.95,
              letterSpacing: '-0.05em',
              color: PALETTE.goldBright,
              textShadow: '0 0 60px rgba(226,168,59,0.45)',
            }}
          >
            {count}
          </span>
          <span
            style={{
              fontFamily: FONTS.display,
              fontWeight: 700,
              fontSize: 48,
              letterSpacing: '-0.03em',
              color: PALETTE.text,
            }}
          >
            Lojas Reais.
          </span>
        </div>

        <KineticHeadline
          words={['Zero', 'visibilidade', 'antes', 'do', 'caixa.']}
          highlightWords={['Zero']}
          startFrame={55}
          fontSize={62}
        />
      </AbsoluteFill>

      <SubtitlePill
        badge="O PONTO CEGO"
        caption="188 vitrines operando no escuro antes da nota fiscal."
      />
    </AbsoluteFill>
  );
};

const Scene2Dor: React.FC = () => {
  const frame = useCurrentFrame();
  const funnelBars = [
    { label: 'Passam no Corredor', value: '1.420 / dia', pct: 92, color: '#94A3B8' },
    { label: 'Olham a Vitrine', value: '???', pct: 46, color: PALETTE.gold },
    { label: 'Entram & Compram', value: 'Só o caixa vê', pct: 18, color: PALETTE.rose },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.obsidian }}>
      <Sequence from={10}>
        <Audio src={staticFile('audio/02_dor.wav')} volume={1} />
      </Sequence>
      <Audio src={staticFile('audio/sfx_whoosh.wav')} volume={0.65} />

      <CapimMall3D cameraMode="reveal" localFrame={frame} />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(90deg, rgba(8,9,13,0.92) 0%, rgba(8,9,13,0.58) 54%, rgba(8,9,13,0.22) 100%)',
        }}
      />
      <BrandWatermark />

      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 165,
          width: 680,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <KineticHeadline
          words={['O', 'cliente', 'passou.', 'Você', 'não', 'viu.']}
          highlightWords={['não', 'viu']}
          align="left"
          startFrame={8}
          fontSize={58}
        />

        <GlassCard3D startFrame={22} rotateY={5} rotateX={2} accent={PALETTE.rose}>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 12,
              letterSpacing: '0.16em',
              color: PALETTE.rose,
              marginBottom: 16,
            }}
          >
            FUNIL FÍSICO INVISÍVEL
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {funnelBars.map((bar, idx) => {
              const barW = interpolate(frame, [30 + idx * 12, 75 + idx * 12], [0, bar.pct], {
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              return (
                <div key={bar.label}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 17,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    <span>{bar.label}</span>
                    <span style={{ fontFamily: FONTS.mono, color: bar.color }}>{bar.value}</span>
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${barW}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: bar.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard3D>
      </div>

      <SubtitlePill
        badge="A DOR REAL"
        caption="Sem telemetria de vitrine, estoque e promoções agem tarde demais."
        accent={PALETTE.rose}
      />
    </AbsoluteFill>
  );
};

const Scene3Revelacao: React.FC = () => {
  const frame = useCurrentFrame();
  const iqScore = Math.round(
    interpolate(frame, [28, 95], [48, 94], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.obsidian }}>
      <Sequence from={10}>
        <Audio src={staticFile('audio/03_revelacao.wav')} volume={1} />
      </Sequence>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.8} />
      <Sequence from={40}>
        <Audio src={staticFile('audio/sfx_click.wav')} volume={0.6} />
      </Sequence>

      <CapimMall3D cameraMode="reveal" localFrame={frame + 120} />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 72% 48%, rgba(8,9,13,0.15) 0%, rgba(8,9,13,0.88) 72%)',
        }}
      />
      <BrandWatermark />

      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 165,
          width: 650,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <KineticHeadline
          words={['VitrineIQ.', 'Inteligência', 'Espacial', '3D.']}
          highlightWords={['VitrineIQ', '3D']}
          align="left"
          startFrame={8}
          fontSize={64}
        />

        <div style={{ display: 'flex', gap: 18 }}>
          <GlassCard3D startFrame={22} rotateY={4} style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: PALETTE.muted }}>
              IQ SCORE AO VIVO
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 64,
                fontWeight: 800,
                color: PALETTE.goldBright,
                lineHeight: 1.05,
                marginTop: 6,
              }}
            >
              {iqScore}
              <span style={{ fontSize: 22, color: PALETTE.muted }}>/100</span>
            </div>
            <div style={{ fontSize: 14, color: PALETTE.emerald, marginTop: 6, fontWeight: 600 }}>
              +38°C Palmas • Pós-Cinemark Ativo
            </div>
          </GlassCard3D>

          <GlassCard3D startFrame={34} rotateY={-4} accent={PALETTE.cyan} style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: PALETTE.muted }}>
              GÊMEO DIGITAL L1/L2
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 44,
                fontWeight: 800,
                color: PALETTE.cyan,
                lineHeight: 1.15,
                marginTop: 10,
              }}
            >
              188 Lojas
            </div>
            <div style={{ fontSize: 14, color: '#CBD5E1', marginTop: 8 }}>
              Portarias P1–P4, Subsolo SS1/SS2 & 2º Piso
            </div>
          </GlassCard3D>
        </div>
      </div>

      <SubtitlePill
        badge="SISTEMA OPERACIONAL"
        caption="O Gêmeo Digital 3D do Capim Dourado Shopping em tempo real."
      />
    </AbsoluteFill>
  );
};

const Scene4RaioX: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.obsidian }}>
      <Sequence from={10}>
        <Audio src={staticFile('audio/04_raiox_lgpd.wav')} volume={1} />
      </Sequence>
      <Audio src={staticFile('audio/sfx_whoosh.wav')} volume={0.6} />
      <Sequence from={45}>
        <Audio src={staticFile('audio/sfx_click.wav')} volume={0.65} />
      </Sequence>

      <CapimMall3D cameraMode="showcase-vitrine" localFrame={frame} showScanner />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(270deg, rgba(8,9,13,0.90) 0%, rgba(8,9,13,0.45) 48%, rgba(8,9,13,0.18) 100%)',
        }}
      />
      <BrandWatermark />

      <div
        style={{
          position: 'absolute',
          right: 68,
          top: 155,
          width: 600,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        <KineticHeadline
          words={['Raio-X', 'Multimodal', '&', 'Edge', 'LGPD.']}
          highlightWords={['Raio-X', 'LGPD']}
          align="left"
          startFrame={8}
          fontSize={56}
        />

        <GlassCard3D startFrame={24} rotateY={-6} accent={PALETTE.cyan}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: PALETTE.cyan }}>
              SENSOR WEBCAM EM RAM
            </span>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(16,185,129,0.2)',
                color: PALETTE.emerald,
              }}
            >
              ZERO VÍDEO SALVO • 0 PII
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginTop: 18,
            }}
          >
            {[
              { k: 'Passantes', v: '312', c: '#F8FAFC' },
              { k: 'Pararam na Vitrine', v: '98 (31%)', c: PALETTE.cyan },
              { k: 'Entradas', v: '41', c: PALETTE.emerald },
            ].map((m) => (
              <div
                key={m.k}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ fontSize: 12, color: PALETTE.muted }}>{m.k}</div>
                <div
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: 24,
                    fontWeight: 800,
                    color: m.c,
                    marginTop: 4,
                  }}
                >
                  {m.v}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.28)',
              fontSize: 14,
              color: '#E0F2FE',
            }}
          >
            <strong>Gemini Multimodal:</strong> “Destaque manequim central à altura dos olhos — ganho estimado de +19% na entrada.”
          </div>
        </GlassCard3D>
      </div>

      <SubtitlePill
        badge="WEBCAM COM BLUR LGPD"
        caption="Visão computacional na borda + auditoria de vitrine via Gemini."
        accent={PALETTE.cyan}
      />
    </AbsoluteFill>
  );
};

const Scene5CrowdDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const discount = frame > 95 ? '30% OFF' : frame > 50 ? '20% OFF' : '15% OFF';

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.obsidian }}>
      <Sequence from={10}>
        <Audio src={staticFile('audio/05_crowddrop.wav')} volume={1} />
      </Sequence>
      <Audio src={staticFile('audio/sfx_sub_drop.wav')} volume={0.75} />
      <Sequence from={48}>
        <Audio src={staticFile('audio/sfx_chime.wav')} volume={0.85} />
      </Sequence>

      <CapimMall3D cameraMode="crowddrop-aerial" localFrame={frame} showCrowdDropWave />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(8,9,13,0.82) 0%, rgba(8,9,13,0.15) 45%, rgba(8,9,13,0.82) 100%)',
        }}
      />
      <BrandWatermark />

      <div
        style={{
          position: 'absolute',
          top: 112,
          left: 72,
          right: 72,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <KineticHeadline
          words={['Vitrine', 'Crowd-Drop.']}
          highlightWords={['Crowd-Drop']}
          align="left"
          startFrame={6}
          fontSize={66}
        />

        <GlassCard3D startFrame={22} rotateY={-8} accent={PALETTE.goldBright} style={{ width: 410 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: PALETTE.goldBright }}>
              GATILHO COLETIVO ATIVO
            </span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: PALETTE.emerald }}>
              ● 5 PESSOAS NA VITRINE
            </span>
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontSize: 58,
              fontWeight: 800,
              color: PALETTE.goldBright,
              marginTop: 8,
              textShadow: '0 0 36px rgba(252,211,77,0.45)',
            }}
          >
            {discount}
          </div>
          <div style={{ fontSize: 15, color: '#E2E8F0', marginTop: 4 }}>
            Pulso redireciona fluxo para salas ociosas & Vagas 132 / 142 em segundos.
          </div>
        </GlassCard3D>
      </div>

      <SubtitlePill
        badge="VITRINE CROWD-DROP"
        caption="Aglomeração na vitrine desbloqueia desconto dinâmico e QR na hora."
      />
    </AbsoluteFill>
  );
};

const Scene6ConciergeBalcao: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.obsidian }}>
      <Sequence from={10}>
        <Audio src={staticFile('audio/06_concierge_balcao.wav')} volume={1} />
      </Sequence>
      <Audio src={staticFile('audio/sfx_whoosh.wav')} volume={0.65} />
      <Sequence from={32}>
        <Audio src={staticFile('audio/sfx_click.wav')} volume={0.6} />
      </Sequence>

      <CapimMall3D cameraMode="concierge-totem" localFrame={frame} showGlassTotem />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(8,9,13,0.18) 0%, rgba(8,9,13,0.86) 72%)',
        }}
      />
      <BrandWatermark />

      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 68,
          right: 68,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <GlassCard3D startFrame={12} rotateY={10} accent={PALETTE.cyan} style={{ width: 450 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: PALETTE.cyan }}>
            PONTA DO CONSUMIDOR
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: 36, fontWeight: 800, marginTop: 8 }}>
            Concierge QR
          </div>
          <p style={{ fontSize: 16, color: '#CBD5E1', lineHeight: 1.45, marginTop: 10 }}>
            Escaneia na vitrine sem app e sem CPF. Recebe oferta relâmpago personalizada na ala.
          </p>
          <div
            style={{
              marginTop: 14,
              display: 'inline-block',
              fontFamily: FONTS.mono,
              fontSize: 14,
              fontWeight: 700,
              color: '#08090D',
              background: PALETTE.goldBright,
              padding: '7px 14px',
              borderRadius: 10,
            }}
          >
            CUPOM ATIVO: VITRINE-QR20
          </div>
        </GlassCard3D>

        <GlassCard3D startFrame={26} rotateY={-10} accent={PALETTE.emerald} style={{ width: 450 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: PALETTE.emerald }}>
            PONTA DO VENDEDOR
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: 36, fontWeight: 800, marginTop: 8 }}>
            Balcão Voz 4s
          </div>
          <p style={{ fontSize: 16, color: '#CBD5E1', lineHeight: 1.45, marginTop: 10 }}>
            Registra venda perdida em 1 toque ou comando de voz — com <strong>Fila Offline</strong> resiliente.
          </p>
          <div
            style={{
              marginTop: 14,
              fontFamily: FONTS.mono,
              fontSize: 13,
              color: PALETTE.emerald,
              background: 'rgba(16,185,129,0.14)',
              border: '1px solid rgba(16,185,129,0.35)',
              padding: '8px 12px',
              borderRadius: 10,
            }}
          >
            🎙 “Sem numeração 41 no tênis branco” → SALVO
          </div>
        </GlassCard3D>
      </div>

      <SubtitlePill
        badge="CICLO FECHADO"
        caption="Concierge QR anônimo + Modo Balcão por voz 4s com fila offline."
        accent={PALETTE.emerald}
      />
    </AbsoluteFill>
  );
};

const Scene7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoPop = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.obsidian }}>
      <Sequence from={10}>
        <Audio src={staticFile('audio/07_cta.wav')} volume={1} />
      </Sequence>
      <Audio src={staticFile('audio/sfx_chime.wav')} volume={0.75} />

      <CapimMall3D cameraMode="outro" localFrame={frame} showCrowdDropWave />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(8,9,13,0.45) 0%, rgba(8,9,13,0.92) 72%)',
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 26,
          padding: '0 90px',
        }}
      >
        <div
          style={{
            transform: `scale(${interpolate(logoPop, [0, 1], [0.85, 1])})`,
            opacity: interpolate(logoPop, [0, 1], [0, 1]),
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #FCD34D 0%, #B45309 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONTS.display,
              fontWeight: 800,
              fontSize: 40,
              color: '#08090D',
              boxShadow: '0 0 50px rgba(226,168,59,0.55)',
            }}
          >
            V
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontWeight: 800,
              fontSize: 82,
              letterSpacing: '-0.04em',
              color: PALETTE.text,
            }}
          >
            Vitrine<span style={{ color: PALETTE.goldBright }}>IQ</span>
          </div>
        </div>

        <KineticHeadline
          words={['O', 'Google', 'Analytics', 'do', 'Varejo', 'Físico.']}
          highlightWords={['Google', 'Analytics', 'Varejo', 'Físico']}
          startFrame={18}
          fontSize={52}
        />

        <GlassCard3D startFrame={40} rotateY={0} rotateX={2} accent={PALETTE.gold}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              fontFamily: FONTS.mono,
              fontSize: 15,
            }}
          >
            <div>
              <div style={{ color: PALETTE.muted, fontSize: 11 }}>PRODUÇÃO AO VIVO</div>
              <div style={{ color: PALETTE.goldBright, fontWeight: 700, marginTop: 4 }}>
                vitrineiq-capim-dourado.vercel.app
              </div>
            </div>
            <div style={{ width: 1, height: 34, background: 'rgba(255,255,255,0.14)' }} />
            <div>
              <div style={{ color: PALETTE.muted, fontSize: 11 }}>ENGENHARIA AUDITADA</div>
              <div style={{ color: PALETTE.emerald, fontWeight: 700, marginTop: 4 }}>
                9.8/10 • 157 TESTES • ZERO PII
              </div>
            </div>
            <div style={{ width: 1, height: 34, background: 'rgba(255,255,255,0.14)' }} />
            <div>
              <div style={{ color: PALETTE.muted, fontSize: 11 }}>TIME NIDO KING</div>
              <div style={{ color: PALETTE.text, fontWeight: 700, marginTop: 4 }}>
                1º HackaRun UniCatólica 2026
              </div>
            </div>
          </div>
        </GlassCard3D>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const MarketingVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.obsidian }}>
      {/* Trilha dark-tech 120 BPM com ducking sutil durante todo o comercial */}
      <Audio
        src={staticFile('audio/music_bed.wav')}
        volume={(f) => {
          const fadeOut = interpolate(f, [TOTAL_DURATION_FRAMES - 90, TOTAL_DURATION_FRAMES], [0.24, 0.02], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return f < 30 ? interpolate(f, [0, 30], [0.06, 0.24]) : fadeOut;
        }}
      />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.hook}>
          <Scene1Hook />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.dor}>
          <Scene2Dor />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.revelacao}>
          <Scene3Revelacao />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.raiox}>
          <Scene4RaioX />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.crowddrop}>
          <Scene5CrowdDrop />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.concierge}>
          <Scene6ConciergeBalcao />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.cta}>
          <Scene7CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
