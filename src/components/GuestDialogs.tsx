'use client';

import { useId, useState } from 'react';
import { parseGuestsCsv, type CsvIssue } from '@/lib/csv';
import { toEasternDigits } from '@/lib/date/numerals';
import { GUEST_GROUP_MAX, GUEST_NAME_MAX, GUEST_SEATS_MAX, type GuestInput } from '@/lib/validation/guest';
import { Dialog, Field, ui } from './ui';

const n = (v: number) => toEasternDigits(v);

const ISSUE_TEXT: Record<CsvIssue['code'], string> = {
  EMPTY_NAME: 'الاسم فارغ',
  NAME_TOO_LONG: 'الاسم طويل جداً',
  INVALID_SEATS: 'عدد المقاعد غير صحيح',
  DUPLICATE: 'الاسم مكرر',
  TOO_MANY_ROWS: 'أكثر من ١٠٠٠ ضيف بالملف',
};

export function issueLine(issue: CsvIssue): string {
  return `السطر ${n(issue.line)}: ${ISSUE_TEXT[issue.code]}${issue.value ? ` (${issue.value})` : ''}`;
}

export function GuestFormDialog({
  open,
  title,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial?: GuestInput;
  onClose: () => void;
  onSubmit: (input: GuestInput) => Promise<boolean>;
}) {
  const id = useId();
  const [form, setForm] = useState<GuestInput>(initial ?? { displayName: '', maxSeats: 2, group: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} title={title} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const ok = await onSubmit({ ...form, displayName: form.displayName.trim(), group: form.group.trim() });
          setBusy(false);
          if (ok) onClose();
          else setError('ما انحفظ، تأكدوا من المعلومات.');
        }}
      >
        <Field label="اسم الضيف أو العائلة" htmlFor={`${id}-name`}>
          <input
            id={`${id}-name`}
            className={ui.input}
            required
            maxLength={GUEST_NAME_MAX}
            placeholder="مثلاً: عائلة أبو حسين"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="عدد المقاعد" htmlFor={`${id}-seats`}>
            <input
              id={`${id}-seats`}
              type="number"
              inputMode="numeric"
              min={1}
              max={GUEST_SEATS_MAX}
              className={ui.input}
              value={form.maxSeats}
              onChange={(e) => setForm({ ...form, maxSeats: Number(e.target.value) })}
            />
          </Field>
          <Field label="المجموعة (اختياري)" htmlFor={`${id}-group`}>
            <input
              id={`${id}-group`}
              className={ui.input}
              maxLength={GUEST_GROUP_MAX}
              placeholder="أهل العريس"
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value })}
            />
          </Field>
        </div>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <button type="submit" className={`${ui.primary} w-full`} disabled={busy || !form.displayName.trim()}>
          {busy ? 'جاري الحفظ…' : 'حفظ'}
        </button>
      </form>
    </Dialog>
  );
}

export type ImportOutcome = { ok: true; imported: number; issues: CsvIssue[] } | { ok: false; error: string };

export function CsvImportDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (csv: string, defaultSeats: number) => Promise<ImportOutcome>;
}) {
  const id = useId();
  const [csv, setCsv] = useState('');
  const [defaultSeats, setDefaultSeats] = useState(2);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportOutcome | null>(null);
  const preview = csv.trim() ? parseGuestsCsv(csv, { defaultSeats }) : null;

  return (
    <Dialog open={open} title="استيراد الضيوف من ملف CSV" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-soft">
          الأعمدة: <strong>الاسم</strong>، <strong>المقاعد</strong> (اختياري)، <strong>المجموعة</strong> (اختياري). يقبل
          العناوين بالعربي أو الإنجليزي، أو بدون عناوين.
        </p>
        <Field label="ملف CSV" htmlFor={`${id}-file`}>
          <input
            id={`${id}-file`}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="block w-full text-sm text-ink-soft file:me-3 file:rounded-full file:border-0 file:bg-emerald-soft file:px-4 file:py-2 file:text-ink"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setCsv(await file.text());
            }}
          />
        </Field>
        <Field label="أو الصقوا القائمة هنا" htmlFor={`${id}-text`}>
          <textarea
            id={`${id}-text`}
            rows={5}
            dir="auto"
            className={ui.input}
            placeholder={'الاسم,المقاعد,المجموعة\nعائلة أبو حسين,4,أهل العريس'}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
        </Field>
        <Field label="المقاعد الافتراضية لكل عائلة" htmlFor={`${id}-seats`}>
          <input
            id={`${id}-seats`}
            type="number"
            min={1}
            max={GUEST_SEATS_MAX}
            className={`${ui.input} w-28`}
            value={defaultSeats}
            onChange={(e) => setDefaultSeats(Number(e.target.value))}
          />
        </Field>

        {preview && !result && (
          <div className="rounded-2xl bg-ivory p-4 text-sm">
            <p className="font-medium text-ink">
              راح يُضاف {n(preview.rows.length)} ضيف
              {preview.issues.length > 0 && ` · ${n(preview.issues.length)} سطر فيه ملاحظة`}
            </p>
            {preview.rows.length > 0 && (
              <p className="mt-1 truncate text-ink-soft">
                {preview.rows
                  .slice(0, 4)
                  .map((r) => r.displayName)
                  .join('، ')}
                {preview.rows.length > 4 && '…'}
              </p>
            )}
            {preview.issues.slice(0, 5).map((issue) => (
              <p key={`${issue.line}-${issue.code}`} className="mt-1 text-danger">
                {issueLine(issue)}
              </p>
            ))}
          </div>
        )}

        {result && (
          <div aria-live="polite" className="rounded-2xl bg-emerald-soft p-4 text-sm">
            {result.ok ? (
              <>
                <p className="font-medium text-ink">تمت إضافة {n(result.imported)} ضيف.</p>
                {result.issues.slice(0, 8).map((issue) => (
                  <p key={`${issue.line}-${issue.code}`} className="mt-1 text-ink-soft">
                    {issueLine(issue)}
                  </p>
                ))}
              </>
            ) : (
              <p className="font-medium text-danger">{result.error}</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {result?.ok ? (
            <button type="button" className={`${ui.primary} w-full`} onClick={onClose}>
              تمام
            </button>
          ) : (
            <button
              type="button"
              className={`${ui.primary} w-full`}
              disabled={busy || !preview || preview.rows.length === 0}
              onClick={async () => {
                setBusy(true);
                setResult(await onImport(csv, defaultSeats));
                setBusy(false);
              }}
            >
              {busy ? 'جاري الاستيراد…' : 'استيراد'}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
