'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SceneView } from '@/lib/invite/scene-types';
import { PLANE_GLYPH } from './glyph';
import { arcPath, ortho, routeMid } from './ortho';
import { passContent } from './pass';
import { PassCard } from './PassCard';
import { GATE_ELEVATION, makeRoute } from './route';

/**
 * The destination-love 2D path (no WebGL, or reduced motion): an SVG orthographic globe drawn
 * from the same land dots as the 3D one, the origin pin pulsing and the corner of a boarding pass
 * peeking behind it. Opening: the plane follows the dashed arc (CSS offset-path), the city glows,
 * and the pass rises to the front. Behind the content: the night side of the globe at dusk with
 * the gold route to the wedding city.
 */
export const OPENING_MS = 3000;

const tokens = (view: SceneView) => {
  const s = view.palette.scene;
  return {
    nightTop: s.nightTop ?? '#0F2D29',
    nightLow: s.nightLow ?? '#184239',
    globe: s.globe ?? '#F3EBDC',
    landGold: s.landGold ?? '#C9A96E',
    trail: s.trail ?? '#E8CC8C',
    atmosphere: s.atmosphere ?? '#FFF1D0',
  };
};

function scalePath(d: string, k: number): string {
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => String(Math.round(Number(n) * k * 10) / 10));
}

function contentOf(view: SceneView) {
  return passContent({
    lang: view.lang,
    groom: view.groom,
    bride: view.bride,
    monogram: view.monogram,
    guestName: view.guestName,
    dateLine: view.dateLine,
    timeLine: view.timeLine,
    venueName: view.venueName,
    from: view.origin,
    to: view.destination,
  });
}

export function Gate2D({ view, opening }: { view: SceneView; opening: boolean }) {
  const t = tokens(view);
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1.6);
  const [freeze, setFreeze] = useState(false);
  useEffect(() => setFreeze(new URLSearchParams(window.location.search).get('capture') === 'mid'), []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / 200));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const route = useMemo(() => makeRoute(view.origin, view.destination), [view.origin, view.destination]);
  const g = useMemo(() => {
    const o = ortho(routeMid(route), 100, 100, 86, GATE_ELEVATION);
    const arc = arcPath(route, o);
    return { dots: o.dots, arc, origin: o.project(route.a), dest: o.project(route.b) };
  }, [route]);
  const content = useMemo(() => contentOf(view), [view]);
  const torn = view.rsvpAttending === true;

  return (
    <div ref={box} className={`dl2-gate ${opening ? 'is-opening' : ''} ${freeze ? 'dl2-freeze' : ''}`} aria-hidden="true" style={{ '--g': t.landGold, '--trail': t.trail } as React.CSSProperties}>
      <style>{GATE_CSS}</style>
      <div className="dl2-peek">
        <PassCard c={content} state={torn ? 'torn' : 'whole'} />
      </div>
      <svg viewBox="0 0 200 200" className="dl2-globe">
        <defs>
          <radialGradient id="dl2-porcelain" cx="38%" cy="34%" r="72%">
            <stop offset="0" stopColor="#FFFBF2" />
            <stop offset=".55" stopColor={t.globe} />
            <stop offset="1" stopColor="#CDBB98" />
          </radialGradient>
          <radialGradient id="dl2-halo" r="50%">
            <stop offset=".82" stopColor={t.atmosphere} stopOpacity=".55" />
            <stop offset="1" stopColor={t.atmosphere} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="dl2-dusk" x1="0" y1="0" x2="1" y2="0.4">
            <stop offset=".55" stopColor={t.nightLow} stopOpacity="0" />
            <stop offset="1" stopColor={t.nightLow} stopOpacity=".55" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="100" fill="url(#dl2-halo)" />
        <circle cx="100" cy="100" r="86" fill="url(#dl2-porcelain)" />
        <g fill="none" stroke={t.landGold} strokeOpacity=".28" strokeWidth=".5">
          <ellipse cx="100" cy="100" rx="86" ry="30" />
          <ellipse cx="100" cy="100" rx="30" ry="86" />
          <ellipse cx="100" cy="100" rx="62" ry="86" />
          <line x1="14" y1="100" x2="186" y2="100" />
        </g>
        <path d={g.dots} stroke={t.landGold} strokeWidth="1.55" strokeLinecap="round" fill="none" />
        <circle cx="100" cy="100" r="86" fill="url(#dl2-dusk)" />
        <path className="dl2-arc" d={g.arc.d} pathLength={1} fill="none" stroke={t.landGold} strokeWidth="1.6" strokeLinecap="round" />
        <g className="dl2-dest" transform={`translate(${g.dest.x} ${g.dest.y})`}>
          <circle r="11" fill={t.trail} opacity=".35" className="dl2-glow" />
          <circle r="2.6" fill="#9C7A3C" />
          <circle r="5.2" fill="none" stroke="#9C7A3C" strokeWidth=".8" />
        </g>
        {!route.virtual && (
          <g transform={`translate(${g.origin.x} ${g.origin.y})`}>
            <circle r="5" fill="none" stroke="#9C7A3C" strokeWidth=".9" className="dl2-ripple" />
            <circle r="5" fill="none" stroke="#9C7A3C" strokeWidth=".9" className="dl2-ripple dl2-ripple-b" />
            <circle r="2.6" fill="#9C7A3C" />
          </g>
        )}
      </svg>
      <div className="dl2-plane" style={{ offsetPath: `path("${scalePath(g.arc.d, k)}")` } as React.CSSProperties}>
        <svg viewBox="0 0 100 100">
          <path d={PLANE_GLYPH} fill="#0F4A3B" stroke={t.landGold} strokeWidth="4" />
        </svg>
      </div>
    </div>
  );
}

const GATE_CSS = `
.dl2-gate{position:relative;width:min(80vw,22rem);aspect-ratio:1;container-type:inline-size;--shift:0s}
.dl2-gate.dl2-freeze{--shift:1.5s}.dl2-gate.dl2-freeze *{animation-play-state:paused!important}
.dl2-globe{position:absolute;inset:0;width:100%;height:100%;z-index:1;overflow:visible;filter:drop-shadow(0 18px 40px rgba(0,0,0,.35))}
.dl2-peek{position:absolute;z-index:0;width:86%;left:44%;top:66%;transform:rotate(-24deg);--dl-fs:2.15cqw}
.dl2-arc{stroke-dasharray:.012 .02;opacity:0}
.dl2-plane{position:absolute;left:0;top:0;width:9%;z-index:2;offset-rotate:auto 90deg;offset-distance:0%;offset-anchor:50% 50%}
.dl2-plane svg{display:block;width:100%;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
.dl2-ripple{transform-box:fill-box;transform-origin:center;animation:dl2-ripple 2.2s ease-out infinite}
.dl2-ripple-b{animation-delay:1.1s}
@keyframes dl2-ripple{from{transform:scale(1);opacity:.9}to{transform:scale(4);opacity:0}}
.dl2-dest .dl2-glow{opacity:.12}
.dl2-gate.is-opening .dl2-plane{animation:dl2-fly 2s cubic-bezier(.45,0,.35,1) calc(.2s - var(--shift)) forwards}
.dl2-gate.is-opening .dl2-arc{animation:dl2-arc 2s cubic-bezier(.45,0,.35,1) calc(.2s - var(--shift)) forwards}
.dl2-gate.is-opening .dl2-glow{transform-box:fill-box;transform-origin:center;animation:dl2-glow .9s ease-out calc(1.9s - var(--shift)) forwards}
.dl2-gate.is-opening .dl2-peek{animation:dl2-rise 1s cubic-bezier(.3,1.2,.4,1) calc(2s - var(--shift)) forwards}
@keyframes dl2-fly{0%{offset-distance:0%;transform:scale(.8)}50%{transform:scale(1.25)}100%{offset-distance:100%;transform:scale(.85)}}
@keyframes dl2-arc{from{opacity:0}to{opacity:1}}
@keyframes dl2-glow{0%{opacity:.12;transform:scale(1)}40%{opacity:.85;transform:scale(2.2)}100%{opacity:.5;transform:scale(1.6)}}
@keyframes dl2-rise{0%{z-index:3;left:44%;top:66%;transform:rotate(-24deg)}100%{z-index:3;left:-3%;top:30%;width:106%;transform:rotate(0)}}
@media (prefers-reduced-motion: reduce){
  .dl2-ripple{animation:none;opacity:.6}
  .dl2-gate.is-opening .dl2-plane{animation:dl2-fade-out .6s ease forwards}
  .dl2-gate.is-opening .dl2-arc{animation:dl2-fade-in .6s ease forwards}
  .dl2-gate.is-opening .dl2-peek{animation:dl2-swap 1.2s ease forwards}
}
@keyframes dl2-fade-out{to{opacity:0}}@keyframes dl2-fade-in{to{opacity:1}}
@keyframes dl2-swap{0%{opacity:1}45%{opacity:0;left:44%;top:66%;transform:rotate(-24deg)}55%{opacity:0;z-index:3;left:-3%;top:30%;width:106%;transform:none}100%{opacity:1;z-index:3;left:-3%;top:30%;width:106%;transform:none}}
`;

export function Backdrop2D({ view }: { view: SceneView }) {
  const t = tokens(view);
  const route = useMemo(() => makeRoute(view.origin, view.destination), [view.origin, view.destination]);
  const g = useMemo(() => {
    const o = ortho(route.b, 100, 100, 90, -0.62);
    return { dots: o.dots, arc: arcPath(route, o, 0.16), dest: o.project(route.b) };
  }, [route]);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${t.nightTop} 0%, ${t.nightLow} 62%, ${t.nightTop} 100%)` }}
    >
      <style>{BACKDROP_CSS}</style>
      <div className="dl2-stars" />
      <svg viewBox="0 0 200 200" className="dl2-world">
        <defs>
          <radialGradient id="dl2-night" cx="50%" cy="22%" r="80%">
            <stop offset="0" stopColor="#2A5A4E" />
            <stop offset=".6" stopColor="#173F36" />
            <stop offset="1" stopColor="#0E2C26" />
          </radialGradient>
          <radialGradient id="dl2-atmo" r="50%">
            <stop offset=".88" stopColor={t.atmosphere} stopOpacity=".5" />
            <stop offset="1" stopColor={t.atmosphere} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="100" fill="url(#dl2-atmo)" />
        <circle cx="100" cy="100" r="90" fill="url(#dl2-night)" />
        <path d={g.dots} stroke={t.trail} strokeOpacity=".55" strokeWidth="1.05" strokeLinecap="round" fill="none" />
        <path d={g.arc.d} fill="none" stroke={t.trail} strokeWidth=".9" strokeLinecap="round" className="dl2-trail" />
        <circle cx={g.dest.x} cy={g.dest.y} r="4.5" fill={t.trail} className="dl2-city" />
        <circle cx={g.dest.x} cy={g.dest.y} r="1.6" fill="#FFF3D2" />
      </svg>
    </div>
  );
}

const BACKDROP_CSS = `
.dl2-stars{position:absolute;inset:0;opacity:.7;background-image:
  radial-gradient(1px 1px at 12% 18%,#fff6e4,transparent),radial-gradient(1px 1px at 78% 9%,#e8cc8c,transparent),
  radial-gradient(1.5px 1.5px at 33% 31%,#fff6e4,transparent),radial-gradient(1px 1px at 64% 24%,#fff6e4,transparent),
  radial-gradient(1px 1px at 90% 38%,#e8cc8c,transparent),radial-gradient(1.5px 1.5px at 6% 44%,#fff6e4,transparent),
  radial-gradient(1px 1px at 48% 12%,#e8cc8c,transparent),radial-gradient(1px 1px at 22% 52%,#fff6e4,transparent)}
.dl2-world{position:absolute;left:50%;top:calc(100svh - min(46vw,430px));width:clamp(560px,150vw,1500px);transform:translateX(-50%);overflow:visible}
.dl2-trail{stroke-dasharray:3 2;animation:dl2-shimmer 6s linear infinite}
.dl2-city{opacity:.35;transform-box:fill-box;transform-origin:center;animation:dl2-city 3.2s ease-in-out infinite}
@keyframes dl2-shimmer{to{stroke-dashoffset:-50}}
@keyframes dl2-city{50%{opacity:.6;transform:scale(1.25)}}
@media (prefers-reduced-motion: reduce){.dl2-trail,.dl2-city{animation:none}}
`;
