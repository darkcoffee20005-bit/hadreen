'use client';

import { useEffect, useRef, useState } from 'react';
import type { SceneView } from '@/lib/invite/scene-types';
import { mixHex as mix } from '@/lib/invite/stage/color';

/**
 * The blossom-oud 2D path (no WebGL, or reduced motion). Pure SVG/CSS:
 *  gate     a blush envelope with a rounded rose-gold-edged flap, a pressed rose sprig and an
 *           oud-brown seal on plum damask; a shimmer runs along the foil;
 *  opening  the flap lifts, the envelope slides away in a bloom of light, and rose-satin
 *           curtains (gradient folds) draw back to their gold tiebacks, revealing an SVG crystal
 *           chandelier (CSS twinkles) and the palm avenue to the palace;
 *  backdrop the dusk avenue in layers (sky, palace, palms, lanterns, mist) that part gently as
 *           the guest scrolls; tied-back curtains frame the top corners.
 * Under reduced motion the opening is a cross-fade and nothing drifts.
 */
export const OPENING_MS = 3000;
/** Seconds into the CSS opening that capture "mid" holds. */
const MID = 1.7;

const tokens = (view: SceneView) => {
  const s = view.palette.scene;
  return {
    satin: s.satin ?? '#E7B9BC',
    satinDeep: s.satinDeep ?? '#B86A7A',
    gold: s.tieback ?? view.palette.gold,
    crystal: s.crystal ?? '#FFF4EE',
    mist: s.mist ?? '#F4C6CD',
    palm: s.palm ?? '#46624F',
    palace: s.palace ?? '#EBDCCB',
    top: s.duskTop ?? '#3A2638',
    low: s.duskLow ?? '#E6A9A6',
    oud: s.oudWood ?? '#5A3A2E',
  };
};
type Tokens = ReturnType<typeof tokens>;

const vars = (t: Tokens) =>
  ({
    '--bo2-satin': t.satin,
    '--bo2-deep': t.satinDeep,
    '--bo2-gold': t.gold,
    '--bo2-top': t.top,
    '--bo2-low': t.low,
    '--bo2-mist': t.mist,
    '--bo2-palace': t.palace,
    '--bo2-oud': t.oud,
  }) as React.CSSProperties;

const CSS = `
.bo2-root{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;--bo2-shift:0s;--bo2-s:0;
  background:linear-gradient(180deg,var(--bo2-top) 0%,color-mix(in srgb,var(--bo2-top) 55%,var(--bo2-low)) 38%,var(--bo2-low) 62%,var(--bo2-mist) 100%)}
.bo2-root.bo2-freeze{--bo2-shift:${MID}s}
.bo2-root.bo2-freeze *{animation-play-state:paused!important}
.bo2-avenue{position:absolute;left:50%;bottom:0;width:clamp(80svh,100vw,125svh);aspect-ratio:1;transform:translateX(-50%);overflow:visible}
.bo2-layer{transform-origin:50% 60%;transition:transform .2s linear}
.bo2-backdrop .bo2-l1{transform:translateY(calc(var(--bo2-s) * -1.5%)) scale(calc(1 + var(--bo2-s) * .05))}
.bo2-backdrop .bo2-l2{transform:translateY(calc(var(--bo2-s) * -3%)) scale(calc(1 + var(--bo2-s) * .12))}
.bo2-backdrop .bo2-l3{transform:translateY(calc(var(--bo2-s) * -5%)) scale(calc(1 + var(--bo2-s) * .22))}
.bo2-mist{animation:bo2-drift 18s ease-in-out infinite alternate}
.bo2-mist:nth-of-type(2n){animation-duration:23s;animation-delay:-7s}
@keyframes bo2-drift{from{transform:translateX(-3%)}to{transform:translateX(3%)}}
.bo2-lamp{animation:bo2-flicker 1.9s ease-in-out infinite alternate}
.bo2-lamp:nth-of-type(3n){animation-duration:1.4s;animation-delay:-.6s}
@keyframes bo2-flicker{0%{opacity:.85}40%{opacity:1}70%{opacity:.9}100%{opacity:.97}}
.bo2-star{animation:bo2-tw 3.2s ease-in-out infinite}
@keyframes bo2-tw{0%,100%{opacity:.25}50%{opacity:.9}}

/* Chandelier */
.bo2-chand{position:absolute;left:50%;top:-2svh;width:min(46vw,30svh);transform:translateX(-50%);overflow:visible;opacity:0}
.bo2-twinkle{transform-box:fill-box;transform-origin:50% 50%;animation:bo2-glint 2.6s ease-in-out infinite;opacity:.2}
@keyframes bo2-glint{0%,70%,100%{opacity:.15;transform:scale(.5)}82%{opacity:1;transform:scale(1.25)}}
.bo2-swing{transform-origin:50% 0;animation:bo2-swing 6s ease-in-out infinite alternate}
@keyframes bo2-swing{from{transform:rotate(-1.2deg)}to{transform:rotate(1.2deg)}}

/* Curtains */
.bo2-curtain{position:absolute;top:0;bottom:0;width:51%;
  background:
    linear-gradient(180deg,rgba(60,20,35,.35),transparent 18%,transparent 82%,rgba(60,20,35,.3)),
    repeating-linear-gradient(90deg,color-mix(in srgb,var(--bo2-deep) 85%,#2a0f1a) 0,var(--bo2-satin) calc(var(--fold)*.38),color-mix(in srgb,var(--bo2-satin) 55%,#fff) calc(var(--fold)*.5),var(--bo2-satin) calc(var(--fold)*.62),color-mix(in srgb,var(--bo2-deep) 85%,#2a0f1a) var(--fold));
  --fold:clamp(26px,6vw,80px)}
.bo2-curtain::after{content:'';position:absolute;top:0;bottom:0;width:5px;background:linear-gradient(90deg,#8a6a2e,var(--bo2-gold),#f3dca0,var(--bo2-gold))}
.bo2-cl{left:0;transform-origin:0 50%}
.bo2-cl::after{right:0}
.bo2-cr{right:0;transform-origin:100% 50%}
.bo2-cr::after{left:0}
.bo2-tie{position:absolute;top:58%;width:34px;height:14px;border-radius:50%;opacity:0;
  background:radial-gradient(circle at 40% 35%,#f6e2b0,var(--bo2-gold) 50%,#7a5c26)}
.bo2-tie.l{left:calc(14vw - 17px)}
.bo2-tie.r{right:calc(14vw - 17px)}
.bo2-tie::after{content:'';position:absolute;left:50%;top:10px;width:12px;height:30px;margin-left:-6px;border-radius:40% 40% 50% 50%;
  background:repeating-linear-gradient(90deg,#7a5c26 0 2px,var(--bo2-gold) 2px 4px)}
.is-opening .bo2-cl{animation:bo2-drawL 1.6s cubic-bezier(.62,0,.28,1) calc(1.05s - var(--bo2-shift)) forwards}
.is-opening .bo2-cr{animation:bo2-drawR 1.6s cubic-bezier(.62,0,.28,1) calc(1.05s - var(--bo2-shift)) forwards}
@keyframes bo2-drawL{to{transform:scaleX(.28);clip-path:polygon(0 0,100% 0,38% 58%,90% 100%,0 100%)}}
@keyframes bo2-drawR{to{transform:scaleX(.28);clip-path:polygon(0 0,100% 0,100% 100%,10% 100%,62% 58%)}}
.bo2-cl{clip-path:polygon(0 0,100% 0,100% 58%,100% 100%,0 100%)}
.bo2-cr{clip-path:polygon(0 0,100% 0,100% 100%,0 100%,0 58%)}
.is-opening .bo2-tie{animation:bo2-on .4s ease-out calc(2.3s - var(--bo2-shift)) forwards}
.is-opening .bo2-chand{animation:bo2-on .8s ease-out calc(1.1s - var(--bo2-shift)) forwards}

/* Envelope */
.bo2-env{position:absolute;left:50%;top:50%;width:min(84vw,62svh);transform:translate(-50%,-50%);overflow:visible}
.bo2-damask{position:absolute;inset:0;background:
  radial-gradient(60% 45% at 50% 50%,color-mix(in srgb,var(--bo2-deep) 45%,var(--bo2-top)) 0%,var(--bo2-top) 60%,color-mix(in srgb,var(--bo2-top) 60%,#000) 100%)}
.bo2-damask::after{content:'';position:absolute;inset:0;opacity:.02;
  background:repeating-linear-gradient(45deg,#fff 0 1px,transparent 1px 22px),repeating-linear-gradient(-45deg,#fff 0 1px,transparent 1px 22px)}
.bo2-gate{position:absolute;inset:0}
.bo2-flap{transform-box:fill-box;transform-origin:50% 0}
.bo2-foil-shine{stroke-dasharray:70 900;animation:bo2-shine 4.5s ease-in-out infinite}
@keyframes bo2-shine{from{stroke-dashoffset:120}to{stroke-dashoffset:-900}}
.is-opening .bo2-flap{animation:bo2-flap .7s cubic-bezier(.5,0,.3,1) calc(.05s - var(--bo2-shift)) forwards}
@keyframes bo2-flap{to{transform:scaleY(-.75)}}
.is-opening .bo2-seal{animation:bo2-off .35s ease-out calc(0s - var(--bo2-shift)) forwards}
.is-opening .bo2-env{animation:bo2-slide .6s cubic-bezier(.55,0,.8,.4) calc(.55s - var(--bo2-shift)) forwards}
@keyframes bo2-slide{to{transform:translate(-50%,60svh) rotateX(20deg)}}
.is-opening .bo2-gate{animation:bo2-off .2s linear calc(1.0s - var(--bo2-shift)) forwards}
.bo2-bloom{position:absolute;inset:0;opacity:0;background:radial-gradient(60% 45% at 50% 50%,#fffaf2,#ffeadf 55%,color-mix(in srgb,#ffeadf 70%,var(--bo2-satin)))}
.is-opening .bo2-bloom{animation:bo2-bloom 1.1s ease-in-out calc(.5s - var(--bo2-shift)) forwards}
@keyframes bo2-bloom{0%{opacity:0}45%{opacity:1}100%{opacity:0}}
@keyframes bo2-on{to{opacity:1}}
@keyframes bo2-off{to{opacity:0}}
.bo2-backdrop .bo2-chand{display:none}
.bo2-backdrop .bo2-curtain{transform:scaleX(.18)}
.bo2-backdrop .bo2-cl{clip-path:polygon(0 0,100% 0,38% 58%,90% 100%,0 100%)}
.bo2-backdrop .bo2-cr{clip-path:polygon(0 0,100% 0,100% 100%,10% 100%,62% 58%)}
.bo2-backdrop .bo2-tie{opacity:1}
.bo2-backdrop .bo2-tie.l{left:calc(9vw - 17px)}
.bo2-backdrop .bo2-tie.r{right:calc(9vw - 17px)}
@media (prefers-reduced-motion: reduce){
  .bo2-mist,.bo2-lamp,.bo2-star,.bo2-twinkle,.bo2-swing,.bo2-foil-shine{animation:none}
  .bo2-layer{transform:none!important}
  .is-opening .bo2-flap,.is-opening .bo2-env,.is-opening .bo2-seal,.is-opening .bo2-bloom{animation:none}
  .is-opening .bo2-gate{animation:bo2-off .6s ease forwards}
  .is-opening .bo2-cl,.is-opening .bo2-cr{animation:bo2-off .6s ease .4s forwards}
  .is-opening .bo2-chand,.is-opening .bo2-tie{animation:bo2-on .6s ease .4s forwards}
}
`;

/* ───────────── The avenue (shared by the opening and the backdrop) ───────────── */

const HORIZON = 600;

function Palm({ x, base, s, flip, t }: { x: number; base: number; s: number; flip: boolean; t: Tokens }) {
  const h = 330 * s;
  const lean = (flip ? -1 : 1) * 24 * s;
  const topX = x + lean;
  const topY = base - h;
  const fronds = [-150, -120, -95, -70, -40, -10, 20, 45, 75, 105, 140, 175];
  return (
    <g>
      <path d={`M${x - 7 * s} ${base} Q${x + lean * 0.2} ${base - h * 0.55} ${topX - 3 * s} ${topY} L${topX + 3 * s} ${topY} Q${x + lean * 0.3} ${base - h * 0.55} ${x + 7 * s} ${base} Z`} fill="#5b4038" />
      <path d={`M${x} ${base} Q${x + lean * 0.25} ${base - h * 0.55} ${topX} ${topY}`} fill="none" stroke="#3e2a26" strokeWidth={9 * s} strokeDasharray={`${2 * s} ${5 * s}`} opacity=".5" />
      {fronds.map((a, i) => {
        const r = (i % 3 === 0 ? 70 : 92) * s;
        const rad = (a * Math.PI) / 180;
        const ex = topX + Math.cos(rad) * r;
        const ey = topY + Math.sin(rad) * r * 0.55 + r * 0.45;
        const cx = topX + Math.cos(rad) * r * 0.55;
        const cy = topY + Math.sin(rad) * r * 0.5 - 18 * s;
        const d = `M${topX} ${topY} Q${cx} ${cy} ${ex} ${ey}`;
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={t.palm} strokeWidth={24 * s} strokeDasharray={`${3 * s} ${2.2 * s}`} />
            <path d={d} fill="none" stroke={t.palm} strokeWidth={3 * s} />
          </g>
        );
      })}
    </g>
  );
}

function Lantern({ x, base, s, t }: { x: number; base: number; s: number; t: Tokens }) {
  return (
    <g>
      <rect x={x - 2.5 * s} y={base - 90 * s} width={5 * s} height={90 * s} fill={t.oud} />
      <circle className="bo2-lamp" cx={x} cy={base - 100 * s} r={26 * s} fill="url(#bo2-halo)" />
      <rect className="bo2-lamp" x={x - 8 * s} y={base - 112 * s} width={16 * s} height={22 * s} rx={3 * s} fill="#ffe2b4" />
      <path d={`M${x - 11 * s} ${base - 112 * s} L${x} ${base - 126 * s} L${x + 11 * s} ${base - 112 * s} Z`} fill={t.oud} />
    </g>
  );
}

function Avenue({ t }: { t: Tokens }) {
  // Depths along the avenue: scale shrinks toward the vanishing point.
  const depths = [0, 1, 2, 3, 4, 5, 6, 7];
  const at = (d: number) => 1 / (1 + d * 0.42);
  return (
    <svg className="bo2-avenue" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="bo2-halo">
          <stop offset="0" stopColor="#ffe6c0" stopOpacity=".9" />
          <stop offset="1" stopColor="#ffd09a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bo2-mistg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.mist} stopOpacity="0" />
          <stop offset=".6" stopColor={t.mist} stopOpacity=".32" />
          <stop offset="1" stopColor={t.mist} stopOpacity=".2" />
        </linearGradient>
        <linearGradient id="bo2-walk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.palace} stopOpacity=".7" />
          <stop offset="1" stopColor={mix(t.satinDeep, t.palace, 0.7)} />
        </linearGradient>
        <radialGradient id="bo2-glow" cx=".5" cy=".85" r=".6">
          <stop offset="0" stopColor="#ffe0bd" stopOpacity=".9" />
          <stop offset="1" stopColor="#ffe0bd" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="bo2-layer bo2-l1">
        {Array.from({ length: 26 }, (_, i) => (
          <circle key={i} className="bo2-star" cx={(i * 389) % 1000} cy={20 + ((i * 137) % 260)} r={i % 4 === 0 ? 1.6 : 1} fill="#fff4ee" style={{ animationDelay: `${-(i * 0.37) % 3.2}s` }} />
        ))}
        <ellipse cx="500" cy={HORIZON - 10} rx="420" ry="90" fill="url(#bo2-glow)" />
        {/* Palace */}
        <g fill={mix(t.satinDeep, t.palace, 0.78)}>
          <rect x="-1500" y={HORIZON - 70} width="4000" height="70" />
          <rect x="250" y={HORIZON - 120} width="500" height="120" />
          <rect x="400" y={HORIZON - 210} width="200" height="210" />
          <rect x="350" y={HORIZON - 250} width="48" height="250" />
          <rect x="602" y={HORIZON - 250} width="48" height="250" />
          <path d={`M440 ${HORIZON - 210} Q440 ${HORIZON - 290} 500 ${HORIZON - 305} Q560 ${HORIZON - 290} 560 ${HORIZON - 210} Z`} />
          <rect x="497" y={HORIZON - 325} width="6" height="22" fill={t.gold} />
          {Array.from({ length: 24 }, (_, i) => (
            <path key={i} d={`M${254 + i * 21} ${HORIZON - 120} v-9 h4 v-5 h3 l2 -4 l2 4 h3 v5 h4 v9 Z`} />
          ))}
        </g>
        <rect x="428" y={HORIZON - 172} width="144" height="26" fill={mix(t.oud, t.top, 0.8)} stroke={t.gold} strokeWidth="1.5" />
        <path d={`M474 ${HORIZON} V${HORIZON - 70} A26 26 0 1 1 526 ${HORIZON - 70} V${HORIZON} Z`} fill="#ffd9a8" className="bo2-lamp" />
        <path d={`M474 ${HORIZON} V${HORIZON - 70} A26 26 0 1 1 526 ${HORIZON - 70} V${HORIZON} Z`} fill="none" stroke={t.satinDeep} strokeWidth="5" strokeDasharray="6 5" />
      </g>
      {/* The walk, the channel and the hedges. */}
      <g className="bo2-layer bo2-l2">
        <path d={`M-1500 ${HORIZON} H2500 V1000 H-1500 Z`} fill={mix(t.palm, t.top, 0.4)} />
        <path d={`M470 ${HORIZON} L530 ${HORIZON} L900 1000 L100 1000 Z`} fill="url(#bo2-walk)" />
        <path d={`M494 ${HORIZON} L506 ${HORIZON} L560 1000 L440 1000 Z`} fill={mix(t.top, t.satinDeep, 0.7)} />
        <path d={`M478 ${HORIZON} L486 ${HORIZON} L330 1000 L270 1000 Z`} fill={mix('#000000', t.palm, 0.8)} />
        <path d={`M514 ${HORIZON} L522 ${HORIZON} L730 1000 L670 1000 Z`} fill={mix('#000000', t.palm, 0.8)} />
        {depths
          .slice()
          .reverse()
          .map((d) => {
            const s = at(d);
            const base = HORIZON + 400 * s;
            return (
              <g key={d}>
                <Palm x={500 - 330 * s} base={base} s={s} flip t={t} />
                <Palm x={500 + 330 * s} base={base} s={s} flip={false} t={t} />
                <Lantern x={500 - 210 * at(d + 0.5)} base={HORIZON + 400 * at(d + 0.5)} s={at(d + 0.5)} t={t} />
                <Lantern x={500 + 210 * at(d + 0.5)} base={HORIZON + 400 * at(d + 0.5)} s={at(d + 0.5)} t={t} />
              </g>
            );
          })}
      </g>
      <g className="bo2-layer bo2-l3">
        <rect className="bo2-mist" x="-1500" y={HORIZON - 120} width="4000" height="180" fill="url(#bo2-mistg)" />
        <rect className="bo2-mist" x="-1500" y={HORIZON - 40} width="4000" height="160" fill="url(#bo2-mistg)" opacity=".7" />
      </g>
    </svg>
  );
}

function Chandelier({ t }: { t: Tokens }) {
  const arms = [-150, -100, -50, 0, 50, 100, 150];
  return (
    <svg className="bo2-chand" viewBox="-160 0 320 330" aria-hidden="true">
      <defs>
        <linearGradient id="bo2-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3dca0" />
          <stop offset=".5" stopColor={t.gold} />
          <stop offset="1" stopColor="#7a5c26" />
        </linearGradient>
      </defs>
      <g className="bo2-swing">
        <line x1="0" y1="0" x2="0" y2="120" stroke="url(#bo2-gold)" strokeWidth="3" />
        <ellipse cx="0" cy="200" rx="26" ry="20" fill="url(#bo2-gold)" />
        <path d="M-6 120 h12 l6 40 h-24 Z" fill="url(#bo2-gold)" />
        {arms.map((x) => (
          <g key={x}>
            <path d={`M0 205 Q${x * 0.5} 240 ${x} 196`} fill="none" stroke="url(#bo2-gold)" strokeWidth="4" />
            <rect x={x - 4} y="178" width="8" height="18" fill="#fbf3e6" />
            <ellipse cx={x} cy="172" rx="5" ry="9" fill="#ffe6c0" />
            <circle cx={x} cy="172" r="16" fill="url(#bo2-halo)" />
            {[0, 1, 2].map((k) => (
              <path key={k} d={`M${x} ${206 + k * 16} l4 6 l-4 9 l-4 -9 Z`} fill={t.crystal} opacity=".85" />
            ))}
          </g>
        ))}
        {arms.slice(0, -1).map((x, i) => (
          <path key={i} d={`M${x} 200 Q${(x + arms[i + 1]!) / 2} 236 ${arms[i + 1]} 200`} fill="none" stroke={t.crystal} strokeWidth="2.4" strokeDasharray="1 5" strokeLinecap="round" />
        ))}
        {[0, 1, 2, 3].map((k) => (
          <path key={k} d={`M0 ${226 + k * 22} l7 10 l-7 14 l-7 -14 Z`} fill={t.crystal} opacity=".9" />
        ))}
        {Array.from({ length: 14 }, (_, i) => {
          const x = ((i * 47) % 280) - 140;
          const y = 190 + ((i * 29) % 110);
          return <path key={i} className="bo2-twinkle" d={`M${x} ${y - 9} L${x + 1.6} ${y - 1.6} L${x + 9} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 9} L${x - 1.6} ${y + 1.6} L${x - 9} ${y} L${x - 1.6} ${y - 1.6} Z`} fill="#fff" style={{ animationDelay: `${-(i * 0.43) % 2.6}s` }} />;
        })}
      </g>
    </svg>
  );
}

function Envelope({ view, t }: { view: SceneView; t: Tokens }) {
  const flap = 'M10 10 H390 C390 150 290 205 200 205 C110 205 10 150 10 10 Z';
  const paper = mix('#fff6f2', t.satin, 0.45);
  return (
    <svg className="bo2-env" viewBox="0 0 400 270" aria-hidden="true">
      <defs>
        <linearGradient id="bo2-foil" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b97d64" />
          <stop offset=".5" stopColor="#ebc0a4" />
          <stop offset="1" stopColor="#a96e58" />
        </linearGradient>
        <radialGradient id="bo2-seal" cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#8a5a46" />
          <stop offset="1" stopColor={t.oud} />
        </radialGradient>
      </defs>
      <rect x="10" y="10" width="380" height="250" rx="4" fill={paper} />
      <path d="M10 260 L200 130 L390 260" fill="none" stroke="rgba(120,60,70,.18)" strokeWidth="1.5" />
      <rect x="20" y="20" width="360" height="230" fill="none" stroke="rgba(120,60,70,.14)" strokeDasharray="3 4" />
      <g className="bo2-flap">
        <path d={flap} fill={mix('#ffffff', paper, 0.92)} />
        <path d="M10 10 C10 150 110 205 200 205 C290 205 390 150 390 10" fill="none" stroke="url(#bo2-foil)" strokeWidth="5" />
        <path className="bo2-foil-shine" d="M10 10 C10 150 110 205 200 205 C290 205 390 150 390 10" fill="none" stroke="#fff6ec" strokeWidth="4" strokeLinecap="round" opacity=".9" />
      </g>
      <g className="bo2-seal">
        <g transform="translate(150 190) rotate(-40)">
          <path d="M0 0 C-3 30 4 60 -2 95" fill="none" stroke="#5f7a55" strokeWidth="2.5" />
          <ellipse cx="-12" cy="45" rx="13" ry="5" fill="#6d8a62" transform="rotate(30 -12 45)" />
          <ellipse cx="10" cy="68" rx="13" ry="5" fill="#6d8a62" transform="rotate(-30 10 68)" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <ellipse key={i} cx={Math.cos(i) * 8} cy={Math.sin(i) * 8 - 4} rx="13" ry="9" fill={i % 2 ? t.satin : t.satinDeep} opacity=".9" transform={`rotate(${i * 50} ${Math.cos(i) * 8} ${Math.sin(i) * 8 - 4})`} />
          ))}
        </g>
        <circle cx="200" cy="200" r="33" fill="url(#bo2-seal)" />
        <circle cx="200" cy="200" r="25" fill="none" stroke={t.gold} strokeWidth="1.6" />
        <text x="200" y="207" textAnchor="middle" fontSize="20" fill={t.gold} style={{ fontFamily: view.lang === 'ar' ? 'var(--font-aref), serif' : 'var(--font-pinyon), serif' }}>
          {view.monogram}
        </text>
      </g>
    </svg>
  );
}

function useFreeze() {
  const [freeze, setFreeze] = useState(false);
  useEffect(() => setFreeze(new URLSearchParams(window.location.search).get('capture') === 'mid'), []);
  return freeze;
}

export function Gate2D({ view, opening }: { view: SceneView; opening: boolean }) {
  const t = tokens(view);
  const freeze = useFreeze();
  return (
    <div className={`bo2-root ${opening ? 'is-opening' : ''} ${freeze ? 'bo2-freeze' : ''}`} aria-hidden="true" style={vars(t)}>
      <style>{CSS}</style>
      <Avenue t={t} />
      <Chandelier t={t} />
      <div className="bo2-curtain bo2-cl" />
      <div className="bo2-curtain bo2-cr" />
      <span className="bo2-tie l" />
      <span className="bo2-tie r" />
      <div className="bo2-gate">
        <div className="bo2-damask" />
        <Envelope view={view} t={t} />
      </div>
      <div className="bo2-bloom" />
    </div>
  );
}

export function Backdrop2D({ view }: { view: SceneView }) {
  const t = tokens(view);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        root.current?.style.setProperty('--bo2-s', String(Math.min(1, window.scrollY / max)));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return (
    <div ref={root} className="bo2-root bo2-backdrop" aria-hidden="true" style={{ ...vars(t), zIndex: 0 }}>
      <style>{CSS}</style>
      <Avenue t={t} />
      <div className="bo2-curtain bo2-cl" />
      <div className="bo2-curtain bo2-cr" />
      <span className="bo2-tie l" />
      <span className="bo2-tie r" />
    </div>
  );
}
