import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONTS, PALETTE } from '../designSystem';

export const KineticHeadline: React.FC<{
  words: string[];
  highlightWords?: string[];
  startFrame?: number;
  fontSize?: number;
  align?: 'center' | 'left';
  maxWidth?: number;
}> = ({
  words,
  highlightWords = [],
  startFrame = 8,
  fontSize = 68,
  align = 'center',
  maxWidth = 1120,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        gap: '14px 18px',
        maxWidth,
        fontFamily: FONTS.display,
        fontWeight: 800,
        fontSize,
        lineHeight: 1.04,
        letterSpacing: '-0.035em',
        color: PALETTE.text,
        textAlign: align,
      }}
    >
      {words.map((word, idx) => {
        const delay = startFrame + idx * 3;
        const p = spring({
          frame: Math.max(0, frame - delay),
          fps,
          config: { damping: 18, stiffness: 140, mass: 0.8 },
        });
        const clean = word.replace(/[.,!?—]/g, '');
        const isGold = highlightWords.includes(clean);
        return (
          <span
            key={`${word}-${idx}`}
            style={{
              display: 'inline-block',
              opacity: interpolate(p, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(p, [0, 1], [28, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
              color: isGold ? PALETTE.goldBright : PALETTE.text,
              textShadow: isGold ? '0 0 32px rgba(226,168,59,0.45)' : '0 10px 30px rgba(0,0,0,0.65)',
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export const GlassCard3D: React.FC<{
  children: React.ReactNode;
  startFrame?: number;
  rotateY?: number;
  rotateX?: number;
  accent?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  startFrame = 10,
  rotateY = -8,
  rotateX = 4,
  accent = PALETTE.gold,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 20, stiffness: 105, mass: 0.9 },
  });

  const opacity = interpolate(p, [0, 1], [0, 1]);
  const ty = interpolate(p, [0, 1], [44, 0]);
  const scale = interpolate(p, [0, 1], [0.92, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `perspective(1200px) translateY(${ty}px) scale(${scale}) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
        background: 'linear-gradient(155deg, rgba(18,22,34,0.82) 0%, rgba(10,12,18,0.72) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.14)',
        borderTop: `1px solid ${accent}88`,
        boxShadow: `0 28px 70px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 40px ${accent}1a`,
        padding: '26px 30px',
        color: PALETTE.text,
        fontFamily: FONTS.sans,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const SubtitlePill: React.FC<{
  badge: string;
  caption: string;
  accent?: string;
}> = ({ badge, caption, accent = PALETTE.gold }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [6, 20], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 44,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity: op,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          background: 'rgba(8, 9, 13, 0.86)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 999,
          padding: '11px 26px',
          boxShadow: '0 14px 36px rgba(0,0,0,0.65)',
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#08090D',
            background: accent,
            padding: '4px 11px',
            borderRadius: 999,
            textTransform: 'uppercase',
          }}
        >
          {badge}
        </span>
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize: 21,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#F8FAFC',
          }}
        >
          {caption}
        </span>
      </div>
    </div>
  );
};

export const BrandWatermark: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 34,
      left: 52,
      right: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      pointerEvents: 'none',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          background: 'linear-gradient(135deg, #E2A83B 0%, #B45309 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONTS.display,
          fontWeight: 800,
          fontSize: 20,
          color: '#08090D',
          boxShadow: '0 6px 22px rgba(226,168,59,0.45)',
        }}
      >
        V
      </div>
      <div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 800,
            fontSize: 19,
            letterSpacing: '-0.02em',
            color: '#F8FAFC',
          }}
        >
          Vitrine<span style={{ color: PALETTE.gold }}>IQ</span>
        </div>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 10,
            letterSpacing: '0.16em',
            color: PALETTE.muted,
          }}
        >
          CAPIM DOURADO SHOPPING • PALMAS-TO
        </div>
      </div>
    </div>

    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(17,20,28,0.72)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 999,
        padding: '7px 14px',
        fontFamily: FONTS.mono,
        fontSize: 12,
        color: '#CBD5E1',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: PALETTE.emerald,
          boxShadow: `0 0 10px ${PALETTE.emerald}`,
        }}
      />
      INTELIGÊNCIA ESPACIAL AO VIVO
    </div>
  </div>
);

