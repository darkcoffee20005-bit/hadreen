/** Shared building blocks for the dashboard and admin (brand palette, RTL-first). */

export const ui = {
  input:
    'w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 focus:border-gold focus:outline-none',
  label: 'mb-1.5 block text-sm text-ink-soft',
  card: 'rounded-3xl border border-line bg-paper',
  primary:
    'inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-5 py-2.5 font-medium text-ivory transition hover:bg-emerald-deep disabled:opacity-40',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-ink transition hover:border-gold disabled:opacity-40',
  ghost: 'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-soft transition hover:bg-emerald-soft hover:text-ink',
  danger: 'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-danger transition hover:bg-red-50',
} as const;

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={ui.label}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-paper p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl text-ink">{title}</h2>
          <button type="button" onClick={onClose} className={ui.ghost} aria-label="إغلاق">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
