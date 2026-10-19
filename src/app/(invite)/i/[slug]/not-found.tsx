import { ar } from '@/lib/i18n/ar';

export default function InviteNotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-ivory p-8 text-center text-ink">
      <div>
        <p className="font-display text-5xl leading-display text-gold-ink">حاضرين</p>
        <h1 className="mt-4 text-xl font-medium">{ar.notFound.title}</h1>
        <p className="mt-2 text-ink-soft">{ar.notFound.body}</p>
      </div>
    </main>
  );
}
