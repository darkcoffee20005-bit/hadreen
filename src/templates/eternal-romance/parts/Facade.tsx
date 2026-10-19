'use client';

import { useEffect, useMemo } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial, Vector4 } from 'three';
import { buildRibbons, facadeLights, facadeStrokes } from '../geometry';

const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/**
 * The venue as a living line drawing: every stroke of the façade is a thin gold ribbon that the
 * pen draws on (uDraw), with a hot pen tip, a soft glow copy so it reads without bloom, and little
 * lights along the garlands that twinkle once drawn. A calm oval behind the names dims the lines
 * so the names (3D at the end of the opening, then the DOM hero) always read cleanly.
 */
export function useFacade(gold: string, hot: string, glow: boolean) {
  const lines = useMemo(() => {
    const r = buildRibbons(facadeStrokes(), glow ? 7 : 4);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(r.position, 3));
    g.setAttribute('aSide', new BufferAttribute(r.side, 1));
    g.setAttribute('aU', new BufferAttribute(r.u, 1));
    g.setAttribute('aWin', new BufferAttribute(r.win, 2));
    g.setAttribute('aGlow', new BufferAttribute(r.glow, 1));
    g.setIndex(new BufferAttribute(r.index, 1));
    const m = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uDraw: { value: 0 },
        uK: { value: 1 },
        uCalm: { value: 0 },
        uCalmBox: { value: new Vector4(0, 3.8, 3.6, 1.75) },
        uGold: { value: new Color(gold) },
        uHot: { value: new Color(hot) },
      },
      vertexShader: /* glsl */ `
        attribute float aSide; attribute float aU; attribute vec2 aWin; attribute float aGlow;
        uniform float uDraw;
        varying float vSide; varying float vVis; varying float vGlow; varying float vLocal; varying vec2 vP;
        void main(){
          float local = clamp((uDraw - aWin.x) / max(1e-4, aWin.y - aWin.x), 0.0, 1.0);
          vLocal = local; vVis = local - aU; vSide = aSide; vGlow = aGlow; vP = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uGold; uniform vec3 uHot; uniform float uK; uniform float uCalm; uniform vec4 uCalmBox;
        varying float vSide; varying float vVis; varying float vGlow; varying float vLocal; varying vec2 vP;
        void main(){
          if (vVis < 0.0 || vLocal <= 0.0) discard;
          float edge = vGlow > 0.5 ? pow(1.0 - abs(vSide), 2.2) * 0.11 : 1.0 - smoothstep(0.35, 1.0, abs(vSide));
          float head = (1.0 - smoothstep(0.0, 0.05, vVis)) * step(vLocal, 0.999);
          vec2 q = (vP - uCalmBox.xy) / uCalmBox.zw;
          float calm = 1.0 - uCalm * 0.72 * (1.0 - smoothstep(0.75, 1.2, length(q)));
          vec3 col = mix(uGold, uHot, head) * (1.0 + head * (vGlow > 0.5 ? 3.0 : 1.4));
          gl_FragColor = vec4(col, edge * uK * calm);
          ${OUT}
        }`,
    });
    return { geometry: g, material: m };
  }, [gold, hot, glow]);

  const lights = useMemo(() => {
    const list = facadeLights();
    const pos = new Float32Array(list.length * 3);
    const t = new Float32Array(list.length);
    const size = new Float32Array(list.length);
    list.forEach((l, i) => {
      pos.set([l.p[0], l.p[1], 0.02], i * 3);
      t[i] = l.t;
      size[i] = l.size;
    });
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aT', new BufferAttribute(t, 1));
    g.setAttribute('aSize', new BufferAttribute(size, 1));
    const m = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uDraw: { value: 0 }, uTime: { value: 0 }, uK: { value: 1 }, uPx: { value: 300 }, uColor: { value: new Color(hot) } },
      vertexShader: /* glsl */ `
        attribute float aT; attribute float aSize;
        uniform float uDraw; uniform float uTime; uniform float uPx;
        varying float vA;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float on = smoothstep(aT, aT + 0.05, uDraw);
          float tw = 0.7 + 0.3 * sin(uTime * (1.3 + fract(aT * 37.0)) + aT * 91.0);
          vA = on * tw;
          gl_PointSize = uPx * aSize * (0.8 + 0.4 * tw) / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uK; varying float vA;
        void main(){
          vec2 q = gl_PointCoord - 0.5;
          float r = length(q);
          float star = max(0.0, 1.0 - abs(q.x) * 14.0) * max(0.0, 1.0 - abs(q.y) * 2.2) + max(0.0, 1.0 - abs(q.y) * 14.0) * max(0.0, 1.0 - abs(q.x) * 2.2);
          float a = (smoothstep(0.5, 0.0, r) * 0.35 + smoothstep(0.12, 0.0, r) + star * 0.5) * vA * uK;
          gl_FragColor = vec4(uColor * 1.3, a);
          ${OUT}
        }`,
    });
    return { geometry: g, material: m };
  }, [hot]);

  useEffect(
    () => () => {
      lines.geometry.dispose();
      lines.material.dispose();
      lights.geometry.dispose();
      lights.material.dispose();
    },
    [lines, lights],
  );
  return { lines, lights };
}
