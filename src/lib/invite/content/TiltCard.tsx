'use client';

import { useEffect, useRef } from 'react';
import { Spring } from '../interaction/spring';

/**
 * A card that tilts toward the pointer with a spring and catches a moving glare.
 * Reduced motion: flat and still.
 */
export function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rx = new Spring(0, 140, 15);
    const ry = new Spring(0, 140, 15);
    let raf = 0;
    let last = 0;
    let running = false;
    const frame = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      const x = rx.step(dt);
      const y = ry.step(dt);
      node.style.transform = `perspective(900px) rotateX(${x}deg) rotateY(${y}deg)`;
      if (glare.current) {
        glare.current.style.setProperty('--gx', `${50 + y * 6}%`);
        glare.current.style.setProperty('--gy', `${50 - x * 6}%`);
      }
      if (rx.settled && ry.settled) {
        running = false;
        last = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    const onMove = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      rx.target = -py * 9;
      ry.target = px * 9;
      kick();
    };
    const onLeave = () => {
      rx.target = 0;
      ry.target = 0;
      kick();
    };
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={el} className={`relative will-change-transform [transform-style:preserve-3d] ${className}`}>
      {children}
      <div
        ref={glare}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
        style={{ background: 'radial-gradient(circle at var(--gx, 50%) var(--gy, 30%), rgba(255,255,255,0.55), transparent 55%)' }}
      />
    </div>
  );
}
