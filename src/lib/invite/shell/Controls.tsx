'use client';

import { useState } from 'react';
import type { InviteDict } from '@/lib/i18n';
import { audio } from '../audio/engine';
import { GyroButton } from '../interaction/GyroButton';

const pill =
  'pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-3.5 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/40';

export function MuteButton({ t }: { t: InviteDict }) {
  const [muted, setMuted] = useState(audio.muted);
  return (
    <button
      type="button"
      aria-pressed={muted}
      aria-label={muted ? t.shell.unmute : t.shell.mute}
      className={pill}
      onClick={() => {
        audio.unlock();
        audio.setMuted(!muted);
        setMuted(!muted);
      }}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        {muted ? <path d="M17 9l5 6m0-6l-5 6" /> : <path d="M17 8.5a5 5 0 010 7M19.5 6a8.5 8.5 0 010 12" />}
      </svg>
    </button>
  );
}

export function SkipButton({ t, onSkip }: { t: InviteDict; onSkip: () => void }) {
  return (
    <button type="button" className={pill} onClick={onSkip}>
      {t.shell.skip}
    </button>
  );
}

export function Gyro({ t }: { t: InviteDict }) {
  return <GyroButton label={t.shell.gyro} className={pill} />;
}
