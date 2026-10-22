'use client';

import { useEffect, useMemo, useState } from 'react';
import { inviteDict } from '@/lib/i18n';
import type { SceneView } from '@/lib/invite/scene-types';
import { DOOR, ELEVATION, ELEVATION_H, ELEVATION_W, facadeStrokes, FANLIGHT, PEDIMENT_TEXT, PORCH } from './facade';
import { HALL_NAME } from './meta';

/**
 * The white-house-hall 2D path (no WebGL, or reduced motion): the same letterpress card on black
 * with the façade drawn in SVG. On tap the black seal lifts, the drawing's doors swing open on warm
 * light and the card leans in through them to the off-white hall behind the content: diagonal
 * marble, panelled walls and a row of chandeliers glowing softly. Pure SVG/CSS.
 */
export const OPENING_MS = 2600;

const tokens = (view: SceneView) => {
  const s = view.palette.scene;
  return { paper: s.paper ?? '#F4F1EA', ink: s.ink ?? '#141414', warm: s.warm ?? '#FFE3BC' };
};

const fmt = (n: number) => Math.round(n * 1000) / 1000;

/** The façade drawing as inline SVG children (drawing space: x from the left edge, y down). */
function FacadeLines({ ink, weight }: { ink: string; weight: number }) {
  const strokes = useMemo(() => facadeStrokes(), []);
  return (
    <g fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
      {strokes.map((s, i) => (
        <path key={i} d={s.d} strokeWidth={fmt(weight * (0.45 + s.w * 0.55))} />
      ))}
      <text x={PEDIMENT_TEXT.x} y={PEDIMENT_TEXT.y} fontSize={PEDIMENT_TEXT.size} textAnchor="middle" fill={ink} stroke="none" className="font-inv-serif">
        {HALL_NAME}
      </text>
    </g>
  );
}

const GATE_CSS = `
.whh2-gate{position:relative;width:min(84vw,23rem);aspect-ratio:3/4.4;--whh2-shift:0s}
.whh2-gate.whh2-freeze{--whh2-shift:1.2s}
.whh2-gate.whh2-freeze *{animation-play-state:paused!important}
.whh2-card{position:absolute;inset:0;border-radius:3px;background:radial-gradient(120% 90% at 30% 20%,#fbf9f4,var(--whh2-paper) 60%,color-mix(in srgb,var(--whh2-paper) 92%,#9b927f));
  box-shadow:0 40px 80px -30px rgba(0,0,0,.9),0 0 0 1px rgba(255,255,255,.04);transform-origin:50% 44.5%}
.whh2-rule{position:absolute;inset:3.6%;border:1px solid var(--whh2-ink);opacity:.85}
.whh2-rule::after{content:'';position:absolute;inset:3px;border:.5px solid var(--whh2-ink);opacity:.7}
.whh2-text{position:absolute;inset:0;color:var(--whh2-ink);text-align:center}
.whh2-greet{position:absolute;top:6.8%;inset-inline:0;font-size:.82rem;opacity:.85}
.whh2-draw{position:absolute;left:8.3%;width:83.3%;top:13.2%}
.whh2-draw svg{display:block;width:100%;height:auto;overflow:visible}
.whh2-rule2{position:absolute;top:60.6%;left:31%;right:31%;height:1px;background:var(--whh2-ink);opacity:.7}
.whh2-lead{position:absolute;top:64%;inset-inline:0;font-size:.8rem;opacity:.85}
.whh2-names{position:absolute;top:68.5%;inset-inline:6%;font-size:clamp(1.9rem,8.5vw,2.6rem);line-height:1.5}
.whh2-date{position:absolute;top:79.5%;inset-inline:0;font-size:.82rem;opacity:.9}
.whh2-seal{position:absolute;left:50%;top:87.7%;width:18%;aspect-ratio:1;transform:translate(-50%,-50%)}
.whh2-door{transform-box:fill-box;transition:none}
.whh2-glow{opacity:0}
.whh2-veil{position:fixed;inset:-50vmax;background:var(--whh2-paper);opacity:0;pointer-events:none}
.whh2-gate.is-opening .whh2-seal{animation:whh2-seal .7s cubic-bezier(.3,.6,.3,1) calc(0s - var(--whh2-shift)) forwards}
.whh2-gate.is-opening .whh2-door-l{animation:whh2-door-l 1s cubic-bezier(.6,0,.3,1) calc(.55s - var(--whh2-shift)) forwards;transform-origin:0 50%}
.whh2-gate.is-opening .whh2-door-r{animation:whh2-door-r 1s cubic-bezier(.6,0,.3,1) calc(.55s - var(--whh2-shift)) forwards;transform-origin:100% 50%}
.whh2-gate.is-opening .whh2-glow{animation:whh2-glow 1s ease-out calc(.6s - var(--whh2-shift)) forwards}
.whh2-gate.is-opening .whh2-card{animation:whh2-lean 1.9s cubic-bezier(.55,0,.3,1) calc(.7s - var(--whh2-shift)) forwards}
.whh2-gate.is-opening .whh2-veil{animation:whh2-veil .8s ease-in calc(1.8s - var(--whh2-shift)) forwards}
@keyframes whh2-seal{to{transform:translate(-50%,-90%) scale(1.25) rotate(8deg);opacity:0}}
@keyframes whh2-door-l{to{transform:scaleX(.08)}}
@keyframes whh2-door-r{to{transform:scaleX(.08)}}
@keyframes whh2-glow{to{opacity:1}}
@keyframes whh2-lean{to{transform:scale(9)}}
@keyframes whh2-veil{to{opacity:1}}
@media (prefers-reduced-motion: reduce){.whh2-gate.is-opening .whh2-card{animation:none}}
`;

/** The black wax seal, with the monogram pressed in. */
function Seal({ monogram, ink }: { monogram: string; ink: string }) {
  const rim = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const r = 47 * (1 + 0.05 * Math.sin(a * 7) + 0.03 * Math.sin(a * 13 + 1.3));
      pts.push(`${fmt(50 + Math.cos(a) * r)},${fmt(50 + Math.sin(a) * r)}`);
    }
    return pts.join(' ');
  }, []);
  return (
    <svg viewBox="0 0 100 100" className="block h-full w-full">
      <defs>
        <radialGradient id="whh2-wax" cx="36%" cy="30%" r="80%">
          <stop offset="0" stopColor="#4a4a4a" />
          <stop offset=".45" stopColor={ink} />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
      </defs>
      <polygon points={rim} fill="url(#whh2-wax)" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#6f6b63" strokeWidth="1.6" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1" />
      <text x="50" y="57" textAnchor="middle" fontSize="20" fill="#8a857b" className="font-inv-display">
        {monogram}
      </text>
    </svg>
  );
}

export function Gate2D({ view, opening }: { view: SceneView; opening: boolean }) {
  const tk = tokens(view);
  const t = inviteDict(view.lang);
  const [freeze, setFreeze] = useState(false);
  useEffect(() => setFreeze(new URLSearchParams(window.location.search).get('capture') === 'mid'), []);
  // The doors in drawing space.
  const dx = (x: number) => fmt(x - ELEVATION.left);
  const dy = (y: number) => fmt(ELEVATION.top - y);
  const D = DOOR.halfWidth;
  return (
    <div
      className={`whh2-gate ${opening ? 'is-opening' : ''} ${freeze ? 'whh2-freeze' : ''}`}
      aria-hidden="true"
      style={{ '--whh2-paper': tk.paper, '--whh2-ink': tk.ink } as React.CSSProperties}
    >
      <style>{GATE_CSS}</style>
      <div className="whh2-veil" />
      <div className="whh2-card">
        <div className="whh2-rule" />
        <div className="whh2-text">
          <p className="whh2-greet font-inv-serif">{view.guestName ? t.greetingGuest(view.guestName) : t.greetingGeneric}</p>
          <div className="whh2-draw">
            <svg viewBox={`0 0 ${fmt(ELEVATION_W)} ${fmt(ELEVATION_H)}`}>
              <defs>
                <radialGradient id="whh2-warm" cx="50%" cy="70%" r="70%">
                  <stop offset="0" stopColor="#fff4dc" />
                  <stop offset="1" stopColor={tk.warm} />
                </radialGradient>
              </defs>
              <rect className="whh2-glow" x={dx(-D)} y={dy(DOOR.top)} width={fmt(D * 2)} height={fmt(DOOR.top - PORCH)} fill="url(#whh2-warm)" />
              <path className="whh2-glow" d={`M${dx(-FANLIGHT.r)} ${dy(FANLIGHT.cy)} A${FANLIGHT.r} ${FANLIGHT.r} 0 0 1 ${dx(FANLIGHT.r)} ${dy(FANLIGHT.cy)} Z`} fill="url(#whh2-warm)" opacity=".8" />
              <FacadeLines ink={tk.ink} weight={0.04} />
              <rect className="whh2-door whh2-door-l" x={dx(-D)} y={dy(DOOR.top - 0.06)} width={fmt(D)} height={fmt(DOOR.top - 0.06 - PORCH)} fill={tk.ink} />
              <rect className="whh2-door whh2-door-r" x={dx(0)} y={dy(DOOR.top - 0.06)} width={fmt(D)} height={fmt(DOOR.top - 0.06 - PORCH)} fill={tk.ink} />
            </svg>
          </div>
          <div className="whh2-rule2" />
          <p className="whh2-lead font-inv-serif">{t.invitationLead}</p>
          <p className="whh2-names font-inv-display">
            {view.groom} {t.and} {view.bride}
          </p>
          <p className="whh2-date font-inv-serif">{view.dateLine}</p>
        </div>
        <div className="whh2-seal">
          <Seal monogram={view.monogram} ink={tk.ink} />
        </div>
      </div>
    </div>
  );
}

const BACK_CSS = `
.whh2-back{position:fixed;inset:0;z-index:0;overflow:hidden;background:#f3f0e9}
.whh2-back svg{position:absolute;inset:0;width:100%;height:100%}
.whh2-chand{animation:whh2-twinkle 4.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes whh2-twinkle{0%,100%{opacity:.75}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){.whh2-chand{animation:none}}
`;

/** Behind the content: the white hall in one-point perspective, calm and bright. */
export function Backdrop2D({ view: _view }: { view: SceneView }) {
  // A 1200 × 900 stage, vanishing point at (600, 380).
  const vx = 600;
  const vy = 380;
  const vp = (x: number, y: number, k: number): [number, number] => [fmt(x + (vx - x) * k), fmt(y + (vy - y) * k)];
  const toVP = (x: number, y: number, k: number) => vp(x, y, k).join(' ');
  const rows = 9;
  const floorLines: string[] = [];
  for (let i = -12; i <= 12; i++) floorLines.push(`M${600 + i * 160} 900 L${vx} ${vy}`);
  const depths = Array.from({ length: rows }, (_, i) => 1 - Math.pow(0.78, i + 1));
  const chandeliers = [0.25, 0.47, 0.63, 0.74].flatMap((k) => [
    [...vp(380, 150, k), 1 - k] as const,
    [...vp(820, 150, k), 1 - k] as const,
  ]);
  return (
    <div className="whh2-back" aria-hidden="true">
      <style>{BACK_CSS}</style>
      <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="whh2-chg" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff6e6" stopOpacity="1" />
            <stop offset=".35" stopColor="#ffe9c6" stopOpacity=".55" />
            <stop offset="1" stopColor="#ffe9c6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="whh2-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d8d3c8" />
            <stop offset="1" stopColor="#f2efe8" />
          </linearGradient>
        </defs>
        <rect width="1200" height="900" fill="#efebe3" />
        {/* Walls and ceiling meeting the far wall. */}
        <polygon points={`0,0 1200,0 ${toVP(1200, 0, 0.8)} ${toVP(0, 0, 0.8)}`} fill="#ebe7df" />
        <polygon points={`0,0 ${toVP(0, 0, 0.8)} ${toVP(0, 900, 0.8)} 0,900`} fill="#f1eee7" />
        <polygon points={`1200,0 ${toVP(1200, 0, 0.8)} ${toVP(1200, 900, 0.8)} 1200,900`} fill="#f1eee7" />
        <polygon points={`0,900 1200,900 ${toVP(1200, 900, 0.8)} ${toVP(0, 900, 0.8)}`} fill="url(#whh2-floor)" />
        <g stroke="#141414" strokeOpacity=".16" strokeWidth="1.2">
          {floorLines.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {depths.map((k, i) => (
          <g key={i} stroke="#141414" strokeOpacity=".2" fill="none">
            <path d={`M${toVP(0, 900, k)} L${toVP(1200, 900, k)}`} />
            <path d={`M${toVP(0, 0, k)} L${toVP(0, 900, k)}`} />
            <path d={`M${toVP(1200, 0, k)} L${toVP(1200, 900, k)}`} />
          </g>
        ))}
        {/* The far wall with its arched alcove. */}
        <rect x={vx - 120} y={vy - 140} width="240" height="300" fill="#f5f2ec" stroke="#141414" strokeOpacity=".22" />
        <path d={`M${vx - 60} ${vy + 160} V${vy - 20} A60 60 0 0 1 ${vx + 60} ${vy - 20} V${vy + 160}`} fill="#fff7ea" stroke="#141414" strokeOpacity=".3" />
        {chandeliers.map(([x, y, s], i) => (
          <g key={i} className="whh2-chand" style={{ animationDelay: `${(i % 4) * 0.6}s` }}>
            <circle cx={x} cy={y + 30 * s} r={120 * s} fill="url(#whh2-chg)" />
            <line x1={x} y1={0} x2={x} y2={y - 20 * s} stroke="#8c877e" strokeWidth={1.2 * s} />
            <ellipse cx={x} cy={y} rx={46 * s} ry={12 * s} fill="none" stroke="#9a948a" strokeWidth={1.5 * s} />
            <path d={`M${x - 46 * s} ${y} Q${x} ${y + 70 * s} ${x + 46 * s} ${y}`} fill="none" stroke="#c7c1b5" strokeWidth={1.2 * s} />
          </g>
        ))}
      </svg>
    </div>
  );
}
