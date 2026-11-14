import React from 'react';
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONTS, PALETTE } from '../designSystem';

/** Fundo dark-tech sutil com grade de pontos estilo Linear/Vercel */
export const StudioGridBackdrop: React.FC<{ accent?: string }> = ({ accent = PALETTE.gold }) => (
  <>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at 50% 42%, ${accent}22 0%, rgba(6,7,11,0.92) 60%, #06070B 100%)`,
        pointerEvents: 'none',
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        opacity: 0.72,
        pointerEvents: 'none',
      }}
    />
  </>
);

/** Badge pill metálico no topo estilo Keynote / pitch original */
export const TopKeynotePill: React.FC<{ label: string; color?: string }> = ({
  label,
  color = PALETTE.gold,
}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 18px',
        borderRadius: 999,
        border: `1px solid ${color}66`,
        background: 'rgba(11, 13, 18, 0.85)',
        fontFamily: FONTS.mono,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.16em',
        color,
        textTransform: 'uppercase',
        opacity: op,
        boxShadow: `0 0 28px ${color}24`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
      <span>{label}</span>
    </div>
  );
};

/** Manchete cinética Apple Keynote com palavra em Highlight Pill sólido brilhante */
export const KineticPillHeadline: React.FC<{
  words: string[];
  pillWord?: string;
  pillColor?: string;
  startFrame?: number;
  fontSize?: number;
  align?: 'center' | 'left';
  maxWidth?: number;
}> = ({
  words,
  pillWord,
  pillColor = PALETTE.gold,
  startFrame = 4,
  fontSize = 64,
  align = 'center',
  maxWidth = 1300,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        alignItems: 'center',
        gap: '12px 16px',
        maxWidth,
        fontFamily: FONTS.display,
        fontWeight: 800,
        fontSize,
        lineHeight: 1.06,
        letterSpacing: '-0.035em',
        color: '#F8FAFC',
        textAlign: align,
      }}
    >
      {words.map((word, idx) => {
        const delay = startFrame + idx * 3;
        const p = spring({
          frame: Math.max(0, frame - delay),
          fps,
          config: { damping: 16, stiffness: 165, mass: 0.78 },
        });
        const clean = word.replace(/[.,!?—:]/g, '');
        const isPill =
          pillWord !== undefined &&
          (pillWord === clean || pillWord.split(' ').includes(clean));
        return (
          <span
            key={`${word}-${idx}`}
            style={{
              display: 'inline-block',
              opacity: interpolate(p, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
              ...(isPill
                ? {
                    background: `linear-gradient(135deg, ${pillColor} 0%, #FDE68A 100%)`,
                    color: '#08090D',
                    padding: '4px 20px 7px',
                    borderRadius: 16,
                    boxShadow: `0 12px 38px ${pillColor}55`,
                  }
                : {
                    textShadow: '0 8px 28px rgba(0,0,0,0.75)',
                  }),
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export interface CursorWaypoint {
  frame: number;
  x: number; // % (0..100 dentro da tela)
  y: number; // % (0..100 dentro da tela)
  click?: boolean;
}

export interface ExplosionCardSpec {
  badge: string;
  value: string;
  sub: string;
  accent: string;
  side: 'left' | 'right';
  top: number;
  delay?: number;
}

/**
 * Moldura MacBook Pro Space Black 3D com UI real do VitrineIQ,
 * Spotlight Optical Zoom (cursor sincronizado no mesmo plano transformado),
 * Z-layer explosion cards e reflexo de vidro Keynote.
 */
export const MacBook3DStage: React.FC<{
  capturePath: string;
  secondaryCapturePath?: string;
  switchAtFrame?: number;
  url?: string;
  rotateY?: number;
  rotateX?: number;
  zoomFrom?: number;
  zoomTo?: number;
  zoomStartFrame?: number;
  zoomEndFrame?: number;
  focusX?: number; // 0..100 (% na imagem para dar zoom)
  focusY?: number; // 0..100
  cursorWaypoints?: CursorWaypoint[];
  explosionCards?: ExplosionCardSpec[];
  widthPx?: number;
}> = ({
  capturePath,
  secondaryCapturePath,
  switchAtFrame = 9999,
  url = 'https://vitrineiq-capim-dourado.vercel.app',
  rotateY = -6,
  rotateX = 3,
  zoomFrom = 1,
  zoomTo = 1.28,
  zoomStartFrame = 35,
  zoomEndFrame = 150,
  focusX = 50,
  focusY = 45,
  cursorWaypoints = [],
  explosionCards = [],
  widthPx = 1180,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 19, stiffness: 110, mass: 0.9 },
  });

  const dynRotY = interpolate(frame, [0, 260], [rotateY - 3, rotateY + 3], {
    easing: Easing.inOut(Easing.sin),
    extrapolateRight: 'clamp',
  });
  const zoom = interpolate(frame, [zoomStartFrame, zoomEndFrame], [zoomFrom, zoomTo], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const glareX = interpolate(frame, [0, 220], [-40, 125], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Interpola posição do cursor animado entre waypoints
  let cursorX = cursorWaypoints[0]?.x ?? 52;
  let cursorY = cursorWaypoints[0]?.y ?? 52;
  let clickScale = 1;
  let rippleOp = 0;
  let rippleSize = 10;

  if (cursorWaypoints.length > 0) {
    for (let i = 0; i < cursorWaypoints.length - 1; i++) {
      const a = cursorWaypoints[i];
      const b = cursorWaypoints[i + 1];
      if (frame >= a.frame && frame <= b.frame) {
        const p = interpolate(frame, [a.frame, b.frame], [0, 1], {
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        });
        cursorX = a.x + (b.x - a.x) * p;
        cursorY = a.y + (b.y - a.y) * p;
      } else if (frame > b.frame && i === cursorWaypoints.length - 2) {
        cursorX = b.x;
        cursorY = b.y;
      }
    }
    for (const wp of cursorWaypoints) {
      if (wp.click && frame >= wp.frame && frame <= wp.frame + 24) {
        const dt = frame - wp.frame;
        clickScale = dt < 6 ? interpolate(dt, [0, 6], [1, 0.78]) : interpolate(dt, [6, 14], [0.78, 1], { extrapolateRight: 'clamp' });
        rippleOp = interpolate(dt, [0, 22], [0.95, 0], { extrapolateRight: 'clamp' });
        rippleSize = interpolate(dt, [0, 22], [10, 74], { extrapolateRight: 'clamp' });
      }
    }
  }

  const activeImg = secondaryCapturePath && frame >= switchAtFrame ? secondaryCapturePath : capturePath;
  const heightPx = Math.round((widthPx * 900) / 1440);

  return (
    <div
      style={{
        width: widthPx,
        opacity: interpolate(enter, [0, 1], [0, 1]),
        transform: `perspective(1650px) translateY(${interpolate(enter, [0, 1], [55, 0])}px) scale(${interpolate(enter, [0, 1], [0.9, 1])}) rotateY(${dynRotY}deg) rotateX(${rotateX}deg)`,
        borderRadius: 22,
        border: '1.5px solid rgba(255,255,255,0.22)',
        background: '#0F1219',
        boxShadow:
          '0 40px 100px rgba(0,0,0,0.85), 0 0 65px rgba(226,168,59,0.16), inset 0 1px 0 rgba(255,255,255,0.25)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top Bar do Browser Space Black */}
      <div
        style={{
          height: 36,
          background: 'linear-gradient(180deg, #1A1F2B 0%, #11141D 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', gap: 7 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F' }} />
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 11,
            color: '#CBD5E1',
            background: 'rgba(255,255,255,0.06)',
            padding: '4px 18px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {url}
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            fontWeight: 700,
            color: PALETTE.emerald,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: PALETTE.emerald }} />
          AO VIVO • 60FPS
        </div>
      </div>

      {/* Viewport da UI real com Zoom Focal e Cursor sincronizados no mesmo plano */}
      <div style={{ width: widthPx, height: heightPx, overflow: 'hidden', position: 'relative', background: '#08090D' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformOrigin: `${focusX}% ${focusY}%`,
            transform: `scale(${zoom})`,
          }}
        >
          <Img
            src={staticFile(activeImg)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />

          {/* Cursor vetorial animado dentro do mesmo container escalado (nunca desalinha no zoom!) */}
          {cursorWaypoints.length > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${cursorX}%`,
                top: `${cursorY}%`,
                pointerEvents: 'none',
                zIndex: 25,
                transform: `scale(${1 / Math.max(1, zoom)})`,
                transformOrigin: 'top left',
              }}
            >
              {rippleOp > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: -rippleSize / 2,
                    top: -rippleSize / 2,
                    width: rippleSize,
                    height: rippleSize,
                    borderRadius: '50%',
                    border: `3px solid ${PALETTE.goldBright}`,
                    background: `${PALETTE.gold}28`,
                    opacity: rippleOp,
                  }}
                />
              )}
              <svg
                width={32}
                height={32}
                viewBox="0 0 28 28"
                style={{
                  transform: `scale(${clickScale})`,
                  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))',
                }}
              >
                <path
                  d="M4 2 L24 12.5 L15 15.2 L12.2 24 Z"
                  fill="#FFFFFF"
                  stroke="#0B0D12"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Z-Layer Explosion Pop-out Cards flutuando sobre o vidro */}
        {explosionCards.map((card) => {
          const p = spring({
            frame: Math.max(0, frame - (card.delay ?? 24)),
            fps,
            config: { damping: 16, stiffness: 125 },
          });
          return (
            <div
              key={card.badge}
              style={{
                position: 'absolute',
                ...(card.side === 'left' ? { left: 26 } : { right: 26 }),
                top: card.top,
                opacity: interpolate(p, [0, 1], [0, 1]),
                transform: `perspective(900px) translateY(${interpolate(p, [0, 1], [28, 0])}px) translateZ(60px) scale(${interpolate(p, [0, 1], [0.85, 1])})`,
                background: 'rgba(10,12,19,0.92)',
                backdropFilter: 'blur(14px)',
                border: `1.5px solid ${card.accent}`,
                borderRadius: 16,
                padding: '12px 18px',
                boxShadow: `0 22px 48px rgba(0,0,0,0.85), 0 0 28px ${card.accent}38`,
                pointerEvents: 'none',
                zIndex: 30,
              }}
            >
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, fontWeight: 700, color: card.accent, letterSpacing: '0.14em' }}>
                {card.badge}
              </div>
              <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginTop: 2 }}>
                {card.value}
              </div>
              <div style={{ fontFamily: FONTS.sans, fontSize: 12, color: '#CBD5E1' }}>
                {card.sub}
              </div>
            </div>
          );
        })}

        {/* Reflexo diagonal de vidro Apple Keynote */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(112deg, transparent ${glareX - 18}%, rgba(255,255,255,0.10) ${glareX}%, transparent ${glareX + 18}%)`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

/** iPhone 3D Space Titanium rodando a tela real do Concierge QR mobile com rolagem suave */
export const IPhone3DStage: React.FC<{
  capturePath: string;
  rotateY?: number;
  widthPx?: number;
}> = ({ capturePath, rotateY = 10, widthPx = 330 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const scrollPct = interpolate(frame, [28, 170], [0, -18], {
    easing: Easing.inOut(Easing.sin),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const heightPx = Math.round(widthPx * 2.02);

  return (
    <div
      style={{
        width: widthPx,
        height: heightPx,
        borderRadius: 44,
        padding: 11,
        background: 'linear-gradient(145deg, #272B38 0%, #11131A 60%, #1F2430 100%)',
        border: '1.5px solid rgba(255,255,255,0.28)',
        boxShadow: '0 34px 80px rgba(0,0,0,0.85), 0 0 46px rgba(16,185,129,0.22)',
        transform: `perspective(1300px) translateY(${interpolate(enter, [0, 1], [60, 0])}px) rotateY(${rotateY}deg) rotateX(3deg)`,
        opacity: interpolate(enter, [0, 1], [0, 1]),
        position: 'relative',
      }}
    >
      {/* Dynamic Island */}
      <div
        style={{
          position: 'absolute',
          top: 17,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 82,
          height: 20,
          borderRadius: 999,
          background: '#050608',
          border: '1px solid rgba(255,255,255,0.08)',
          zIndex: 10,
        }}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 34,
          overflow: 'hidden',
          background: '#0F172A',
          paddingTop: 34,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#FAF7F0', borderRadius: '20px 20px 0 0' }}>
          <Img
            src={staticFile(capturePath)}
            style={{
              width: '100%',
              height: '110%',
              objectFit: 'cover',
              objectPosition: 'top center',
              transform: `translateY(${Math.max(-9, scrollPct)}%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

/** Pill Badge flutuante ao redor dos mockups (estilo Linear / Pitch) */
export const FloatingTelemetryPill: React.FC<{
  kicker: string;
  value: string;
  accent?: string;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ kicker, value, accent = PALETTE.gold, delay = 14, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 17, stiffness: 140 } });

  return (
    <div
      style={{
        opacity: interpolate(p, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px) scale(${interpolate(p, [0, 1], [0.88, 1])})`,
        background: 'rgba(10, 12, 19, 0.92)',
        backdropFilter: 'blur(14px)',
        border: `1px solid ${accent}66`,
        borderRadius: 18,
        padding: '12px 18px',
        boxShadow: `0 18px 46px rgba(0,0,0,0.75), 0 0 26px ${accent}22`,
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: accent,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 22,
          fontWeight: 800,
          color: '#FFFFFF',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
};

/** Leque 3D (Fan-Out) de 3 cards no clímax de ROI / Engenharia */
export const CardFan3D: React.FC<{
  cards: Array<{
    badge: string;
    metric: string;
    title: string;
    desc: string;
    accent: string;
  }>;
}> = ({ cards }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        gap: 28,
        width: '100%',
        maxWidth: 1420,
      }}
    >
      {cards.map((c, idx) => {
        const delay = 8 + idx * 7;
        const p = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 18, stiffness: 120 } });
        const fanAngle = idx === 0 ? 10 : idx === 2 ? -10 : 0;
        const zBump = idx === 1 ? 30 : 0;
        const floatY = Math.sin(frame / 26 + idx * 1.4) * 5;
        const shineX = ((frame * 1.35 + idx * 35) % 240) - 60;
        return (
          <div
            key={c.title}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              opacity: interpolate(p, [0, 1], [0, 1]),
              transform: `perspective(1400px) translateY(${interpolate(p, [0, 1], [50, 0]) + floatY}px) translateZ(${zBump}px) rotateY(${fanAngle}deg) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
              background: 'linear-gradient(155deg, rgba(19,23,35,0.92) 0%, rgba(9,11,17,0.88) 100%)',
              borderRadius: 24,
              border: `1.5px solid ${c.accent}77`,
              boxShadow: `0 28px 65px rgba(0,0,0,0.75), 0 0 42px ${c.accent}24`,
              padding: '30px 28px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(115deg, transparent ${shineX - 18}%, rgba(255,255,255,0.08) ${shineX}%, transparent ${shineX + 18}%)`,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: c.accent,
                marginBottom: 14,
              }}
            >
              {c.badge}
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 54,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: c.accent,
                lineHeight: 1.0,
                marginBottom: 12,
              }}
            >
              {c.metric}
            </div>
            <div
              style={{
                fontFamily: FONTS.display,
                fontSize: 22,
                fontWeight: 700,
                color: '#FFFFFF',
                marginBottom: 8,
              }}
            >
              {c.title}
            </div>
            <div style={{ fontFamily: FONTS.sans, fontSize: 15, color: '#94A3B8', lineHeight: 1.45 }}>
              {c.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
};

