'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SceneView } from '@/lib/invite/scene-types';
import { facadeStrokes, facadeLights } from './geometry';

/**
 * The eternal-romance 2D path (no WebGL, or reduced motion): a CSS velvet curtain (gradient
 * pleats, a spotlight pool, gold galloon and fringe, an embroidered crest) that rises, gathering
 * into swags; behind it, an SVG candlelit table with roses and the gold-framed name card, and the
 * venue façade — the same strokes as the 3D drawing — drawing itself with stroke-dashoffset.
 * The backdrop behind the content is that finished stage. Pure SVG/CSS.
 */
export const OPENING_MS = 3000;
/** Seconds into the CSS opening that capture "mid" holds. */
const MID = 1.75;

const tokens = (view: SceneView) => {
  const s = view.palette.scene;
  return {
    velvet: s.velvet ?? '#6A1A2B',
    deep: s.velvetDeep ?? '#3A0D17',
    hi: s.velvetHi ?? '#9C2D40',
    rose: s.rose ?? '#A4142C',
    ivory: s.ivory ?? '#F8F3E8',
    linen: s.linen ?? '#F2EADF',
    candle: s.candle ?? '#FFB867',
    gold: s.gold ?? view.palette.gold,
    goldInk: view.palette.goldInk,
  };
};
type Tokens = ReturnType<typeof tokens>;

const vars = (t: Tokens) =>
  ({
    '--er2-velvet': t.velvet,
    '--er2-deep': t.deep,
    '--er2-hi': t.hi,
    '--er2-rose': t.rose,
    '--er2-gold': t.gold,
    '--er2-candle': t.candle,
    '--er2-linen': t.linen,
  }) as React.CSSProperties;

const CSS = `
.er2-root{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;--er2-shift:0s;
  background:radial-gradient(70% 55% at 50% 52%,color-mix(in srgb,var(--er2-deep) 70%,#000) 0%,color-mix(in srgb,var(--er2-deep) 30%,#000) 70%,#080204 100%)}
.er2-root.er2-freeze{--er2-shift:${MID}s}
.er2-root.er2-freeze *{animation-play-state:paused!important}
.er2-facade{position:absolute;left:50%;bottom:27svh;width:min(150vw,92svh);transform:translateX(-50%);overflow:visible}
.er2-facade path{fill:none;stroke:var(--er2-gold);stroke-linecap:round;stroke-linejoin:round}
.er2-facade .er2-glowg path{stroke:color-mix(in srgb,var(--er2-gold) 60%,#fff)}
.er2-facade .er2-glowg{opacity:.2;filter:blur(2.5px)}
.er2-facade circle{fill:#fff3d6}
.er2-draw path{stroke-dasharray:1;stroke-dashoffset:1;animation:er2-draw var(--dur) cubic-bezier(.45,0,.4,1) calc(var(--d) - var(--er2-shift)) forwards}
.er2-draw circle{opacity:0;animation:er2-on .4s ease-out calc(var(--d) - var(--er2-shift)) forwards}
.er2-backdrop .er2-facade{opacity:.62}
.er2-backdrop .er2-table{filter:brightness(.55) saturate(.9);bottom:2svh;width:min(62vw,38svh)}
.er2-backdrop .er2-pool{opacity:.6}
.er2-table{position:absolute;left:50%;bottom:6svh;width:min(74vw,46svh);transform:translateX(-50%);overflow:visible}
.er2-flame{transform-box:fill-box;transform-origin:50% 100%;animation:er2-flicker 1.7s ease-in-out infinite alternate}
.er2-flame:nth-of-type(2n){animation-duration:1.3s;animation-delay:-.4s}
.er2-flame:nth-of-type(3n){animation-duration:2.1s;animation-delay:-.9s}
.er2-halo{animation:er2-halo 2.3s ease-in-out infinite alternate}
@keyframes er2-flicker{0%{transform:scale(1,1) skewX(0)}30%{transform:scale(.94,1.08) skewX(3deg)}60%{transform:scale(1.04,.95) skewX(-2deg)}100%{transform:scale(.97,1.05) skewX(1deg)}}
@keyframes er2-halo{from{opacity:.8}to{opacity:1}}
@keyframes er2-draw{to{stroke-dashoffset:0}}
@keyframes er2-on{to{opacity:1}}
.er2-pool{position:absolute;left:50%;bottom:4svh;width:min(110vw,70svh);aspect-ratio:2/1;transform:translateX(-50%);border-radius:50%;
  background:radial-gradient(closest-side,color-mix(in srgb,var(--er2-candle) 30%,transparent),transparent)}
.er2-swags{position:absolute;inset-inline:0;top:0;height:19svh;width:100%;overflow:visible;transform-origin:50% 0;transform:scaleY(.42)}
.er2-backdrop .er2-swags{transform:none}
.is-opening .er2-swags{animation:er2-gather 1.45s cubic-bezier(.62,0,.28,1) calc(.15s - var(--er2-shift)) forwards}
@keyframes er2-gather{to{transform:scaleY(1)}}

/* The curtain */
.er2-curtain{position:absolute;inset:0;transform-origin:50% 0;
  background:
    radial-gradient(32% 62% at 50% 34%,rgba(255,150,150,.28),rgba(255,110,110,.08) 55%,transparent 75%),
    linear-gradient(180deg,rgba(0,0,0,.55),transparent 22%,transparent 78%,rgba(0,0,0,.45)),
    linear-gradient(90deg,rgba(0,0,0,.7),transparent 26%,transparent 74%,rgba(0,0,0,.7)),
    repeating-linear-gradient(90deg,transparent 0,rgba(255,170,170,.07) calc(var(--fold)*.31),transparent calc(var(--fold)*.42),rgba(0,0,0,.18) calc(var(--fold)*.7),transparent var(--fold)),
    repeating-linear-gradient(90deg,var(--er2-deep) 0,var(--er2-velvet) calc(var(--fold)*.36),var(--er2-hi) calc(var(--fold)*.5),var(--er2-velvet) calc(var(--fold)*.64),var(--er2-deep) calc(var(--fold)*1.37));
  --fold:clamp(30px,7.5vw,96px)}
.er2-ruffle{position:absolute;inset-inline:0;bottom:0;height:24%;opacity:0;
  background:repeating-linear-gradient(180deg,rgba(0,0,0,.35) 0 3px,rgba(255,170,170,.12) 6px,rgba(0,0,0,.35) 10px)}
.er2-hem{position:absolute;inset-inline:0;bottom:0;height:34px}
.er2-hem::before{content:'';position:absolute;inset-inline:0;top:0;height:7px;
  background:repeating-linear-gradient(60deg,var(--er2-gold) 0 3px,color-mix(in srgb,var(--er2-gold) 55%,#3a2208) 3px 6px)}
.er2-hem::after{content:'';position:absolute;inset-inline:0;top:7px;height:26px;
  background:repeating-linear-gradient(90deg,var(--er2-gold) 0 1.5px,color-mix(in srgb,var(--er2-gold) 50%,#2a1504) 1.5px 3px,transparent 3px 4.5px);
  -webkit-mask:linear-gradient(#000 70%,transparent);mask:linear-gradient(#000 70%,transparent)}
.er2-crest{position:absolute;left:50%;top:44%;width:min(36vw,26svh);transform:translate(-50%,-50%)}
.er2-crest text{font-family:var(--font-aref),serif}
.is-opening .er2-curtain{animation:er2-rise 1.5s cubic-bezier(.62,0,.28,1) calc(.05s - var(--er2-shift)) forwards}
.is-opening .er2-ruffle{animation:er2-on .9s ease-in calc(.25s - var(--er2-shift)) forwards}
.is-opening .er2-crest{animation:er2-off .5s ease-out calc(.1s - var(--er2-shift)) forwards}
.is-opening .er2-spot{animation:er2-spot 1.6s cubic-bezier(.5,0,.3,1) calc(.7s - var(--er2-shift)) forwards}
@keyframes er2-rise{to{transform:translateY(-102%)}}
@keyframes er2-off{to{opacity:0}}
@keyframes er2-spot{from{opacity:0;transform:translate(-50%,-30svh) scale(.7)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
.er2-spot{position:absolute;left:50%;bottom:2svh;width:min(80vw,52svh);height:62svh;opacity:0;transform:translateX(-50%);
  background:radial-gradient(50% 40% at 50% 82%,rgba(255,236,205,.22),transparent 75%),linear-gradient(180deg,transparent,rgba(255,236,205,.07));
  clip-path:polygon(42% 0,58% 0,100% 100%,0 100%)}
.er2-backdrop .er2-spot{opacity:.5}
.er2-petal{position:absolute;top:-6svh;width:11px;height:14px;border-radius:70% 0 70% 0;opacity:.9;
  background:radial-gradient(circle at 30% 30%,color-mix(in srgb,var(--er2-rose) 75%,#fff),var(--er2-rose) 55%,color-mix(in srgb,var(--er2-rose) 60%,#000));
  animation:er2-fall linear infinite}
@keyframes er2-fall{0%{transform:translate3d(0,0,0) rotate(0) rotateY(0)}50%{transform:translate3d(5vw,56svh,0) rotate(160deg) rotateY(180deg)}100%{transform:translate3d(-3vw,112svh,0) rotate(340deg) rotateY(360deg)}}
@media (prefers-reduced-motion: reduce){
  .er2-petal{display:none}
  .er2-flame,.er2-halo{animation:none}
  .is-opening .er2-curtain{animation:er2-fade .01ms forwards}
}
@keyframes er2-fade{to{opacity:0}}
`;

const W = 16;
const H = 12;
/** The façade strokes as SVG paths (y flipped), each with its draw-on delay and duration. */
function useFacadePaths() {
  return useMemo(() => {
    const fmt = (n: number) => Math.round(n * 1000) / 1000;
    const paths = facadeStrokes().map((s) => ({
      d: s.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${fmt(x)} ${fmt(-y)}`).join(' '),
      start: s.start,
      end: s.end,
      w: s.w,
    }));
    const lights = facadeLights().map((l) => ({ x: l.p[0], y: -l.p[1], t: l.t, r: 0.045 * l.size }));
    return { paths, lights };
  }, []);
}

function Facade({ drawing, t }: { drawing: boolean; t: Tokens }) {
  const { paths, lights } = useFacadePaths();
  // Drawn between 1.15 s and 2.85 s of the opening.
  const at = (p: number) => `${(1.15 + p * 1.7).toFixed(3)}s`;
  return (
    <svg className={`er2-facade ${drawing ? 'er2-draw' : ''}`} viewBox={`${-W / 2} ${-H + 0.4} ${W} ${H}`} aria-hidden="true" style={{ aspectRatio: `${W} / ${H}` }}>
      <defs>
        <radialGradient id="er2-wall" cx="50%" cy="62%" r="60%">
          <stop offset="0" stopColor={t.velvet} stopOpacity=".55" />
          <stop offset="1" stopColor={t.deep} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="-4.5" rx="9" ry="6.5" fill="url(#er2-wall)" />
      <g className="er2-glowg">
        {paths.map((p, i) => (
          <path
            key={`g${i}`}
            d={p.d}
            pathLength={1}
            strokeWidth={p.w * 4.5}
            style={{ '--d': at(p.start), '--dur': `${((p.end - p.start) * 1.7).toFixed(3)}s` } as React.CSSProperties}
          />
        ))}
      </g>
      <g>
        {paths.map((p, i) => (
          <path key={i} d={p.d} pathLength={1} strokeWidth={p.w * 1.15} style={{ '--d': at(p.start), '--dur': `${((p.end - p.start) * 1.7).toFixed(3)}s` } as React.CSSProperties} />
        ))}
        {lights.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r={l.r} style={{ '--d': at(l.t) } as React.CSSProperties} />
        ))}
      </g>
    </svg>
  );
}

/** A rose seen from above and a little in front: a spiral of petals in a red disc. */
function Rose({ x, y, r, t }: { x: number; y: number; r: number; t: Tokens }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={t.rose} />
      <circle r={r} fill="url(#er2-rose-shade)" />
      <path
        d={`M0 ${-r * 0.15} c${r * 0.3} 0 ${r * 0.35} ${r * 0.35} 0 ${r * 0.4} c${-r * 0.55} 0 ${-r * 0.6} ${-r * 0.7} 0 ${-r * 0.75} c${r * 0.8} 0 ${r * 0.85} ${r * 1.1} 0 ${r * 1.15}`}
        fill="none"
        stroke="rgba(40,0,8,.55)"
        strokeWidth={r * 0.12}
        strokeLinecap="round"
      />
    </g>
  );
}

function Candle({ x, base, h, w, stick = 0 }: { x: number; base: number; h: number; w: number; stick?: number }) {
  const top = base - stick - h;
  return (
    <g>
      {stick > 0 && <path d={`M${x - 9} ${base} h18 l-4 -4 h-3 l-1 ${-stick + 10} h6 l2 -4 h-14 l2 4 h6 l-1 ${stick - 10} h-3 z`} fill="url(#er2-goldg)" />}
      <rect x={x - w / 2} y={top} width={w} height={h} rx={w * 0.12} fill="url(#er2-wax)" />
      <ellipse className="er2-halo" cx={x} cy={top - 7} rx={26} ry={26} fill="url(#er2-halo)" />
      <path className="er2-flame" d={`M${x} ${top - 16} C${x + 4.2} ${top - 8} ${x + 3.8} ${top - 1} ${x} ${top - 0.5} C${x - 3.8} ${top - 1} ${x - 4.2} ${top - 8} ${x} ${top - 16} Z`} fill="url(#er2-flameg)" />
    </g>
  );
}

function Table({ view, t }: { view: SceneView; t: Tokens }) {
  const names = `${view.groom} ${view.lang === 'ar' ? 'و' : '&'} ${view.bride}`;
  return (
    <svg className="er2-table" viewBox="0 0 400 230" aria-hidden="true">
      <defs>
        <linearGradient id="er2-cloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.ivory} />
          <stop offset=".55" stopColor={t.linen} />
          <stop offset="1" stopColor="#7d6a5c" />
        </linearGradient>
        <radialGradient id="er2-top" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor={t.linen} />
        </radialGradient>
        <radialGradient id="er2-rose-shade" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ff6b7d" stopOpacity=".5" />
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#1a0006" stopOpacity=".55" />
        </radialGradient>
        <linearGradient id="er2-wax" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9cbb3" />
          <stop offset=".45" stopColor="#fff8ea" />
          <stop offset="1" stopColor="#cbb89c" />
        </linearGradient>
        <linearGradient id="er2-goldg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a5c26" />
          <stop offset=".5" stopColor="#f0d79c" />
          <stop offset="1" stopColor="#8c6a2c" />
        </linearGradient>
        <radialGradient id="er2-flameg" cx="50%" cy="78%" r="65%">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset=".45" stopColor="#ffe3a8" />
          <stop offset=".8" stopColor={t.candle} />
          <stop offset="1" stopColor="#ff7a2e" stopOpacity=".6" />
        </radialGradient>
        <radialGradient id="er2-halo">
          <stop offset="0" stopColor={t.candle} stopOpacity=".55" />
          <stop offset="1" stopColor={t.candle} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="222" rx="170" ry="9" fill="#000" opacity=".5" />
      <path d="M58 92 C54 140 44 186 30 216 Q200 232 370 216 C356 186 346 140 342 92 Z" fill="url(#er2-cloth)" />
      <path d="M100 100 C98 150 92 190 86 220 M150 104 C150 150 148 190 146 224 M250 104 C250 150 252 190 254 224 M300 100 C302 150 308 190 314 220" stroke="rgba(90,60,50,.18)" strokeWidth="5" fill="none" />
      <ellipse cx="200" cy="92" rx="142" ry="30" fill="url(#er2-top)" />
      <Candle x={92} base={104} h={18} w={13} />
      <Candle x={312} base={102} h={24} w={13} />
      <Candle x={124} base={84} h={12} w={6} stick={44} />
      <Candle x={276} base={84} h={12} w={6} stick={44} />
      <Candle x={170} base={74} h={30} w={13} />
      <Candle x={232} base={74} h={22} w={13} />
      <ellipse cx="200" cy="86" rx="40" ry="8" fill="url(#er2-goldg)" />
      {[
        [182, 74, 10],
        [218, 74, 10],
        [200, 70, 11],
        [170, 82, 9],
        [230, 82, 9],
        [190, 84, 9],
        [211, 84, 9],
      ].map(([x, y, r], i) => (
        <Rose key={i} x={x!} y={y!} r={r!} t={t} />
      ))}
      <g transform="translate(200 104)">
        <rect x="-38" y="-24" width="76" height="46" rx="5" fill="url(#er2-goldg)" />
        <rect x="-31" y="-18" width="62" height="34" rx="2" fill={t.linen} />
        <rect x="-28" y="-15" width="56" height="28" fill="none" stroke={t.goldInk} strokeWidth=".6" />
        <text x="0" y="3" textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={t.goldInk} style={{ fontFamily: view.lang === 'ar' ? 'var(--font-aref), serif' : 'var(--font-pinyon), cursive' }}>
          {names}
        </text>
      </g>
      {[
        [130, 118, 20],
        [268, 122, -30],
        [160, 128, 70],
        [246, 112, 140],
        [108, 112, 200],
      ].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="3.4" ry="2.2" fill={t.rose} transform={`rotate(${r} ${x} ${y})`} />
      ))}
    </svg>
  );
}

/** The raised curtain's swags along the top, with their gold fringe. */
function Swags({ t }: { t: Tokens }) {
  const n = 5;
  const w = 100 / n;
  const d = Array.from({ length: n }, (_, i) => `M${i * w} 0 Q${i * w + w / 2} 120 ${(i + 1) * w} 0`).join(' ');
  const hem = Array.from({ length: n }, (_, i) => `M${i * w} 2 Q${i * w + w / 2} 122 ${(i + 1) * w} 2`).join(' ');
  return (
    <svg className="er2-swags" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="er2-swag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#120307" />
          <stop offset=".5" stopColor={t.deep} />
          <stop offset=".85" stopColor={t.velvet} />
          <stop offset="1" stopColor={t.deep} />
        </linearGradient>
      </defs>
      <rect width="100" height="30" fill="#120307" />
      <path d={d} fill="url(#er2-swag)" />
      {Array.from({ length: 6 }, (_, k) => (
        <path key={k} d={Array.from({ length: n }, (_, i) => `M${i * w + 1} ${8 + k * 9} Q${i * w + w / 2} ${50 + k * 11} ${(i + 1) * w - 1} ${8 + k * 9}`).join(' ')} fill="none" stroke="rgba(0,0,0,.28)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={hem} fill="none" stroke={t.gold} strokeWidth="9" strokeDasharray="1 2" vectorEffect="non-scaling-stroke" opacity=".9" />
      <path d={hem} fill="none" stroke={t.gold} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Petals({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 37 + 11) % 100;
        const dur = 9 + ((i * 7) % 6);
        const delay = (i * 1.37) % dur;
        const scale = 0.7 + ((i * 13) % 5) * 0.12;
        return <span key={i} className="er2-petal" style={{ left: `${left}%`, animationDuration: `${dur}s`, animationDelay: `-${delay}s`, scale: String(scale) }} />;
      })}
    </>
  );
}

export function Gate2D({ view, opening }: { view: SceneView; opening: boolean }) {
  const t = tokens(view);
  const [freeze, setFreeze] = useState(false);
  useEffect(() => setFreeze(new URLSearchParams(window.location.search).get('capture') === 'mid'), []);
  return (
    <div className={`er2-root ${opening ? 'is-opening' : ''} ${freeze ? 'er2-freeze' : ''}`} aria-hidden="true" style={vars(t)}>
      <style>{CSS}</style>
      <div className="er2-pool" />
      <Facade drawing={opening} t={t} />
      <div className="er2-spot" />
      <Table view={view} t={t} />
      {opening && <Petals count={12} />}
      <div className="er2-curtain">
        <div className="er2-ruffle" />
        <svg className="er2-crest" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="er2-crest-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f3dca0" />
              <stop offset=".5" stopColor={t.gold} />
              <stop offset="1" stopColor="#8a6a2e" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#er2-crest-g)">
            <circle cx="100" cy="100" r="80" strokeWidth="4.5" />
            <circle cx="100" cy="100" r="71" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="90" strokeWidth="2" strokeDasharray="1.5 5" strokeLinecap="round" />
          </g>
          <g fill="url(#er2-crest-g)">
            {Array.from({ length: 18 }, (_, i) => {
              const side = i < 9 ? -1 : 1;
              const k = i % 9;
              const a = Math.PI / 2 + side * (0.42 + k * 0.27);
              const x = 100 + Math.cos(a) * 60;
              const y = 100 + Math.sin(a) * 60;
              return <ellipse key={i} cx={x} cy={y} rx="7" ry="2.6" transform={`rotate(${((a + side * 0.6) * 180) / Math.PI} ${x} ${y})`} />;
            })}
          </g>
          <text x="100" y="106" textAnchor="middle" dominantBaseline="middle" fontSize="46" fill="url(#er2-crest-g)">
            {view.monogram}
          </text>
        </svg>
        <div className="er2-hem" />
      </div>
      <Swags t={t} />
    </div>
  );
}

export function Backdrop2D({ view }: { view: SceneView }) {
  const t = tokens(view);
  return (
    <div className="er2-root er2-backdrop" aria-hidden="true" style={{ ...vars(t), zIndex: 0 }}>
      <style>{CSS}</style>
      <div className="er2-pool" />
      <Facade drawing={false} t={t} />
      <div className="er2-spot" />
      <Table view={view} t={t} />
      <Petals count={14} />
      <Swags t={t} />
      <div className="invite-dust absolute inset-0" style={{ '--dust': t.gold } as React.CSSProperties} />
    </div>
  );
}
