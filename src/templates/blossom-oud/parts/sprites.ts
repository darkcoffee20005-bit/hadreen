import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, ShaderMaterial, type Texture } from 'three';

/**
 * Screen-facing additive sprites (crystal sparkles, candle and lantern halos). Each point has a
 * size (world units), a phase and an intensity; `uMode` picks the animation: 0 = twinkle (sharp,
 * occasional flashes), 1 = flicker (a flame's breathing). Sizes are in world units so they scale
 * with distance. Reads without bloom (low tier).
 */
export function spriteMaterial(map: Texture, color: string, mode: 0 | 1): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uMap: { value: map }, uColor: { value: new Color(color) }, uTime: { value: 0 }, uK: { value: 1 }, uViewH: { value: 800 }, uMode: { value: mode } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aPhase; attribute float aK;
      uniform float uTime; uniform float uViewH; uniform float uMode; uniform float uK;
      varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw;
        if (uMode < 0.5) {
          float w = 0.5 + 0.5 * sin(uTime * (1.3 + fract(aPhase * 7.13)) + aPhase * 6.2831);
          tw = 0.12 + pow(clamp(w, 0.0, 1.0), 18.0) * 1.4;
        } else {
          tw = 0.86 + 0.08 * sin(uTime * 7.3 + aPhase * 12.9) + 0.06 * sin(uTime * 13.1 + aPhase * 78.2);
        }
        vA = tw * aK * uK;
        gl_PointSize = max(0.0, aSize * tw * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform vec3 uColor; varying float vA;
      void main(){
        float a = texture2D(uMap, gl_PointCoord).a * vA;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    fog: false,
  });
}

export function spriteGeometry(points: { p: [number, number, number]; size: number; phase: number; k?: number }[]): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(points.flatMap((q) => q.p), 3));
  g.setAttribute('aSize', new Float32BufferAttribute(points.map((q) => q.size), 1));
  g.setAttribute('aPhase', new Float32BufferAttribute(points.map((q) => q.phase), 1));
  g.setAttribute('aK', new Float32BufferAttribute(points.map((q) => q.k ?? 1), 1));
  return g;
}
