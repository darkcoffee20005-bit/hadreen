import Link from 'next/link';
import { notFound } from 'next/navigation';
import { labEnabled } from '@/lib/env';
import { TEMPLATE_IDS } from '@/lib/invite/types';
import { getTemplate } from '@/templates';

export const dynamic = 'force-dynamic';

/** Index of the template lab (development, or LAB_ENABLED=true). */
export default function LabIndex() {
  if (!labEnabled()) notFound();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-emerald">المختبر</h1>
      <p className="mt-2 text-ink-soft">كل قالب مع لوحة تحكّم: الجودة، المراحل، شريط الافتتاحية وقيم المشهد.</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {TEMPLATE_IDS.map((id) => {
          const t = getTemplate(id);
          return (
            <li key={id}>
              <Link href={`/lab/${id}`} className="block rounded-2xl border border-line bg-paper p-4 hover:border-gold">
                <span className="font-serif text-xl text-ink">{t.nameAr}</span>
                <span className="block text-sm text-ink-soft" dir="ltr">
                  {t.nameEn}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
