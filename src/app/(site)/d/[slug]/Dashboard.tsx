'use client';

import { useEffect, useMemo, useState } from 'react';
import { matchesQuery } from '@/lib/arabic';
import { formatShortDateTime } from '@/lib/date/format';
import { toEasternDigits } from '@/lib/date/numerals';
import type { Lang } from '@/lib/lang';
import { inviteUrl } from '@/lib/links';
import { buildShareMessage } from '@/lib/share';
import type { DashboardGuest, DashboardTotals, GuestStatus } from '@/lib/wedding-types';
import { CsvImportDialog, GuestFormDialog } from '@/components/GuestDialogs';
import { Dialog, ui } from '@/components/ui';
import {
  addGuestAction,
  deleteGuestAction,
  importGuestsAction,
  rotateTokenAction,
  updateGuestAction,
} from './actions';

const n = (v: number) => toEasternDigits(v);
const rowAction =
  'inline-flex items-center rounded-full px-2.5 py-1.5 text-sm text-ink-soft transition hover:bg-emerald-soft hover:text-ink';

const STATUS: Record<GuestStatus, { label: string; className: string }> = {
  attending: { label: 'حاضرين', className: 'bg-emerald text-ivory' },
  declined: { label: 'معتذرين', className: 'bg-[#f3e1e1] text-danger' },
  opened: { label: 'فتحوا وما ردّوا', className: 'bg-[#f6ecd6] text-gold-ink' },
  pending: { label: 'بلا رد', className: 'bg-ivory text-ink-soft border border-line' },
};

type Filter = 'all' | GuestStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'attending', label: 'حاضرين' },
  { id: 'declined', label: 'معتذرين' },
  { id: 'pending', label: 'بلا رد' },
  { id: 'opened', label: 'فتحوا وما ردّوا' },
];

interface Props {
  wedding: {
    slug: string;
    lang: Lang;
    groomName: string;
    brideName: string;
    dateLine: string;
    daysLeft: number;
    isDemo: boolean;
    live: boolean;
  };
  guests: DashboardGuest[];
  totals: DashboardTotals;
  baseUrl: string;
  dashboardLink: string;
}

export function Dashboard({ wedding, guests, totals, baseUrl, dashboardLink }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [dialog, setDialog] = useState<
    | { kind: 'add' }
    | { kind: 'edit'; guest: DashboardGuest }
    | { kind: 'import' }
    | { kind: 'qr'; guest: DashboardGuest }
    | null
  >(null);

  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2200);
  };

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(done);
    } catch {
      window.prompt('انسخوا النص:', text);
    }
  };

  const visible = useMemo(
    () =>
      guests.filter(
        (g) =>
          (filter === 'all' ||
            g.status === filter ||
            (filter === 'pending' && g.status === 'opened')) &&
          (matchesQuery(g.displayName, query) || matchesQuery(g.group, query)),
      ),
    [guests, filter, query],
  );
  const messages = guests
    .filter((g) => g.message)
    .sort((a, b) => (b.respondedAt ?? '').localeCompare(a.respondedAt ?? ''));

  const linkFor = (g: DashboardGuest) => inviteUrl(baseUrl, wedding.slug, g.token);
  const messageFor = (g: DashboardGuest) =>
    buildShareMessage({
      lang: wedding.lang,
      guestName: g.displayName,
      groomName: wedding.groomName,
      brideName: wedding.brideName,
      link: linkFor(g),
    });

  const stats = [
    { label: 'المقاعد المؤكدة', value: totals.confirmedSeats, strong: true },
    { label: 'العوائل المدعوة', value: totals.invitedHouseholds },
    { label: 'معتذرين', value: totals.declined },
    { label: 'بلا رد', value: totals.noReply },
    { label: 'فتحوا وما ردّوا', value: totals.openedNoReply },
  ];

  return (
    <div className="min-h-svh bg-ivory pb-24">
      {wedding.isDemo && (
        <p className="bg-emerald px-4 py-2 text-center text-xs text-ivory">
          لوحة تجريبية: كل الأسماء والأرقام أمثلة
        </p>
      )}

      <header className="border-b border-line bg-paper">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <p className="text-sm text-gold-ink">لوحة العروسين</p>
          <h1 className="mt-1 font-display text-4xl leading-display text-ink">
            {wedding.groomName} و{wedding.brideName}
          </h1>
          <p className="mt-1 text-ink-soft">{wedding.dateLine}</p>
          {wedding.daysLeft >= 0 && (
            <p className="mt-1 text-sm text-gold-ink">
              {wedding.daysLeft === 0 ? 'الفرحة اليوم!' : `باقي ${n(wedding.daysLeft)} يوم`}
            </p>
          )}
          {!wedding.live && (
            <p className="mt-3 text-sm font-medium text-danger">الدعوة ما منشورة بعد.</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={inviteUrl(baseUrl, wedding.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className={ui.secondary}
            >
              افتحوا الدعوة
            </a>
            <button
              type="button"
              className={ui.secondary}
              onClick={() => copy(dashboardLink, 'انتسخ رابط اللوحة')}
            >
              نسخ رابط اللوحة
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-5 py-8">
        <section aria-label="الأرقام" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`${ui.card} p-4 ${s.strong ? 'col-span-2 border-gold bg-[#fbf6ea] sm:col-span-1' : ''}`}
            >
              <p className="font-serif text-3xl text-ink">{n(s.value)}</p>
              <p className="mt-1 text-sm text-ink-soft">{s.label}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="guests-title" className={`${ui.card} overflow-hidden`}>
          <div className="space-y-4 border-b border-line p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="guests-title" className="font-serif text-2xl text-ink">
                الضيوف <span className="text-base text-ink-soft">({n(guests.length)})</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={ui.primary}
                  onClick={() => setDialog({ kind: 'add' })}
                >
                  + ضيف
                </button>
                <button
                  type="button"
                  className={ui.secondary}
                  onClick={() => setDialog({ kind: 'import' })}
                >
                  استيراد CSV
                </button>
                <a href={`/d/${wedding.slug}/export.csv`} className={ui.secondary}>
                  تصدير CSV
                </a>
              </div>
            </div>
            <input
              type="search"
              aria-label="ابحثوا بالاسم أو المجموعة"
              placeholder="ابحثوا بالاسم أو المجموعة…"
              className={ui.input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div role="tablist" aria-label="تصفية" className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                    filter === f.id ? 'bg-ink text-ivory' : 'bg-ivory text-ink-soft hover:text-ink'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="p-8 text-center text-ink-soft">ما اكو ضيوف بهذا البحث.</p>
          ) : (
            <ul className="divide-y divide-line">
              {visible.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
                  data-guest={g.displayName}
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate font-medium text-ink">{g.displayName}</p>
                    <p className="text-xs text-ink-soft">
                      {[g.group, g.source === 'open' ? 'من الرابط العام' : null]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS[g.status].className}`}
                  >
                    {STATUS[g.status].label}
                  </span>
                  <span
                    className="w-20 text-sm text-ink-soft tabular-nums"
                    title="المقاعد المؤكدة / المسموحة"
                  >
                    {g.status === 'attending' ? n(g.seats) : '–'} / {n(g.maxSeats)}
                  </span>
                  <div className="-ms-2.5 flex w-full items-center sm:ms-0 sm:w-auto">
                    <button
                      type="button"
                      className={rowAction}
                      onClick={() => copy(messageFor(g), 'انتسخت الرسالة')}
                    >
                      نسخ الرسالة
                    </button>
                    <button
                      type="button"
                      className={rowAction}
                      onClick={() => setDialog({ kind: 'qr', guest: g })}
                    >
                      QR
                    </button>
                    <a
                      href={linkFor(g)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={rowAction}
                    >
                      فتح
                    </a>
                    <button
                      type="button"
                      className={rowAction}
                      onClick={() => setDialog({ kind: 'edit', guest: g })}
                    >
                      تعديل
                    </button>
                    <details className="relative">
                      <summary className={`${rowAction} cursor-pointer list-none`}>المزيد</summary>
                      <div className="absolute end-0 z-10 mt-1 flex w-36 flex-col rounded-2xl border border-line bg-paper p-1 shadow-lg">
                        <button
                          type="button"
                          className={rowAction}
                          onClick={async () => {
                            if (!window.confirm('رابط جديد لهذا الضيف؟ الرابط القديم راح يبطل.'))
                              return;
                            const r = await rotateTokenAction(wedding.slug, g.id);
                            notify(r.ok ? 'تم تجديد الرابط' : 'ما تم، جرّبوا مرة ثانية');
                          }}
                        >
                          رابط جديد
                        </button>
                        <button
                          type="button"
                          className={ui.danger}
                          onClick={async () => {
                            if (!window.confirm(`حذف ${g.displayName}؟`)) return;
                            const r = await deleteGuestAction(wedding.slug, g.id);
                            notify(r.ok ? 'انحذف' : 'ما انحذف، جرّبوا مرة ثانية');
                          }}
                        >
                          حذف
                        </button>
                      </div>
                    </details>
                  </div>
                  {g.lastOpenedAt && g.status !== 'attending' && g.status !== 'declined' && (
                    <p className="w-full text-xs text-ink-soft">
                      آخر فتح: {formatShortDateTime(new Date(g.lastOpenedAt), 'ar')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="messages-title">
          <h2 id="messages-title" className="mb-4 font-serif text-2xl text-ink">
            رسائل الضيوف
          </h2>
          {messages.length === 0 ? (
            <p className={`${ui.card} p-6 text-center text-ink-soft`}>بعد ما وصلت رسائل.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {messages.map((g) => (
                <li key={g.id} className={`${ui.card} p-5`}>
                  <p className="font-serif text-lg leading-relaxed text-ink">«{g.message}»</p>
                  <p className="mt-3 text-sm text-gold-ink">{g.displayName}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {dialog?.kind === 'add' && (
        <GuestFormDialog
          open
          title="إضافة ضيف"
          onClose={() => setDialog(null)}
          onSubmit={async (input) => (await addGuestAction(wedding.slug, input)).ok}
        />
      )}
      {dialog?.kind === 'edit' && (
        <GuestFormDialog
          open
          title="تعديل الضيف"
          initial={{
            displayName: dialog.guest.displayName,
            maxSeats: dialog.guest.maxSeats,
            group: dialog.guest.group,
          }}
          onClose={() => setDialog(null)}
          onSubmit={async (input) =>
            (await updateGuestAction(wedding.slug, dialog.guest.id, input)).ok
          }
        />
      )}
      {dialog?.kind === 'import' && (
        <CsvImportDialog
          open
          onClose={() => setDialog(null)}
          onImport={async (csv, seats) => {
            const r = await importGuestsAction(wedding.slug, csv, seats);
            return r.ok ? r : { ok: false, error: 'ما تم الاستيراد، تأكدوا من الملف.' };
          }}
        />
      )}
      {dialog?.kind === 'qr' && (
        <QrDialog
          guest={dialog.guest}
          link={linkFor(dialog.guest)}
          onClose={() => setDialog(null)}
        />
      )}

      {toast && (
        <p
          role="status"
          className="fixed inset-x-0 bottom-6 mx-auto w-fit rounded-full bg-ink px-5 py-2.5 text-sm text-ivory shadow-lg"
        >
          {toast}
        </p>
      )}
    </div>
  );
}

function QrDialog({
  guest,
  link,
  onClose,
}: {
  guest: DashboardGuest;
  link: string;
  onClose: () => void;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [png, setPng] = useState<string | null>(null);

  useEffect(() => {
    import('qrcode').then(async (QR) => {
      const opts = { margin: 2, color: { dark: '#0b3d2e', light: '#ffffff' } };
      setSvg(await QR.toString(link, { ...opts, type: 'svg' }));
      setPng(await QR.toDataURL(link, { ...opts, width: 1024 }));
    });
  }, [link]);

  return (
    <Dialog open title={`رمز QR: ${guest.displayName}`} onClose={onClose}>
      <div
        className="mx-auto aspect-square w-64 rounded-2xl bg-white p-2"
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <p className="mt-3 break-all text-center text-xs text-ink-soft" dir="ltr">
        {link}
      </p>
      {png && (
        <a
          href={png}
          download={`hadreen-qr-${guest.token}.png`}
          className={`${ui.primary} mt-5 w-full`}
        >
          تنزيل الصورة
        </a>
      )}
    </Dialog>
  );
}
