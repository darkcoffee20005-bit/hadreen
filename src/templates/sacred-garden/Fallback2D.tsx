import { useId } from 'react';
import type { SceneView } from '@/lib/invite/scene-types';
import { archOutline, ARCH, leafLayout, roseLayout } from './layout';
import { BEAK_PATH, SWAN_PATH } from './SwanHeart';

/**
 * The Sacred Garden without WebGL: the same garden as the 3D scene, in SVG and CSS.
 *  Gate: a blush envelope (gilded double rule, corner rosettes, folds) sealed with wine wax.
 *  Opening (3 s): the seal splits in two, the flap turns on rotateX and shows its wine liner,
 *  the envelope sinks away while the garden fades up and two swans glide in to form the heart.
 *  Backdrop: golden-hour sky, cypress and palms, a rose hedge, the arch over the pool, the swans.
 * Under prefers-reduced-motion nothing moves: the envelope fades out and the garden fades in.
 */
export const OPENING_MS = 3000;

const M = 135; // SVG units per metre for the arch layer
const ARCH_PATH = `M${archOutline(28)
  .map(([x, y]) => `${(x * M).toFixed(1)} ${(-y * M).toFixed(1)}`)
  .join('L')}Z`;
const ROSES = roseLayout(90).filter((r) => r.facing[2] > 0.2);
const LEAVES = leafLayout(ROSES, 40).filter((l) => l.facing[2] > 0.2);
const PLINTHS = [-1, 1].map((s) => s * (ARCH.a + ARCH.t / 2));

/** Background layer units: the waterline sits at y=800 of a 1600×1000 box anchored to the bottom. */
/** The hedge as seen in 2D: tall behind the arch (above its apex at every screen shape), stepping down at the sides. */
const hedgeTop = (x: number) => {
  const a = Math.abs(x - 800);
  const s = (e0: number, e1: number) => {
    const t = Math.min(1, Math.max(0, (a - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  return 300 - 110 * s(560, 520) - 95 * s(300, 270);
};
const HEDGE_PATH = (() => {
  const pts: string[] = [];
  for (let x = 0; x <= 1600; x += 8) pts.push(`${x} ${hedgeTop(x).toFixed(1)}`);
  return `M0 800L${pts.join('L')}L1600 800Z`;
})();
const cypress = (x: number, base: number, h: number, w: number) =>
  `M${x - w} ${base}C${x - w} ${base - h * 0.55} ${x - w * 0.4} ${base - h * 0.86} ${x} ${base - h}C${x + w * 0.4} ${base - h * 0.86} ${x + w} ${base - h * 0.55} ${x + w} ${base}Z`;
const CYPRESS_FAR = [-660, -520, -380, -250, 250, 380, 520, 660].map((dx, i) => cypress(800 + dx, 800, 780 + (i % 3) * 70, 48));
const CYPRESS_NEAR = [-560, -430, 430, 560].map((dx, i) => cypress(800 + dx, 810, 600 + (i % 2) * 60, 58));

const PETALS = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  delay: `${-((i * 1.7) % 9).toFixed(2)}s`,
  duration: `${9 + (i % 4) * 2.2}s`,
  drift: `${(i % 2 ? 1 : -1) * (20 + (i % 5) * 9)}px`,
  scale: (0.7 + (i % 3) * 0.2).toFixed(2),
}));

const CSS = `
.sg2d-scene{position:fixed;inset:0;overflow:hidden;pointer-events:none}
.sg2d-scene svg{position:absolute;inset:0;width:100%;height:100%}
.sg2d-petal{position:absolute;top:-3%;width:11px;height:8px;border-radius:70% 30% 70% 30%;opacity:.85;animation:sg2d-fall linear infinite}
@keyframes sg2d-fall{0%{transform:translate3d(0,0,0) rotate(0deg) scale(var(--s))}50%{transform:translate3d(var(--dx),52svh,0) rotate(200deg) scale(var(--s))}100%{transform:translate3d(0,106svh,0) rotate(420deg) scale(var(--s))}}
.sg2d-reveal{opacity:0;transition:opacity 1.2s ease .95s}
.sg2d-gate.is-open~.sg2d-reveal,.sg2d-reveal.is-open{opacity:1}
.sg2d-swan{transition:transform 1.35s cubic-bezier(.2,.7,.3,1) 1.45s,opacity .6s ease 1.45s}
.sg2d-reveal:not(.is-open) .sg2d-swan-l{transform:translateX(-150px);opacity:0}
.sg2d-reveal:not(.is-open) .sg2d-swan-r{transform:translateX(150px);opacity:0}
.sg2d-wrap{perspective:1100px}
.sg2d-env{position:relative;transform-style:preserve-3d;transition:transform .85s cubic-bezier(.55,0,.9,.45) 1.3s,opacity .5s ease 1.62s}
.sg2d-gate.is-open .sg2d-env{transform:translateY(70svh) rotate(-4deg);opacity:0}
.sg2d-flap{position:absolute;inset-inline:0;top:0;transform-origin:50% 0;transform-style:preserve-3d;transition:transform .95s cubic-bezier(.6,0,.3,1) .45s}
.sg2d-flap>svg{position:absolute;inset:0;width:100%;height:100%;backface-visibility:hidden}
.sg2d-flap>svg.back{transform:rotateX(180deg)}
.sg2d-gate.is-open .sg2d-flap{transform:rotateX(178deg)}
.sg2d-half{position:absolute;inset:0;transition:transform .8s cubic-bezier(.3,0,.7,1),opacity .45s ease .35s}
.sg2d-gate.is-open .sg2d-half-a{transform:translate(-38%,95%) rotate(-28deg);opacity:0}
.sg2d-gate.is-open .sg2d-half-b{transform:translate(38%,105%) rotate(24deg);opacity:0}
.sg2d-glint{position:absolute;inset:0;border-radius:50%;overflow:hidden}
.sg2d-glint::after{content:'';position:absolute;inset:-20%;background:linear-gradient(115deg,transparent 40%,rgba(255,236,214,.5) 50%,transparent 60%);transform:translateX(-120%);animation:sg2d-glint 3s ease-in-out infinite 1s}
@keyframes sg2d-glint{0%,55%{transform:translateX(-120%)}85%,100%{transform:translateX(120%)}}
.sg2d-gate.is-open .sg2d-glint{opacity:0}
@media (prefers-reduced-motion:reduce){
  .sg2d-gate *,.sg2d-reveal *,.sg2d-gate,.sg2d-reveal{transition-property:opacity!important;animation:none!important}
  .sg2d-gate.is-open .sg2d-env,.sg2d-gate.is-open .sg2d-flap,.sg2d-gate.is-open .sg2d-half-a,.sg2d-gate.is-open .sg2d-half-b{transform:none}
  .sg2d-gate.is-open .sg2d-env{transition-delay:0s!important;transition-duration:1.1s!important}
  .sg2d-reveal:not(.is-open) .sg2d-swan-l,.sg2d-reveal:not(.is-open) .sg2d-swan-r{transform:none}
  .sg2d-petal,.sg2d-glint{display:none}
}
`;

function useIds() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (name: string) => `sg2d-${id}-${name}`;
}

function colors(view: SceneView) {
  const s = view.palette.scene;
  return {
    paper: s.paper ?? '#F2DED6',
    seal: s.seal ?? '#6B1626',
    stone: s.stone ?? '#DCCDB9',
    rose: s.rose ?? '#D98A97',
    leaf: s.leaf ?? '#5E7A55',
    pond: s.pond ?? '#2E4B47',
    sun: s.sun ?? '#FFC98A',
    skyTop: s.skyTop ?? '#F6D2A2',
    skyLow: s.skyLow ?? '#E8A79E',
    gold: view.palette.gold,
    goldInk: view.palette.goldInk,
  };
}
type Colors = ReturnType<typeof colors>;
const mix = (a: string, b: string, pct: number) => `color-mix(in srgb, ${a} ${100 - pct}%, ${b})`;

/** The whole garden: sky, trees, hedge, pool, arch with roses, the swans' heart and petals. */
function GardenScene({ c, className = '', open = true }: { c: Colors; className?: string; open?: boolean }) {
  const id = useIds();
  const roseTones = [mix(c.rose, '#ffffff', 45), mix(c.rose, '#ffffff', 20), c.rose, mix(c.rose, c.seal, 35), '#F6E7DA'];
  return (
    <div className={`sg2d-scene ${className} ${open ? 'is-open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix(c.skyLow, '#A3849C', 40)} />
            <stop offset="0.42" stopColor={mix(c.skyLow, c.skyTop, 25)} />
            <stop offset="0.8" stopColor={mix(c.skyTop, c.sun, 45)} />
          </linearGradient>
          <radialGradient id={id('sun')}>
            <stop offset="0" stopColor="#FFF6E6" />
            <stop offset="0.08" stopColor={mix(c.sun, '#ffffff', 30)} />
            <stop offset="0.35" stopColor={c.sun} stopOpacity="0.45" />
            <stop offset="1" stopColor={c.sun} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id('pool')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix(c.pond, '#000000', 45)} />
            <stop offset="1" stopColor={mix(c.pond, '#000000', 62)} />
          </linearGradient>
          <linearGradient id={id('hedge')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix(mix(c.leaf, c.pond, 30), '#000000', 18)} />
            <stop offset="1" stopColor={mix(mix(c.leaf, c.pond, 30), '#000000', 55)} />
          </linearGradient>
        </defs>
        <rect width="1600" height="800" fill={`url(#${id('sky')})`} />
        <circle cx="1030" cy="420" r="520" fill={`url(#${id('sun')})`} />
        <g fill={mix(mix(c.leaf, c.pond, 30), c.skyTop, 18)} opacity="0.72">
          {CYPRESS_FAR.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <path d={HEDGE_PATH} fill={`url(#${id('hedge')})`} />
        <path d={HEDGE_PATH} fill="none" stroke={mix(c.sun, '#ffffff', 30)} strokeOpacity="0.35" strokeWidth="2" />
        <g>
          {Array.from({ length: 60 }, (_, i) => {
            const x = (i * 263) % 1600;
            const top = hedgeTop(x);
            const y = top + 20 + (((i * 97) % 100) / 100) * (800 - top - 40) * 0.7;
            if (Math.abs(x - 800) < 300) return null;
            return (
              <g key={i} fill={roseTones[i % roseTones.length]} opacity="0.8">
                <circle cx={x} cy={y} r={5} />
                <circle cx={x + 8} cy={y + 5} r={4} />
                <circle cx={x - 4} cy={y + 9} r={3.5} />
              </g>
            );
          })}
        </g>
        <g fill={mix(mix(c.leaf, c.pond, 30), '#000000', 30)}>
          {CYPRESS_NEAR.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <rect y="800" width="1600" height="200" fill={`url(#${id('pool')})`} />
        <path d={HEDGE_PATH} fill={mix(c.pond, '#000000', 30)} opacity="0.55" transform="translate(0 1600) scale(1 -1)" />
        <rect y="797" width="1600" height="6" fill={mix(c.stone, '#000000', 45)} />
        <ellipse cx="1030" cy="860" rx="150" ry="60" fill={`url(#${id('sun')})`} opacity="0.5" />
      </svg>

      <svg viewBox="-190 -600 380 775" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id={id('stone')} x1="0" y1="-560" x2="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={mix(c.stone, '#ffffff', 15)} />
            <stop offset="0.85" stopColor={c.stone} />
            <stop offset="1" stopColor={mix(c.stone, c.pond, 45)} />
          </linearGradient>
          <linearGradient id={id('fade')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={id('reflect')} maskUnits="userSpaceOnUse" x="-190" y="0" width="380" height="200">
            <rect x="-190" y="0" width="380" height="200" fill={`url(#${id('fade')})`} />
          </mask>
        </defs>
        <g mask={`url(#${id('reflect')})`}>
          <g transform="scale(1 -1)" opacity="0.7">
            <path d={ARCH_PATH} fill={mix(c.stone, c.pond, 35)} />
          </g>
        </g>
        <path d={ARCH_PATH} fill={`url(#${id('stone')})`} stroke={mix(c.stone, '#000000', 30)} strokeWidth="1" />
        {PLINTHS.map((x) => (
          <rect key={x} x={x * M - 32} y={-42} width={64} height={46} fill={mix(c.stone, '#000000', 8)} stroke={mix(c.stone, '#000000', 30)} strokeWidth="1" />
        ))}
        <g>
          {LEAVES.map((l, i) => (
            <ellipse key={i} cx={l.position[0] * M} cy={-l.position[1] * M} rx={l.scale * M * 0.18} ry={l.scale * M * 0.5} transform={`rotate(${((l.spin * 180) / Math.PI).toFixed(0)} ${(l.position[0] * M).toFixed(1)} ${(-l.position[1] * M).toFixed(1)})`} fill={mix(c.leaf, '#000000', 10 + (i % 3) * 10)} />
          ))}
          {ROSES.map((r, i) => {
            const cx = r.position[0] * M;
            const cy = -r.position[1] * M;
            const rr = r.scale * M * 0.95;
            const tone = roseTones[Math.floor(r.hue * roseTones.length) % roseTones.length]!;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={rr} fill={tone} />
                <circle cx={cx + rr * 0.08} cy={cy - rr * 0.05} r={rr * 0.58} fill="none" stroke={mix(tone, '#000000', 22)} strokeWidth={rr * 0.16} />
                <circle cx={cx} cy={cy} r={rr * 0.22} fill={mix(tone, '#000000', 35)} />
              </g>
            );
          })}
        </g>
        <g transform="translate(0 0)">
          <g mask={`url(#${id('reflect')})`}>
            <g transform="translate(0 270) scale(1 -1)" opacity="0.8">
              <SwanPair c={c} />
            </g>
          </g>
          <SwanPair c={c} />
        </g>
      </svg>

      {PETALS.map((p, i) => (
        <span
          key={i}
          className="sg2d-petal"
          style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, background: roseTones[i % roseTones.length], '--dx': p.drift, '--s': p.scale } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** The pair of swans meeting in a heart on the water in front of the arch (waterline at y=105). */
function SwanPair({ c }: { c: Colors }) {
  const s = 1.85;
  const swan = (
    <>
      <path d={SWAN_PATH} fill="#FBF7F1" stroke={mix(c.stone, '#000000', 25)} strokeWidth={0.5} />
      <path d={BEAK_PATH} fill="#D9692A" />
    </>
  );
  return (
    <g transform={`translate(${-50 * s} ${135 - 76 * s}) scale(${s})`}>
      <g className="sg2d-swan sg2d-swan-l">{swan}</g>
      <g className="sg2d-swan sg2d-swan-r">
        <g transform="translate(100 0) scale(-1 1)">{swan}</g>
      </g>
    </g>
  );
}

export function Backdrop2D({ view }: { view: SceneView }) {
  return (
    <>
      <style>{CSS}</style>
      <GardenScene c={colors(view)} />
    </>
  );
}

export function Gate2D({ view, opening }: { view: SceneView; opening: boolean }) {
  const c = colors(view);
  const id = useIds();
  const gold = c.gold;
  const paper = mix(c.paper, c.rose, 8);
  return (
    <>
      <style>{CSS}</style>
      <div className={`sg2d-gate ${opening ? 'is-open' : ''} sg2d-wrap relative mx-auto w-[min(80vw,41svh)] [@media(min-aspect-ratio:17/20)]:w-[min(46vw,82svh)]`} aria-hidden="true">
        <div className="sg2d-env aspect-[11/15] [@media(min-aspect-ratio:17/20)]:aspect-[162/106]">
          <div className="absolute inset-0 rounded-[5px] shadow-[0_34px_70px_-24px_rgba(40,10,16,0.6)]" style={{ background: `linear-gradient(165deg, ${mix(paper, '#ffffff', 22)}, ${paper} 55%, ${mix(paper, c.rose, 18)})` }}>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 100L50 56L100 100" fill={mix(paper, '#ffffff', 25)} stroke={mix(gold, 'transparent', 55)} strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
              <path d="M0 0L50 56L0 100Z" fill="#000" opacity="0.03" />
              <path d="M100 0L50 56L100 100Z" fill="#000" opacity="0.03" />
            </svg>
            <div className="absolute inset-[5%] rounded-[3px] border-[1.5px]" style={{ borderColor: mix(gold, 'transparent', 25) }} />
            <div className="absolute inset-[7%] rounded-[2px] border" style={{ borderColor: mix(gold, 'transparent', 50) }} />
            {[
              ['5.6%', '5.6%'],
              ['94.4%', '5.6%'],
              ['5.6%', '94.4%'],
              ['94.4%', '94.4%'],
            ].map(([x, y]) => (
              <svg key={`${x}${y}`} className="absolute aspect-square w-[9%] [@media(min-aspect-ratio:17/20)]:w-[6%]" style={{ left: x, top: y, transform: 'translate(-50%,-50%)' }} viewBox="-10 -10 20 20">
                {Array.from({ length: 8 }, (_, k) => (
                  <ellipse key={k} rx="4.4" ry="1.8" cx="4.6" fill={gold} transform={`rotate(${k * 45})`} />
                ))}
                <circle r="2.4" fill={mix(gold, '#ffffff', 20)} />
              </svg>
            ))}
          </div>

          <div className="sg2d-flap h-[46%] [@media(min-aspect-ratio:17/20)]:h-[58%]">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id={id('flap')} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={mix(paper, '#ffffff', 30)} />
                  <stop offset="1" stopColor={mix(paper, '#ffffff', 8)} />
                </linearGradient>
              </defs>
              <path d="M0 0H100L53 97Q50 101 47 97Z" fill={`url(#${id('flap')})`} />
              <path d="M5 2.5L50 90L95 2.5" fill="none" stroke={mix(gold, 'transparent', 20)} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
              <path d="M9 2.5L50 82L91 2.5" fill="none" stroke={mix(gold, 'transparent', 50)} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
            </svg>
            <svg className="back" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id={id('liner')} width="9" height="9" patternUnits="userSpaceOnUse">
                  <rect width="9" height="9" fill={c.seal} />
                  <circle cx="4.5" cy="4.5" r="2.1" fill="none" stroke={gold} strokeOpacity="0.5" strokeWidth="0.5" />
                </pattern>
              </defs>
              <path d="M0 0H100L53 97Q50 101 47 97Z" fill={`url(#${id('liner')})`} />
            </svg>
          </div>

          <div className="absolute left-1/2 top-[46%] aspect-square w-[26%] -translate-x-1/2 -translate-y-[38%] [@media(min-aspect-ratio:17/20)]:top-[58%] [@media(min-aspect-ratio:17/20)]:w-[19%]">
            {(['a', 'b'] as const).map((half) => (
              <div
                key={half}
                className={`sg2d-half sg2d-half-${half}`}
                style={{ clipPath: half === 'a' ? 'polygon(0 0,53% 0,46% 28%,56% 52%,47% 76%,52% 100%,0 100%)' : 'polygon(53% 0,100% 0,100% 100%,52% 100%,47% 76%,56% 52%,46% 28%)' }}
              >
                <svg viewBox="-50 -50 100 100" className="h-full w-full">
                  <defs>
                    <radialGradient id={id(`wax-${half}`)} cx="0.38" cy="0.32" r="0.75">
                      <stop offset="0" stopColor={mix(c.seal, '#ffffff', 28)} />
                      <stop offset="0.55" stopColor={c.seal} />
                      <stop offset="1" stopColor={mix(c.seal, '#000000', 35)} />
                    </radialGradient>
                  </defs>
                  <path d={SEAL_PATH} fill={`url(#${id(`wax-${half}`)})`} />
                  <circle r="34" fill="none" stroke={gold} strokeWidth="2.6" opacity="0.9" />
                  <circle r="28" fill="none" stroke={gold} strokeWidth="1" opacity="0.7" />
                  <text y="2" textAnchor="middle" dominantBaseline="middle" className="font-inv-display" fontSize="22" fill={mix(gold, '#ffffff', 15)} direction="rtl">
                    {view.monogram}
                  </text>
                </svg>
              </div>
            ))}
            <div className="sg2d-glint" />
          </div>
        </div>
      </div>
      <GardenScene c={c} className="sg2d-reveal -z-[9]" open={opening} />
    </>
  );
}

const SEAL_PATH = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r = 44 * (1 + 0.045 * Math.sin(a * 7) + 0.03 * Math.sin(a * 13 + 1.3));
    pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();
