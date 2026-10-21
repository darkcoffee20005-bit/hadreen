'use client';

import { useEffect, useRef, useState } from 'react';
import type { SceneView } from '@/lib/invite/scene-types';
import { mixHex as mix, shadeHex } from '@/lib/invite/stage/color';

/**
 * The old-money 2D path (no WebGL, or reduced motion). Pure SVG/CSS:
 *  gate     olive paint (an SVG turbulence brush texture) with an ivory envelope floating on it:
 *           pearls along the flap's edges, the monogram pressed into the flap, white flowers at
 *           its corner, the date beneath;
 *  opening  the flap lifts, the card slides up out of the pocket, the envelope sinks away and
 *           the card grows to fill the screen, its double gold rule drawing in;
 *  backdrop the card as the page: ivory paper, the gold rule round the screen until the guest
 *           scrolls, a sprig of white flowers and a few pearls in the corners.
 * Under reduced motion the opening is a cross-fade and nothing floats.
 */
export const OPENING_MS = 3300;
/** Seconds into the CSS opening that capture "mid" holds. */
const MID = 1.45;

const tokens = (view: SceneView) => {
  const s = view.palette.scene;
  const band = view.palette.band;
  return {
    paint: mix(band, s.paintLight ?? '#A9B08C', 0.28),
    dark: shadeHex(band, 0.82),
    light: mix(band, '#E9E6CF', 0.42),
    paper: s.paper ?? '#F4EEE3',
    liner: s.liner ?? '#E6E1CF',
    pearl: s.pearl ?? '#F3EDE4',
    leaf: s.leaf ?? '#5C7448',
    relief: s.relief ?? '#CDBB97',
    gold: view.palette.gold,
    goldInk: view.palette.goldInk,
  };
};
type Tokens = ReturnType<typeof tokens>;

const vars = (t: Tokens) =>
  ({
    '--om2-paint': t.paint,
    '--om2-dark': t.dark,
    '--om2-light': t.light,
    '--om2-paper': t.paper,
    '--om2-gold': t.gold,
    '--om2-gold-ink': t.goldInk,
  }) as React.CSSProperties;

const CSS = `
.om2-root{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;--om2-shift:0s}
.om2-root.om2-freeze{--om2-shift:${MID}s}
.om2-root.om2-freeze *{animation-play-state:paused!important}
.om2-paint{position:absolute;inset:0;background:
  radial-gradient(70% 50% at 25% 15%,color-mix(in srgb,var(--om2-light) 70%,transparent),transparent 70%),
  radial-gradient(60% 45% at 85% 80%,color-mix(in srgb,var(--om2-dark) 80%,transparent),transparent 70%),
  linear-gradient(160deg,var(--om2-paint),var(--om2-dark))}
.om2-brush{position:absolute;inset:-5%;width:110%;height:110%;opacity:.55;mix-blend-mode:soft-light}
.om2-vignette{position:absolute;inset:0;background:radial-gradient(80% 70% at 50% 50%,transparent 55%,rgb(0 0 0 / .28))}
.om2-stage{position:absolute;left:50%;top:50%;width:min(80vw,46svh,30rem);aspect-ratio:2.6/1.8;translate:-50% -46%}
.om2-float{position:absolute;inset:0;animation:om2-float 6s ease-in-out infinite}
@keyframes om2-float{0%,100%{transform:translateY(0) rotate(-.4deg)}50%{transform:translateY(-1.2%) rotate(.4deg)}}
.om2-env{position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(10px 18px 14px rgb(30 35 20 / .35))}
.om2-flap{transform-box:view-box;transform-origin:50% 0}
.om2-card{position:absolute;left:4.5%;top:7%;width:91%;height:86.5%;background:var(--om2-paper);border-radius:2px;
  --om2-dx:0px;--om2-dy:0px;--om2-sx:1;--om2-sy:1}
.om2-rule{position:absolute;inset:5%;border:1.5px solid color-mix(in srgb,var(--om2-gold) 85%,var(--om2-gold-ink));opacity:0;
  box-shadow:0 0 0 4px var(--om2-paper),0 0 0 5px color-mix(in srgb,var(--om2-gold) 70%,transparent)}
.om2-date{position:absolute;left:50%;top:calc(100% + 1.4rem);translate:-50% 0;white-space:nowrap;color:#FFF8EA;font-size:1.05rem;text-shadow:0 1px 8px rgb(0 0 0 / .35)}
.om2-glint{animation:om2-glint 3.2s ease-in-out infinite}
@keyframes om2-glint{0%,100%{opacity:.0}50%{opacity:.9}}
.is-opening .om2-float{animation:none}
.is-opening .om2-flap{animation:om2-flap .8s cubic-bezier(.5,0,.3,1) calc(.1s - var(--om2-shift)) forwards}
@keyframes om2-flap{to{transform:scaleY(-.62)}}
.is-opening .om2-card{animation:om2-slide .8s cubic-bezier(.5,0,.3,1) calc(.75s - var(--om2-shift)) forwards,om2-grow 1.3s cubic-bezier(.65,0,.25,1) calc(1.6s - var(--om2-shift)) forwards}
@keyframes om2-slide{to{transform:translateY(-62%)}}
@keyframes om2-grow{from{transform:translateY(-62%)}to{transform:translate(var(--om2-dx),var(--om2-dy)) scale(var(--om2-sx),var(--om2-sy));border-radius:0}}
.is-opening .om2-envwrap{animation:om2-sink .9s cubic-bezier(.55,0,.8,.4) calc(1.6s - var(--om2-shift)) forwards}
@keyframes om2-sink{to{transform:translateY(80svh) rotateX(25deg);opacity:0}}
.is-opening .om2-date{animation:om2-off .4s ease calc(0s - var(--om2-shift)) forwards}
@keyframes om2-on{to{opacity:1}}
@keyframes om2-off{to{opacity:0}}
.om2-backdrop{z-index:0;background:var(--om2-paper)}
.om2-backdrop::before{content:'';position:absolute;inset:0;opacity:.5;background:
  radial-gradient(circle at 20% 30%,rgb(255 255 255 / .5),transparent 40%),
  radial-gradient(circle at 80% 70%,rgb(120 110 80 / .06),transparent 45%)}
.om2-backdrop .om2-rule{position:fixed;inset:14px;opacity:var(--om2-rule,1);transition:opacity .4s}
.om2-sprig{position:absolute;right:-10px;bottom:-6px;width:min(42vw,13rem);scale:-1 1;animation:om2-sway 7s ease-in-out infinite alternate;transform-origin:0 100%}
@keyframes om2-sway{from{transform:rotate(-1deg)}to{transform:rotate(1.5deg)}}
.om2-string{position:absolute;left:-6px;top:-6px;width:min(52vw,16rem);scale:-1 1}
@media (prefers-reduced-motion: reduce){
  .om2-float,.om2-glint,.om2-sprig{animation:none}
  .is-opening .om2-flap,.is-opening .om2-card,.is-opening .om2-envwrap{animation:none}
  .is-opening .om2-stage{animation:om2-off .6s ease forwards}
}
`;

/** A pearl with its own little highlight. */
function Pearl({ cx, cy, r, id }: { cx: number; cy: number; r: number; id: string }) {
  return <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} stroke="rgb(120 110 90 / .25)" strokeWidth={r * 0.08} />;
}

function Bloom({ x, y, r, rot }: { x: number; y: number; r: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M0 0C${-r * 0.55} ${-r * 0.4} ${-r * 0.5} ${-r * 1.15} 0 ${-r * 1.3}C${r * 0.5} ${-r * 1.15} ${r * 0.55} ${-r * 0.4} 0 0z`} transform={`rotate(${i * 72})`} fill="#FDFCF8" stroke="#D5D0BE" strokeWidth="0.8" />
      ))}
      <circle r={r * 0.22} fill="#D6CE8E" />
    </g>
  );
}

function Envelope({ view, t }: { view: SceneView; t: Tokens }) {
  // Units: 260 × 180, as the 3D envelope (2.6 × 1.8).
  const W = 260;
  const H = 180;
  const tipY = 105;
  const pearls: [number, number][] = [];
  const n = 22;
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) / n;
    pearls.push([(W / 2) * s + 2, tipY * s]);
    pearls.push([W - (W / 2) * s - 2, tipY * s]);
  }
  const family = view.lang === 'ar' ? 'var(--font-aref), serif' : 'var(--font-pinyon), cursive';
  return (
    <svg className="om2-env" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <radialGradient id="om2-pearl" cx=".35" cy=".3" r=".75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".45" stopColor={t.pearl} />
          <stop offset="1" stopColor={mix(t.pearl, '#9C9484', 0.55)} />
        </radialGradient>
        <linearGradient id="om2-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={mix(t.paper, '#ffffff', 0.5)} />
          <stop offset="1" stopColor={mix(t.paper, '#C9BFA8', 0.25)} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} rx="2" fill="url(#om2-paper)" />
      <path d={`M0 ${H}L${W / 2} ${H * 0.56}L${W} ${H}`} fill="none" stroke="rgb(120 110 90 / .28)" strokeWidth="0.8" />
      <g className="om2-flap">
        <path d={`M0 0H${W}L${W / 2 + 4} ${tipY - 2}Q${W / 2} ${tipY + 3} ${W / 2 - 4} ${tipY - 2}Z`} fill={mix(t.paper, '#ffffff', 0.25)} stroke="rgb(120 110 90 / .25)" strokeWidth="0.6" />
        <text x={W / 2} y={tipY * 0.68} textAnchor="middle" fontSize="20" fill={t.relief} stroke="rgb(255 255 255 / .6)" strokeWidth=".4" style={{ fontFamily: family }}>
          {view.monogram}
        </text>
        {pearls.map(([x, y], i) => (
          <Pearl key={i} cx={x} cy={y} r={2.7} id="om2-pearl" />
        ))}
        <circle className="om2-glint" cx={W * 0.32} cy={tipY * 0.36} r="1.6" fill="#fff" />
      </g>
      <g transform={`translate(18 ${H - 26})`}>
        {[
          [-6, -6, 210],
          [4, 10, 250],
          [24, 2, 300],
          [-12, -20, 160],
        ].map(([x, y, a], i) => (
          <ellipse key={i} cx={x} cy={y} rx="16" ry="5" fill={i % 2 ? mix(t.leaf, '#C9D3A8', 0.3) : t.leaf} transform={`rotate(${a} ${x} ${y})`} />
        ))}
        <Bloom x={4} y={-2} r={12} rot={10} />
        <Bloom x={26} y={-14} r={9} rot={-25} />
        <ellipse cx="-14" cy="-24" rx="3.5" ry="7.5" fill="#F7F5EE" stroke="#D5D0BE" strokeWidth=".5" transform="rotate(-35 -14 -24)" />
      </g>
    </svg>
  );
}

function useFreeze() {
  const [freeze, setFreeze] = useState(false);
  useEffect(() => setFreeze(new URLSearchParams(window.location.search).get('capture') === 'mid'), []);
  return freeze;
}

function Brush() {
  return (
    <svg className="om2-brush" viewBox="0 0 400 800" preserveAspectRatio="none" aria-hidden="true">
      <filter id="om2-strokes" x="-400" y="-300" width="1200" height="1400" filterUnits="userSpaceOnUse">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.05" numOctaves="3" seed="4" />
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.1 -0.35" />
      </filter>
      <rect x="-400" y="-300" width="1200" height="1400" filter="url(#om2-strokes)" transform="rotate(-24 200 400)" />
    </svg>
  );
}

export function Gate2D({ view, opening }: { view: SceneView; opening: boolean }) {
  const t = tokens(view);
  const freeze = useFreeze();
  const card = useRef<HTMLDivElement>(null);
  // Where the card must go to cover the screen: measured at rest, before it moves.
  useEffect(() => {
    const fit = () => {
      const el = card.current;
      if (!el || el.closest('.is-opening')) return;
      const r = el.getBoundingClientRect();
      const slid = r.top + r.height / 2 - 0.62 * r.height;
      el.style.setProperty('--om2-dx', `${window.innerWidth / 2 - (r.left + r.width / 2)}px`);
      el.style.setProperty('--om2-dy', `${window.innerHeight / 2 - slid - 0.62 * r.height}px`);
      el.style.setProperty('--om2-sx', String((window.innerWidth / r.width) * 1.02));
      el.style.setProperty('--om2-sy', String((window.innerHeight / r.height) * 1.02));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className={`om2-root ${opening ? 'is-opening' : ''} ${freeze ? 'om2-freeze' : ''}`} aria-hidden="true" style={vars(t)}>
      <style>{CSS}</style>
      <div className="om2-paint" />
      <Brush />
      <div className="om2-vignette" />
      <div className="om2-stage">
        <div ref={card} className="om2-card" />
        <div className="om2-envwrap absolute inset-0">
          <div className="om2-float">
            <Envelope view={view} t={t} />
            <p className="om2-date" style={{ fontFamily: view.lang === 'ar' ? 'var(--font-amiri), serif' : 'var(--font-cormorant), serif' }}>
              {view.dateLine}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CornerSprig({ t }: { t: Tokens }) {
  return (
    <svg className="om2-sprig" viewBox="0 0 160 120" aria-hidden="true">
      <path d="M0 118C30 96 62 72 120 40" fill="none" stroke={t.leaf} strokeWidth="2" />
      {[
        [26, 98, -40],
        [48, 82, 20],
        [70, 66, -35],
        [92, 54, 25],
        [36, 112, 10],
      ].map(([x, y, a], i) => (
        <ellipse key={i} cx={x} cy={y} rx="14" ry="5" fill={i % 2 ? mix(t.leaf, '#C9D3A8', 0.3) : t.leaf} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      <Bloom x={120} y={40} r={17} rot={8} />
      <Bloom x={80} y={64} r={12} rot={-20} />
      <ellipse cx="140" cy="22" rx="4.5" ry="10" fill="#F7F5EE" stroke="#D5D0BE" strokeWidth=".6" transform="rotate(38 140 22)" />
    </svg>
  );
}

function PearlString({ t }: { t: Tokens }) {
  const pts: [number, number][] = [];
  const n = 17;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    pts.push([20 + 230 * u, 6 + 110 * u - 60 * 4 * u * (1 - u) + 40 * u * (1 - u)]);
  }
  return (
    <svg className="om2-string" viewBox="0 0 260 140" aria-hidden="true">
      <defs>
        <radialGradient id="om2-pearl-b" cx=".35" cy=".3" r=".75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".45" stopColor={t.pearl} />
          <stop offset="1" stopColor={mix(t.pearl, '#9C9484', 0.55)} />
        </radialGradient>
      </defs>
      {pts.map(([x, y], i) => (
        <Pearl key={i} cx={x} cy={y} r={6} id="om2-pearl-b" />
      ))}
    </svg>
  );
}

export function Backdrop2D({ view }: { view: SceneView }) {
  const t = tokens(view);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => root.current?.style.setProperty('--om2-rule', window.scrollY > 40 ? '0' : '1'));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return (
    <div ref={root} className="om2-root om2-backdrop" aria-hidden="true" style={vars(t)}>
      <style>{CSS}</style>
      <div className="om2-rule" />
      <PearlString t={t} />
      <CornerSprig t={t} />
    </div>
  );
}
