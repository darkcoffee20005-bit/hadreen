'use client';

import { useEffect, useMemo } from 'react';
import { CanvasTexture, Color, DoubleSide, MeshMatcapMaterial, MeshPhysicalMaterial, PlaneGeometry, SRGBColorSpace, Vector2, Vector3, type Texture } from 'three';
import { mixHex as mix, shadeHex as shade } from '@/lib/invite/stage/color';
import { canvas } from '@/lib/invite/stage/textures';
import { CURTAIN, type CurtainParams } from '../geometry';

/**
 * The velvet stage curtain, one draw call: a plane deformed on the GPU (deep pleats, the lift that
 * gathers the fabric into Austrian swags, the moving hem), with a gold galloon along the hem, a
 * gold bullion fringe below it (alpha-cut strands) and an embroidered gold crest.
 * Medium/high: MeshPhysicalMaterial with sheen (true velvet). Low: a velvet matcap with the
 * spotlight pool computed in the shader. The GLSL mirrors `curtainPoint` in geometry.ts.
 */
const DEFORM = /* glsl */ `
uniform float uLift; uniform float uSwag; uniform float uSway; uniform float uMove; uniform float uTime;
uniform float uTop; uniform float uLen; uniform float uRaised; uniform float uSag; uniform float uSpacing; uniform float uDepth;
uniform float uCrestS; uniform float uCrestSize;
varying float vS; varying float vX; varying float vFold; varying vec3 vCrW;
float crFolds(float x){ return 0.55 * sin(x * 6.613 + 0.6) + 0.28 * sin(x * 11.85 + 2.1) + 0.17 * sin(x * 2.33 + 4.0); }
float crSwag(float x){ return sin(3.14159265 * fract(x / uSpacing)); }
vec3 crPoint(float x, float s){
  float sw = crSwag(x);
  float hem0 = uTop - uLen;
  float hemY = hem0 + (uRaised - hem0) * uLift - uSag * sw * uSwag;
  float span = uTop - hemY;
  float e = 1.0 - clamp(span / uLen, 0.0, 1.0);
  float fs = max(s, 0.0);
  float w = 1.0 - fs / uLen;
  float y = uTop - span * w;
  float ruff = sqrt(e) * 0.15 * sin(fs * 11.4) * (0.35 + 0.65 * w);
  float amp = uDepth * (1.0 + 0.8 * (1.0 - sw) * uSwag * w) * (1.0 + 0.15 * w);
  float dx = x / (uCrestSize * 1.05);
  float ds = (fs - uCrestS) / (uCrestSize * 1.05);
  float flt = 1.0 - 0.62 * exp(-(dx * dx + ds * ds));
  float z = crFolds(x) * amp * flt + ruff + 0.5 * sw * uSwag * e * w;
  float sway = uSway + uMove * sin(uTime * 0.8 + x * 0.45);
  z += sway * w * w * w;
  if (s < 0.0) y += s;
  return vec3(x, y, z);
}
`;

const DEFORM_MAIN = /* glsl */ `
  vec3 crP = crPoint(position.x, position.y);
  vec3 crPx = crPoint(position.x + 0.012, position.y);
  vec3 crPs = crPoint(position.x, position.y + 0.012);
  vec3 objectNormal = normalize(cross(crPx - crP, crPs - crP));
  vS = position.y; vX = position.x; vFold = crFolds(position.x);
  vCrW = (modelMatrix * vec4(crP, 1.0)).xyz;
`;

const SURFACE = /* glsl */ `
uniform vec3 uGold; uniform vec3 uGoldDeep; uniform sampler2D uCrestMap; uniform float uHasCrest;
uniform float uFringe; uniform float uCrestS; uniform float uCrestSize; uniform float uCrestK;
varying float vS; varying float vX; varying float vFold; varying vec3 vCrW;
float crHash(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float crGold = 0.0; float crAO = 1.0; vec3 crGoldCol = vec3(0.0);
void crSurface(){
  crAO = 0.3 + 0.7 * smoothstep(-0.95, 0.9, vFold);
  float pattern = 0.72 + 0.28 * sin(vX * 95.0 + vS * 70.0);
  float braid = step(0.0, vS) * (1.0 - smoothstep(0.12, 0.135, vS));
  braid *= 0.85 + 0.15 * step(0.03, vS) * step(vS, 0.1);
  vec2 cuv = vec2(vX / uCrestSize + 0.5, (vS - uCrestS) / uCrestSize + 0.5);
  float crest = 0.0;
  if (uHasCrest > 0.5 && cuv.x > 0.0 && cuv.x < 1.0 && cuv.y > 0.0 && cuv.y < 1.0) crest = smoothstep(0.28, 0.62, texture2D(uCrestMap, cuv).r) * uCrestK;
  float fr = 0.0;
  if (vS < 0.0) {
    float id = floor(vX * 62.0);
    float f = fract(vX * 62.0);
    float strand = smoothstep(0.04, 0.3, f) * (1.0 - smoothstep(0.62, 0.92, f));
    float len = uFringe * (0.84 + 0.16 * crHash(id));
    if (strand < 0.3 || -vS > len) discard;
    fr = 1.0;
    pattern = 0.66 + 0.34 * sin(vS * 150.0 + id * 1.7);
    crAO = 0.75 + 0.25 * strand;
  }
  crGold = max(max(braid, crest), fr);
  crGoldCol = mix(uGoldDeep, uGold, pattern);
}
`;

export interface CurtainUniforms {
  [key: string]: { value: unknown };
  uLift: { value: number };
  uSwag: { value: number };
  uSway: { value: number };
  uMove: { value: number };
  uTime: { value: number };
  uSpotPos: { value: Vector3 };
  uSpotDir: { value: Vector3 };
  uSpotCos: { value: Vector2 };
  uSpotK: { value: number };
  uCrestMap: { value: Texture | null };
  uHasCrest: { value: number };
  uCrestK: { value: number };
}

export function crestTexture(text: string, family: string): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const S = 512;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.filter = 'blur(1.6px)';
  const ring = (r: number, w: number) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  ring(S * 0.4, S * 0.022);
  ring(S * 0.355, S * 0.008);
  // A laurel of small leaves inside the rings, open at the top.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI / 2 + side * (0.42 + i * 0.27);
      const r = S * 0.3;
      ctx.save();
      ctx.translate(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r);
      ctx.rotate(a + side * 0.6);
      ctx.beginPath();
      ctx.ellipse(0, 0, S * 0.036, S * 0.013, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  // Little dots around the outer ring, like couched pearls.
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(S / 2 + Math.cos(a) * S * 0.455, S / 2 + Math.sin(a) * S * 0.455, S * 0.009, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = `700 ${Math.round(S * 0.24)}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(text, S / 2, S / 2 + S * 0.015, S * 0.46);
  const t = new CanvasTexture(c);
  return t;
}

function velvetMatcap(p: { deep: string; velvet: string; hi: string }): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const S = 256;
  const [c, ctx] = canvas(S, S);
  // Velvet is darkest facing you and glows at grazing angles (the pile catches the light).
  const g = ctx.createRadialGradient(S * 0.5, S * 0.56, 0, S * 0.5, S * 0.5, S * 0.5);
  g.addColorStop(0, shade(p.deep, 0.7));
  g.addColorStop(0.5, p.deep);
  g.addColorStop(0.78, p.velvet);
  g.addColorStop(0.93, mix(p.velvet, p.hi, 0.6));
  g.addColorStop(1, mix(p.hi, '#f0b0a8', 0.15));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  // Light from above: the upper rim is brighter than the lower one.
  const top = ctx.createLinearGradient(0, 0, 0, S);
  top.addColorStop(0, 'rgba(255,220,200,0.16)');
  top.addColorStop(0.5, 'rgba(0,0,0,0)');
  top.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, S, S);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export interface CurtainOptions {
  params?: CurtainParams;
  segments: [number, number];
  low: boolean;
  palette: { velvet: string; deep: string; hi: string; gold: string; goldDeep: string };
  crest?: Texture | null;
}

export function useCurtain({ params = CURTAIN, segments, low, palette, crest = null }: CurtainOptions) {
  const geometry = useMemo(() => {
    const h = params.length + params.fringe;
    const g = new PlaneGeometry(params.width, h, segments[0], segments[1]);
    g.translate(0, h / 2 - params.fringe, 0);
    return g;
  }, [params, segments]);

  const uniforms = useMemo<CurtainUniforms>(
    () => ({
      uLift: { value: 0 },
      uSwag: { value: 0 },
      uSway: { value: 0 },
      uMove: { value: 0 },
      uTime: { value: 0 },
      uTop: { value: params.top },
      uLen: { value: params.length },
      uRaised: { value: params.raised },
      uSag: { value: params.sag },
      uSpacing: { value: params.spacing },
      uDepth: { value: params.depth },
      uCrestS: { value: params.crestS },
      uCrestSize: { value: params.crestSize },
      uFringe: { value: params.fringe },
      uGold: { value: new Color(palette.gold) },
      uGoldDeep: { value: new Color(palette.goldDeep) },
      uCrestMap: { value: null as Texture | null },
      uHasCrest: { value: 0 },
      uCrestK: { value: 1 },
      uSpotPos: { value: new Vector3() },
      uSpotDir: { value: new Vector3(0, -1, 0) },
      uSpotCos: { value: new Vector2(0.9, 0.98) },
      uSpotK: { value: 1 },
    }),
    [params, palette.gold, palette.goldDeep],
  );

  useEffect(() => {
    uniforms.uCrestMap.value = crest;
    uniforms.uHasCrest.value = crest ? 1 : 0;
  }, [crest, uniforms]);

  const matcap = useMemo(() => (low ? velvetMatcap(palette) : null), [low, palette]);

  const material = useMemo(() => {
    const vertex = (src: string) =>
      src
        .replace('#include <common>', `#include <common>\n${DEFORM}`)
        .replace('#include <beginnormal_vertex>', DEFORM_MAIN)
        .replace('#include <begin_vertex>', 'vec3 transformed = crP;');
    if (low) {
      const m = new MeshMatcapMaterial({ matcap, side: DoubleSide, color: '#ffffff' });
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = vertex(shader.vertexShader);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${SURFACE}\nuniform vec3 uSpotPos; uniform vec3 uSpotDir; uniform vec2 uSpotCos; uniform float uSpotK;`)
          .replace('#include <color_fragment>', '#include <color_fragment>\n crSurface();')
          .replace(
            'vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;',
            `vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb * crAO;
             float crL = 0.45 + 0.75 * max(0.0, dot(normal, normalize(vec3(0.15, 0.75, 0.6))));
             outgoingLight = mix(outgoingLight, crGoldCol * crL, crGold);
             float crSp = smoothstep(uSpotCos.x, uSpotCos.y, dot(normalize(vCrW - uSpotPos), uSpotDir));
             outgoingLight *= 0.2 + uSpotK * 1.3 * crSp * crSp;`,
          );
      };
      m.customProgramCacheKey = () => 'er-curtain-matcap';
      return m;
    }
    const m = new MeshPhysicalMaterial({
      color: palette.velvet,
      roughness: 0.82,
      metalness: 0,
      sheen: 1,
      sheenColor: new Color(mix(palette.hi, '#ffaaaa', 0.32)),
      sheenRoughness: 0.36,
      side: DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = vertex(shader.vertexShader);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${SURFACE}`)
        .replace('#include <color_fragment>', '#include <color_fragment>\n crSurface();\n diffuseColor.rgb = mix(diffuseColor.rgb * crAO, crGoldCol, crGold);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.4, crGold);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = mix(metalnessFactor, 0.6, crGold);')
        .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_SHEEN\n material.sheenColor *= (1.0 - crGold) * crAO;\n#endif')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += crGoldCol * crGold * 0.16;');
    };
    m.customProgramCacheKey = () => 'er-curtain-velvet';
    return m;
  }, [low, matcap, palette, uniforms]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      matcap?.dispose();
    },
    [geometry, material, matcap],
  );

  return { geometry, material, uniforms };
}
