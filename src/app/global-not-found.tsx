import type { Metadata } from 'next';
import Link from 'next/link';
import { arabicFontVars } from './fonts';
import './globals.css';

export const metadata: Metadata = { title: 'الصفحة غير موجودة | حاضرين' };

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" className={arabicFontVars}>
      <body className="grid min-h-svh place-items-center bg-ivory p-6 text-center text-ink">
        <main>
          <p className="font-display text-5xl text-gold-ink leading-display">حاضرين</p>
          <h1 className="mt-4 text-xl font-medium">ما لگينا هذي الصفحة</h1>
          <p className="mt-2 text-ink-soft">تأكدوا من الرابط وجرّبوا مرة ثانية.</p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-emerald px-6 py-3 text-ivory">
            الصفحة الرئيسية
          </Link>
        </main>
      </body>
    </html>
  );
}
