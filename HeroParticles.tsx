import { useEffect, useRef } from 'react';

interface Leaf {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  phase: number;
  freq: number;
  rot: number;
  rotSpeed: number;
  opacity: number;
  color: string;
  shape: 'leaf' | 'petal';
}

const COLORS = ['#2FBFA5', '#FFB547', '#FF6B4A', '#0E8C7F', '#22C55E'];

/** Lightweight 2D canvas: 20-30 tropical leaves/petals drifting down with sinusoidal oscillation. */
export default function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const leaves: Leaf[] = Array.from({ length: 26 }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      size: 5 + Math.random() * 9,
      speedY: 0.00022 + Math.random() * 0.00035,
      speedX: (Math.random() - 0.5) * 0.0001,
      phase: Math.random() * Math.PI * 2,
      freq: 0.0008 + Math.random() * 0.0012,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.0006,
      opacity: 0.3 + Math.random() * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() > 0.5 ? 'leaf' : 'petal',
    }));

    let last = performance.now();
    const draw = (now: number) => {
      const dt = now - last;
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (const leaf of leaves) {
        leaf.y += leaf.speedY * dt;
        leaf.x += leaf.speedX * dt;
        leaf.rot += leaf.rotSpeed * dt;
        if (leaf.y > 1.05) { leaf.y = -0.05; leaf.x = Math.random(); }
        if (leaf.x > 1.05) leaf.x = -0.05;
        if (leaf.x < -0.05) leaf.x = 1.05;
        const sway = Math.sin(now * leaf.freq + leaf.phase) * 14;
        const px = leaf.x * width + sway;
        const py = leaf.y * height;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(leaf.rot + Math.sin(now * leaf.freq + leaf.phase) * 0.4);
        ctx.globalAlpha = leaf.opacity;
        ctx.fillStyle = leaf.color;
        if (leaf.shape === 'leaf') {
          ctx.beginPath();
          ctx.ellipse(0, 0, leaf.size * 0.5, leaf.size, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, leaf.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
