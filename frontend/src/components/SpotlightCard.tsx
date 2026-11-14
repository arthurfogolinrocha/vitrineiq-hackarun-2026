import React, { useEffect, useRef } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  tilt3d?: boolean;
  beam?: boolean;
  hudCorners?: boolean;
}

/**
 * Container executivo com spotlight radial dourado, borda iluminada por ponteiro,
 * feixe cônico opcional (`beam`), cantoneiras HUD (`hudCorners`) e inclinação 3D sutil.
 * Respeita prefers-reduced-motion e usa pointer-events: none nas camadas visuais.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  tilt3d = false,
  beam = false,
  hudCorners = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef({ left: 0, top: 0 });
  const reduceMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const updateRect = () => {
      const r = el.getBoundingClientRect();
      rectRef.current = { left: r.left, top: r.top };
    };

    updateRect();
    const ro = new ResizeObserver(updateRect);
    ro.observe(el);
    window.addEventListener('scroll', updateRect, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', updateRect);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    rectRef.current = { left: r.left, top: r.top };

    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    el.style.setProperty('--mouse-x', `${x.toFixed(1)}px`);
    el.style.setProperty('--mouse-y', `${y.toFixed(1)}px`);

    if (tilt3d && !reduceMotion.current && r.width > 0 && r.height > 0) {
      const rotateX = -((y - r.height / 2) / (r.height / 2)) * 4;
      const rotateY = ((x - r.width / 2) / (r.width / 2)) * 4;
      el.style.transform = `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(4px)`;
    }
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (!el || !tilt3d) return;
    el.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0)';
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`spotlight-card ${tilt3d ? 'card-3d-tilt' : ''} ${beam ? 'border-beam-gold' : ''} ${className}`}
    >
      <div className="spotlight-overlay" aria-hidden="true" />
      <div className="spotlight-border-glow" aria-hidden="true" />
      {hudCorners && <div className="hud-corners-overlay" aria-hidden="true" />}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};
