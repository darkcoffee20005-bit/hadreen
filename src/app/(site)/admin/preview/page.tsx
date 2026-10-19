import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/session';
import { PreviewFrame } from './PreviewFrame';

export const dynamic = 'force-dynamic';

/** Framed by the wedding editor; renders unsaved form state sent with postMessage. */
export default async function PreviewPage() {
  if (!(await isAdmin())) notFound();
  return <PreviewFrame />;
}
