import { Spring } from './spring';

/**
 * Shared, spring-smoothed tilt in [-1, 1] on both axes, from the pointer or (when enabled) the
 * phone's gyroscope. Scenes read `tilt.x` / `tilt.y` every frame; nothing re-renders React.
 */
const sx = new Spring(0, 60, 11);
const sy = new Spring(0, 60, 11);

export const tilt = {
  x: 0,
  y: 0,
  gyro: false,
};

let users = 0;
let raf = 0;
let last = 0;
let baseline: { beta: number; gamma: number } | null = null;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

function onPointer(e: PointerEvent) {
  if (tilt.gyro) return;
  sx.target = clamp((e.clientX / window.innerWidth) * 2 - 1);
  sy.target = clamp((e.clientY / window.innerHeight) * 2 - 1);
}

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta === null || e.gamma === null) return;
  baseline ??= { beta: e.beta, gamma: e.gamma };
  tilt.gyro = true;
  sx.target = clamp((e.gamma - baseline.gamma) / 25);
  sy.target = clamp((e.beta - baseline.beta) / 25);
}

function frame(now: number) {
  raf = requestAnimationFrame(frame);
  const dt = last ? (now - last) / 1000 : 0;
  last = now;
  tilt.x = sx.step(dt);
  tilt.y = sy.step(dt);
}

/** Start listening (ref-counted). Returns a cleanup function. */
export function startTiltSource(): () => void {
  users += 1;
  if (users === 1) {
    window.addEventListener('pointermove', onPointer, { passive: true });
    raf = requestAnimationFrame(frame);
    // Android delivers orientation without a permission prompt; iOS needs the button below.
    if (!needsGyroPermission()) window.addEventListener('deviceorientation', onOrientation);
  }
  return () => {
    users -= 1;
    if (users === 0) {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onOrientation);
      cancelAnimationFrame(raf);
      last = 0;
    }
  };
}

type PermissionApi = { requestPermission?: () => Promise<'granted' | 'denied'> };

export function needsGyroPermission(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as PermissionApi).requestPermission === 'function'
  );
}

/** iOS: must be called from a tap. Resolves true when the gyroscope is on. */
export async function enableGyro(): Promise<boolean> {
  try {
    const api = DeviceOrientationEvent as unknown as PermissionApi;
    const result = api.requestPermission ? await api.requestPermission() : 'granted';
    if (result !== 'granted') return false;
    baseline = null;
    window.addEventListener('deviceorientation', onOrientation);
    return true;
  } catch {
    return false;
  }
}
