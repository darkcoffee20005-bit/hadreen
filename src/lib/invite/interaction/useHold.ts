'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Press-and-hold: progress fills while held, resets on release, completes after `ms`.
 * Keyboard users never have to hold: Enter or Space completes immediately.
 */
export function useHold(ms: number, onComplete: () => void, enabled = true) {
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const raf = useRef(0);
  const done = useRef(false);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    start.current = null;
    if (!done.current) setProgress(0);
  }, []);

  const tick = useCallback(
    (now: number) => {
      if (start.current === null) return;
      const p = Math.min(1, (now - start.current) / ms);
      setProgress(p);
      if (p >= 1) {
        done.current = true;
        start.current = null;
        onComplete();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    },
    [ms, onComplete],
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return {
    progress,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (!enabled || done.current) return;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        start.current = performance.now();
        raf.current = requestAnimationFrame(tick);
      },
      onPointerUp: stop,
      onPointerCancel: stop,
      onPointerLeave: stop,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!enabled || done.current || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        done.current = true;
        setProgress(1);
        onComplete();
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(), // long-press menus on phones
    },
  };
}
