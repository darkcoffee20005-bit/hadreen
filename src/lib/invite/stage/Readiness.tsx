'use client';

import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import { useInviteStore } from '../machine';

/**
 * Real loading milestones from inside the canvas:
 *  - <AssetsReady/> sits after the scene inside its Suspense boundary: when it mounts, every
 *    loader the scene suspended on has finished.
 *  - <ShaderWarmup/> compiles every material before the gate opens, so the opening never
 *    hitches on its first frames.
 */
export function AssetsReady() {
  const store = useInviteStore();
  useEffect(() => store.getState().setProgress('assets', 1), [store]);
  return null;
}

export function ShaderWarmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const store = useInviteStore();
  useEffect(() => {
    let cancelled = false;
    // Let the scene mount its meshes first (two frames), then compile them all.
    const id = setTimeout(() => {
      gl.compileAsync(scene, camera)
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) store.getState().setProgress('shaders', 1);
        });
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [gl, scene, camera, store]);
  return null;
}

/** Counts text textures as they finish; reports the fonts milestone when all `total` are ready. */
export function useTextsReady(total: number): () => void {
  const done = useRef(0);
  const store = useInviteStore();
  useEffect(() => {
    if (total === 0) store.getState().setProgress('fonts', 1);
  }, [total, store]);
  return useCallback(() => {
    done.current += 1;
    store.getState().setProgress('fonts', Math.min(1, done.current / Math.max(1, total)));
  }, [total, store]);
}
