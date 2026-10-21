import { useId } from 'react';
import type { SceneView } from '@/lib/invite/scene-types';
import { archOutline, ARCH, leafLayout, rng, roseLayout } from './layout';
import { BEAK_PATH, SWAN_PATH } from './SwanHeart';

/**
 * The Sacred Garden without WebGL: the same morning garden as the 3D scene, in SVG and CSS.
 *  Gate: an ivory envelope (four flaps folded to a diamond, blind-embossed flowering sprays)
 *  under a wine wax seal; full-bleed on phones, a card on wide screens.
 *  Opening (3 s): the seal warms and splits, the four flaps fold open one after another, warm
 *  light pours out and whites out the envelope; the garden fades up and two swans glide in.
 *  Backdrop: hazy cream sky, soft far trees, a pale pool under the cusped rose arch, the swans.
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

/** Background layer: the waterline sits at y=800 of a 1600×1000 box anchored to the bottom. */
const tree = (x: number, base: number, h: number, w: number) =>
  `M${x - w} ${base}C${x - w * 1.1} ${base - h * 0.6} ${x - w * 0.5} ${base - h} ${x} ${base - h}C${x + w * 0.5} ${base - h} ${x + w * 1.1} ${base - h * 0.6} ${x + w} ${base}Z`;
const TREES = (() => {
  const rand = rng(19);
  const out: string[] = [];
  for (let x = -40; x <= 1640; x += 46) {
    if (Math.abs(x - 800) < 330) continue;
    out.push(tree(x + (rand() - 0.5) * 30, 790, 90 + rand() * 110, 34 + rand() * 22));
  }
  return out;
})();

/** Flowering sprays for the paper's blind emboss, in a 100×200 (portrait) envelope space. */
function sprayPaths(x: number, y: number, angle: number, length: number, size: number, seed: number) {
  const rand = rng(seed);
  const bend = (rand() - 0.5) * 0.9;
  const at = (s: number) => {
    const a = angle + bend * s * s;
    const d = s * length;
    return [x + Math.cos(a) * d, y + Math.sin(a) * d, a] as const;
  };
  let stem = '';
  for (let s = 0; s <= 1.0001; s += 0.05) {
    const [px, py] = at(s);
    stem += `${s === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  const blobs: string[] = [];
  for (let s = 0.1; s < 0.98; s += 0.11) {
    const [px, py, a] = at(s);
    const side = Math.round(s / 0.11) % 2 ? 1 : -1;
    const la = a + side * 0.8;
    const l = size * (1.6 + rand() * 0.6);
    const tx = px + Math.cos(la) * l;
    const ty = py + Math.sin(la) * l;
    const nx = -Math.sin(la) * l * 0.3;
    const ny = Math.cos(la) * l * 0.3;
    const mx = (px + tx) / 2;
    const my = (py + ty) / 2;
    blobs.push(`M${px.toFixed(1)} ${py.toFixed(1)}Q${(mx + nx).toFixed(1)} ${(my + ny).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}Q${(mx - nx).toFixed(1)} ${(my - ny).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}Z`);
  }
  const [ex, ey] = at(1);
  const r = size * 0.9;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const cx = ex + Math.cos(a) * r * 0.7;
    const cy = ey + Math.sin(a) * r * 0.7;
    blobs.push(`M${(cx - r * 0.5).toFixed(1)} ${cy.toFixed(1)}a${(r * 0.5).toFixed(1)} ${(r * 0.5).toFixed(1)} 0 1 0 ${r.toFixed(1)} 0a${(r * 0.5).toFixed(1)} ${(r * 0.5).toFixed(1)} 0 1 0 ${(-r).toFixed(1)} 0`);
  }
  return { stem, leaves: blobs.join('') };
}
const SPRAYS = [
  sprayPaths(10, 197, -Math.PI / 2 + 0.1, 84, 3.4, 3),
  sprayPaths(90, 197, -Math.PI / 2 - 0.1, 84, 3.4, 13),
  sprayPaths(10, 3, Math.PI / 2 - 0.1, 70, 3.2, 5),
  sprayPaths(90, 3, Math.PI / 2 + 0.1, 70, 3.2, 15),
];

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
.sg2d-reveal{opacity:0;transition:opacity 1.1s ease 2.05s}
.sg2d-gate.is-open~.sg2d-reveal,.sg2d-reveal.is-open{opacity:1}
.sg2d-swan{transition:transform 1.3s cubic-bezier(.2,.7,.3,1) 2.1s,opacity .6s ease 2.1s}
.sg2d-reveal:not(.is-open) .sg2d-swan-l{transform:translateX(-150px);opacity:0}
.sg2d-reveal:not(.is-open) .sg2d-swan-r{transform:translateX(150px);opacity:0}
.sg2d-env{position:fixed;inset:0;z-index:-5;perspective:1400px;transition:opacity .6s ease 2.15s}
.sg2d-gate.is-open .sg2d-env{opacity:0}
@media (min-aspect-ratio:17/20){.sg2d-env{inset:auto;left:50%;top:50%;width:min(64vw,128svh);aspect-ratio:172/112;translate:-50% -50%;box-shadow:0 40px 80px -40px rgba(90,40,30,.45)}}
.sg2d-inner{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#fff8ea,#f6e3d4 70%);opacity:0;transition:opacity 1s ease-in 1.3s}
.sg2d-gate.is-open .sg2d-inner{opacity:1}
.sg2d-glow{position:absolute;left:50%;top:50%;width:30%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;background:radial-gradient(circle,#fff4de,rgba(255,228,190,.6) 40%,rgba(255,220,180,0) 70%);opacity:0;transition:transform 1.2s ease-in 1.3s,opacity .8s ease 1.2s}
.sg2d-gate.is-open .sg2d-glow{opacity:1;transform:scale(9)}
.sg2d-flap{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .95s cubic-bezier(.6,0,.3,1)}
.sg2d-flap>svg{position:absolute;inset:0;width:100%;height:100%;backface-visibility:hidden}
.sg2d-flap>svg.back{transform:rotateX(180deg)}
.sg2d-flap.side>svg.back{transform:rotateY(180deg)}
.sg2d-top{transform-origin:50% 0;transition-delay:.7s}
.sg2d-bottom{transform-origin:50% 100%;transition-delay:.85s}
.sg2d-left{transform-origin:0 50%;transition-delay:1s}
.sg2d-right{transform-origin:100% 50%;transition-delay:1.08s}
.sg2d-gate.is-open .sg2d-top{transform:rotateX(-176deg)}
.sg2d-gate.is-open .sg2d-bottom{transform:rotateX(176deg)}
.sg2d-gate.is-open .sg2d-left{transform:rotateY(176deg)}
.sg2d-gate.is-open .sg2d-right{transform:rotateY(-176deg)}
.sg2d-emboss{display:block}
@media (min-aspect-ratio:17/20){.sg2d-emboss{display:none}}
.sg2d-seal{position:absolute;left:50%;top:50%;width:min(30vw,15svh);aspect-ratio:1;translate:-50% -50%;z-index:5}
@media (min-aspect-ratio:17/20){.sg2d-seal{width:19%}}
.sg2d-half{position:absolute;inset:0;transition:transform .8s cubic-bezier(.3,0,.7,1) .55s,opacity .45s ease .85s,filter .5s ease}
.sg2d-gate.is-open .sg2d-half{filter:drop-shadow(0 0 10px rgba(255,170,110,.9)) brightness(1.15)}
.sg2d-gate.is-open .sg2d-half-a{transform:translate(-38%,95%) rotate(-28deg);opacity:0}
.sg2d-gate.is-open .sg2d-half-b{transform:translate(38%,105%) rotate(24deg);opacity:0}
.sg2d-glint{position:absolute;inset:0;border-radius:50%;overflow:hidden}
.sg2d-glint::after{content:'';position:absolute;inset:-20%;background:linear-gradient(115deg,transparent 40%,rgba(255,236,214,.5) 50%,transparent 60%);transform:translateX(-120%);animation:sg2d-glint 3s ease-in-out infinite 1s}
@keyframes sg2d-glint{0%,55%{transform:translateX(-120%)}85%,100%{transform:translateX(120%)}}
.sg2d-gate.is-open .sg2d-glint{opacity:0}
@media (prefers-reduced-motion:reduce){
  .sg2d-gate *,.sg2d-reveal *,.sg2d-gate,.sg2d-reveal{transition-property:opacity!important;animation:none!important}
  .sg2d-gate.is-open .sg2d-flap,.sg2d-gate.is-open .sg2d-half-a,.sg2d-gate.is-open .sg2d-half-b,.sg2d-gate.is-open .sg2d-glow{transform:none}
  .sg2d-gate.is-open .sg2d-env{transition-delay:0s!important;transition-duration:1.1s!important}
  .sg2d-reveal{transition-delay:0s!important}
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
    paper: s.paper ?? '#F3EADF',
    blush: s.blush ?? '#EBC9C3',
    seal: s.seal ?? '#6E1A2A',
    stone: s.stone ?? '#EEE4D5',
    rose: s.rose ?? '#E7B3AE',
    leaf: s.leaf ?? '#93A583',
    pond: s.pond ?? '#AFC0B6',
    sun: s.sun ?? '#FFE9C9',
    skyTop: s.skyTop ?? '#F1E6DC',
    skyLow: s.skyLow ?? '#FAF1E6',
    gold: view.palette.gold,
    goldInk: view.palette.goldInk,
  };
}
type Colors = ReturnType<typeof colors>;
const mix = (a: string, b: string, pct: number) => `color-mix(in srgb, ${a} ${100 - pct}%, ${b})`;

/** The whole garden: hazy sky, far trees, pale pool, the cusped arch with roses, the swans' heart and petals. */
function GardenScene({ c, className = '', open = true }: { c: Colors; className?: string; open?: boolean }) {
  const id = useIds();
  const roseTones = [mix(c.rose, '#ffffff', 55), mix(c.rose, '#ffffff', 30), c.rose, '#FBF3EA', '#F4E6D6'];
  return (
    <div className={`sg2d-scene ${className} ${open ? 'is-open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix(c.skyTop, '#C9CFD6', 30)} />
            <stop offset="0.5" stopColor={c.skyTop} />
            <stop offset="0.8" stopColor={mix(c.skyLow, '#ffffff', 35)} />
          </linearGradient>
          <radialGradient id={id('sun')}>
            <stop offset="0" stopColor="#FFFBF2" />
            <stop offset="0.3" stopColor={c.sun} stopOpacity="0.55" />
            <stop offset="1" stopColor={c.sun} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id('pool')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix(c.skyLow, c.pond, 25)} />
            <stop offset="1" stopColor={mix(c.pond, '#ffffff', 25)} />
          </linearGradient>
          <linearGradient id={id('lawn')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix(c.leaf, c.skyLow, 70)} />
            <stop offset="1" stopColor={mix(c.leaf, c.skyLow, 45)} />
          </linearGradient>
        </defs>
        <rect width="1600" height="800" fill={`url(#${id('sky')})`} />
        <circle cx="900" cy="560" r="560" fill={`url(#${id('sun')})`} />
        <g fill={mix(c.leaf, c.skyLow, 62)}>
          {TREES.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <rect y="760" width="1600" height="42" fill={`url(#${id('lawn')})`} />
        <rect y="800" width="1600" height="200" fill={`url(#${id('pool')})`} />
        <rect y="797" width="1600" height="6" fill={mix(c.stone, '#000000', 12)} />
      </svg>

      <svg viewBox="-190 -600 380 775" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id={id('stone')} x1="0" y1="-560" x2="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={mix(c.stone, '#ffffff', 25)} />
            <stop offset="0.85" stopColor={c.stone} />
            <stop offset="1" stopColor={mix(c.stone, c.pond, 25)} />
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
          <g transform="scale(1 -1)" opacity="0.6">
            <path d={ARCH_PATH} fill={mix(c.stone, c.pond, 20)} />
          </g>
        </g>
        <path d={ARCH_PATH} fill={`url(#${id('stone')})`} stroke={mix(c.stone, '#000000', 14)} strokeWidth="1" />
        {PLINTHS.map((x) => (
          <rect key={x} x={x * M - 32} y={-42} width={64} height={46} fill={mix(c.stone, '#000000', 4)} stroke={mix(c.stone, '#000000', 14)} strokeWidth="1" />
        ))}
        <g>
          {LEAVES.map((l, i) => (
            <ellipse key={i} cx={l.position[0] * M} cy={-l.position[1] * M} rx={l.scale * M * 0.18} ry={l.scale * M * 0.5} transform={`rotate(${((l.spin * 180) / Math.PI).toFixed(0)} ${(l.position[0] * M).toFixed(1)} ${(-l.position[1] * M).toFixed(1)})`} fill={mix(c.leaf, '#000000', (i % 3) * 8)} />
          ))}
          {ROSES.map((r, i) => {
            const cx = r.position[0] * M;
            const cy = -r.position[1] * M;
            const rr = r.scale * M * 0.95;
            const tone = roseTones[Math.floor(r.hue * roseTones.length) % roseTones.length]!;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={rr} fill={tone} />
                <circle cx={cx + rr * 0.08} cy={cy - rr * 0.05} r={rr * 0.58} fill="none" stroke={mix(tone, '#7a3a3a', 22)} strokeWidth={rr * 0.14} />
                <circle cx={cx} cy={cy} r={rr * 0.2} fill={mix(tone, '#7a3a3a', 30)} />
              </g>
            );
          })}
        </g>
        <g mask={`url(#${id('reflect')})`}>
          <g transform="translate(0 270) scale(1 -1)" opacity="0.7">
            <SwanPair c={c} />
          </g>
        </g>
        <SwanPair c={c} />
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
      <path d={SWAN_PATH} fill="#FFFCF7" stroke={mix(c.stone, '#000000', 18)} strokeWidth={0.5} />
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

/** One flap: a triangle of the face (front) with its blush lining behind; `points` in 100×200 space. */
function Flap({ cls, points, face, lining, side = false }: { cls: string; points: string; face: string; lining: string; side?: boolean }) {
  return (
    <div className={`sg2d-flap ${cls} ${side ? 'side' : ''}`}>
      <svg viewBox="0 0 100 200" preserveAspectRatio="none">
        <polygon points={points} fill={face} stroke="rgba(150,118,92,0.35)" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg className="back" viewBox="0 0 100 200" preserveAspectRatio="none">
        <polygon points={points} fill={lining} />
      </svg>
    </div>
  );
}

export function Gate2D({ view, opening }: { view: SceneView; opening: boolean }) {
  const c = colors(view);
  const id = useIds();
  const gold = c.gold;
  const lining = mix(c.blush, c.paper, 45);
  return (
    <>
      <style>{CSS}</style>
      <div className={`sg2d-gate ${opening ? 'is-open' : ''}`} aria-hidden="true">
        <div className="sg2d-env" style={{ background: c.paper }}>
          <div className="sg2d-inner" />
          <div className="sg2d-glow" />
          {/* Side flaps under, bottom over them, top over all — as an envelope is folded. */}
          <Flap cls="sg2d-left" side points="0,0 50,100 0,200" face={mix(c.paper, '#000000', 2.5)} lining={lining} />
          <Flap cls="sg2d-right" side points="100,0 50,100 100,200" face={mix(c.paper, '#000000', 2.5)} lining={lining} />
          <Flap cls="sg2d-bottom" points="0,200 50,100 100,200" face={mix(c.paper, '#ffffff', 12)} lining={lining} />
          <Flap cls="sg2d-top" points="0,0 100,0 50,100" face={mix(c.paper, '#ffffff', 22)} lining={lining} />
          {/* Blind emboss: each spray twice, a soft shadow under a light highlight. */}
          <svg className="sg2d-emboss pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300" style={{ opacity: opening ? 0 : 1 }} viewBox="0 0 100 200" preserveAspectRatio="none">
            {SPRAYS.map((s, i) => (
              <g key={i}>
                <g transform="translate(0.25 0.4)" fill="rgba(140,108,84,0.16)" stroke="rgba(140,108,84,0.16)" strokeWidth="0.5">
                  <path d={s.stem} fill="none" />
                  <path d={s.leaves} stroke="none" />
                </g>
                <g fill="rgba(255,255,255,0.5)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5">
                  <path d={s.stem} fill="none" />
                  <path d={s.leaves} stroke="none" />
                </g>
              </g>
            ))}
          </svg>
          <div className="sg2d-seal">
            {(['a', 'b'] as const).map((half) => (
              <div
                key={half}
                className={`sg2d-half sg2d-half-${half}`}
                style={{ clipPath: half === 'a' ? 'polygon(0 0,53% 0,46% 28%,56% 52%,47% 76%,52% 100%,0 100%)' : 'polygon(53% 0,100% 0,100% 100%,52% 100%,47% 76%,56% 52%,46% 28%)' }}
              >
                <svg viewBox="-50 -50 100 100" className="h-full w-full">
                  <defs>
                    <radialGradient id={id(`wax-${half}`)} cx="0.38" cy="0.32" r="0.75">
                      <stop offset="0" stopColor={mix(c.seal, '#ffffff', 22)} />
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
