/**
 * Remote breadcrumbs for ?debug=1: each step is sent at once with sendBeacon, so when a phone
 * freezes the server log shows the last step that ran.
 */
let enabled = false;
const started = typeof performance !== 'undefined' ? performance.now() : 0;
const session = Math.random().toString(36).slice(2, 8);

export function enableDebugLog() {
  if (enabled) return;
  enabled = true;
  window.addEventListener('error', (e) => dlog(`error ${e.message} @${e.filename?.split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => dlog(`rejection ${String(e.reason).slice(0, 300)}`));
  setInterval(() => dlog('tick'), 2000);
}

export function dlog(step: string) {
  if (!enabled) return;
  const body = JSON.stringify({ s: session, t: Math.round(performance.now() - started), step: step.slice(0, 600) });
  try {
    navigator.sendBeacon('/api/debug', new Blob([body], { type: 'application/json' }));
  } catch {
    // breadcrumbs are best effort
  }
}
