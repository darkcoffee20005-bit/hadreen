import type { Lang } from '@/lib/lang';
import { ar } from './ar';
import { en } from './en';

export type { InviteDict } from './ar';

export function inviteDict(lang: Lang) {
  return lang === 'en' ? en : ar;
}
