/** Haptics where the platform has them (Android); a silent no-op elsewhere (iOS Safari). */
function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    // some in-app browsers throw instead of ignoring
  }
}

export const haptics = {
  tap: () => vibrate(10),
  crack: () => vibrate([8, 30, 14]),
  success: () => vibrate([12, 40, 18]),
  tick: () => vibrate(5),
};
