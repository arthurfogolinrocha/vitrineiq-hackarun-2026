import React, { useEffect, useRef } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container executivo com spotlight radial sutil guiado por ponteiro.
 * Usa pointer-events: none no overlay para nunca bloquear cliques ou textos.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({ children, className = '' }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef({ left: 0, top: 0 });

  useEffect(() => {
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
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={`spotlight-card ${className}`}
    >
      <div className="spotlight-overlay" aria-hidden="true" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};
