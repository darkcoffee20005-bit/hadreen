import { Color, Matrix4, Vector3, type Texture } from 'three';

/**
 * GLSL for dolce-vita: the bright lake sky, the lake (scrolling normals, sky/planar reflection,
 * sun glitter, the boat's wake), billboard clouds and the sparkle burst.
 */

export type SkyUniforms = {
  uSkyTop: { value: Color };
  uSkyHorizon: { value: Color };
  uSkyLow: { value: Color };
  uHaze: { value: Color };
  uSunColor: { value: Color };
  uSunDir: { value: Vector3 };
};

export function skyUniforms(top: string, horizon: string, low: string, haze: string, sun: string): SkyUniforms {
  return {
    uSkyTop: { value: new Color(top) },
    uSkyHorizon: { value: new Color(horizon) },
    uSkyLow: { value: new Color(low) },
    uHaze: { value: new Color(haze) },
    uSunColor: { value: new Color(sun) },
    // The glitter "sun", up and to the right beyond the lake (the key light on the balcony comes
    // from behind the camera: a cheat nobody notices, and both the balcony and the water sparkle).
    uSunDir: { value: new Vector3(0.42, 0.3, -0.86).normalize() },
  };
}

const SKY_FN = /* glsl */ `
uniform vec3 uSkyTop, uSkyHorizon, uSkyLow, uHaze, uSunColor;
uniform vec3 uSunDir;
vec3 skyColor(vec3 d) {
  float h = d.y;
  vec3 col = mix(uSkyHorizon, uSkyTop, pow(smoothstep(-0.02, 0.42, h), 0.7));
  col = mix(col, uSkyLow, smoothstep(0.0, -0.25, h));
  col = mix(col, uHaze, exp(-abs(h) * 22.0) * 0.5);
  float s = max(dot(normalize(d), uSunDir), 0.0);
  col += uSunColor * (pow(s, 6.0) * 0.22 + pow(s, 48.0) * 0.3);
  return col;
}
`;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

export const SKY_FRAG = /* glsl */ `
${SKY_FN}
varying vec3 vDir;
void main() {
  gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0);
  #include <colorspace_fragment>
}`;

export type WaterUniforms = SkyUniforms & {
  uTime: { value: number };
  uNormal: { value: Texture | null };
  uBody: { value: Color };
  uDeep: { value: Color };
  uGlitter: { value: number };
  uBoat: { value: Vector3 };
  uFogColor: { value: Color };
  uFogNear: { value: number };
  uFogFar: { value: number };
  uReflect: { value: Texture | null };
  uTexMatrix: { value: Matrix4 };
};

export function waterUniforms(sky: SkyUniforms, body: string, deep: string, fog: { color: string; near: number; far: number }): WaterUniforms {
  return {
    ...sky,
    uTime: { value: 0 },
    uNormal: { value: null },
    uBody: { value: new Color(body) },
    uDeep: { value: new Color(deep) },
    uGlitter: { value: 0.5 },
    uBoat: { value: new Vector3(0, -64, 0) },
    uFogColor: { value: new Color(fog.color) },
    uFogNear: { value: fog.near },
    uFogFar: { value: fog.far },
    uReflect: { value: null },
    uTexMatrix: { value: new Matrix4() },
  };
}

export const WATER_VERT = /* glsl */ `
uniform mat4 uTexMatrix;
varying vec3 vWorld;
varying vec4 vRefl;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vRefl = uTexMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/**
 * MODE_BASE: the sky's reflection only (opaque; the mirrored world draws over it).
 * MODE_FILM: the water's body, ripples, glitter and wake over that (transparent).
 * neither:   one opaque surface sampling a real planar reflection (uReflect).
 */
export const WATER_FRAG = /* glsl */ `
${SKY_FN}
uniform float uTime, uGlitter, uFogNear, uFogFar;
uniform sampler2D uNormal;
uniform sampler2D uReflect;
uniform vec3 uBody, uDeep, uFogColor;
uniform vec3 uBoat;
varying vec3 vWorld;
varying vec4 vRefl;

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

void main() {
  vec2 p = vWorld.xz;
  float dist = length(cameraPosition - vWorld);
  vec3 n1 = texture2D(uNormal, p * 0.021 + vec2(uTime * 0.006, uTime * 0.004)).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D(uNormal, p * 0.057 + vec2(-uTime * 0.011, uTime * 0.008)).xyz * 2.0 - 1.0;
  vec3 n3 = texture2D(uNormal, p * 0.19 + vec2(uTime * 0.02, -uTime * 0.016)).xyz * 2.0 - 1.0;
  vec2 slope = n1.xy * 0.55 + n2.xy * 0.4 + n3.xy * 0.3 * (1.0 - smoothstep(20.0, 140.0, dist));
  slope *= mix(0.55, 0.22, smoothstep(40.0, 520.0, dist));
  vec3 N = normalize(vec3(slope.x, 1.0, slope.y));
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = 0.025 + 0.975 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  fres = clamp(fres * 1.1, 0.0, 0.94);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  vec3 refl = skyColor(R);
#if !defined(MODE_BASE) && !defined(MODE_FILM)
  vec4 rc = vRefl;
  rc.xy += N.xz * 0.9 * rc.w * 0.05;
  vec3 planar = texture2DProj(uReflect, rc).rgb;
  refl = mix(refl, planar, 0.9);
#endif
  vec3 body = mix(uDeep, uBody, smoothstep(10.0, 260.0, dist));

  // Sun glitter: a broad sheen path plus tight sparkles that twinkle as the ripples move.
  vec3 H = normalize(uSunDir + V);
  float nh = max(dot(N, H), 0.0);
  float sheen = pow(nh, 90.0) * 0.5;
  float spark = pow(nh, 1100.0);
  vec2 cell = floor(p * 1.6 + uTime * 0.3);
  spark *= step(0.55, hash(cell)) * 26.0;
  vec3 glitter = uSunColor * (sheen + spark) * uGlitter * (1.0 - smoothstep(260.0, 640.0, dist));

  // The boat's wake: a V of foam behind it (the boat sails toward -x).
  vec2 q = p - uBoat.xy;
  float behind = q.x;
  float spread = abs(q.y) - behind * 0.3;
  float wake = 0.0;
  if (behind > -2.0 && behind < 46.0) {
    float edge = exp(-spread * spread * 1.2) * (1.0 - smoothstep(2.0, 46.0, behind));
    float trail = exp(-q.y * q.y * 0.6) * (1.0 - smoothstep(0.0, 24.0, behind)) * 0.6;
    float bow = exp(-dot(q - vec2(-3.0, 0.0), q - vec2(-3.0, 0.0)) * 0.25) * 0.5;
    wake = (edge * 0.75 + trail + bow) * (0.55 + 0.45 * hash(floor(p * 3.0 + uTime)));
  }
  vec3 foam = vec3(1.0) * wake * uBoat.z;

  float fog = smoothstep(uFogNear, uFogFar, dist);
#ifdef MODE_BASE
  vec3 col = mix(refl, uFogColor, fog * 0.6);
  gl_FragColor = vec4(col, 1.0);
#elif defined(MODE_FILM)
  float a = clamp(1.0 - fres, 0.12, 1.0);
  vec3 col = body + (glitter + foam) / a;
  col = mix(col, uFogColor, fog * 0.6);
  gl_FragColor = vec4(col, a * (1.0 - fog * 0.6));
#else
  vec3 col = mix(body, refl, fres) + glitter + foam;
  col = mix(col, uFogColor, fog * 0.6);
  gl_FragColor = vec4(col, 1.0);
#endif
  #include <colorspace_fragment>
}`;

export const CLOUD_VERT = /* glsl */ `
attribute vec3 iOffset;
attribute vec3 iData; // width, height, seed
attribute float iKind;
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
varying float vKind;
varying float vDepth;
void main() {
  vec3 c = iOffset;
  float speed = iKind > 0.5 ? 0.35 : 1.0 + iData.z * 0.8;
  c.x = mod(c.x + uTime * speed * 1.6 + 700.0, 1400.0) - 700.0;
  vec4 mv = viewMatrix * vec4(c, 1.0);
  mv.xy += position.xy * iData.xy;
  vUv = uv;
  vSeed = iData.z;
  vKind = iKind;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

export const CLOUD_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uLit, uShade, uFogColor;
uniform float uOpacity, uFogNear, uFogFar;
varying vec2 vUv;
varying float vSeed;
varying float vKind;
varying float vDepth;
void main() {
  float a;
  float lit;
  if (vKind > 0.5) {
    // Mist band: a soft horizontal smear.
    vec2 d = (vUv - 0.5) * vec2(2.0, 2.0);
    a = exp(-d.y * d.y * 3.5) * (1.0 - smoothstep(0.4, 1.0, abs(d.x))) * 0.26;
    lit = 0.9;
  } else {
    float k = floor(vSeed * 4.0);
    vec2 cell = vec2(mod(k, 2.0), floor(k / 2.0)) * 0.5;
    vec4 t = texture2D(uAtlas, cell + vUv * 0.5);
    a = t.a;
    lit = mix(t.r, 1.0, 0.25) * (0.75 + 0.25 * vUv.y);
  }
  vec3 col = mix(uShade, uLit, clamp(lit, 0.0, 1.0));
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth) * 0.7);
  gl_FragColor = vec4(col, a * uOpacity);
  #include <colorspace_fragment>
}`;

/**
 * The sparkle burst over the card (t = seconds since the burst): gold and white sparks fly out
 * and fade; powder-blue foil flakes flutter down. Plus a few slow glints on the card at the gate.
 */
export const SPARK_VERT = /* glsl */ `
attribute vec4 seed;
uniform float uT;
uniform float uGate;
uniform float uClock;
uniform float uScale;
uniform vec2 uHalf;
uniform float uTilt;
varying float vAlpha;
varying float vKind;
void main() {
  float kind = seed.w < 0.55 ? 0.0 : (seed.w < 0.9 ? 1.0 : 2.0);
  vec3 dir = normalize(vec3(seed.x - 0.5, seed.y * 0.9 + 0.25, (seed.z - 0.5) * 0.7));
  vec3 p = vec3(0.0);
  float alpha = 0.0;
  float size = 1.0;
  if (kind < 0.5) {
    // Sparks: out fast, slow down, drift down a little, fade by 1.4 s.
    float t = max(uT - seed.z * 0.15, 0.0);
    float speed = 0.35 + seed.y * 0.45;
    p = dir * speed * (1.0 - exp(-t * 3.2)) / 3.2 * 3.0 + vec3(0.0, 0.03 - 0.06 * t * t, 0.0);
    alpha = step(0.0, uT) * (1.0 - smoothstep(0.35, 1.4, t)) * smoothstep(0.0, 0.05, t);
    size = 0.9 + seed.x;
  } else if (kind < 1.5) {
    // Foil flakes: tossed up, then flutter down past the rail.
    float t = max(uT - 0.1 - seed.x * 0.4, 0.0);
    p = vec3((seed.x - 0.5) * 0.5, 0.0, (seed.z - 0.5) * 0.3) * min(t * 2.5, 1.0);
    p.y = 0.16 * (1.0 - exp(-t * 4.0)) - 0.11 * t * t;
    p.x += sin(t * 5.0 + seed.y * 6.28) * 0.03;
    alpha = step(0.0, uT) * (1.0 - smoothstep(1.6, 2.6, t)) * smoothstep(0.0, 0.1, t);
    size = 1.1 + seed.z;
  } else {
    // Gate glints on the card's gilding.
    float ph = fract(uClock * (0.18 + seed.y * 0.2) + seed.x);
    // Somewhere along the card's gilded rule.
    float s4 = seed.z * 4.0;
    vec2 e = s4 < 1.0 ? vec2(s4 * 2.0 - 1.0, 1.0) : s4 < 2.0 ? vec2(1.0, (s4 - 1.0) * 2.0 - 1.0) : s4 < 3.0 ? vec2((s4 - 2.0) * 2.0 - 1.0, -1.0) : vec2(-1.0, (s4 - 3.0) * 2.0 - 1.0);
    vec2 l = e * uHalf;
    p = vec3(l.x, l.y * sin(uTilt) + cos(uTilt) * 0.004, -l.y * cos(uTilt) + sin(uTilt) * 0.004);
    alpha = uGate * pow(sin(ph * 3.14159), 18.0) * 0.7;
    size = 0.9;
  }
  vAlpha = alpha;
  vKind = kind;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = size * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

export const SPARK_FRAG = /* glsl */ `
uniform sampler2D uDot;
uniform vec3 uGold, uFoil;
varying float vAlpha;
varying float vKind;
void main() {
  float d = texture2D(uDot, gl_PointCoord).a;
  vec3 col = vKind > 0.5 && vKind < 1.5 ? uFoil : mix(uGold, vec3(1.0), 0.45);
  gl_FragColor = vec4(col * (1.0 + d), d * vAlpha);
  #include <colorspace_fragment>
}`;
