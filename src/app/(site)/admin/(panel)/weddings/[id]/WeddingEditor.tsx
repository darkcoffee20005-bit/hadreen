'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CsvImportDialog } from '@/components/GuestDialogs';
import { Field, ui } from '@/components/ui';
import { toEasternDigits } from '@/lib/date/numerals';
import { parseLocalDateTime } from '@/lib/date/tz';
import { CITIES } from '@/lib/geo';
import type { TemplateId } from '@/lib/invite/types';
import { PLACEHOLDER_TRACKS } from '@/lib/music';
import { contrastIssues, resolvePalette } from '@/lib/palette';
import type { WeddingFormInput } from '@/lib/validation/wedding';
import type { PublicWedding } from '@/lib/wedding-types';
import { getTemplate, TEMPLATES } from '@/templates';
import { importGuestsAdminAction, rotateCouplePinAction, saveWeddingAction } from '../../../actions';

const NIKKAH_VERSE =
  'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً';

/** The unsaved form as the invitation would render it, for the live preview iframe. */
function previewWedding(form: WeddingFormInput): PublicWedding {
  const date = parseLocalDateTime(form.dateLocal) ?? new Date();
  const deadline = parseLocalDateTime(form.rsvpDeadlineLocal) ?? date;
  return {
    id: 'preview',
    slug: form.slug || 'preview',
    template: form.template,
    lang: form.lang,
    groomName: form.groomName || 'اسم العريس',
    brideName: form.brideName || 'اسم العروس',
    monogram: form.monogram,
    dateTimeUtc: date.toISOString(),
    verse: form.verse,
    intro: form.intro,
    venueName: form.venueName || 'اسم القاعة',
    venueArea: form.venueArea,
    mapsUrl: form.mapsUrl,
    dressCode: form.dressCode,
    notes: form.notes,
    rsvpDeadline: deadline.toISOString(),
    schedule: form.schedule.filter((s) => s.title),
    musicTrack: form.musicTrack,
    paletteOverrides: form.paletteOverrides,
    originCity: form.originCity,
    destinationCity: form.destinationCity,
    status: form.status,
    isDemo: false,
    openRsvpMaxSeats: form.openRsvpMaxSeats,
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${ui.card} space-y-4 p-5`}>
      <h2 className="font-serif text-xl text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function WeddingEditor({
  id,
  initial,
  guestCount,
  dashboardLink,
  pin = '',
  justCreated = false,
}: {
  id: string | null;
  initial: WeddingFormInput;
  guestCount: number;
  dashboardLink: string | null;
  /** The couple's dashboard code. */
  pin?: string;
  /** Arrived here right after creating the wedding: keep the confirmation visible. */
  justCreated?: boolean;
}) {
  const uid = useId();
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(justCreated ? 'انحفظ ✓' : null);
  const [importing, setImporting] = useState(false);

  const set = <K extends keyof WeddingFormInput>(key: K, value: WeddingFormInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const template = getTemplate(form.template);
  const palette = resolvePalette(template, form.paletteOverrides);
  const contrast = contrastIssues(palette);
  const f = (name: string) => `${uid}-${name}`;

  const sendPreview = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      { type: 'hadreen:preview', wedding: previewWedding(form) },
      window.location.origin,
    );
  }, [form]);

  useEffect(() => {
    const t = setTimeout(sendPreview, 120);
    return () => clearTimeout(t);
  }, [sendPreview]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'hadreen:preview-ready') sendPreview();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sendPreview]);

  function chooseTemplate(next: TemplateId) {
    const fromPlaceholder = PLACEHOLDER_TRACKS.some((t) => t.id === form.musicTrack);
    setForm((cur) => ({
      ...cur,
      template: next,
      paletteOverrides: {},
      musicTrack: fromPlaceholder ? getTemplate(next).music.placeholder : cur.musicTrack,
    }));
  }

  async function save(status?: 'draft' | 'live') {
    setSaving(true);
    setSaved(null);
    const payload = status ? { ...form, status } : form;
    const result = await saveWeddingAction(id, payload);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (status) setForm(payload);
    setSaved('انحفظ ✓');
    if (!id) router.replace(`/admin/weddings/${result.id}?saved=1`);
    else router.refresh();
  }

  const isTravel = form.template === 'destination-love';

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-5 pb-28">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-3xl text-ink">{id ? 'تعديل العرس' : 'عرس جديد'}</h1>
          <Link href="/admin" className={ui.ghost}>
            ← كل الأعراس
          </Link>
        </div>

        <Section title="القالب والألوان">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="القالب">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={form.template === t.id}
                onClick={() => chooseTemplate(t.id)}
                className={`rounded-2xl border p-3 text-start transition ${
                  form.template === t.id ? 'border-emerald ring-2 ring-emerald/30' : 'border-line hover:border-gold'
                }`}
              >
                <span className="flex gap-1" aria-hidden="true">
                  {[t.palette.accent, t.palette.band, t.palette.gold, t.palette.bg].map((c, i) => (
                    <span key={i} className="size-3.5 rounded-full border border-line" style={{ background: c }} />
                  ))}
                </span>
                <span className="mt-2 block font-medium text-ink">{t.nameAr}</span>
                {t.exclusive && <span className="mt-0.5 block text-xs text-ink-soft">حصري لـ{t.exclusive}</span>}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="الألوان">
            {template.paletteVariants.map((v) => {
              const active = (form.paletteOverrides.variant ?? template.paletteVariants[0]!.id) === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set('paletteOverrides', { variant: v.id })}
                  className={`rounded-full px-4 py-1.5 text-sm ${active ? 'bg-ink text-ivory' : 'bg-ivory text-ink-soft'}`}
                >
                  {v.nameAr}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="لون الأزرار (اختياري)" htmlFor={f('accent')}>
              <input
                id={f('accent')}
                type="color"
                className="h-11 w-full cursor-pointer rounded-xl border border-line bg-paper"
                value={palette.accent}
                onChange={(e) => set('paletteOverrides', { ...form.paletteOverrides, accent: e.target.value })}
              />
            </Field>
            <Field label="لون الشريط (اختياري)" htmlFor={f('band')}>
              <input
                id={f('band')}
                type="color"
                className="h-11 w-full cursor-pointer rounded-xl border border-line bg-paper"
                value={palette.band}
                onChange={(e) => set('paletteOverrides', { ...form.paletteOverrides, band: e.target.value })}
              />
            </Field>
          </div>
          {contrast.length > 0 && (
            <p role="alert" className="text-sm text-danger">
              التباين ضعيف بين النص والخلفية ({contrast.map((c) => `${c.fg}/${c.bg} ${c.ratio}`).join('، ')}). اختاروا لون أغمق.
            </p>
          )}
        </Section>

        <Section title="العروسين">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسم العريس" htmlFor={f('groom')} error={errors.groomName}>
              <input id={f('groom')} className={ui.input} value={form.groomName} onChange={(e) => set('groomName', e.target.value)} />
            </Field>
            <Field label="اسم العروس" htmlFor={f('bride')} error={errors.brideName}>
              <input id={f('bride')} className={ui.input} value={form.brideName} onChange={(e) => set('brideName', e.target.value)} />
            </Field>
            <Field label="المونوغرام (للختم)" htmlFor={f('mono')} hint="يُترك فارغاً لاستخدام أول حرف من كل اسم">
              <input id={f('mono')} className={ui.input} maxLength={12} value={form.monogram} onChange={(e) => set('monogram', e.target.value)} />
            </Field>
            <Field label="لغة الدعوة" htmlFor={f('lang')}>
              <select id={f('lang')} className={ui.input} value={form.lang} onChange={(e) => set('lang', e.target.value as 'ar' | 'en')}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="الموعد والمكان">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="تاريخ ووقت العرس (بتوقيت بغداد)" htmlFor={f('date')} error={errors.dateLocal}>
              <input id={f('date')} type="datetime-local" className={ui.input} value={form.dateLocal} onChange={(e) => set('dateLocal', e.target.value)} />
            </Field>
            <Field label="آخر موعد لتأكيد الحضور" htmlFor={f('deadline')} error={errors.rsvpDeadlineLocal}>
              <input
                id={f('deadline')}
                type="datetime-local"
                className={ui.input}
                value={form.rsvpDeadlineLocal}
                onChange={(e) => set('rsvpDeadlineLocal', e.target.value)}
              />
            </Field>
            <Field label="اسم القاعة" htmlFor={f('venue')} error={errors.venueName}>
              <input id={f('venue')} className={ui.input} value={form.venueName} onChange={(e) => set('venueName', e.target.value)} />
            </Field>
            <Field label="المنطقة" htmlFor={f('area')}>
              <input id={f('area')} className={ui.input} value={form.venueArea} onChange={(e) => set('venueArea', e.target.value)} />
            </Field>
          </div>
          <Field label="رابط الموقع على الخريطة" htmlFor={f('maps')} error={errors.mapsUrl} hint="إذا تُرك فارغاً نبحث عن اسم القاعة بخرائط Google">
            <input id={f('maps')} dir="ltr" className={ui.input} placeholder="https://maps.app.goo.gl/…" value={form.mapsUrl} onChange={(e) => set('mapsUrl', e.target.value)} />
          </Field>
          {isTravel && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="الطيارة تطلع من" htmlFor={f('origin')}>
                <select id={f('origin')} className={ui.input} value={form.originCity} onChange={(e) => set('originCity', e.target.value)}>
                  <option value="">بدون (من الأفق)</option>
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ar}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="مدينة العرس" htmlFor={f('dest')}>
                <select id={f('dest')} className={ui.input} value={form.destinationCity || 'baghdad'} onChange={(e) => set('destinationCity', e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ar}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </Section>

        <Section title="النصوص">
          <Field label="آية أو بيت شعر (اختياري)" htmlFor={f('verse')}>
            <textarea id={f('verse')} rows={2} className={ui.input} value={form.verse} onChange={(e) => set('verse', e.target.value)} />
          </Field>
          {!form.verse && (
            <button type="button" className={ui.ghost} onClick={() => set('verse', NIKKAH_VERSE)}>
              + إضافة آية «ومن آياته أن خلق لكم…»
            </button>
          )}
          <Field label="كلمة الدعوة" htmlFor={f('intro')}>
            <textarea id={f('intro')} rows={3} className={ui.input} value={form.intro} onChange={(e) => set('intro', e.target.value)} />
          </Field>
          <Field label="ملاحظات للضيوف (اختياري)" htmlFor={f('notes')}>
            <textarea id={f('notes')} rows={2} className={ui.input} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </Section>

        <Section title="برنامج الحفل">
          {errors.schedule && <p className="text-sm text-danger">{errors.schedule}</p>}
          <ol className="space-y-3">
            {form.schedule.map((item, i) => (
              <li key={i} className="grid grid-cols-[6.5rem_1fr_auto] gap-2 sm:grid-cols-[6.5rem_1fr_1fr_auto]">
                <input
                  type="time"
                  aria-label="الوقت"
                  className={ui.input}
                  value={item.time}
                  onChange={(e) => set('schedule', form.schedule.map((s, j) => (j === i ? { ...s, time: e.target.value } : s)))}
                />
                <input
                  aria-label="العنوان"
                  placeholder="الزفّة"
                  className={ui.input}
                  value={item.title}
                  onChange={(e) => set('schedule', form.schedule.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)))}
                />
                <input
                  aria-label="تفاصيل"
                  placeholder="تفاصيل (اختياري)"
                  className={`${ui.input} col-span-2 sm:col-span-1`}
                  value={item.subtitle}
                  onChange={(e) => set('schedule', form.schedule.map((s, j) => (j === i ? { ...s, subtitle: e.target.value } : s)))}
                />
                <button type="button" aria-label="حذف" className={`${ui.danger} row-start-1 col-start-3 sm:col-start-4`} onClick={() => set('schedule', form.schedule.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </li>
            ))}
          </ol>
          {form.schedule.length < 12 && (
            <button type="button" className={ui.secondary} onClick={() => set('schedule', [...form.schedule, { time: '20:00', title: '', subtitle: '' }])}>
              + فقرة
            </button>
          )}
        </Section>

        <Section title="لباس الحفل">
          <Field label="الوصف" htmlFor={f('dress')} error={errors.dressCode}>
            <input id={f('dress')} className={ui.input} placeholder="رسمي" value={form.dressCode.label} onChange={(e) => set('dressCode', { ...form.dressCode, label: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            {form.dressCode.swatches.map((hex, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <input
                  type="color"
                  aria-label={`لون ${toEasternDigits(i + 1)}`}
                  className="size-10 cursor-pointer rounded-full border border-line"
                  value={hex}
                  onChange={(e) => set('dressCode', { ...form.dressCode, swatches: form.dressCode.swatches.map((s, j) => (j === i ? e.target.value : s)) })}
                />
                <button type="button" aria-label="حذف اللون" className={ui.danger} onClick={() => set('dressCode', { ...form.dressCode, swatches: form.dressCode.swatches.filter((_, j) => j !== i) })}>
                  ✕
                </button>
              </span>
            ))}
            {form.dressCode.swatches.length < 6 && (
              <button type="button" className={ui.secondary} onClick={() => set('dressCode', { ...form.dressCode, swatches: [...form.dressCode.swatches, '#C9A96E'] })}>
                + لون
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="للسيدات" htmlFor={f('ladies')}>
              <input id={f('ladies')} className={ui.input} value={form.dressCode.ladies} onChange={(e) => set('dressCode', { ...form.dressCode, ladies: e.target.value })} />
            </Field>
            <Field label="للرجال" htmlFor={f('gents')}>
              <input id={f('gents')} className={ui.input} value={form.dressCode.gentlemen} onChange={(e) => set('dressCode', { ...form.dressCode, gentlemen: e.target.value })} />
            </Field>
          </div>
        </Section>

        <Section title="الموسيقى وتأكيد الحضور">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الموسيقى" htmlFor={f('music')}>
              <select id={f('music')} className={ui.input} value={form.musicTrack} onChange={(e) => set('musicTrack', e.target.value)}>
                {PLACEHOLDER_TRACKS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameAr}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="مقاعد الرد من الرابط العام" htmlFor={f('open')} hint="٠ = الرد من الرابط الشخصي فقط">
              <input
                id={f('open')}
                type="number"
                min={0}
                max={10}
                className={ui.input}
                value={form.openRsvpMaxSeats}
                onChange={(e) => set('openRsvpMaxSeats', Number(e.target.value))}
              />
            </Field>
          </div>
        </Section>

        <Section title="الرابط">
          <Field label="رابط الدعوة" htmlFor={f('slug')} error={errors.slug} hint="أحرف إنجليزية صغيرة وأرقام وشرطة">
            <div className="flex items-center gap-2" dir="ltr">
              <span className="text-sm text-ink-soft">/i/</span>
              <input id={f('slug')} className={ui.input} value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} />
            </div>
          </Field>
        </Section>

        {id && (
          <Section title="الضيوف">
            <p className="text-ink-soft">عدد الضيوف: {toEasternDigits(guestCount)}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={ui.secondary} onClick={() => setImporting(true)}>
                استيراد قائمة CSV
              </button>
              {dashboardLink && (
                <a href={dashboardLink} target="_blank" rel="noopener noreferrer" className={ui.secondary}>
                  لوحة العروسين
                </a>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p>
                رمز لوحة العروسين: <bdi dir="ltr" className="font-medium tracking-widest">{pin || '—'}</bdi>
              </p>
              <button
                type="button"
                className={ui.ghost}
                onClick={async () => {
                  if (!window.confirm('رمز جديد؟ الرمز القديم يبطل، والعرسان لازم يكتبون الرمز الجديد.')) return;
                  await rotateCouplePinAction(id);
                  router.refresh();
                }}
              >
                رمز جديد
              </button>
            </div>
            <p className="text-xs text-ink-soft">دزّوا للعرسان الرابط والرمز، كل واحد برسالة.</p>
          </Section>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-2 text-center text-sm text-ink-soft">معاينة مباشرة (بدون حفظ)</p>
        <div className="mx-auto w-[300px] rounded-[2.6rem] border-[10px] border-ink bg-ink shadow-2xl">
          <iframe
            ref={frame}
            src="/admin/preview"
            title="معاينة الدعوة"
            className="h-[600px] w-full rounded-[1.9rem] bg-ivory"
            onLoad={sendPreview}
          />
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3">
          <button type="button" className={ui.primary} disabled={saving} onClick={() => save()}>
            {saving ? 'جاري الحفظ…' : 'حفظ'}
          </button>
          <button
            type="button"
            className={ui.secondary}
            disabled={saving}
            onClick={() => save(form.status === 'live' ? 'draft' : 'live')}
          >
            {form.status === 'live' ? 'إخفاء الدعوة (مسودة)' : 'حفظ ونشر'}
          </button>
          <span className={`rounded-full px-3 py-1 text-xs ${form.status === 'live' ? 'bg-emerald text-ivory' : 'bg-[#f6ecd6] text-gold-ink'}`}>
            {form.status === 'live' ? 'منشورة' : 'مسودة'}
          </span>
          <span aria-live="polite" className="text-sm text-emerald">
            {saved}
          </span>
          {Object.keys(errors).length > 0 && <span className="text-sm text-danger">في حقول تحتاج تصحيح.</span>}
        </div>
      </div>

      {importing && id && (
        <CsvImportDialog
          open
          onClose={() => {
            setImporting(false);
            router.refresh();
          }}
          onImport={(csv, seats) => importGuestsAdminAction(id, csv, seats)}
        />
      )}
    </main>
  );
}
