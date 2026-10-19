'use client';

import gsap from 'gsap';
import { useEffect } from 'react';
import { inviteStore } from '../machine';

/**
 * Registers a scene's opening as a GSAP timeline the shell can play, skip and seek.
 * Rules for builders: drive state with tweens/sets (they land correctly when skipped);
 * use tl.call() only for sound and haptics (those are suppressed on skip and seek).
 */
export function useIntro(build: (tl: gsap.core.Timeline) => void, deps: React.DependencyList) {
  useEffect(() => {
    const tl = gsap.timeline({ paused: true });
    build(tl);
    let onDone: (() => void) | null = null;
    const finish = () => {
      const done = onDone;
      onDone = null;
      done?.();
    };
    tl.eventCallback('onComplete', finish);

    inviteStore.getState().registerIntro({
      duration: tl.duration(),
      play: (onComplete) => {
        onDone = onComplete;
        tl.play(0);
      },
      skip: () => {
        tl.progress(1, true); // land every tween at its end, without firing the sounds in between
        tl.pause();
        finish();
      },
      seek: (seconds) => {
        tl.pause();
        tl.seek(seconds, true);
      },
    });
    return () => {
      tl.kill();
      inviteStore.getState().registerIntro(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
