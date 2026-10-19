import { copy } from './copy';

/** The occasions, drifting by. Two copies of the strip make the loop seamless. */
export function Ticker() {
  const strip = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-10 pe-10">
      {copy.occasions.map((o) => (
        <li key={o} className="flex items-center gap-10 font-display text-3xl leading-display text-gold whitespace-nowrap">
          {o}
          <span aria-hidden="true" className="text-base text-gold/60">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="مناسباتنا" className="overflow-hidden border-y border-gold/25 bg-emerald-deep py-5">
      <div className="site-ticker flex w-max">
        {strip(false)}
        {strip(true)}
      </div>
    </section>
  );
}
