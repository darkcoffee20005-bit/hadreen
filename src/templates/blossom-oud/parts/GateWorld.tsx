'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  ShaderMaterial,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import { WaxSeal, type SealState } from '@/lib/invite/kit/WaxSeal';
import { mixHex as mix } from '@/lib/invite/stage/color';
import { cssFontFamily } from '@/lib/invite/stage/textures';
import { GATE_Z } from '../camera';
import { glowTexture, paperNormal, sprigTexture } from '../textures';

export interface GateState {
  seal: number;
  flap: number;
  slide: number;
  glow: number;
  /** 0..1 position of the shimmer travelling along the foil edge. */
  shimmer: number;
  /** Idle sway (radians). */
  sway: number;
}

export interface GatePalette {
  paper: string;
  liner: string;
  foil: string;
  seal: string;
  sealRelief: string;
  plum: string;
  plumDeep: string;
  rose: string;
  roseDeep: string;
  leaf: string;
}

const W = 3.2;
const H = 2.2;
const D = 1.3;

/** The rounded flap outline from the right hinge, under the belly, to the left hinge. */
export function flapCurve(n = 64): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    out.push([(W / 2) * Math.cos(Math.PI * s), -D * Math.pow(Math.sin(Math.PI * s), 0.85)]);
  }
  return out;
}

/** A ribbon along the flap's curved edge (the rose-gold foil), with aU = 0..1 along it. */
function foilGeometry(outer: number, inner: number): BufferGeometry {
  const pts = flapCurve(96);
  const pos: number[] = [];
  const au: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  pts.forEach(([x, y], i) => {
    const [px, py] = pts[Math.max(0, i - 1)]!;
    const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)]!;
    let tx = nx - px;
    let ty = ny - py;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    // Inward normal (toward the flap's interior).
    const ix = -ty;
    const iy = tx;
    const u = i / (pts.length - 1);
    pos.push(x - ix * outer, y - iy * outer, 0, x + ix * inner, y + iy * inner, 0);
    au.push(u, u);
    nrm.push(0, 0, 1, 0, 0, 1);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  g.setAttribute('aU', new Float32BufferAttribute(au, 1));
  g.setIndex(idx);
  return g;
}

/** A soft shadow cast by the flap's edge onto the envelope (alpha falls off away from the edge). */
function edgeShadowGeometry(width: number): BufferGeometry {
  const g = foilGeometry(width, 0);
  // An alpha ramp across it: clear on the envelope, darkest at the edge.
  const pos = g.attributes.position!;
  const ramp: number[] = [];
  for (let i = 0; i < pos.count; i++) ramp.push(i % 2 === 0 ? 0 : 1);
  g.setAttribute('aV', new Float32BufferAttribute(ramp, 1));
  return g;
}

/** The plum satin the envelope rests against: a soft pool of light and a tone-on-tone damask. */
function backdropMaterial(plum: string, plumDeep: string, rose: string): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uPlum: { value: new Color(plum) }, uDeep: { value: new Color(plumDeep) }, uRose: { value: new Color(rose) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uPlum, uDeep, uRose; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - 0.5) * vec2(26.0, 18.0);
        float pool = exp(-dot(p * vec2(0.16, 0.24), p * vec2(0.16, 0.24)));
        // Ogee damask: two offset lattices of soft lozenges with a little flower in each.
        vec2 q = p * 1.6;
        vec2 cell = fract(q * vec2(0.5, 0.36)) - 0.5;
        vec2 cell2 = fract(q * vec2(0.5, 0.36) + 0.5) - 0.5;
        float og = smoothstep(0.035, 0.0, abs(abs(cell.x) * 1.0 + abs(cell.y) * 0.72 - 0.36));
        float fl = smoothstep(0.12, 0.05, length(cell2 * vec2(1.0, 1.35)));
        float damask = max(og * 0.8, fl * 0.6);
        float top = smoothstep(0.35, 1.0, vUv.y);
        vec3 col = mix(uDeep, uPlum, pool * 0.9 + 0.1);
        col = mix(col, uRose, pool * pool * 0.22);
        col *= 1.0 + damask * 0.05 * (0.3 + pool);
        col *= 1.0 - top * 0.45;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    fog: false,
  });
}

/**
 * The gate: a blush envelope, back up, with a rounded flap edged in rose-gold foil, a pressed
 * rose sprig tucked under an oud-brown wax seal, against plum damask satin. A shimmer travels
 * along the foil while it waits. Opening: the seal breaks, the flap lifts, light pours out, and
 * the envelope slides down and away.
 */
export function GateWorld({ pal, state, monogram, lang, onReady }: { pal: GatePalette; state: React.RefObject<GateState>; monogram: string; lang: 'ar' | 'en'; onReady: () => void }) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  useLayoutEffect(() => {
    const g = body.current?.geometry;
    const pos = g?.attributes.position;
    const uv = g?.attributes.uv;
    if (!g || !pos || !uv) return;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / W + 0.5, pos.getY(i) / H + 0.5);
    uv.needsUpdate = true;
  }, []);
  const env = useRef<Group>(null);
  const flap = useRef<Group>(null);
  const sprig = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);
  const seal = useRef<SealState>({ crack: 0, glint: 0 });
  const foilShader = useRef<{ uniforms: Record<string, { value: number }> } | null>(null);

  const flapGeo = useMemo(() => {
    const s = new Shape();
    const pts = flapCurve(64);
    s.moveTo(pts[0]![0], pts[0]![1]);
    for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
    s.closePath();
    return new ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false });
  }, []);
  const foilGeo = useMemo(() => foilGeometry(0.018, 0.05), []);
  const shadowGeo = useMemo(() => edgeShadowGeometry(0.16), []);
  const shadowMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: `attribute float aV; varying float vV; void main(){ vV = aV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        uniforms: { uK: { value: 1 } },
        fragmentShader: `uniform float uK; varying float vV; void main(){ gl_FragColor = vec4(0.18, 0.05, 0.08, pow(vV, 2.2) * 0.32 * uK); }`,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  );
  const maps = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return { normal: paperNormal(W, H), sprig: sprigTexture(pal.rose, pal.roseDeep, pal.leaf), glow: glowTexture() };
  }, [pal.rose, pal.roseDeep, pal.leaf]);
  const backdrop = useMemo(() => backdropMaterial(pal.plum, pal.plumDeep, pal.rose), [pal.plum, pal.plumDeep, pal.rose]);
  useEffect(
    () => () => {
      flapGeo.dispose();
      foilGeo.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      backdrop.dispose();
      maps?.normal.dispose();
      maps?.sprig.dispose();
      maps?.glow.dispose();
    },
    [flapGeo, foilGeo, shadowGeo, shadowMat, backdrop, maps],
  );

  // The seal's monogram waits for the display font.
  const fontVar = lang === 'ar' ? '--font-aref' : '--font-pinyon';
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    document.fonts
      .load(`700 120px ${cssFontFamily(fontVar, 'serif')}`, monogram)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        setFontReady(true);
        onReady();
      });
    return () => {
      cancelled = true;
    };
  }, [fontVar, monogram, onReady]);

  const onFoil = (m: MeshStandardMaterial | null) => {
    if (!m) return;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uShimmer = { value: 0 };
      shader.uniforms.uShineCol = { value: new Color(mix(pal.foil, '#fff4e8', 0.7)) };
      foilShader.current = shader as unknown as { uniforms: Record<string, { value: number }> };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aU; varying float vU;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvU = aU;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uShimmer; uniform vec3 uShineCol; varying float vU;')
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\nfloat sh = exp(-pow((vU - uShimmer) * 16.0, 2.0)); totalEmissiveRadiance += uShineCol * sh * 1.6;',
        );
    };
    m.customProgramCacheKey = () => 'bo-foil';
  };

  useFrame(() => {
    const s = state.current;
    if (!s) return;
    seal.current.crack = s.seal;
    seal.current.glint = s.shimmer;
    if (foilShader.current) foilShader.current.uniforms.uShimmer!.value = s.shimmer * 1.5 - 0.25;
    if (flap.current) flap.current.rotation.x = -Math.PI * 0.7 * s.flap;
    shadowMat.uniforms.uK!.value = Math.max(0, 1 - s.flap * 4);
    if (env.current) {
      env.current.position.y = -s.slide * 4.6;
      env.current.rotation.x = s.slide * 0.35;
      env.current.rotation.z = s.sway;
    }
    if (sprig.current) {
      // The sprig slips off as the seal breaks.
      const k = Math.max(0, s.seal - 0.1);
      sprig.current.position.set(-0.46 - k * 0.35, H / 2 - D + 0.03 - k * k * 0.9, 0.08 + k * 0.25);
      sprig.current.rotation.z = 0.78 + k * 0.5;
    }
    if (glow.current) {
      const g = s.glow;
      glow.current.visible = g > 0.001;
      glow.current.scale.set(2.2 + g * 9, 0.8 + g * 6, 1);
      (glow.current.material as MeshStandardMaterial).opacity = Math.min(1, g * 1.6);
    }
    if (group.current) group.current.visible = true;
  });

  return (
    <group ref={group} position={[0, 0, GATE_Z]}>
      <mesh material={backdrop} position={[0, 0, -1.4]}>
        <planeGeometry args={[26, 18]} />
      </mesh>
      <group ref={env}>
        <RoundedBox ref={body} args={[W, H, 0.05]} radius={0.03} smoothness={3}>
          <meshPhysicalMaterial color={pal.paper} roughness={0.85} sheen={0.4} sheenColor="#ffffff" normalMap={maps?.normal ?? null} normalScale={[0.55, 0.55]} />
        </RoundedBox>
        {/* Light from inside the opened envelope. */}
        <mesh ref={glow} position={[0, H / 2 - 0.05, 0.06]} visible={false} renderOrder={5}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={maps?.glow ?? null} color={mix('#fff1e4', pal.rose, 0.2)} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* The pressed rose sprig, tucked under the seal at the flap's tip; it slips away as the seal breaks. */}
        <mesh ref={sprig} position={[-0.46, H / 2 - D + 0.03, 0.08]} rotation={[0, 0, 0.78]}>
          <planeGeometry args={[0.8, 1.6]} />
          <meshStandardMaterial map={maps?.sprig ?? null} transparent alphaTest={0.4} roughness={0.75} side={DoubleSide} />
        </mesh>
        <group ref={flap} position={[0, H / 2 - 0.012, 0.031]}>
          <mesh geometry={shadowGeo} material={shadowMat} position={[0, 0, -0.004]} renderOrder={2} />
          <mesh geometry={flapGeo}>
            <meshPhysicalMaterial color={mix(pal.paper, '#ffffff', 0.08)} roughness={0.8} sheen={0.35} sheenColor="#ffffff" side={DoubleSide} />
          </mesh>
          <mesh geometry={flapGeo} position={[0, 0, -0.003]} scale={[0.97, 0.97, 1]}>
            <meshStandardMaterial color={pal.liner} roughness={0.55} metalness={0.15} side={DoubleSide} />
          </mesh>
          <mesh geometry={foilGeo} position={[0, 0, 0.0095]}>
            <meshStandardMaterial ref={onFoil} color={pal.foil} metalness={0.7} roughness={0.32} emissive={pal.foil} emissiveIntensity={0.42} side={DoubleSide} />
          </mesh>
          <group position={[0, -D + 0.1, 0.09]}>
            {fontReady && <WaxSeal monogram={monogram} color={pal.seal} relief={pal.sealRelief} state={seal} fontVar={fontVar} radius={0.3} />}
          </group>
        </group>
      </group>
    </group>
  );
}
