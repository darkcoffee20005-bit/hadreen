import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { customAlphabet } from 'nanoid';
import { SECRET_LENGTH, TOKEN_ALPHABET, TOKEN_LENGTH } from '@/lib/validation/patterns';

export const newGuestToken = customAlphabet(TOKEN_ALPHABET, TOKEN_LENGTH);
export const newCoupleSecret = customAlphabet(TOKEN_ALPHABET, SECRET_LENGTH);
export const newCouplePin = customAlphabet('0123456789', 6);

/** Constant-time string comparison (hashing first makes the lengths equal). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
