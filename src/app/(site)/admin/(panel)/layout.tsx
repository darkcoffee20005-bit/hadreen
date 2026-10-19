import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { ui } from '@/components/ui';
import { logoutAction } from '../actions';

export const metadata: Metadata = { title: 'الإدارة', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/admin" className="font-display text-2xl leading-display text-emerald">
            حاضرين <span className="font-ui text-sm text-ink-soft">· الإدارة</span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={ui.ghost}>
              خروج
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
