import { PLANE_GLYPH } from './glyph';
import { barcode, type PassContent } from './pass';

/**
 * The boarding pass in the DOM (content hero card and 2D gate). Decorative: aria-hidden, every
 * word is already in the content. `state` drives the stub: whole, tearing (CSS), or torn.
 */
export function PassCard({ c, state = 'whole', className = '', style }: { c: PassContent; state?: 'whole' | 'tearing' | 'torn'; className?: string; style?: React.CSSProperties }) {
  const bars = barcode(`${c.flight.value}${c.passenger.value}`, 30);
  return (
    <div className={`dl-pass is-${state} ${className}`} dir={c.rtl ? 'rtl' : 'ltr'} aria-hidden="true" style={style}>
      <style>{PASS_CSS}</style>
      <div className="dl-main">
        <div className="dl-band">
          <span className="dl-title">{c.title}</span>
          <span className="dl-kicker">
            <svg viewBox="0 0 100 100" className="dl-glyph" style={{ transform: `rotate(${c.rtl ? -90 : 90}deg)` }}>
              <path d={PLANE_GLYPH} />
            </svg>
            {c.kicker}
          </span>
        </div>
        <div className="dl-route">
          <div className="dl-city">
            {c.from && (
              <>
                <small>{c.fromLabel}</small>
                <b>{c.from}</b>
              </>
            )}
          </div>
          <svg viewBox="0 0 120 30" className="dl-arc" preserveAspectRatio="none">
            <path d="M6 26 Q60 -6 114 26" />
          </svg>
          <div className="dl-city dl-to">
            <small>{c.toLabel}</small>
            <b>{c.to}</b>
          </div>
        </div>
        <div className="dl-fields">
          <div className="dl-f dl-wide">
            <small>{c.passenger.label}</small>
            <b>{c.passenger.value}</b>
          </div>
          <div className="dl-f dl-wide">
            <small>{c.flight.label}</small>
            <b className="dl-names">{c.flight.value}</b>
          </div>
          <div className="dl-f dl-wide">
            <small>{c.date.label}</small>
            <b>{c.date.value}</b>
          </div>
          <div className="dl-f">
            <small>{c.time.label}</small>
            <b>{c.time.value}</b>
          </div>
          <div className="dl-f">
            <small>{c.gate.label}</small>
            <b>{c.gate.value}</b>
          </div>
        </div>
        <div className="dl-stamp">{c.stubTitle}</div>
      </div>
      <div className="dl-stub">
        <div className="dl-band dl-band-stub">{c.stubTitle}</div>
        <div className="dl-seal">{c.monogram}</div>
        <div className="dl-f dl-center">
          <small>{c.passenger.label}</small>
          <b>{c.passenger.value}</b>
        </div>
        <div className="dl-bars">
          {bars.map((w, i) => (
            <i key={i} style={{ flexGrow: w, opacity: i % 2 ? 0 : 1 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const PASS_CSS = `
.dl-pass{--paper:#FBF7EF;--ink:#1E2B29;--soft:#4A5A57;--acc:#0B3D2E;--gold:#C9A96E;--goldink:#7A5C26;
  position:relative;display:flex;width:100%;font-size:var(--dl-fs,clamp(8.5px,2.55vw,14px));line-height:1.25;color:var(--ink);
  filter:drop-shadow(0 1.2em 1.6em rgba(4,20,16,.38));text-align:start}
.dl-main,.dl-stub{position:relative;background:linear-gradient(180deg,#fffefa,var(--paper));overflow:hidden}
.dl-main{flex:0 0 71.5%;border-start-start-radius:1em;border-end-start-radius:1em;
  -webkit-mask:radial-gradient(circle at var(--nx) 0,#0000 .85em,#000 .9em),radial-gradient(circle at var(--nx) 100%,#0000 .85em,#000 .9em);
  -webkit-mask-composite:source-in;mask:radial-gradient(circle at var(--nx) 0,#0000 .85em,#000 .9em),radial-gradient(circle at var(--nx) 100%,#0000 .85em,#000 .9em);mask-composite:intersect}
.dl-stub{flex:1 1 auto;border-start-end-radius:1em;border-end-end-radius:1em;display:flex;flex-direction:column;align-items:center;
  -webkit-mask:radial-gradient(circle at var(--sx) 0,#0000 .85em,#000 .9em),radial-gradient(circle at var(--sx) 100%,#0000 .85em,#000 .9em);
  -webkit-mask-composite:source-in;mask:radial-gradient(circle at var(--sx) 0,#0000 .85em,#000 .9em),radial-gradient(circle at var(--sx) 100%,#0000 .85em,#000 .9em);mask-composite:intersect;
  background-image:radial-gradient(circle,rgba(30,43,41,.38) .12em,transparent .14em),linear-gradient(180deg,#fffefa,var(--paper));
  background-size:.3em .9em,100% 100%;background-repeat:repeat-y,no-repeat;background-position:var(--sx) .6em,0 0}
.dl-pass[dir=ltr]{--nx:100%;--sx:0}.dl-pass[dir=rtl]{--nx:0;--sx:100%}
.dl-band{display:flex;align-items:center;justify-content:space-between;gap:.6em;background:var(--acc);color:#F8F3E8;padding:.62em 1.2em;border-bottom:.18em solid var(--gold)}
.dl-band-stub{width:100%;justify-content:center;color:var(--gold);font-family:var(--font-aref),serif;font-size:1.15em;padding:.4em .6em}
.dl-title{font-weight:700;font-size:1.12em;letter-spacing:.02em}
.dl-kicker{display:inline-flex;align-items:center;gap:.35em;color:var(--gold);font-size:.85em}
.dl-glyph{width:1.05em;height:1.05em;fill:currentColor}
.dl-route{display:flex;align-items:flex-end;gap:.5em;padding:.9em 1.2em .3em}
.dl-city{display:flex;flex-direction:column;min-width:0}.dl-to{text-align:end}
.dl-city small,.dl-f small{color:var(--goldink);font-size:.72em;letter-spacing:.02em}
.dl-city b{font-family:var(--font-amiri),var(--font-cormorant),serif;font-size:1.6em;line-height:1.15;white-space:nowrap}
.dl-arc{flex:1;height:1.6em;margin-bottom:.55em;overflow:visible}
.dl-arc path{fill:none;stroke:var(--gold);stroke-width:1.6;stroke-dasharray:.5 5;stroke-linecap:round;vector-effect:non-scaling-stroke}
.dl-fields{display:grid;grid-template-columns:1fr 1fr;gap:.55em 1em;padding:.6em 1.2em 1em;border-top:1px solid rgba(74,90,87,.18);margin:0 1.2em;padding-inline:0}
.dl-f{display:flex;flex-direction:column;min-width:0}
.dl-f b{font-family:var(--font-amiri),var(--font-cormorant),serif;font-size:1.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dl-f b.dl-names{font-family:var(--font-aref),var(--font-pinyon),serif;color:var(--goldink);font-size:1.18em}
.dl-wide:nth-child(3){grid-column:1 / -1}
.dl-center{align-items:center;text-align:center;padding:0 .7em;max-width:100%}
.dl-seal{display:grid;place-items:center;width:3.3em;height:3.3em;margin:.75em 0 .5em;border-radius:50%;color:var(--goldink);font-family:var(--font-aref),var(--font-pinyon),serif;font-size:1em;
  border:.12em solid var(--gold);box-shadow:inset 0 0 0 .22em var(--paper),inset 0 0 0 .3em var(--gold)}
.dl-bars{display:flex;width:78%;height:2.4em;margin:.6em 0 .9em}.dl-bars i{background:var(--ink);min-width:1px}
.dl-stamp{position:absolute;inset-inline-end:7%;top:44%;padding:.25em .8em;border:.16em double var(--goldink);border-radius:.4em;color:var(--goldink);
  font-family:var(--font-aref),serif;font-size:1.5em;transform:rotate(-11deg) scale(1.6);opacity:0;pointer-events:none}
.dl-pass.is-torn .dl-stub{visibility:hidden}
.dl-pass.is-torn .dl-stamp{opacity:.9;transform:rotate(-11deg)}
.dl-pass.is-tearing .dl-stub{transform-origin:var(--sx) 0;animation:dl-tear 1.5s cubic-bezier(.45,0,.65,1) forwards}
.dl-pass.is-tearing .dl-stamp{animation:dl-stamp .45s cubic-bezier(.3,1.5,.6,1) .95s forwards}
.dl-pass[dir=rtl]{--dir:-1}.dl-pass[dir=ltr]{--dir:1}
@keyframes dl-tear{0%{transform:none}16%{transform:rotate(calc(var(--dir) * 5deg)) translateY(.2em)}
  100%{transform:translate(calc(var(--dir) * 3em),11em) rotate(calc(var(--dir) * 34deg));opacity:0}}
@keyframes dl-stamp{to{opacity:.9;transform:rotate(-11deg) scale(1)}}
@media (prefers-reduced-motion: reduce){
  .dl-pass.is-tearing .dl-stub{animation:dl-fade .6s ease forwards}
  .dl-pass.is-tearing .dl-stamp{animation:dl-fade-in .6s ease forwards;transform:rotate(-11deg)}
}
@keyframes dl-fade{to{opacity:0}}@keyframes dl-fade-in{to{opacity:.9}}
`;
