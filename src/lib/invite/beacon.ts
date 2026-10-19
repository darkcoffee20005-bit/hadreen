import type { ClientEventType } from '@/lib/validation/events';

// Batches analytics beacons and flushes them on a short timer or when the page is hidden.
let context: { slug: string; token?: string } | null = null;
let queue: ClientEventType[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let listening = false;

export function initBeacon(slug: string, token?: string | null) {
  context = { slug, ...(token ? { token } : {}) };
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('pagehide', flushBeacons);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushBeacons();
  });
}

export function track(type: ClientEventType) {
  queue.push(type);
  clearTimeout(timer);
  timer = setTimeout(flushBeacons, 1500);
}

export function flushBeacons() {
  if (!context || queue.length === 0) return;
  const body = JSON.stringify({ ...context, events: queue.map((type) => ({ type })) });
  queue = [];
  const sent = navigator.sendBeacon?.('/api/events', new Blob([body], { type: 'application/json' }));
  if (!sent) {
    fetch('/api/events', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(
      () => {},
    );
  }
}

/** "opened" once per browser session per invitation, and only once the page is actually visible. */
export function trackOpenedOnce(slug: string) {
  const key = `hadreen:opened:${slug}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // storage blocked: still count it
  }
  const send = () => {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', send);
    track('opened');
  };
  if (document.visibilityState === 'visible') send();
  else document.addEventListener('visibilitychange', send);
}
