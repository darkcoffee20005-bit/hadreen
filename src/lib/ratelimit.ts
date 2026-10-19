import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface Limiter {
  /** true = allowed */
  allow(key: string): Promise<boolean>;
}

function memoryLimiter(max: number, windowSec: number): Limiter {
  const hits = new Map<string, number[]>();
  return {
    async allow(key) {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowSec * 1000);
      const ok = recent.length < max;
      if (ok) recent.push(now);
      hits.set(key, recent);
      if (hits.size > 10_000) hits.clear(); // dev-only limiter: crude memory guard
      return ok;
    },
  };
}

function upstashLimiter(name: string, max: number, windowSec: number): Limiter {
  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
    prefix: `hadreen:${name}`,
  });
  return { allow: async (key) => (await limiter.limit(key)).success };
}

const cache = new Map<string, Limiter>();

function limiter(name: string, max: number, windowSec: number): Limiter {
  let l = cache.get(name);
  if (!l) {
    const upstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
    l = upstash ? upstashLimiter(name, max, windowSec) : memoryLimiter(max, windowSec);
    cache.set(name, l);
  }
  return l;
}

export const limits = {
  rsvpByIp: (ip: string) => limiter('rsvp-ip', 20, 60).allow(ip),
  rsvpByToken: (token: string) => limiter('rsvp-token', 6, 60).allow(token),
  events: (ip: string) => limiter('events', 60, 60).allow(ip),
  login: (ip: string) => limiter('login', 5, 600).allow(ip),
};

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
}

/** Rejects cross-site POSTs. Browsers send Origin on POST; Sec-Fetch-Site when available. */
export function isSameOrigin(headers: Headers): boolean {
  const site = headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = headers.get('origin');
  if (!origin) return true;
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
