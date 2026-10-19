'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SceneView } from '@/lib/invite/scene-types';
import { balusterPath, balusterXs, ridgePath, STUCCO_2D, villaScatter } from './art2d';

/**
 * The dolce-vita 2D path (no WebGL, or reduced motion): a layered SVG landscape — powder sky,
 * clouds, three ridges of mountains, villas with terracotta roofs and cypresses, the lake with its
 * glitter and a sloop — seen through an arched villa window at the gate. Opening: the boat glides
 * and we pass through the window into the view. Behind the content: the same view over the stone
 * balustrade, with the powder-blue envelope whose letter rises as the guest scrolls.
 */
export const OPENING_MS = 2600;

const tokens = (view: SceneView) => {
  const s = view.palette.scene;
  return {
    powder: s.powder ?? '#A9C7E4',
    powderDeep: s.powderDeep ?? '#6F97C2',
    skyTop: s.skyTop ?? '#BFDDF5',
    skyLow: s.skyLow ?? '#EAF4FB',
    lake: s.lake ?? '#4F86B0',
    mountain: s.mountain ?? '#8098AE',
    terracotta: s.terracotta ?? '#C8714F',
    rose: s.rose ?? '#E8A3B4',
    stone: s.stone ?? '#EFE7DC',
    gold: view.palette.gold,
    ink: view.palette.ink,
  };
};
type Tokens = ReturnType<typeof tokens>;

const ROSES: [number, number, number][] = [
  [60, 872, 1.1], [92, 866, 0.8], [128, 874, 1], [300, 870, 0.9], [332, 864, 1.15], [366, 872, 0.8],
  [640, 868, 1], [676, 874, 0.85], [708, 864, 1.1], [880, 872, 0.9], [914, 866, 1.15], [946, 874, 0.8],
];

/** The shared landscape. `rail` adds the balustrade and its roses along the bottom. */
function Landscape({ t, viewBox, rail, id, boat = 400, preserve = 'xMidYMax slice' }: { t: Tokens; viewBox: string; rail?: boolean; id: string; boat?: number; preserve?: string }) {
  const art = useMemo(
    () => ({
      far: ridgePath(1000, 640, 520, 150, 0.006, 23, 70, 0.1),
      mid: ridgePath(1000, 640, 565, 105, 0.009, 11, 70, 0.45),
      near: ridgePath(1000, 640, 610, 62, 0.012, 3, 70, 1.1),
      villas: villaScatter(30, 970, 622, 26, 13, 5),
      cypresses: villaScatter(20, 980, 626, 18, 9, 9),
      balusters: balusterXs(1000, 42),
    }),
    [],
  );
  const v = (n: string) => `${id}-${n}`;
  return (
    <svg viewBox={viewBox} preserveAspectRatio={preserve} className="dv2-land" aria-hidden="true">
      <defs>
        <linearGradient id={v('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.powderDeep} stopOpacity="0.85" />
          <stop offset="0.3" stopColor={t.skyTop} />
          <stop offset="0.62" stopColor={t.skyLow} />
        </linearGradient>
        <radialGradient id={v('sun')} cx="0.72" cy="0.5" r="0.4">
          <stop offset="0" stopColor="#FFF6E2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFF6E2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={v('far')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2F6FA" />
          <stop offset="0.35" stopColor="#B7CADF" />
          <stop offset="1" stopColor="#C9D9E8" />
        </linearGradient>
        <linearGradient id={v('mid')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8EAACB" />
          <stop offset="1" stopColor="#B4C8DB" />
        </linearGradient>
        <linearGradient id={v('near')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9DBB8B" />
          <stop offset="1" stopColor="#7FA474" />
        </linearGradient>
        <linearGradient id={v('lake')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9C7DE" />
          <stop offset="0.25" stopColor={t.lake} />
          <stop offset="1" stopColor="#386C93" />
        </linearGradient>
        <linearGradient id={v('stone')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBF7F1" />
          <stop offset="1" stopColor={t.stone} />
        </linearGradient>
      </defs>
      <rect width="1000" height="1000" fill={`url(#${v('sky')})`} />
      <rect width="1000" height="700" fill={`url(#${v('sun')})`} />
      <g className="dv2-clouds" fill="#FFFFFF">
        {[
          [160, 250, 1],
          [520, 190, 0.8],
          [820, 300, 1.2],
          [1180, 230, 0.9],
        ].map(([x, y, k], i) => (
          <g key={i} className="dv2-cloud">
            <g transform={`translate(${x} ${y}) scale(${k})`} opacity="0.88">
              <ellipse cx="0" cy="0" rx="62" ry="20" />
              <circle cx="-22" cy="-14" r="22" />
              <circle cx="12" cy="-22" r="28" />
              <circle cx="40" cy="-8" r="18" />
            </g>
          </g>
        ))}
      </g>
      <path d={art.far} fill={`url(#${v('far')})`} />
      <path d={art.mid} fill={`url(#${v('mid')})`} />
      <ellipse cx="500" cy="606" rx="560" ry="16" fill="#FFFFFF" opacity="0.35" />
      <path d={art.near} fill={`url(#${v('near')})`} />
      {art.villas.map((h, i) => (
        <g key={i}>
          <rect x={h.x - h.w / 2} y={h.y - h.h} width={h.w} height={h.h} fill={STUCCO_2D[h.tone]} />
          <path d={`M${h.x - h.w * 0.6} ${h.y - h.h}L${h.x - h.w * 0.2} ${h.y - h.h * 1.4}L${h.x + h.w * 0.2} ${h.y - h.h * 1.4}L${h.x + h.w * 0.6} ${h.y - h.h}Z`} fill={t.terracotta} />
          <rect x={h.x - h.w * 0.3} y={h.y - h.h * 0.6} width={h.w * 0.6} height={h.h * 0.12} fill="#4A5864" opacity="0.5" />
        </g>
      ))}
      {art.cypresses.map((c, i) => (
        <ellipse key={i} cx={c.x} cy={c.y - c.w * 1.4} rx={c.w * 0.22} ry={c.w * 1.5} fill="#3F6249" />
      ))}
      <rect y="636" width="1000" height="364" fill={`url(#${v('lake')})`} />
      <g opacity="0.28">
        {art.villas.map((h, i) => (
          <rect key={i} x={h.x - h.w / 2} y={640 + (636 - h.y)} width={h.w} height={h.h * 0.8} fill={STUCCO_2D[h.tone]} />
        ))}
      </g>
      <g className="dv2-glitter" stroke="#FFFFFF" strokeLinecap="round">
        {Array.from({ length: 16 }, (_, i) => {
          const y = 660 + i * 13 + (i % 3) * 3;
          const w = 8 + ((i * 7) % 5) * 6 + i * 1.5;
          const x = 720 + Math.sin(i * 2.3) * (14 + i * 3);
          return <line key={i} x1={x - w} y1={y} x2={x + w} y2={y} strokeWidth={1.5 + i * 0.12} style={{ animationDelay: `${(i * 0.37) % 2}s` }} />;
        })}
      </g>
      <g className="dv2-boat">
        <g className="dv2-sail" transform={`translate(${boat} 720)`} style={{ '--bx': `${boat}px` } as React.CSSProperties}>
          <path d="M-46 0L46 0L34 13L-36 13Z" fill="#FBFAF6" />
          <path d="M-36 9L35 9L33 13L-35 13Z" fill={t.ink} />
          <path d="M0 -2L0 -96L-44 -6Z" fill="#FFFDF8" />
          <path d="M5 -4L5 -84L38 -6Z" fill="#FFFDF8" opacity="0.94" />
          <line x1="2" y1="0" x2="2" y2="-100" stroke={t.gold} strokeWidth="2" />
          <path d="M-60 18H70" stroke="#FFFFFF" strokeWidth="2" opacity="0.55" strokeLinecap="round" />
        </g>
      </g>
      {rail && (
        <g>
          <rect y="852" width="1000" height="26" fill={`url(#${v('stone')})`} />
          <rect y="878" width="1000" height="6" fill="#D8CDBD" />
          <g fill="#F4EEE5" stroke="#D9CCB8" strokeWidth="1.2">
            {art.balusters.map((x) => (
              <path key={x} d={balusterPath(x, 988, 104, 20)} />
            ))}
          </g>
          <rect y="986" width="1000" height="14" fill={t.stone} />
          {ROSES.map(([x, y, k], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
              <ellipse cx="-14" cy="4" rx="14" ry="6" fill="#4F7A47" transform="rotate(-20)" />
              <ellipse cx="15" cy="2" rx="13" ry="5.5" fill="#5E8A4E" transform="rotate(18)" />
              <circle r="11" fill={i % 3 === 1 ? '#F7E1E6' : t.rose} />
              <circle r="6.5" fill="#D98A9E" opacity="0.6" />
              <path d="M-4 -1a4 4 0 1 0 8 0" stroke="#C26F86" strokeWidth="1.2" fill="none" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

function Monogram({ view, x, y, size }: { view: SceneView; x: number; y: number; size: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={size} fill={view.palette.gold} style={{ fontFamily: view.lang === 'ar' ? 'var(--font-aref), serif' : 'var(--font-pinyon), cursive' }} direction={view.lang === 'ar' ? 'rtl' : 'ltr'}>
      {view.monogram}
    </text>
  );
}

export function Gate2D({ view, opening }: { view: SceneView; opening: boolean }) {
  const t = tokens(view);
  const [freeze, setFreeze] = useState(false);
  useEffect(() => setFreeze(new URLSearchParams(window.location.search).get('capture') === 'mid'), []);
  return (
    <div className={`dv2-gate ${opening ? 'is-opening' : ''} ${freeze ? 'dv2-freeze' : ''}`} aria-hidden="true">
      <style>{STYLES}</style>
      <div className="dv2-window">
        <Landscape t={t} id="dv2g" viewBox="200 200 600 800" preserve="xMidYMid slice" boat={470} rail />
      </div>
      <svg viewBox="0 0 300 400" className="dv2-frame" fill="none">
        <path d="M6 398V150A144 144 0 0 1 294 150V398" stroke={t.gold} strokeWidth="3.5" />
        <path d="M16 398V152A134 134 0 0 1 284 152V398" stroke={t.gold} strokeOpacity="0.55" strokeWidth="1.2" />
        <circle cx="150" cy="16" r="4.5" fill={t.gold} />
      </svg>
      <svg viewBox="0 0 300 120" className="dv2-garland">
        {[
          [18, 92, 1.3], [44, 104, 1], [8, 60, 0.9], [262, 98, 1.25], [288, 70, 1], [240, 108, 0.85],
        ].map(([x, y, k], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
            <ellipse cx="-12" cy="6" rx="13" ry="5" fill="#4F7A47" transform="rotate(-25)" />
            <ellipse cx="13" cy="5" rx="12" ry="5" fill="#5E8A4E" transform="rotate(22)" />
            <circle r="10.5" fill={i % 2 ? '#F7E1E6' : t.rose} />
            <circle r="6" fill="#D98A9E" opacity="0.55" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function Backdrop2D({ view }: { view: SceneView }) {
  const t = tokens(view);
  const env = useRef<HTMLDivElement>(null);

  // The letter rises with the scroll: CSS scroll-driven animation where supported, else this.
  useEffect(() => {
    const el = env.current;
    if (!el || (typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: scroll()'))) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const k = max > 0 ? Math.min(1, window.scrollY / (max * 0.6)) : 0;
      el.style.setProperty('--rise', k.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden" style={{ background: t.skyLow }}>
      <style>{STYLES}</style>
      <div className="dv2-back">
        <Landscape t={t} id="dv2b" viewBox="0 0 1000 1000" boat={300} rail />
      </div>
      <div ref={env} className="dv2-env">
        <svg viewBox="0 0 200 140" className="dv2-flap">
          <path d="M4 52L100 2L196 52Z" fill="#F7E9B8" stroke={t.gold} strokeWidth="1.5" />
          <path d="M40 34V52M70 18V52M100 4V52M130 18V52M160 34V52" stroke={t.rose} strokeWidth="9" opacity="0.5" />
        </svg>
        <div className="dv2-letter">
          <svg viewBox="0 0 180 250">
            <rect x="1" y="1" width="178" height="248" rx="3" fill="#FCF9F2" stroke={t.gold} strokeWidth="2" />
            <path d="M48 128V70a42 42 0 0 1 84 0v58Z" fill={t.skyTop} />
            <path d="M48 112l20-18 14 10 22-22 28 24v22H48Z" fill="#9DB4CC" />
            <rect x="48" y="112" width="84" height="16" fill={t.lake} />
            <path d="M96 124V102l10 22Z" fill="#FFFFFF" />
            <path d="M48 128V70a42 42 0 0 1 84 0v58" fill="none" stroke={t.gold} strokeWidth="1.5" />
            <Monogram view={view} x={90} y={186} size={34} />
            <path d="M60 206H120" stroke={t.gold} strokeWidth="1" />
          </svg>
        </div>
        <svg viewBox="0 0 200 140" className="dv2-pocket">
          <path d="M2 52L100 104L198 52V138H2Z" fill={t.powder} />
          <path d="M2 138L100 84L198 138" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.5" />
          <path d="M2 52L100 104L198 52" fill="none" stroke={t.gold} strokeWidth="1.5" />
          <rect x="2" y="52" width="196" height="86" fill="none" stroke={t.gold} strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  );
}

const STYLES = `
.dv2-land{position:absolute;inset:0;width:100%;height:100%;display:block}
.dv2-cloud{animation:dv2-drift 60s ease-in-out infinite alternate}
.dv2-cloud:nth-child(2n){animation-duration:85s;animation-delay:-20s}
@keyframes dv2-drift{from{transform:translateX(-60px)}to{transform:translateX(80px)}}
.dv2-glitter line{opacity:.25;animation:dv2-twinkle 2s ease-in-out infinite}
@keyframes dv2-twinkle{50%{opacity:.95}}
.dv2-boat{animation:dv2-bob 3.6s ease-in-out infinite}
@keyframes dv2-bob{50%{transform:translateY(3px) rotate(.6deg)}}
.dv2-boat{transform-box:fill-box;transform-origin:center bottom}
.dv2-gate{position:relative;width:min(76vw,21rem);aspect-ratio:3/4;--shift:0s}
.dv2-gate.dv2-freeze{--shift:1.3s}.dv2-gate.dv2-freeze *{animation-play-state:paused!important}
.dv2-window{position:absolute;inset:0;overflow:hidden;border-radius:50% 50% 0 0/37.5% 37.5% 0 0;box-shadow:0 30px 60px -20px rgba(0,0,0,.55);background:#EAF4FB;transform-origin:50% 62%}
.dv2-frame{position:absolute;inset:-1.5%;width:103%;height:103%;overflow:visible;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
.dv2-garland{position:absolute;left:-8%;right:-8%;bottom:-6%;width:116%;overflow:visible;filter:drop-shadow(0 3px 4px rgba(0,0,0,.3))}
.dv2-gate.is-opening .dv2-window{animation:dv2-through 2.4s cubic-bezier(.55,0,.3,1) calc(.1s - var(--shift)) forwards}
.dv2-gate.is-opening .dv2-frame,.dv2-gate.is-opening .dv2-garland{animation:dv2-out 1.6s ease-in calc(.3s - var(--shift)) forwards}
.dv2-gate.is-opening .dv2-sail{animation:dv2-glide 2.4s cubic-bezier(.45,0,.3,1) calc(0s - var(--shift)) forwards}
@keyframes dv2-through{0%{transform:scale(1)}100%{transform:scale(3.4);border-radius:0;box-shadow:none}}
@keyframes dv2-out{to{opacity:0;transform:scale(1.6)}}
@keyframes dv2-glide{from{transform:translate(var(--bx),720px)}to{transform:translate(calc(var(--bx) - 160px),722px)}}
.dv2-back{position:absolute;inset:0}
.dv2-env{--rise:0;position:absolute;left:50%;bottom:max(1.5svh,10px);width:clamp(150px,30vw,250px);aspect-ratio:200/140;transform:translateX(-50%);filter:drop-shadow(0 14px 18px rgba(31,54,87,.3))}
.dv2-env>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.dv2-flap{transform:translateY(-36%)}
.dv2-letter{position:absolute;left:5%;width:90%;top:8%;aspect-ratio:180/250;transform:translateY(calc((1 - var(--rise)) * 4% - var(--rise) * 62%))}
.dv2-letter svg{display:block;width:100%;height:100%}
@supports (animation-timeline: scroll()){
  .dv2-letter{animation:dv2-rise linear both;animation-timeline:scroll(root);animation-range:0% 60%}
  @keyframes dv2-rise{from{transform:translateY(4%)}to{transform:translateY(-62%)}}
}
@media (prefers-reduced-motion: reduce){
  .dv2-cloud,.dv2-glitter line,.dv2-boat{animation:none}
  .dv2-gate.is-opening .dv2-window{animation:dv2-fade 1.2s ease forwards}
  .dv2-gate.is-opening .dv2-sail{animation:none}
  @keyframes dv2-fade{to{opacity:0}}
  .dv2-letter{transform:translateY(-62%);animation:none;opacity:calc(.25 + var(--rise) * .75)}
  @supports (animation-timeline: scroll()){
    .dv2-letter{animation:dv2-appear linear both;animation-timeline:scroll(root);animation-range:0% 60%}
    @keyframes dv2-appear{from{opacity:.25}to{opacity:1}}
  }
}
`;
