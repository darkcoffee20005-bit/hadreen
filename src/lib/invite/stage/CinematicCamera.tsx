'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { PerspectiveCamera } from 'three';
import { startTiltSource, tilt } from '../interaction/tilt';
import { useInviteStore } from '../machine';
import { easeInOutCubic, evaluateTrack, framedPosition, lerpShot, type Shot, type TrackKey } from './rig';

/**
 * Directs the camera through the invitation:
 *  gate     → the gate shot, breathing slightly
 *  opening  → the scene's camera track, at `director.time` (tweened by the opening timeline)
 *  handoff+ → blends into the ambient shot, which follows the page scroll
 * Pointer or gyro tilt adds a little parallax on top. Every shot stays composed on phones
 * (see framedPosition).
 */
export interface Director {
  track: TrackKey[];
  /** Seconds along the track; the opening timeline tweens this. */
  time: number;
  ambient: (scroll: number, seconds: number) => Shot;
  /** World units of parallax at full tilt. */
  parallax: number;
}

export function useDirector(init: Omit<Director, 'time'>): Director {
  const ref = useRef<Director>({ ...init, time: 0 });
  return ref.current;
}

export function CinematicCamera({ director }: { director: Director }) {
  const camera = useThree((s) => s.camera as PerspectiveCamera);
  const size = useThree((s) => s.size);
  const blend = useRef(0);
  const store = useInviteStore();

  useEffect(() => startTiltSource(), []);

  useFrame((state, delta) => {
    const { phase, scroll, capture } = store.getState();
    const t = state.clock.elapsedTime;
    const aspect = size.width / Math.max(1, size.height);
    let shot: Shot;

    if (phase === 'boot' || phase === 'loading' || phase === 'gate') {
      shot = evaluateTrack(director.track, 0);
      const breathe = capture ? 0 : Math.sin(t * 0.6) * 0.03;
      shot = { ...shot, position: [shot.position[0], shot.position[1] + breathe, shot.position[2]] };
    } else if (phase === 'opening') {
      blend.current = 0;
      shot = evaluateTrack(director.track, director.time);
    } else {
      blend.current = capture ? 1 : Math.min(1, blend.current + delta / 1.4);
      const end = evaluateTrack(director.track, Infinity);
      shot = lerpShot(end, director.ambient(scroll, t), easeInOutCubic(blend.current));
    }

    const [px, py, pz] = framedPosition(shot, aspect);
    const k = capture ? 0 : director.parallax;
    camera.position.set(px + tilt.x * k, py - tilt.y * k * 0.6, pz);
    camera.lookAt(shot.target[0], shot.target[1], shot.target[2]);
    if (Math.abs(camera.fov - shot.fov) > 1e-3) {
      camera.fov = shot.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
