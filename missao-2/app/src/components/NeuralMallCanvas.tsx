import React, { useEffect, useRef } from 'react';

interface NeuralMallCanvasProps {
  paused: boolean;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  hue: 'amber' | 'sky';
}

export const NeuralMallCanvas: React.FC<NeuralMallCanvasProps> = ({ paused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const count = 42;
    const particles: Particle3D[] = Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 900,
      y: (Math.random() - 0.5) * 500,
      z: Math.random() * 500 + 120,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.35,
      vz: (Math.random() - 0.5) * 0.5,
      hue: i % 3 === 0 ? 'amber' : 'sky',
    }));

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const fov = 420;

      const projected: { sx: number; sy: number; scale: number; hue: 'amber' | 'sky' }[] = [];

      for (const p of particles) {
        if (!paused && !prefersReduced) {
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
          if (p.x > 520 || p.x < -520) p.vx *= -1;
          if (p.y > 320 || p.y < -320) p.vy *= -1;
          if (p.z > 620 || p.z < 90) p.vz *= -1;
        }

        const scale = fov / (fov + p.z);
        const sx = cx + p.x * scale * 1.4;
        const sy = cy + p.y * scale * 1.3;
        projected.push({ sx, sy, scale, hue: p.hue });
      }

      // Conexões sinápticas entre pontos próximos em 3D
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i];
          const b = projected[j];
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const dist = Math.hypot(dx, dy);
          if (dist < 155) {
            const alpha = (1 - dist / 155) * 0.14;
            ctx.strokeStyle =
              a.hue === 'amber' || b.hue === 'amber'
                ? `rgba(245, 158, 11, ${alpha})`
                : `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.stroke();
          }
        }
      }

      for (const p of projected) {
        const r = Math.max(1.2, 3.2 * p.scale);
        ctx.fillStyle =
          p.hue === 'amber' ? 'rgba(251, 191, 36, 0.48)' : 'rgba(56, 189, 248, 0.42)';
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!paused && !prefersReduced) {
        animId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 opacity-75"
    />
  );
};
