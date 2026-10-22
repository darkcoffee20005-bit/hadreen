import { Color, ShaderMaterial, Vector2, Vector4 } from 'three';

/**
 * Two hand-made surfaces, drawn in the shader so nothing is downloaded and nothing pixelates:
 *  - the wall: olive paint laid on with a broad brush (long directional strokes, bristle streaks,
 *    paler sweeps and a breath of gold), drifting very slowly;
 *  - the card: cotton paper with a fine grain and a double gold rule inset from its edge, drawn
 *    in the card's own physical units so it stays crisp while the card grows to fill the screen.
 */

const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
`;

export interface WallColors {
  dark: string;
  base: string;
  light: string;
  cream: string;
  gold: string;
}

export function wallMaterial(c: WallColors) {
  const uniforms = {
    uDark: { value: new Color(c.dark) },
    uBase: { value: new Color(c.base) },
    uLight: { value: new Color(c.light) },
    uCream: { value: new Color(c.cream) },
    uGold: { value: new Color(c.gold) },
    uTime: { value: 0 },
    /** xy: the point the camera looks at; zw: half the visible width and height there. */
    uView: { value: new Vector4(0, 0, 2, 3.5) },
  };
  return new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vP = w.xy;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uDark, uBase, uLight, uCream, uGold;
      uniform float uTime;
      uniform vec4 uView;
      varying vec2 vP;
      ${NOISE}
      void main() {
        vec2 p = vP * 0.42 + vec2(uTime * 0.006, uTime * 0.002);
        // Each region of the wall has its own brush direction.
        float ang = 0.62 + 0.9 * (fbm(p * 0.3 + 4.0) - 0.5);
        vec2 q = rot(p, ang);
        float strokes = fbm(vec2(q.x * 0.55, q.y * 3.6));
        float bristle = fbm(vec2(q.x * 1.4, q.y * 16.0) + 7.3);
        float body = fbm(p * 0.7 + 3.1);
        vec3 col = mix(uDark, uBase, smoothstep(0.22, 0.62, body));
        col = mix(col, uLight, smoothstep(0.48, 0.82, strokes) * 0.62);
        col = mix(col, uCream, smoothstep(0.74, 0.98, strokes * 0.65 + bristle * 0.4) * 0.22);
        col *= 0.94 + 0.12 * bristle;
        // A breath of gold, sweeping across the upper wall.
        float g = smoothstep(0.6, 0.86, fbm(rot(p, 0.95) * vec2(0.45, 3.2) + 11.0));
        g *= smoothstep(-0.6, 0.8, (vP.y - uView.y) / uView.w);
        col = mix(col, uGold, g * 0.32);
        // Soft vignette around what the camera sees.
        vec2 s = (vP - uView.xy) / uView.zw;
        col *= 1.0 - 0.22 * smoothstep(0.55, 1.35, length(s * vec2(0.85, 1.0)));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }) as ShaderMaterial & { uniforms: typeof uniforms };
}

export interface PaperColors {
  paper: string;
  gold: string;
}

export function cardMaterial(c: PaperColors) {
  const uniforms = {
    uPaper: { value: new Color(c.paper) },
    uGold: { value: new Color(c.gold) },
    /** The card's size in world units right now (it grows while it flies). */
    uSize: { value: new Vector2(2, 1.4) },
    /** 0..1 the gold rule. */
    uBorder: { value: 0 },
    /** Raking light across the face (−1..1), from the tilt. */
    uLight: { value: new Vector2(0, 0) },
  };
  return new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uPaper, uGold;
      uniform vec2 uSize, uLight;
      uniform float uBorder;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 P = (vUv - 0.5) * uSize;
        float m = min(uSize.x, uSize.y);
        vec2 G = P / m; // grain in the card's own proportions
        float grain = 0.6 * noise(G * 240.0) + 0.4 * fbm(G * 14.0);
        vec3 col = uPaper * (0.965 + 0.05 * grain);
        // Light from the upper left, moving a little with the tilt.
        vec2 n = P / (0.5 * uSize);
        col *= 1.0 + 0.035 * dot(n, vec2(-0.6, 0.8) + uLight * 0.6);
        // Edges a touch deeper, like the bevel of thick card.
        vec2 e2 = 0.5 * uSize - abs(P);
        float edge = min(e2.x, e2.y);
        col *= mix(0.93, 1.0, smoothstep(0.0, 0.05 * m, edge));
        // Double gold rule.
        float aa = fwidth(edge) * 1.25;
        float a = 0.05 * m;
        float b = 0.066 * m;
        float l1 = 1.0 - smoothstep(max(0.0026 * m, aa) * 0.5, max(0.0026 * m, aa) * 0.5 + aa, abs(edge - a));
        float l2 = 1.0 - smoothstep(max(0.0012 * m, aa) * 0.5, max(0.0012 * m, aa) * 0.5 + aa, abs(edge - b));
        vec3 gold = uGold * (0.85 + 0.3 * noise(G * 90.0));
        col = mix(col, gold, (l1 * 0.95 + l2 * 0.75) * uBorder);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }) as ShaderMaterial & { uniforms: typeof uniforms };
}
