import { notFound, redirect } from 'next/navigation';
import { labEnabled } from '@/lib/env';
import { TEMPLATE_IDS, type TemplateId } from '@/lib/invite/types';

export const dynamic = 'force-dynamic';

/** /lab/<template> opens that template's demo invitation with the lab panel. */
export default async function LabTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ template: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { template } = await params;
  if (!labEnabled() || !(TEMPLATE_IDS as readonly string[]).includes(template)) notFound();
  const query = new URLSearchParams({ lab: '1' });
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === 'string' && k !== 'lab') query.set(k, v);
  redirect(`/i/demo-${template as TemplateId}?${query}`);
}
