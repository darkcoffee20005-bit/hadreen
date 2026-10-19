'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Coverage } from './coverage';
import { haptics } from './haptics';

interface Props {
  /** What's under the foil (always in the DOM, so screen readers can read it once revealed). */
  children: React.ReactNode;
  label: string;
  foil: [string, string];
  threshold?: number;
  revealed?: boolean;
  onReveal: () => void;
  className?: string;
}

/**
 * Scratch-to-reveal on a DOM element: a canvas foil erased with the finger or mouse.
 * Keyboard: focus it and press Enter or Space. It completes itself once enough is scratched.
 */
export function ScratchSurface({ children, label, foil, threshold = 0.55, revealed = false, onReveal, className = '' }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const coverage = useRef(new Coverage(16, 8));
  const last = useRef<{ x: number; y: number } | null>(null);
  const [done, setDone] = useState(revealed);

  const reveal = useCallback(() => {
    if (done) return;
    setDone(true);
    haptics.success();
    onReveal();
  }, [done, onReveal]);

  // Paint the foil whenever the size changes.
  useEffect(() => {
    const el = wrap.current;
    const c = canvas.current;
    if (!el || !c || done) return;
    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = el.getBoundingClientRect();
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, width, height);
      g.addColorStop(0, foil[0]);
      g.addColorStop(0.5, foil[1]);
      g.addColorStop(1, foil[0]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      // Foil sparkle: a deterministic speckle, then soft diagonal sheen lines.
      for (let i = 0; i < width * height * 0.02; i++) {
        const x = (i * 97.13) % width;
        const y = (i * 57.71 + (i % 7) * 13) % height;
        ctx.fillStyle = i % 3 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)';
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 6;
      for (let x = -height; x < width; x += 26) {
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x + height, 0);
        ctx.stroke();
      }
      coverage.current.reset();
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(el);
    return () => ro.disconnect();
  }, [foil, done]);

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (done || (e.pointerType === 'mouse' && e.buttons !== 1)) return;
    const c = canvas.current!;
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = Math.max(14, Math.min(rect.width, rect.height) * 0.16);
    const ctx = c.getContext('2d')!;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 2;
    ctx.beginPath();
    ctx.moveTo(last.current?.x ?? x, last.current?.y ?? y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    last.current = { x, y };
    coverage.current.paint(x / rect.width, y / rect.height, r / rect.width, rect.width / rect.height);
    if (coverage.current.ratio >= threshold) reveal();
  };

  return (
    <div
      ref={wrap}
      role="button"
      tabIndex={done ? -1 : 0}
      aria-label={done ? undefined : label}
      aria-pressed={done}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          reveal();
        }
      }}
      className={`relative overflow-hidden ${className}`}
    >
      <div aria-hidden={!done}>{children}</div>
      <canvas
        ref={canvas}
        aria-hidden="true"
        className={`absolute inset-0 size-full touch-none transition-opacity duration-700 ${done ? 'pointer-events-none opacity-0' : 'cursor-grab'}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = null;
          haptics.tick();
          scratch(e);
        }}
        onPointerMove={scratch}
        onPointerUp={() => (last.current = null)}
      />
    </div>
  );
}
