import { clientIp, isSameOrigin, limits } from '@/lib/ratelimit';

const MAX_BODY = 4096;

/**
 * ?debug=1 invitations post their loading steps here so a freeze on a guest's phone shows up in
 * the server logs. Nothing is stored.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return new Response(null, { status: 403 });
  const text = await req.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });
  if (!(await limits.events(clientIp(req.headers)))) return new Response(null, { status: 429 });
  console.log(`[invite-debug] ${(req.headers.get('user-agent') ?? '').slice(0, 160)} ${text.replace(/\s+/g, ' ')}`);
  return new Response(null, { status: 204 });
}
