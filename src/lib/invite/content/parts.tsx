/** Small shared pieces of the invitation content. */

export function Ornament({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 16" aria-hidden="true" className={`mx-auto h-4 w-40 text-inv-gold ${className}`}>
      <path d="M0 8h62M98 8h62" stroke="currentColor" strokeWidth="1" />
      <path d="M80 1l7 7-7 7-7-7z" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="68" cy="8" r="1.6" fill="currentColor" />
      <circle cx="92" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function Section({
  id,
  title,
  children,
  className = '',
}: {
  id?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={title && id ? `${id}-title` : undefined} className={`px-6 py-14 ${className}`}>
      <div className="mx-auto max-w-xl">
        {title && (
          <header className="mb-8 text-center">
            <h2 id={id ? `${id}-title` : undefined} className="font-inv-serif text-2xl text-inv-gold-ink">
              {title}
            </h2>
            <Ornament className="mt-3" />
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
