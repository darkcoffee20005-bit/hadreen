'use server';

import { revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { parseGuestsCsv, type CsvIssue } from '@/lib/csv';
import { db } from '@/lib/db';
import { clientIp, limits } from '@/lib/ratelimit';
import { isAdmin, logInAdmin, logOutAdmin } from '@/lib/session';
import { weddingInputSchema, type WeddingFormInput } from '@/lib/validation/wedding';
import { weddingTag } from '@/lib/wedding-cache';
import { duplicateWedding, existingGuestNames, importGuests, saveWedding } from '@/lib/weddings';

async function guard() {
  if (!(await isAdmin())) redirect('/admin/login');
}

export async function loginAction(_prev: { error?: string } | undefined, form: FormData) {
  if (!(await limits.login(clientIp(await headers())))) return { error: 'محاولات كثيرة، جرّبوا بعد عشر دقائق.' };
  const ok = await logInAdmin(String(form.get('password') ?? ''));
  if (!ok) return { error: 'كلمة المرور غير صحيحة.' };
  redirect('/admin');
}

export async function logoutAction() {
  await logOutAdmin();
  redirect('/admin/login');
}

export type SaveWeddingResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

const FIELD_ERRORS: Record<string, string> = {
  slug: 'الرابط: أحرف إنجليزية صغيرة وأرقام وشرطة فقط.',
  groomName: 'اكتبوا اسم العريس.',
  brideName: 'اكتبوا اسم العروس.',
  venueName: 'اكتبوا اسم القاعة.',
  dateLocal: 'تاريخ العرس غير صحيح.',
  rsvpDeadlineLocal: 'آخر موعد للرد لازم يكون قبل العرس.',
  mapsUrl: 'رابط الخريطة لازم يبدأ بـ https://',
  schedule: 'تأكدوا من برنامج الحفل (الوقت والعنوان).',
  dressCode: 'تأكدوا من ألوان اللباس.',
  paletteOverrides: 'لون غير صحيح.',
};

export async function saveWeddingAction(id: string | null, form: WeddingFormInput): Promise<SaveWeddingResult> {
  await guard();
  const parsed = weddingInputSchema.safeParse(form);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      errors[key] ??= FIELD_ERRORS[key] ?? 'تأكدوا من هذا الحقل.';
    }
    return { ok: false, errors };
  }
  const before = id ? await db().wedding.findUnique({ where: { id }, select: { slug: true } }) : null;
  const result = await saveWedding(parsed.data, id ?? undefined);
  if (!result.ok) return { ok: false, errors: { slug: 'هذا الرابط مستخدم لعرس ثاني.' } };
  revalidateTag(weddingTag(result.slug));
  if (before && before.slug !== result.slug) revalidateTag(weddingTag(before.slug));
  return { ok: true, id: result.id };
}

export async function setStatusAction(id: string, status: 'draft' | 'live') {
  await guard();
  const w = await db().wedding.update({ where: { id }, data: { status }, select: { slug: true } });
  revalidateTag(weddingTag(w.slug));
}

export async function duplicateWeddingAction(id: string) {
  await guard();
  const copy = await duplicateWedding(id);
  redirect(`/admin/weddings/${copy.id}`);
}

export async function deleteWeddingAction(id: string) {
  await guard();
  const w = await db().wedding.delete({ where: { id }, select: { slug: true } });
  revalidateTag(weddingTag(w.slug));
}

export async function importGuestsAdminAction(
  weddingId: string,
  csv: string,
  defaultSeats: number,
): Promise<{ ok: true; imported: number; issues: CsvIssue[] } | { ok: false; error: string }> {
  await guard();
  if (csv.length > 200_000 || !Number.isInteger(defaultSeats) || defaultSeats < 1 || defaultSeats > 20) {
    return { ok: false, error: 'الملف كبير أو عدد المقاعد غير صحيح.' };
  }
  const { rows, issues } = parseGuestsCsv(csv, { defaultSeats, existingNames: await existingGuestNames(weddingId) });
  return { ok: true, imported: await importGuests(weddingId, rows), issues };
}
