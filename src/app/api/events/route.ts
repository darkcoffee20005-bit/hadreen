import { recordEvents } from '@/lib/events';
import { clientIp, isSameOrigin, limits } from '@/lib/ratelimit';
import { eventsInputSchema } from '@/lib/validation/events';

const MAX_BODY = 4096;
const noContent = () => new Response(null, { status: 204 });

/** Batched beacons from navigator.sendBeacon. Always answers 204 so beacons never retry. */
export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return new Response(null, { status: 403 });
  const text = await req.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });
  if (!(await limits.events(clientIp(req.headers)))) return new Response(null, { status: 429 });

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return noContent();
  }
  const parsed = eventsInputSchema.safeParse(json);
  if (parsed.success) await recordEvents(parsed.data, req.headers.get('user-agent'));
  return noContent();
}
