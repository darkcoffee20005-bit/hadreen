import type { Lang } from '@/lib/lang';

export interface ShareMessageInput {
  lang: Lang;
  guestName: string;
  groomName: string;
  brideName: string;
  link: string;
}

/** The ready-to-send message the couple copies for each household. */
export function buildShareMessage({ lang, guestName, groomName, brideName, link }: ShareMessageInput): string {
  if (lang === 'en') {
    return `Hello ${guestName}, we would be delighted to have you at the wedding of ${groomName} & ${brideName}. Open the invitation: ${link}`;
  }
  return `أهلاً ${guestName}، يسعدنا دعوتكم لحفل زفاف ${groomName} و${brideName}. افتحوا الدعوة: ${link}`;
}
