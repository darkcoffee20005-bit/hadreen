import Link from 'next/link';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/links';
import { TEMPLATES } from '@/templates';

// Placeholder until the 3D marketing site (Phase 4): brand, the six demos, and how to order.
export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="text-center">
        <p className="font-display text-6xl leading-display text-emerald">حاضرين</p>
        <p className="mt-4 font-serif text-xl text-ink-soft">دعوات زفاف تفاعلية، بالعربي، وبرابط خاص لكل عائلة.</p>
      </header>

      <section aria-labelledby="demos" className="mt-14">
        <h2 id="demos" className="text-center text-lg font-medium text-gold-ink">
          شوفوا الدعوات التجريبية
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <li key={t.id}>
              <Link
                href={`/i/demo-${t.id}`}
                className="block h-full rounded-3xl border border-line bg-paper p-6 transition hover:border-gold"
              >
                <span className="flex gap-1.5" aria-hidden="true">
                  {[t.palette.accent, t.palette.band, t.palette.gold, t.palette.bg].map((c, i) => (
                    <span key={i} className="size-4 rounded-full border border-line" style={{ background: c }} />
                  ))}
                </span>
                <span className="mt-4 block font-serif text-2xl text-ink">{t.nameAr}</span>
                <span className="mt-2 block text-sm leading-relaxed text-ink-soft">{t.taglineAr}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 text-center text-ink-soft">
        <p>باقة وحدة: ٤٩ ألف دينار</p>
        <p className="mt-2">
          للطلب راسلونا على انستكرام{' '}
          <a href={INSTAGRAM_URL} dir="ltr" className="font-medium text-gold-ink underline-offset-4 hover:underline">
            @{INSTAGRAM_HANDLE}
          </a>
        </p>
      </footer>
    </main>
  );
}
