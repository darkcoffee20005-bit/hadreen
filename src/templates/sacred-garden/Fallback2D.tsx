import { useId } from 'react';
import type { SceneView } from '@/lib/invite/scene-types';
import { ARCH, archOutline, leafLayout, openingOutline, rng, roseLayout, strandLayout } from './layout';
import { BEAK_PATH, SWAN_PATH } from './SwanHeart';

/**
 * The Sacred Garden without WebGL: the same sunset terrace as the 3D scene, in SVG and CSS.
 *  Gate: an ivory envelope (four flaps folded to a diamond, blind-embossed flowering sprays)
 *  under a gold seal with a laurel wreath (or poured wine wax); full-bleed on phones, a card on
 *  wide screens.
 *  Opening (3 s): the seal warms and splits, the four flaps fold open one after another, warm
 *  light pours out and whites out the envelope; the terrace fades up and two swans glide in.
 *  Backdrop: one SVG framed like the 3D hero: a sunset sky, misty mountains, a village on the
 *  far shore, the lake, the swans' heart, a balustrade with urns, and the rose arch with sheer
 *  curtains and lanterns. Phones fill the screen with it; wide screens see the wall around it.
 * Under prefers-reduced-motion nothing moves: the envelope fades out and the terrace fades in.
 */
export const OPENING_MS = 3000;

/** Drawing units: centimetres on the arch's plane, floor at y = 0, up is negative. */
const CM = 100;
const pathOf = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${(x * CM).toFixed(1)} ${(-y * CM).toFixed(1)}`).join('L')}Z`;
const OPENING = pathOf(openingOutline(28));
const RING = pathOf(archOutline(28));
const ROSES = roseLayout(110).filter((r) => r.facing[2] > 0.1);
const LEAVES = leafLayout(ROSES, 60).filter((l) => l.facing[2] > 0.1);
const STRANDS = strandLayout(14);
const HORIZON = -400;
const RAIL_TOP = -150;

/** A mountain ridge across the sky as a closed path down to the horizon. Seeded. */
function ridge(seed: number, base: number, amp: number, valleyX: number, valley: number): string {
  const rand = rng(seed);
  const pts: string[] = [];
  const knots = Array.from({ length: 30 }, () => rand());
  for (let i = 0; i <= 120; i++) {
    const x = -1600 + (3200 * i) / 120;
    const k = (i / 120) * 29;
    const a = knots[Math.floor(k)]!;
    const b = knots[Math.min(29, Math.floor(k) + 1)]!;
    const f = k - Math.floor(k);
    const v = a + (b - a) * (f * f * (3 - 2 * f));
    const dip = valley + (1 - valley) * Math.min(1, Math.abs(x - valleyX) / 420);
    pts.push(`${x.toFixed(0)} ${(HORIZON - (base + amp * v) * dip).toFixed(1)}`);
  }
  return `M-1600 ${HORIZON}L${pts.join('L')}L1600 ${HORIZON}Z`;
}
const MOUNTAINS = [ridge(5, 70, 120, -60, 0.45), ridge(9, 40, 90, -60, 0.3), ridge(13, 10, 60, -60, 0.1)];

/** Houses, a tower and cypresses on the right-hand shore (simple blocks). */
const VILLAGE = (() => {
  const rand = rng(77);
  const houses: { x: number; w: number; h: number }[] = [];
  for (let x = 120; x < 560; x += 18 + rand() * 16) houses.push({ x, w: 16 + rand() * 14, h: 12 + rand() * 18 });
  const trees = Array.from({ length: 9 }, () => ({ x: 130 + rand() * 420, h: 26 + rand() * 22 }));
  return { houses, trees };
})();

const LANTERNS_2D: [number, number, number][] = [
  [-140, -505, 1],
  [140, -505, 1],
  [-132, -18, 1.1],
  [132, -18, 1.1],
  [-102, -6, 0.7],
  [106, -6, 0.62],
];

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
.sg2d-scene svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.sg2d-curtain{transform-box:fill-box;animation:sg2d-sway 7s ease-in-out infinite alternate}
.sg2d-curtain-r{transform-origin:100% 0;animation-delay:-3s}
.sg2d-curtain-l{transform-origin:0 0}
@keyframes sg2d-sway{0%{transform:skewX(-1.2deg)}100%{transform:skewX(1.4deg)}}
.sg2d-flame{animation:sg2d-flicker 1.6s ease-in-out infinite alternate}
@keyframes sg2d-flicker{0%{opacity:.85}40%{opacity:1}70%{opacity:.8}100%{opacity:.95}}
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
@media (min-aspect-ratio:17/20){.sg2d-scene svg.sg2d-frame{left:50%;right:auto;width:auto;height:100%;aspect-ratio:600/960;translate:-50% 0}}
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
  .sg2d-curtain,.sg2d-flame{animation:none!important}
}
`;

function useIds() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (name: string) => `sg2d-${id}-${name}`;
}

function colors(view: SceneView) {
  const s = view.palette.scene;
  return {
    paper: s.paper ?? '#F6EFE5',
    blush: s.blush ?? '#EED3CB',
    seal: s.seal ?? '#B4853A',
    sealRelief: s.sealRelief ?? '#F6E2AA',
    gilt: (s.sealFinish ?? 'gold') === 'gold',
    stone: s.stone ?? '#EADFD1',
    marble: s.marble ?? '#F2E9DD',
    rose: s.rose ?? '#E8B1AC',
    leaf: s.leaf ?? '#8DA37C',
    pond: s.pond ?? '#B7AEC8',
    sun: s.sun ?? '#FFD9A0',
    skyTop: s.skyTop ?? '#A6B6DC',
    skyMid: s.skyMid ?? '#EFB7BC',
    skyLow: s.skyLow ?? '#FAD09B',
    mtnNear: s.mtnNear ?? '#9483A3',
    mtnMid: s.mtnMid ?? '#B39CB8',
    mtnFar: s.mtnFar ?? '#CDB6C4',
    village: s.village ?? '#EED0BA',
    roof: s.roof ?? '#CC957F',
    tree: s.tree ?? '#7F8E80',
    gold: view.palette.gold,
    goldInk: view.palette.goldInk,
  };
}
type Colors = ReturnType<typeof colors>;
const mix = (a: string, b: string, pct: number) => `color-mix(in srgb, ${a} ${100 - pct}%, ${b})`;

/** The whole terrace in one SVG (see the header comment for the layers). */
function GardenScene({ c, className = '', open = true }: { c: Colors; className?: string; open?: boolean }) {
  const id = useIds();
  const roseTones = [mix(c.rose, '#ffffff', 60), mix(c.rose, '#ffffff', 35), c.rose, '#FCF5EC', '#F7E8D8', mix(c.rose, '#F6D6A8', 45)];
  const haze = mix(c.skyLow, c.skyMid, 35);
  const wall = mix(c.stone, '#7a5a48', 18);
  const roseAt = (x: number, y: number, rr: number, tone: string, key: string | number) => (
    <g key={key}>
      <circle cx={x} cy={y} r={rr} fill={tone} />
      <circle cx={x + rr * 0.08} cy={y - rr * 0.05} r={rr * 0.58} fill="none" stroke={mix(tone, '#7a3a3a', 22)} strokeWidth={rr * 0.14} />
      <circle cx={x} cy={y} r={rr * 0.2} fill={mix(tone, '#7a3a3a', 30)} />
    </g>
  );
  const bouquet = (cx: number, cy: number, seed: number) => {
    const rand = rng(seed);
    return Array.from({ length: 16 }, (_, i) => {
      const a = Math.PI + (i / 15) * Math.PI;
      const r = 14 + rand() * 26;
      return roseAt(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 0.8, 8 + rand() * 5, roseTones[i % roseTones.length]!, `${seed}-${i}`);
    });
  };
  const curtain = (side: -1 | 1) => {
    const x0 = side * -(ARCH.a - 0.04) * CM;
    const w = (top: number) => side * top;
    const top = -(ARCH.spring + 1.2) * CM;
    return `M${x0} ${top}L${x0 + w(78)} ${top + 30}C${x0 + w(52)} -400 ${x0 + w(22)} -270 ${x0 + w(18)} -235C${x0 + w(26)} -150 ${x0 + w(40)} -60 ${x0 + w(44)} 0L${x0} 0Z`;
  };
  return (
    <div className={`sg2d-scene ${className} ${open ? 'is-open' : ''}`} aria-hidden="true">
      <svg viewBox="-300 -880 600 960" preserveAspectRatio="xMidYMax slice" className="sg2d-frame">
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="-1000" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={c.skyTop} />
            <stop offset="0.55" stopColor={c.skyMid} />
            <stop offset="1" stopColor={c.skyLow} />
          </linearGradient>
          <radialGradient id={id('sun')}>
            <stop offset="0" stopColor="#FFFBF0" />
            <stop offset="0.12" stopColor="#FFF1D2" />
            <stop offset="0.35" stopColor={c.sun} stopOpacity="0.6" />
            <stop offset="1" stopColor={c.sun} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id('lake')} x1="0" y1={HORIZON} x2="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={mix(c.skyLow, c.pond, 30)} />
            <stop offset="0.6" stopColor={mix(c.skyMid, c.pond, 45)} />
            <stop offset="1" stopColor={mix(c.skyTop, c.pond, 40)} />
          </linearGradient>
          <radialGradient id={id('glitter')} cx="0.5" cy="0.1" r="0.9">
            <stop offset="0" stopColor="#FFF4DA" stopOpacity="0.95" />
            <stop offset="1" stopColor="#FFF4DA" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id('floor')} x1="0" y1="-40" x2="0" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={mix(c.marble, '#c9a98a', 18)} />
            <stop offset="1" stopColor={c.marble} />
          </linearGradient>
          <radialGradient id={id('flame')}>
            <stop offset="0" stopColor="#FFF6E2" />
            <stop offset="0.25" stopColor="#FFD08A" stopOpacity="0.8" />
            <stop offset="1" stopColor="#FFB45E" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky, sun and clouds */}
        <rect x="-1600" y="-2000" width="3200" height={2000 + HORIZON} fill={`url(#${id('sky')})`} />
        <circle cx="-60" cy={HORIZON - 40} r="260" fill={`url(#${id('sun')})`} />
        <g fill={mix(c.skyMid, '#ffffff', 25)} opacity="0.55">
          <ellipse cx="-180" cy="-640" rx="140" ry="16" />
          <ellipse cx="120" cy="-690" rx="170" ry="14" />
          <ellipse cx="40" cy="-590" rx="110" ry="11" />
          <ellipse cx="-90" cy="-560" rx="90" ry="9" fill={mix(c.skyLow, '#ffffff', 30)} />
        </g>
        {/* Mountains, far to near, and the village on the right shore */}
        <path d={MOUNTAINS[0]} fill={mix(c.mtnFar, haze, 35)} />
        <path d={MOUNTAINS[1]} fill={mix(c.mtnMid, haze, 25)} />
        <path d={MOUNTAINS[2]} fill={mix(c.mtnNear, haze, 15)} />
        <path d={`M100 ${HORIZON}C180 ${HORIZON - 40} 420 ${HORIZON - 60} 700 ${HORIZON - 30}L700 ${HORIZON}Z`} fill={mix(c.tree, haze, 40)} />
        <g>
          {VILLAGE.houses.map((h, i) => (
            <g key={i}>
              <rect x={h.x} y={HORIZON - 14 - h.h} width={h.w} height={h.h} fill={mix(c.village, haze, 25)} />
              <path d={`M${h.x - 2} ${HORIZON - 14 - h.h}L${h.x + h.w / 2} ${HORIZON - 22 - h.h}L${h.x + h.w + 2} ${HORIZON - 14 - h.h}Z`} fill={mix(c.roof, haze, 25)} />
              <circle cx={h.x + h.w / 2} cy={HORIZON - 10 - h.h / 2} r="1.6" fill="#FFD08A" />
            </g>
          ))}
          <rect x="160" y={HORIZON - 90} width="16" height="80" fill={mix(c.village, haze, 20)} />
          <path d={`M157 ${HORIZON - 90}L168 ${HORIZON - 112}L179 ${HORIZON - 90}Z`} fill={mix(c.roof, haze, 20)} />
          {VILLAGE.trees.map((t, i) => (
            <path key={i} d={`M${t.x - 5} ${HORIZON - 8}Q${t.x} ${HORIZON - 8 - t.h * 1.4} ${t.x + 5} ${HORIZON - 8}Z`} fill={mix(c.tree, haze, 30)} />
          ))}
        </g>
        {/* The lake, its mirror of the mountains, the sun's glitter path */}
        <rect x="-1600" y={HORIZON} width="3200" height={-HORIZON} fill={`url(#${id('lake')})`} />
        <g transform={`translate(0 ${2 * HORIZON}) scale(1 -1)`} opacity="0.28">
          <path d={MOUNTAINS[2]} fill={c.mtnNear} />
        </g>
        <ellipse cx="-60" cy={HORIZON + 90} rx="26" ry="100" fill={`url(#${id('glitter')})`} opacity="0.75" />
        <SwanPair c={c} />

        {/* Balustrade, urns and their bouquets, the floor */}
        <rect x="-1600" y="-40" width="3200" height="200" fill={`url(#${id('floor')})`} />
        <g fill={c.stone} stroke={mix(c.stone, '#000000', 16)} strokeWidth="0.8">
          <rect x="-1600" y={RAIL_TOP} width="3200" height="12" />
          <rect x="-1600" y="-52" width="3200" height="14" />
          {Array.from({ length: 120 }, (_, i) => -1600 + i * 27 + 12)
            .filter((x) => Math.abs(Math.abs(x) - 178) > 30)
            .map((x) => (
              <path key={x} d={`M${x - 6} -52C${x - 9} -80 ${x - 3} -95 ${x - 4} -110C${x - 6} -125 ${x - 7} -132 ${x - 5} -138L${x + 5} -138C${x + 7} -132 ${x + 6} -125 ${x + 4} -110C${x + 3} -95 ${x + 9} -80 ${x + 6} -52Z`} />
            ))}
          {[-178, 178].map((x) => (
            <g key={x}>
              <rect x={x - 21} y={RAIL_TOP - 4} width="42" height="114" />
              <path d={`M${x - 26} ${RAIL_TOP - 4}h52M${x - 13} ${RAIL_TOP - 6}L${x - 8} ${RAIL_TOP - 18}L${x - 26} ${RAIL_TOP - 38}L${x - 28} ${RAIL_TOP - 52}L${x + 28} ${RAIL_TOP - 52}L${x + 26} ${RAIL_TOP - 38}L${x + 8} ${RAIL_TOP - 18}L${x + 13} ${RAIL_TOP - 6}Z`} />
            </g>
          ))}
        </g>
        {bouquet(-178, RAIL_TOP - 56, 31)}
        {bouquet(178, RAIL_TOP - 56, 32)}

        {/* The wall with the opening cut out (wide screens see it around the arch) */}
        <path d={`M-4000 -3000H4000V400H-4000Z${OPENING}`} fillRule="evenodd" fill={wall} />
        <path d={RING} fill={c.stone} stroke={mix(c.stone, '#000000', 14)} strokeWidth="1" />

        {/* Curtains */}
        {([-1, 1] as const).map((side) => (
          <path key={side} className={`sg2d-curtain sg2d-curtain-${side < 0 ? 'l' : 'r'}`} d={curtain(side)} fill="#FFFBF6" opacity="0.5" />
        ))}

        {/* Hanging greenery, leaves and roses on the arch */}
        <g stroke={mix(c.leaf, '#000000', 25)} strokeWidth="1" fill="none">
          {STRANDS.map((pts, i) => (
            <polyline key={i} points={pts.map(([x, y]) => `${(x * CM).toFixed(1)},${(-y * CM).toFixed(1)}`).join(' ')} />
          ))}
        </g>
        <g fill={mix(c.leaf, '#000000', 10)}>
          {STRANDS.flatMap((pts, i) =>
            pts.slice(1).map(([x, y], k) => <ellipse key={`${i}-${k}`} cx={x * CM + (k % 2 ? 4 : -4)} cy={-y * CM} rx="2.6" ry="6" transform={`rotate(${k % 2 ? 30 : -30} ${x * CM} ${-y * CM})`} />),
          )}
        </g>
        <g>
          {LEAVES.map((l, i) => (
            <ellipse key={i} cx={l.position[0] * CM} cy={-l.position[1] * CM} rx={l.scale * CM * 0.2} ry={l.scale * CM * 0.5} transform={`rotate(${((l.spin * 180) / Math.PI).toFixed(0)} ${(l.position[0] * CM).toFixed(1)} ${(-l.position[1] * CM).toFixed(1)})`} fill={mix(c.leaf, '#000000', (i % 3) * 8)} />
          ))}
          {ROSES.map((r, i) => roseAt(r.position[0] * CM, -r.position[1] * CM, r.scale * CM * 0.9, roseTones[Math.floor(r.hue * roseTones.length) % roseTones.length]!, i))}
        </g>

        {/* Lanterns: brass hexagons with a candle glow */}
        {LANTERNS_2D.map(([x, y, k], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
            {i < 2 && <line x1="0" y1="-60" x2="0" y2="-34" stroke="#A47C3C" strokeWidth="0.8" />}
            <circle className="sg2d-flame" cx="0" cy="-15" r="34" fill={`url(#${id('flame')})`} />
            <path d="M-9 -34L9 -34L12 -27L-12 -27ZM-11 -27L11 -27L11 -2L-11 -2ZM-13 -2L13 -2L13 2L-13 2Z" fill="#FFE9C8" fillOpacity="0.45" stroke="#B8893E" strokeWidth="1.2" />
            <path d="M-12 -27L0 -40L12 -27Z" fill="#C79A4E" />
            <rect x="-2.6" y="-14" width="5.2" height="11" fill="#F6EBDB" />
            <ellipse className="sg2d-flame" cx="0" cy="-17" rx="1.8" ry="3.4" fill="#FFF3D6" />
          </g>
        ))}
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

/** The pair of swans meeting in a heart on the lake (waterline at y = -185). */
function SwanPair({ c }: { c: Colors }) {
  const s = 1.15;
  const swan = (
    <>
      <path d={SWAN_PATH} fill="#FFFCF7" stroke={mix(c.stone, '#000000', 18)} strokeWidth={0.6} />
      <path d={BEAK_PATH} fill="#D9692A" />
    </>
  );
  const pair = (
    <>
      <g className="sg2d-swan sg2d-swan-l">{swan}</g>
      <g className="sg2d-swan sg2d-swan-r">
        <g transform="translate(100 0) scale(-1 1)">{swan}</g>
      </g>
    </>
  );
  return (
    <>
      <g transform={`translate(${-50 * s} ${-185 - 76 * s}) scale(${s})`}>{pair}</g>
      <g transform={`translate(${-50 * s} ${-185 + 76 * s}) scale(${s} ${-s})`} opacity="0.3">
        {pair}
      </g>
    </>
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
                    <radialGradient id={id(`wax-${half}`)} cx="0.36" cy="0.3" r="0.8">
                      <stop offset="0" stopColor={c.gilt ? c.sealRelief : mix(c.seal, '#ffffff', 22)} />
                      <stop offset="0.5" stopColor={c.seal} />
                      <stop offset="1" stopColor={mix(c.seal, '#000000', c.gilt ? 40 : 35)} />
                    </radialGradient>
                  </defs>
                  <path d={SEAL_PATH} fill={`url(#${id(`wax-${half}`)})`} />
                  {/* Raised rim and a laurel wreath round the monogram, catching the light. */}
                  <circle r="38" fill="none" stroke={c.gilt ? c.sealRelief : gold} strokeWidth="2.4" opacity="0.85" />
                  <g fill={c.gilt ? c.sealRelief : gold} opacity="0.85">
                    {WREATH.map(([x, y, a], i) => (
                      <ellipse key={i} cx={x} cy={y} rx="3.4" ry="1.4" transform={`rotate(${a} ${x} ${y})`} />
                    ))}
                  </g>
                  <circle r="22" fill="none" stroke={c.gilt ? c.sealRelief : gold} strokeWidth="0.8" opacity="0.7" />
                  <text y="2" textAnchor="middle" dominantBaseline="middle" className="font-inv-display" fontSize="15" fill={c.gilt ? mix(c.sealRelief, '#ffffff', 25) : mix(gold, '#ffffff', 15)} direction="rtl">
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

/** Laurel leaves in pairs round the seal (x, y, angle in degrees), two branches meeting at the top. */
const WREATH = (() => {
  const out: [number, number, number][] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const a = Math.PI / 2 + side * (0.3 + i * 0.22);
      const x = Math.cos(a) * 29;
      const y = Math.sin(a) * 29;
      const deg = (a * 180) / Math.PI + 90;
      for (const out2 of [-1, 1]) out.push([x + Math.cos(a) * out2 * 2.6, y + Math.sin(a) * out2 * 2.6, deg + side * out2 * 32]);
    }
  }
  return out.map(([x, y, d]) => [Number(x.toFixed(2)), Number(y.toFixed(2)), Number(d.toFixed(1))] as [number, number, number]);
})();
