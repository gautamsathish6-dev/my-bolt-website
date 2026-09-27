import { useEffect, useRef } from 'react';

interface ConfettiOptions {
  count?: number;
  duration?: number;
}

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
}

export function fireConfetti(options: ConfettiOptions = {}) {
  const count = options.count ?? 80;
  const duration = options.duration ?? 3000;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  const particles: Particle[] = [];
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 3;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 3 + Math.random() * 6;
    particles.push({
      x: centerX + (Math.random() - 0.5) * 100,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: duration,
    });
  }

  let startTime = performance.now();
  let rafId: number;

  const animate = (now: number) => {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = false;
    for (const p of particles) {
      p.life += 16;
      if (p.life > p.maxLife) continue;
      alive = true;

      p.vy += 0.15;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.vx *= 0.99;

      const opacity = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    if (alive && elapsed < duration + 1000) {
      rafId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(rafId);
      document.body.removeChild(canvas);
    }
  };

  rafId = requestAnimationFrame(animate);
}

export function useConfettiTrigger() {
  const ref = useRef(false);
  useEffect(() => {
    return () => { ref.current = false; };
  }, []);
  return (options?: ConfettiOptions) => {
    if (ref.current) return;
    ref.current = true;
    fireConfetti(options);
    setTimeout(() => { ref.current = false; }, 3500);
  };
}
