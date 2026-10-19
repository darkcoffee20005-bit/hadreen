/**
 * GLSL for the golden-hour sky and the still pond. The water reuses the sky function, so the
 * reflected sky always matches the dome; ripples, the swans' wakes and the sun's glitter are
 * a height field differentiated in the fragment shader.
 */
import { Color, Matrix4, Texture, Vector2, Vector3, Vector4 } from 'three';

export const SKY_GLSL = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
float sgHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sgNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sgHash(i), sgHash(i + vec2(1.0, 0.0)), f.x), mix(sgHash(i + vec2(0.0, 1.0)), sgHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 skyColor(vec3 dir) {
  float h = dir.y;
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
  col = mix(col, uZenith, smoothstep(0.22, 0.8, h));
  float s = max(dot(dir, uSunDir), 0.0);
  // Thin wisps low in the sky, lit gold toward the sun.
  vec2 q = vec2(atan(dir.x, -dir.z) * 4.0, h * 30.0);
  float wisp = sgNoise(q + vec2(0.0, 3.0)) * sgNoise(q * vec2(2.7, 0.45) + 1.7);
  wisp = smoothstep(0.22, 0.62, wisp) * smoothstep(0.03, 0.1, h) * (1.0 - smoothstep(0.22, 0.42, h));
  col = mix(col, mix(uMid * 1.06, uSunColor * 1.2, pow(s, 3.0)), wisp * 0.45);
  col += uSunColor * (pow(s, 5.0) * 0.28 + pow(s, 40.0) * 0.5);
  col += uSunColor * smoothstep(0.9991, 0.99965, s) * 2.6;
  if (h < 0.0) col = mix(col, uHorizon * 0.92, smoothstep(0.0, 0.25, -h));
  return col;
}
`;

const WATER_GLSL = /* glsl */ `
uniform float uTime;
uniform vec4 uSwanA;
uniform vec4 uSwanB;
uniform vec2 uWake;
float wakeH(vec2 p, vec4 s, float k) {
  vec2 rel = p - s.xy;
  vec2 fwd = s.zw;
  vec2 side = vec2(-fwd.y, fwd.x);
  float a = dot(rel, fwd);
  float b = dot(rel, side);
  float behind = max(-a, 0.0);
  // Kelvin wake: two arms opening at ~19.5 degrees behind the swan.
  float arm = abs(b) - (behind * 0.36 + 0.13);
  float width = 0.03 + behind * 0.05;
  float v = exp(-arm * arm / (width * width)) * exp(-behind * 0.75) * smoothstep(-0.05, 0.25, behind);
  v *= 0.55 + 0.45 * sin(behind * 26.0 - abs(b) * 8.0);
  // A ring of ripples hugging the body (always there: they bob).
  float e = length(vec2(a / 0.4, b / 0.19));
  float ring = exp(-pow((e - 1.08) * 3.2, 2.0)) * sin(e * 22.0 - uTime * 2.2);
  return k * v * 0.006 + ring * 0.0018 * (0.4 + k);
}
float waterHeight(vec2 p) {
  float h = sin(p.x * 2.3 + uTime * 0.55) * 0.0009 + sin(p.y * 3.7 - uTime * 0.42 + p.x * 0.8) * 0.0008;
  h += sin(dot(p, vec2(8.0, 6.0)) + uTime * 1.3) * 0.00025 + sin(dot(p, vec2(-5.0, 9.0)) - uTime * 1.1) * 0.0002;
  h += wakeH(p, uSwanA, uWake.x) + wakeH(p, uSwanB, uWake.y);
  return h;
}
vec3 waterNormal(vec2 p) {
  float e = 0.015;
  float h0 = waterHeight(p);
  float hx = waterHeight(p + vec2(e, 0.0));
  float hz = waterHeight(p + vec2(0.0, e));
  return normalize(vec3(-(hx - h0) / e, 1.0, -(hz - h0) / e));
}
`;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vDir = w.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const SKY_FRAG = /* glsl */ `
${SKY_GLSL}
varying vec3 vDir;
void main() {
  gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const WATER_VERT = /* glsl */ `
uniform mat4 uTexMatrix;
varying vec3 vWorld;
varying vec4 vProj;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vProj = uTexMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/** MODE_BASE: reflected sky (opaque, under the mirrored world). MODE_FILM: the water's body and glints over it. Otherwise: planar reflection. */
export const WATER_FRAG = /* glsl */ `
${SKY_GLSL}
${WATER_GLSL}
uniform vec3 uBody;
uniform float uSunStrength;
uniform sampler2D uReflect;
varying vec3 vWorld;
varying vec4 vProj;
void main() {
  vec3 N = waterNormal(vWorld.xz);
  vec3 V = normalize(vWorld - cameraPosition);
  vec3 R = reflect(V, N);
  R.y = abs(R.y);
  float cosT = clamp(dot(-V, N), 0.0, 1.0);
  float F = 0.1 + 0.78 * pow(1.0 - cosT, 4.0);
  // Glitter: four interfering short waves in odd directions (no grid artefacts).
  vec2 gp = vWorld.xz;
  vec2 gg = cos(dot(gp, vec2(33.9, 14.4)) + uTime * 1.7) * vec2(33.9, 14.4);
  gg += cos(dot(gp, vec2(-17.3, 50.1)) - uTime * 1.3) * vec2(-17.3, 50.1);
  gg += cos(dot(gp, vec2(-22.2, -19.6)) + uTime * 2.1) * vec2(-22.2, -19.6);
  gg += cos(dot(gp, vec2(58.0, -14.2)) - uTime * 1.1) * vec2(58.0, -14.2);
  vec3 Ng = normalize(N + vec3(gg.x, 0.0, gg.y) * 0.0011);
  vec3 Rg = reflect(V, Ng);
  float glint = pow(max(dot(Rg, uSunDir), 0.0), 900.0) * 2.4 * uSunStrength + pow(max(dot(R, uSunDir), 0.0), 90.0) * 0.08 * uSunStrength;
  float ridge = clamp(length(N.xz) * 7.0 - 0.05, 0.0, 1.0);
#if defined(MODE_BASE)
  gl_FragColor = vec4(skyColor(R), 1.0);
#elif defined(MODE_FILM)
  float a = 1.0 - F;
  vec3 col = uBody;
  float sheen = ridge * 0.6;
  col = mix(col, skyColor(R) * 1.05, sheen);
  a = max(a, sheen);
  float g = clamp(glint, 0.0, 1.0);
  col = mix(col, uSunColor * 2.5, g);
  a = max(a, g);
  gl_FragColor = vec4(col, a);
#else
  vec2 uv = vProj.xy / vProj.w + N.xz * 0.12;
  vec3 refl = texture2D(uReflect, uv).rgb;
  vec3 col = mix(uBody, refl, F) + skyColor(R) * ridge * 0.25 + uSunColor * glint;
  gl_FragColor = vec4(col, 1.0);
#endif
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface SkyUniforms {
  [k: string]: { value: unknown };
  uZenith: { value: Color };
  uMid: { value: Color };
  uHorizon: { value: Color };
  uSunColor: { value: Color };
  uSunDir: { value: Vector3 };
}

export interface WaterUniforms extends SkyUniforms {
  uTime: { value: number };
  uSwanA: { value: Vector4 };
  uSwanB: { value: Vector4 };
  uWake: { value: Vector2 };
  uBody: { value: Color };
  uSunStrength: { value: number };
  uReflect: { value: Texture | null };
  uTexMatrix: { value: Matrix4 };
}

export function skyUniforms(c: { zenith: string; mid: string; horizon: string; sun: string }, sunDir: Vector3): SkyUniforms {
  return {
    uZenith: { value: new Color(c.zenith) },
    uMid: { value: new Color(c.mid) },
    uHorizon: { value: new Color(c.horizon) },
    uSunColor: { value: new Color(c.sun) },
    uSunDir: { value: sunDir.clone().normalize() },
  };
}

export function waterUniforms(sky: SkyUniforms, body: string): WaterUniforms {
  return {
    ...sky,
    uTime: { value: 0 },
    uSwanA: { value: new Vector4(-3, -1.5, 1, 0) },
    uSwanB: { value: new Vector4(3, -1.5, -1, 0) },
    uWake: { value: new Vector2(0, 0) },
    uBody: { value: new Color(body) },
    uSunStrength: { value: 0.6 },
    uReflect: { value: null },
    uTexMatrix: { value: new Matrix4() },
  };
}
