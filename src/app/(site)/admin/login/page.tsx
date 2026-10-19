import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/session';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'دخول الإدارة', robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin');
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <p className="font-display text-5xl leading-display text-emerald">حاضرين</p>
        <p className="mt-2 text-ink-soft">لوحة الإدارة</p>
        <LoginForm />
      </div>
    </main>
  );
}
