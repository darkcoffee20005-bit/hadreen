import { INSTAGRAM_URL } from '@/lib/links';
import { copy } from './copy';

/** A thin gold rule with a lozenge, the site's recurring ornament. */
export function Ornament({ className = '', tone = 'gold' }: { className?: string; tone?: 'gold' | 'light' }) {
  const color = tone === 'gold' ? 'var(--color-gold)' : 'rgba(248,243,232,0.7)';
  return (
    <svg aria-hidden="true" viewBox="0 0 160 12" className={`mx-auto h-3 w-40 ${className}`} fill="none">
      <path d="M0 6h64M96 6h64" stroke={color} strokeWidth="1" />
      <path d="M80 1l5 5-5 5-5-5z" stroke={color} strokeWidth="1" />
      <circle cx="70" cy="6" r="1.2" fill={color} />
      <circle cx="90" cy="6" r="1.2" fill={color} />
    </svg>
  );
}

export function SectionTitle({ id, title, lead, tone = 'dark' }: { id: string; title: string; lead?: string; tone?: 'dark' | 'light' }) {
  return (
    <header className="mx-auto max-w-2xl text-center" data-reveal>
      <h2 id={id} className={`font-display text-[clamp(2.1rem,6vw,3.4rem)] leading-display ${tone === 'dark' ? 'text-emerald' : 'text-gold'}`}>
        {title}
      </h2>
      <Ornament className="mt-3" tone={tone === 'dark' ? 'gold' : 'light'} />
      {lead && <p className={`mt-5 font-serif text-lg leading-loose ${tone === 'dark' ? 'text-ink-soft' : 'text-ivory/85'}`}>{lead}</p>}
    </header>
  );
}

/** The Instagram call to action (the only way to order: no phone or WhatsApp, by design). */
export function InstagramButton({ label = copy.order, variant = 'gold', className = '' }: { label?: string; variant?: 'gold' | 'outline' | 'emerald'; className?: string }) {
  const styles = {
    gold: 'bg-gold text-emerald-deep hover:bg-[#d6b97f] shadow-[0_10px_30px_-10px_rgba(201,169,110,0.8)]',
    outline: 'border border-gold/70 text-ivory hover:bg-white/10',
    emerald: 'bg-emerald text-ivory hover:bg-emerald-deep',
  }[variant];
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-medium transition ${styles} ${className}`}
    >
      <InstagramGlyph />
      {label}
    </a>
  );
}

export function InstagramGlyph({ className = 'size-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
