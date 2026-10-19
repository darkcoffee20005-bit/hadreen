import { clientIp, isSameOrigin, limits } from '@/lib/ratelimit';
import { submitRsvp } from '@/lib/rsvp';
import { isAdmin } from '@/lib/session';
import { rsvpInputSchema, type RsvpErrorCode } from '@/lib/validation/rsvp';

const MAX_BODY = 2048;

const error = (status: number, code: RsvpErrorCode) =>
  Response.json({ ok: false, error: code }, { status, headers: { 'cache-control': 'no-store' } });

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return error(403, 'INVALID_INPUT');
  const text = await req.text();
  if (text.length > MAX_BODY) return error(413, 'INVALID_INPUT');

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return error(400, 'INVALID_INPUT');
  }
  const parsed = rsvpInputSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message;
    return error(422, first === 'NAME_REQUIRED' || first === 'SEATS_MIN' ? first : 'INVALID_INPUT');
  }

  const input = parsed.data;
  const allowed =
    (await limits.rsvpByIp(clientIp(req.headers))) &&
    (await limits.rsvpByToken(input.token ?? input.clientKey ?? 'open'));
  if (!allowed) return error(429, 'RATE_LIMITED');

  const result = await submitRsvp(input, {
    userAgent: req.headers.get('user-agent') ?? '',
    allowDraft: await isAdmin(), // admins can test drafts end to end
  });
  if (!result.ok) return error(result.status, result.error);
  return Response.json(result, { headers: { 'cache-control': 'no-store' } });
}
