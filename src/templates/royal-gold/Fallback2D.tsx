'use client';

import { useEffect, useState } from 'react';
import type { SceneView } from '@/lib/invite/scene-types';
import { domeProfile, minaretProfile, pointedArch, type P2 } from './geometry';

/**
 * The royal-gold 2D path (no WebGL, or reduced motion): an SVG pochette on emerald whose four
 * flaps unfold in CSS 3D, 0.15 s apart, into a radial burst of gold light; behind the content,
 * an ivory hall with a pointed zellige-framed arch, swinging brass lanterns, falling blossoms and
 * a pale-gold mosque in the haze. Pure SVG/CSS.
 */
export const OPENING_MS = 2800;

const tokens = (view: SceneView) => {
  const s = view.palette.scene;
  return {
    ivory: s.ivory ?? '#F8F3E8',
    ivoryWarm: s.ivoryWarm ?? '#EFE3CC',
    gold: s.gold ?? '#C9A96E',
    goldDeep: s.goldDeep ?? '#9F7B3C',
    goldPale: s.goldPale ?? '#E8D6A6',
    brass: s.brass ?? '#B38B4D',
    blossom: s.blossom ?? '#FFFDF7',
    skyTop: s.skyTop ?? '#F3E3BC',
    skyLow: s.skyLow ?? '#FBF4E2',
    emerald: s.emerald ?? '#0B3D2E',
  };
};

const fmt = (n: number) => Math.round(n * 10) / 10;
/** SVG path through points given in "world" units (y up), mapped by scale and origin. */
function pathOf(pts: P2[], k: number, ox: number, oy: number, close = true): string {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${fmt(ox + x * k)} ${fmt(oy - y * k)}`).join(' ') + (close ? ' Z' : '');
}
/** A lathe profile (radius, y) drawn as a symmetric silhouette. */
function silhouette(profile: P2[], k: number, ox: number, oy: number): string {
  const right = profile.map(([r, y]) => [r, y] as P2);
  const left = [...profile].reverse().map(([r, y]) => [-r, y] as P2);
  return pathOf([...right, ...left], k, ox, oy);
}

function Star8({ cx, cy, r, fill, stroke, sw = 1, rot = 0 }: { cx: number; cy: number; r: number; fill: string; stroke?: string; sw?: number; rot?: number }) {
  const inner = (r * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  const pts = Array.from({ length: 16 }, (_, k) => {
    const a = rot + (k * Math.PI) / 8;
    const rad = k % 2 ? inner : r;
    return `${fmt(cx + Math.cos(a) * rad)},${fmt(cy + Math.sin(a) * rad)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />;
}

/** Zellige tile as an SVG pattern: touching eight-point stars on emerald, gold-ruled. */
function ZelligePattern({ id, size, t }: { id: string; size: number; t: ReturnType<typeof tokens> }) {
  const R = size * 0.355;
  return (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
      <rect width={size} height={size} fill={t.emerald} />
      {[
        [size / 2, size / 2],
        [0, 0],
        [size, 0],
        [0, size],
        [size, size],
      ].map(([x, y], i) => (
        <g key={i}>
          <Star8 cx={x!} cy={y!} r={R} fill={t.ivory} stroke={t.gold} sw={size * 0.03} />
          <Star8 cx={x!} cy={y!} r={R * 0.42} fill={t.gold} rot={Math.PI / 8} />
        </g>
      ))}
    </pattern>
  );
}

/* ───────────────────────────── Gate ───────────────────────────── */

const FLAP = 'M0 0 H300 C262 46 214 98 172 146 Q150 172 128 146 C86 98 38 46 0 0 Z';

const GATE_CSS = `
.rg2-gate{position:relative;width:min(70vw,21rem);aspect-ratio:1;perspective:1100px;--rg2-shift:0s}
.rg2-gate.rg2-freeze{--rg2-shift:1.45s}
.rg2-gate.rg2-freeze *{animation-play-state:paused!important}
.rg2-env{position:absolute;inset:0;z-index:1}
.rg2-body{position:absolute;inset:0;border-radius:4px;background:linear-gradient(150deg,#fffdf6,#f4ead6);box-shadow:0 34px 60px -24px rgba(0,0,0,.6),0 0 0 2px var(--rg2-gold),inset 0 0 0 1px rgba(255,255,255,.6)}
.rg2-card{position:absolute;inset:6%;border-radius:3px;background:radial-gradient(circle at 50% 50%,#fffaf0 0%,var(--rg2-pale) 55%,var(--rg2-gold) 100%);opacity:.9}
.rg2-flap{position:absolute;inset:0}
.rg2-flap svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.rg2-flap-t{transform-origin:50% 0;z-index:4;--d:.4s}
.rg2-flap-r{transform-origin:100% 50%;z-index:3;--d:.55s}
.rg2-flap-l{transform-origin:0 50%;z-index:2;--d:.7s}
.rg2-flap-b{transform-origin:50% 100%;z-index:1;--d:.85s}
.rg2-liner{opacity:0}
.rg2-seal{position:absolute;left:50%;top:50%;width:25%;aspect-ratio:1;transform:translate(-50%,-50%);z-index:6}
.rg2-half{position:absolute;inset:0;--d:0s}
.rg2-dust{--d:0s;position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:var(--rg2-pale);opacity:0;
  box-shadow:24px -30px 0 var(--rg2-gold),-34px -18px 0 var(--rg2-pale),40px 12px 0 var(--rg2-pale),-28px 30px 0 var(--rg2-gold),8px 40px 0 var(--rg2-pale),-44px -2px 0 var(--rg2-gold),30px 34px 0 var(--rg2-gold),-6px -44px 0 var(--rg2-pale)}
.rg2-burst{position:absolute;left:50%;top:50%;width:260vmax;height:260vmax;margin:-130vmax 0 0 -130vmax;border-radius:50%;pointer-events:none;opacity:0;transform:scale(.06);z-index:0;--d:1.2s;
  background:radial-gradient(circle,#fffaf0 0%,#fff6e2 14%,var(--rg2-pale) 26%,color-mix(in srgb,var(--rg2-gold) 70%,transparent) 36%,transparent 52%)}
.rg2-rays{position:absolute;left:50%;top:50%;width:190vmax;height:190vmax;margin:-95vmax 0 0 -95vmax;pointer-events:none;opacity:0;z-index:7;--d:1.25s;
  background:repeating-conic-gradient(from 0deg,rgba(255,240,205,.55) 0deg 2.2deg,transparent 2.2deg 11deg);
  -webkit-mask:radial-gradient(circle,#000 0%,rgba(0,0,0,.6) 22%,transparent 50%);mask:radial-gradient(circle,#000 0%,rgba(0,0,0,.6) 22%,transparent 50%)}
.rg2-gate.is-opening .rg2-half-a{animation:rg2-half-a .55s cubic-bezier(.2,.8,.3,1) calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-half-b{animation:rg2-half-b .55s cubic-bezier(.2,.8,.3,1) calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-dust{animation:rg2-dust .7s ease-out calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-flap-t{animation:rg2-open-t .62s cubic-bezier(.6,0,.3,1) calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-flap-r{animation:rg2-open-r .62s cubic-bezier(.6,0,.3,1) calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-flap-l{animation:rg2-open-l .62s cubic-bezier(.6,0,.3,1) calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-flap-b{animation:rg2-open-b .62s cubic-bezier(.6,0,.3,1) calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-liner{animation:rg2-liner .62s linear calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-card{--d:.9s;animation:rg2-glow 1.2s ease-in calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-rays{animation:rg2-rays 1.5s ease-out calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-burst{animation:rg2-burst 1.5s cubic-bezier(.55,0,.35,1) calc(var(--d,0s) - var(--rg2-shift)) forwards}
.rg2-gate.is-opening .rg2-env{--d:1.95s;animation:rg2-env .75s cubic-bezier(.5,0,.75,0) calc(var(--d,0s) - var(--rg2-shift)) forwards}
@keyframes rg2-half-a{to{transform:translate(-70%,55%) rotate(-50deg);opacity:0}}
@keyframes rg2-half-b{to{transform:translate(70%,55%) rotate(45deg);opacity:0}}
@keyframes rg2-open-t{to{transform:rotateX(178deg)}}
@keyframes rg2-open-b{to{transform:rotateX(-178deg)}}
@keyframes rg2-open-r{to{transform:rotateY(178deg)}}
@keyframes rg2-open-l{to{transform:rotateY(-178deg)}}
@keyframes rg2-liner{0%,49%{opacity:0}50%,100%{opacity:1}}
@keyframes rg2-glow{to{opacity:1;filter:brightness(1.35);box-shadow:0 0 60px 20px rgba(255,236,190,.85)}}
@keyframes rg2-dust{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(2.6)}}
@keyframes rg2-rays{0%{opacity:0;transform:rotate(0) scale(.3)}45%{opacity:1}100%{opacity:.25;transform:rotate(14deg) scale(1)}}
@keyframes rg2-burst{0%{opacity:0;transform:scale(.06)}30%{opacity:1;transform:scale(.16)}100%{opacity:1;transform:scale(1)}}
@keyframes rg2-env{to{transform:scale(1.25);opacity:0}}
@media (prefers-reduced-motion: reduce){
  .rg2-gate.is-opening .rg2-flap,.rg2-gate.is-opening .rg2-dust,.rg2-gate.is-opening .rg2-rays,.rg2-gate.is-opening .rg2-card,.rg2-gate.is-opening .rg2-half{animation:none}
  .rg2-gate.is-opening .rg2-env{animation:none;opacity:0}
  .rg2-gate.is-opening .rg2-burst{animation:none;transform:scale(1);opacity:1}
}
`;

export function Gate2D({ view, opening }: { view: SceneView; opening: boolean }) {
  const t = tokens(view);
  // Capture "mid" (screenshots): hold the CSS opening at 1.45 s instead of racing a slow renderer.
  const [freeze, setFreeze] = useState(false);
  useEffect(() => setFreeze(new URLSearchParams(window.location.search).get('capture') === 'mid'), []);
  const flap = (key: 't' | 'r' | 'l' | 'b', rot: number) => (
    <div key={key} className={`rg2-flap rg2-flap-${key}`}>
      <svg viewBox="0 0 300 300" style={{ transform: `rotate(${rot}deg)` }}>
        <path d={FLAP} fill="url(#rg2-paper)" stroke={t.gold} strokeWidth="3" />
        <path d="M28 10 Q150 150 150 150 Q150 150 272 10" fill="none" stroke={t.goldPale} strokeWidth="1" opacity=".9" />
        <g opacity=".55" fill="none" stroke="#e6d7b8" strokeWidth="1.4">
          <path d="M150 18 C142 50 158 80 150 118" />
          {[34, 56, 78, 100].map((y, i) => (
            <ellipse key={y} cx={150 + (i % 2 ? 8 : -8)} cy={y} rx="3.5" ry="8" transform={`rotate(${i % 2 ? 40 : -40} ${150 + (i % 2 ? 8 : -8)} ${y})`} />
          ))}
          <circle cx="150" cy="128" r="7" />
        </g>
        <g className="rg2-liner">
          <path d={FLAP} fill="url(#rg2-liner-tile)" stroke={t.gold} strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
  return (
    <div
      className={`rg2-gate ${opening ? 'is-opening' : ''} ${freeze ? 'rg2-freeze' : ''}`}
      aria-hidden="true"
      style={{ '--rg2-gold': t.gold, '--rg2-pale': t.goldPale } as React.CSSProperties}
    >
      <style>{GATE_CSS}</style>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="rg2-paper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffdf7" />
            <stop offset="1" stopColor={t.ivory} />
          </linearGradient>
          <ZelligePattern id="rg2-liner-tile" size={30} t={t} />
        </defs>
      </svg>
      <div className="rg2-rays" />
      <div className="rg2-env">
        <div className="rg2-body">
          <div className="rg2-card" />
        </div>
        {flap('b', 180)}
        {flap('l', -90)}
        {flap('r', 90)}
        {flap('t', 0)}
        <div className="rg2-seal">
          {(['a', 'b'] as const).map((h) => (
            <svg key={h} viewBox="0 0 100 100" className={`rg2-half rg2-half-${h}`} style={{ clipPath: h === 'a' ? 'polygon(0 0,58% 0,44% 100%,0 100%)' : 'polygon(58% 0,100% 0,100% 100%,44% 100%)' }}>
              <defs>
                <radialGradient id={`rg2-wax-${h}`} cx="38%" cy="32%" r="75%">
                  <stop offset="0" stopColor="#fffdf6" />
                  <stop offset=".7" stopColor={t.ivoryWarm} />
                  <stop offset="1" stopColor="#d9c7a3" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="46" fill={`url(#rg2-wax-${h})`} stroke={t.gold} strokeWidth="5" />
              <circle cx="50" cy="50" r="36" fill="none" stroke={t.gold} strokeWidth="1.2" opacity=".8" />
              <text x="50" y="52" textAnchor="middle" dominantBaseline="middle" fontSize="24" fill={t.goldDeep} className="font-display">
                {view.monogram}
              </text>
            </svg>
          ))}
          <span className="rg2-dust" />
        </div>
      </div>
      <div className="rg2-burst" />
    </div>
  );
}

/* ─────────────────────────── Backdrop ─────────────────────────── */

const BACKDROP_CSS = `
.rg2-lantern{transform-box:view-box;animation:rg2-swing-in 6s cubic-bezier(.3,.6,.4,1),rg2-sway 3.2s ease-in-out 6s infinite alternate}
.rg2-lantern-b{animation-delay:0s,6.4s;animation-duration:6.8s,3.6s}
@keyframes rg2-swing-in{0%{transform:rotate(0)}10%{transform:rotate(5deg)}24%{transform:rotate(-3.6deg)}40%{transform:rotate(2.4deg)}56%{transform:rotate(-1.6deg)}72%{transform:rotate(1.1deg)}88%{transform:rotate(-.8deg)}100%{transform:rotate(-1deg)}}
@keyframes rg2-sway{from{transform:rotate(-1deg)}to{transform:rotate(1deg)}}
.rg2-petal{position:absolute;top:-4vh;width:12px;height:12px;border-radius:50%;
  background:radial-gradient(circle,var(--rg2-pale) 0 18%,var(--rg2-blossom) 24%);
  -webkit-mask:radial-gradient(circle at 50% 18%,#000 30%,transparent 31%),radial-gradient(circle at 84% 42%,#000 30%,transparent 31%),radial-gradient(circle at 70% 84%,#000 30%,transparent 31%),radial-gradient(circle at 30% 84%,#000 30%,transparent 31%),radial-gradient(circle at 16% 42%,#000 30%,transparent 31%),radial-gradient(circle,#000 34%,transparent 35%);
  mask:radial-gradient(circle at 50% 18%,#000 30%,transparent 31%),radial-gradient(circle at 84% 42%,#000 30%,transparent 31%),radial-gradient(circle at 70% 84%,#000 30%,transparent 31%),radial-gradient(circle at 30% 84%,#000 30%,transparent 31%),radial-gradient(circle at 16% 42%,#000 30%,transparent 31%),radial-gradient(circle,#000 34%,transparent 35%);
  filter:drop-shadow(0 1px 1px rgba(122,92,38,.25));animation:rg2-fall linear infinite}
@keyframes rg2-fall{0%{transform:translate3d(0,0,0) rotate(0)}50%{transform:translate3d(4vw,55vh,0) rotate(200deg)}100%{transform:translate3d(-2vw,110vh,0) rotate(420deg)}}
@media (prefers-reduced-motion: reduce){.rg2-lantern,.rg2-petal{animation:none}.rg2-petal{display:none}}
`;

const PETALS = [
  [8, 13, 0],
  [22, 17, 4],
  [37, 15, 9],
  [55, 19, 2],
  [68, 14, 6.5],
  [83, 18, 11],
  [93, 16, 3.5],
  [14, 20, 13],
  [47, 16, 15],
  [76, 21, 8],
] as const;

export function Backdrop2D({ view }: { view: SceneView }) {
  const t = tokens(view);
  // A 1200 × 900 stage; "slice" keeps the arch centred and filling phones and desktops alike.
  const cx = 600;
  const floor = 840;
  const opening = pathOf(pointedArch(2.6, 3.3, 5.6, 24), 100, cx, floor);
  const extrados = pathOf(pointedArch(3.0, 3.3, 5.86, 24), 100, cx, floor, false);
  const niche = (x: number) => pathOf(pointedArch(1.5, 3.0, 4.2, 18), 100, x, 760);
  const mosqueY = 790;
  const dome = silhouette(domeProfile(0.62, 0.95), 100, cx, mosqueY - 92);
  const minaret = (x: number) => silhouette(minaretProfile(2.5, 0.07), 100, x, mosqueY);
  const lantern = (x: number, cls: string) => (
    <g className={`rg2-lantern ${cls}`} style={{ transformOrigin: `${x}px 0px` }}>
      <line x1={x} y1="-20" x2={x} y2="318" stroke={t.brass} strokeWidth="2.2" strokeDasharray="5 3" />
      <circle cx={x} cy="372" r="58" fill="url(#rg2-glow)" />
      <path d={`M${x - 6} 318 Q${x} 300 ${x + 6} 318 L${x + 26} 336 Q${x + 34} 342 ${x + 24} 344 L${x - 24} 344 Q${x - 34} 342 ${x - 26} 336 Z`} fill={t.brass} />
      <path d={`M${x - 24} 344 Q${x - 40} 372 ${x - 22} 404 L${x + 22} 404 Q${x + 40} 372 ${x + 24} 344 Z`} fill={t.goldDeep} />
      {[-12, 0, 12].map((dx) => (
        <Star8 key={dx} cx={x + dx} cy={374} r={dx ? 5 : 7.5} fill="#FFE2A6" />
      ))}
      <path d={`M${x - 22} 404 Q${x} 418 ${x + 22} 404 L${x + 6} 424 L${x} 444 L${x - 6} 424 Z`} fill={t.brass} />
    </g>
  );
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ background: `linear-gradient(${t.skyTop}, ${t.skyLow})`, '--rg2-pale': t.goldPale, '--rg2-blossom': t.blossom } as React.CSSProperties}
    >
      <style>{BACKDROP_CSS}</style>
      <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <ZelligePattern id="rg2-zel" size={26} t={t} />
          <radialGradient id="rg2-sun" cx="50%" cy="62%" r="40%">
            <stop offset="0" stopColor="#fffaf0" />
            <stop offset=".5" stopColor={t.skyLow} />
            <stop offset="1" stopColor={t.skyTop} />
          </radialGradient>
          <radialGradient id="rg2-glow">
            <stop offset="0" stopColor="#FFD58A" stopOpacity=".75" />
            <stop offset="1" stopColor="#FFD58A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rg2-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.ivory} />
            <stop offset="1" stopColor={t.ivoryWarm} />
          </linearGradient>
          <linearGradient id="rg2-mist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.skyLow} stopOpacity="0" />
            <stop offset="1" stopColor={t.skyLow} stopOpacity=".95" />
          </linearGradient>
        </defs>
        {/* Through the arch: sun-washed sky, the mosque in haze, the path and the couple. */}
        <rect x="380" y="200" width="440" height="660" fill="url(#rg2-sun)" />
        <g fill={t.goldPale} opacity=".75">
          <path d={dome} />
          <rect x={cx - 52} y={mosqueY - 96} width="104" height="12" />
          <rect x={cx - 95} y={mosqueY - 52} width="190" height="52" />
          <rect x={cx - 30} y={mosqueY - 84} width="60" height="84" />
          <path d={minaret(cx - 112)} />
          <path d={minaret(cx + 112)} />
        </g>
        <g fill={t.goldDeep} opacity=".25">
          <path d={pathOf(pointedArch(0.36, 0.38, 0.7, 10), 100, cx, mosqueY)} />
        </g>
        <rect x="380" y={mosqueY - 70} width="440" height="80" fill="url(#rg2-mist)" />
        <path d={`M${cx - 18} ${mosqueY} L${cx + 18} ${mosqueY} L${cx + 70} ${floor} L${cx - 70} ${floor} Z`} fill={t.goldPale} opacity=".7" />
        {[-1, 1].map((s) =>
          [0, 1, 2].map((i) => (
            <path
              key={`${s}${i}`}
              d={`M${cx + s * (34 + i * 18)} ${mosqueY + 8 + i * 12} q${s * 7} -${46 + i * 10} 0 -${70 + i * 16} q${-s * 7} ${24 + i * 6} 0 ${70 + i * 16} Z`}
              fill="#5E7F68"
              opacity={0.35 + i * 0.15}
            />
          )),
        )}
        <g transform={`translate(${cx} ${floor - 8})`}>
          <path d="M-14 0 v-22 q0 -9 5 -12 a5.5 5.5 0 1 1 6 0 q5 3 5 12 v22 z" fill="#2F332C" />
          <path d="M3 0 q2 -26 7 -30 a5 5 0 1 1 6 0 q6 6 10 30 z" fill="#FBF6EA" stroke="#e6d9bf" strokeWidth=".8" />
        </g>

        {/* The wall, cut by the arch. */}
        <path d={`M-20 -20 H1220 V920 H-20 Z ${opening}`} fill="url(#rg2-wall)" fillRule="evenodd" />
        <rect x="-20" y="770" width="1240" height="70" fill="url(#rg2-zel)" />
        <rect x="-20" y="766" width="1240" height="5" fill={t.gold} />
        {[cx - 400, cx + 400].map((x) => (
          <g key={x}>
            <path d={niche(x)} fill={t.goldPale} fillOpacity=".35" stroke={t.gold} strokeWidth="3" />
            <Star8 cx={x} cy={510} r={22} fill={t.emerald} stroke={t.gold} sw={2} />
          </g>
        ))}
        <path d={`M${cx - 200} 840 V210 H${cx + 200} V840 H${cx + 172} V238 H${cx - 172} V840 Z`} fill="url(#rg2-zel)" stroke={t.gold} strokeWidth="3" />
        <path d={extrados} fill="none" stroke={t.goldPale} strokeWidth="26" />
        <path d={extrados} fill="none" stroke={t.ivory} strokeWidth="26" strokeDasharray="18 18" />
        <path d={extrados} fill="none" stroke={t.gold} strokeWidth="2" transform="translate(0 0)" />
        <path d={opening} fill="none" stroke={t.gold} strokeWidth="5" />
        {[-1, 1].map((s) => (
          <Star8 key={s} cx={cx + s * 132} cy={292} r={20} fill={t.emerald} stroke={t.gold} sw={2} />
        ))}
        <rect x={cx - 200} y="120" width="400" height="64" fill={t.ivoryWarm} stroke={t.gold} strokeWidth="3" />
        <rect x={cx - 190} y="130" width="380" height="44" fill="none" stroke={t.gold} strokeWidth="1" />
        <rect x="-20" y="60" width="1240" height="22" fill="url(#rg2-zel)" stroke={t.gold} strokeWidth="2" />
        {lantern(cx - 186, 'rg2-lantern-a')}
        {lantern(cx + 186, 'rg2-lantern-b')}
      </svg>
      <div className="invite-dust absolute inset-0" style={{ '--dust': t.gold } as React.CSSProperties} />
      {PETALS.map(([left, dur, delay], i) => (
        <span key={i} className="rg2-petal" style={{ left: `${left}%`, animationDuration: `${dur}s`, animationDelay: `-${delay}s` }} />
      ))}
    </div>
  );
}
