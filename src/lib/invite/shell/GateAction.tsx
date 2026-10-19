'use client';

import { useCallback, useState } from 'react';
import type { InviteDict } from '@/lib/i18n';
import { ScratchSurface } from '../interaction/ScratchSurface';
import { useHold } from '../interaction/useHold';
import type { GateGesture } from '../types';
import type { SceneView } from '../scene-types';

interface Props {
  gesture: GateGesture;
  ready: boolean;
  progress: number;
  label: string;
  view: SceneView;
  t: InviteDict;
  onOpen: () => void;
}

/** The gate's call to action: tap, press-and-hold, or scratch the three date tiles. */
export function GateAction({ gesture, ready, progress, label, view, t, onOpen }: Props) {
  if (gesture === 'scratch') return <ScratchTiles view={view} t={t} ready={ready} progress={progress} label={label} onOpen={onOpen} />;
  return gesture === 'hold' ? (
    <HoldButton ready={ready} progress={progress} label={label} t={t} onOpen={onOpen} />
  ) : (
    <TapButton ready={ready} progress={progress} label={label} t={t} onOpen={onOpen} />
  );
}

function Ring({ value, pulse }: { value: number; pulse?: boolean }) {
  const c = 2 * Math.PI * 46;
  return (
    <svg viewBox="0 0 100 100" className={`absolute inset-0 size-full -rotate-90 ${pulse ? 'gate-pulse' : ''}`} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--c-gold)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} style={{ transition: 'stroke-dashoffset 0.25s linear' }} />
    </svg>
  );
}

function TapButton({ ready, progress, label, t, onOpen }: { ready: boolean; progress: number; label: string; t: InviteDict; onOpen: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={!ready}
        onClick={onOpen}
        aria-label={ready ? t.openInvitation : t.shell.preparing}
        className="relative grid size-20 place-items-center rounded-full text-inv-on-band transition disabled:cursor-progress"
      >
        <Ring value={ready ? 1 : progress} pulse={ready} />
        <span aria-hidden="true" className="text-2xl">{ready ? '✦' : ''}</span>
      </button>
      <p className="text-sm text-inv-on-band/90" aria-live="polite">
        {ready ? label : t.shell.preparing}
      </p>
    </div>
  );
}

function HoldButton({ ready, progress, label, t, onOpen }: { ready: boolean; progress: number; label: string; t: InviteDict; onOpen: () => void }) {
  const hold = useHold(900, onOpen, ready);
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        disabled={!ready}
        aria-label={ready ? label : t.shell.preparing}
        className="relative grid size-20 touch-none select-none place-items-center rounded-full text-inv-on-band disabled:cursor-progress"
        {...hold.handlers}
      >
        <Ring value={ready ? Math.max(hold.progress, 0.02) : progress} pulse={ready && hold.progress === 0} />
        <span aria-hidden="true" className="text-2xl" style={{ transform: `scale(${1 + hold.progress * 0.25})` }}>
          ✦
        </span>
      </button>
      <p className="text-sm text-inv-on-band/90" aria-live="polite">
        {!ready ? t.shell.preparing : hold.progress > 0 ? t.shell.holdHint : label}
      </p>
    </div>
  );
}

function ScratchTiles({ view, t, ready, progress, label, onOpen }: { view: SceneView; t: InviteDict; ready: boolean; progress: number; label: string; onOpen: () => void }) {
  const [revealed, setRevealed] = useState([false, false, false]);
  const p = view.palette;
  const d = view.dateParts;
  const tiles = [
    { name: t.shell.scratchDay, top: d.weekday, main: d.day },
    { name: t.shell.scratchMonth, top: d.monthName, main: d.month },
    { name: t.shell.scratchYear, top: '', main: d.year },
  ];
  const reveal = useCallback(
    (i: number) => {
      setRevealed((r) => {
        const next = r.map((v, k) => v || k === i);
        if (next.every(Boolean)) setTimeout(onOpen, 700);
        return next;
      });
    },
    [onOpen],
  );

  if (!ready) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative size-14">
          <Ring value={progress} />
        </div>
        <p className="text-sm text-inv-on-band/90">{t.shell.preparing}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3" dir={view.lang === 'ar' ? 'rtl' : 'ltr'}>
        {tiles.map((tile, i) => (
          <ScratchSurface
            key={tile.name}
            label={t.shell.scratchTile(tile.name)}
            foil={[p.gold, `color-mix(in srgb, ${p.gold} 55%, white)`]}
            revealed={revealed[i]}
            onReveal={() => reveal(i)}
            className="h-24 w-24 rounded-2xl bg-inv-surface shadow-lg sm:h-28 sm:w-28"
          >
            <div className="grid h-24 w-24 place-items-center content-center gap-0.5 sm:h-28 sm:w-28">
              {tile.top && <span className="text-xs text-inv-ink-soft">{tile.top}</span>}
              <span className="font-inv-serif text-3xl text-inv-ink">{tile.main}</span>
            </div>
          </ScratchSurface>
        ))}
      </div>
      <p className="text-sm text-inv-on-band/90">{label}</p>
    </div>
  );
}
