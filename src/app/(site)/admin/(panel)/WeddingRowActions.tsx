'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { ui } from '@/components/ui';
import { deleteWeddingAction, duplicateWeddingAction, setStatusAction } from '../actions';

export function WeddingRowActions({
  id,
  status,
  inviteLink,
  dashboardLink,
  pin,
}: {
  id: string;
  status: 'draft' | 'live';
  inviteLink: string;
  dashboardLink: string;
  pin: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex w-full flex-wrap gap-1 sm:w-auto" aria-busy={pending}>
      <Link href={`/admin/weddings/${id}`} className={ui.ghost}>
        تعديل
      </Link>
      <a href={inviteLink} target="_blank" rel="noopener noreferrer" className={ui.ghost}>
        الدعوة
      </a>
      <a href={dashboardLink} target="_blank" rel="noopener noreferrer" className={ui.ghost}>
        لوحة العروسين
      </a>
      <span className="inline-flex items-center px-3 py-1.5 text-sm text-ink-soft">
        الرمز: <bdi dir="ltr" className="ms-1 font-medium tracking-widest text-ink">{pin || '—'}</bdi>
      </span>
      <button
        type="button"
        className={ui.ghost}
        disabled={pending}
        onClick={() => start(() => setStatusAction(id, status === 'live' ? 'draft' : 'live'))}
      >
        {status === 'live' ? 'إخفاء' : 'نشر'}
      </button>
      <button type="button" className={ui.ghost} disabled={pending} onClick={() => start(() => duplicateWeddingAction(id))}>
        نسخ
      </button>
      <button
        type="button"
        className={ui.danger}
        disabled={pending}
        onClick={() => {
          if (window.confirm('حذف العرس وكل ضيوفه وردودهم؟ ما يمكن التراجع.')) start(() => deleteWeddingAction(id));
        }}
      >
        حذف
      </button>
    </div>
  );
}
