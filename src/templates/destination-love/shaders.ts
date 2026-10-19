/**
 * GLSL for the ivory-and-gold globe. Everything is lit by one world-space light direction
 * (uLight) so the porcelain, the gold beads, the dusk line and the halo all agree; tone mapping
 * and colour space come from three's chunks, so the low tier (renderer tone mapping) and the
 * composer tiers look the same.
 */
const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/** The porcelain sphere: soft wrap light, warm shade at the dusk line, emerald night, faint graticule, rim. */
export const GLOBE_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vL;
  void main() {
    vL = position;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const GLOBE_FRAG = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uDay;
  uniform vec3 uShade;
  uniform vec3 uNight;
  uniform vec3 uRim;
  uniform vec3 uGrat;
  uniform float uGratK;
  uniform float uRimK;
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vL;

  float gridLine(float v, float stepDeg) {
    float f = abs(fract(v / stepDeg + 0.5) - 0.5) * stepDeg;
    float w = max(fwidth(v), 1e-4) * 0.85;
    return 1.0 - smoothstep(0.0, w, f);
  }

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    float ndl = dot(N, uLight);
    float day = smoothstep(-0.2, 0.38, ndl);
    float wrap = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
    vec3 lit = mix(uShade, uDay, smoothstep(0.02, 0.62, ndl)) * (0.7 + 0.2 * wrap);
    vec3 col = mix(uNight, lit, day);
    float spec = pow(max(dot(N, normalize(uLight + V)), 0.0), 34.0) * day;
    col += vec3(1.0, 0.96, 0.88) * spec * 0.1;

    vec3 p = normalize(vL);
    float lat = degrees(asin(clamp(p.y, -1.0, 1.0)));
    float lon = degrees(atan(p.x, p.z));
    float g = max(gridLine(lat, 15.0), gridLine(lon, 15.0) * (1.0 - smoothstep(72.0, 86.0, abs(lat))));
    col = mix(col, uGrat * mix(0.9, 1.25, 1.0 - day), g * uGratK * mix(1.0, 0.55, 1.0 - day));

    float fr = pow(1.0 - max(dot(N, V), 0.0), 2.4);
    col += uRim * fr * uRimK * (0.3 + 0.7 * smoothstep(-0.45, 0.5, ndl));
    gl_FragColor = vec4(col, 1.0);
    ${OUTPUT}
  }
`;

/**
 * Land dots: one instanced quad per dot, laid flat on the sphere. Gold beads on the day side;
 * on the night side they glow like city lights. Dots near the wedding city brighten with uCityK.
 */
export const DOTS_VERT = /* glsl */ `
  attribute vec3 aPos;
  attribute float aSeed;
  uniform float uRadius;
  uniform float uSize;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  varying float vSeed;
  void main() {
    vec3 n = aPos;
    vec3 up = abs(n.y) > 0.995 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 t = normalize(cross(up, n));
    vec3 b = cross(n, t);
    vec3 p = n * uRadius + (t * position.x + b * position.y) * uSize;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vN = normalize(mat3(modelMatrix) * n);
    vW = w.xyz;
    vUv = position.xy * 2.0;
    vSeed = aSeed;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const DOTS_FRAG = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uGold;
  uniform vec3 uGoldHi;
  uniform vec3 uNightGlow;
  uniform vec3 uCity;
  uniform vec3 uCityPos;
  uniform float uCityK;
  uniform float uTime;
  uniform float uTwinkle;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  varying float vSeed;
  void main() {
    float r = length(vUv);
    float aa = max(fwidth(r), 1e-3);
    float a = 1.0 - smoothstep(1.0 - aa * 1.5, 1.0, r);
    if (a <= 0.002) discard;
    vec3 N = normalize(vN);
    float ndl = dot(N, uLight);
    float day = smoothstep(-0.16, 0.32, ndl);
    float dome = sqrt(max(0.0, 1.0 - r * r));
    float hl = pow(max(0.0, 1.0 - length(vUv - vec2(-0.3, 0.32)) * 1.2), 3.0);
    vec3 dayCol = uGold * (0.66 + 0.3 * max(ndl, 0.0)) * (0.9 + 0.1 * dome) + uGoldHi * hl * 0.22;
    float tw = 1.0 + 0.3 * sin(uTime * 1.6 + vSeed * 43.0) * uTwinkle;
    vec3 nightCol = uNightGlow * tw * (0.5 + 0.5 * dome);
    vec3 col = mix(nightCol, dayCol, day);
    float cd = distance(vW, uCityPos);
    col += uCity * uCityK * exp(-cd * cd * 9.0) * 1.4;
    gl_FragColor = vec4(col, a);
    ${OUTPUT}
  }
`;

/** Analytic halo: brightness from how close each view ray passes the limb (works inside the shell too). */
export const ATMO_VERT = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const ATMO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLight;
  uniform float uR;
  uniform float uThick;
  uniform float uK;
  varying vec3 vW;
  void main() {
    vec3 C = cameraPosition;
    vec3 d = normalize(vW - C);
    vec3 oc = -C;
    float tca = max(dot(oc, d), 0.0);
    vec3 P = C + d * tca;
    float dist = length(P);
    float x = (dist - uR) / uThick;
    if (x < 0.0) discard;
    float glow = exp(-x * 5.0) * (1.0 - smoothstep(0.7, 1.0, x));
    float sun = 0.28 + 0.72 * smoothstep(-0.55, 0.6, dot(normalize(P), uLight));
    vec3 col = uColor * glow * sun * uK;
    gl_FragColor = vec4(col, 1.0);
    ${OUTPUT}
  }
`;

/**
 * The gold trail: a screen-facing ribbon along the arc, drawn up to the plane (uHead). A bright
 * core, a deeper gold edge (so it reads on ivory too) and, on medium/high, a soft glow; a slow
 * shimmer runs along it.
 */
export const TRAIL_VERT = /* glsl */ `
  attribute vec3 aTangent;
  attribute float aSide;
  attribute float aS;
  uniform float uWidth;
  uniform float uPixel;
  uniform float uMinPx;
  uniform float uMaxPx;
  varying float vSide;
  varying float vS;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 t = normalize((modelViewMatrix * vec4(aTangent, 0.0)).xyz);
    vec3 side = normalize(cross(t, normalize(mv.xyz)));
    float px = uPixel * -mv.z;
    float w = clamp(uWidth, uMinPx * px, uMaxPx * px);
    mv.xyz += side * aSide * w;
    vSide = aSide;
    vS = aS;
    gl_Position = projectionMatrix * mv;
  }
`;

export const TRAIL_FRAG = /* glsl */ `
  uniform float uHead;
  uniform float uTail;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uGlow;
  uniform vec3 uColor;
  uniform vec3 uEdge;
  uniform vec3 uCore;
  varying float vSide;
  varying float vS;
  void main() {
    if (vS > uHead) discard;
    float x = abs(vSide);
    float core = exp(-x * x * 22.0);
    float edge = smoothstep(0.62, 0.32, x);
    float glow = exp(-x * x * 3.2) * uGlow;
    float age = uHead - vS;
    float head = exp(-age * 18.0);
    float shimmer = 0.82 + 0.18 * sin(vS * 140.0 - uTime * 4.0);
    float tail = smoothstep(0.0, max(uTail, 1e-4), vS);
    vec3 col = mix(uEdge, uColor, smoothstep(0.5, 0.1, x));
    col = mix(col, uCore, core * 0.7) * shimmer * (1.0 + head * 0.8);
    float a = max(edge, glow * 0.45) * tail * uOpacity;
    gl_FragColor = vec4(col, a);
    ${OUTPUT}
  }
`;

/** Cloud wisps: instanced billboards with a soft procedural texture; they fade near the lens and far away. */
export const CLOUD_VERT = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec3 aData; // scale, rotation, alpha
  uniform float uK;
  varying vec2 vUv;
  varying float vA;
  varying float vShade;
  void main() {
    vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
    float c = cos(aData.y);
    float s = sin(aData.y);
    vec2 q = mat2(c, s, -s, c) * (position.xy * vec2(1.9, 1.0)) * aData.x;
    mv.xy += q;
    float dist = -mv.z;
    vA = aData.z * uK * smoothstep(0.12, 0.45, dist) * (1.0 - smoothstep(1.4, 2.6, dist));
    vUv = position.xy + 0.5;
    vShade = position.y + 0.5;
    gl_Position = projectionMatrix * mv;
  }
`;

export const CLOUD_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform vec3 uShadow;
  varying vec2 vUv;
  varying float vA;
  varying float vShade;
  void main() {
    float a = texture2D(uMap, vUv).a * vA;
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(uShadow, uColor, smoothstep(0.1, 0.85, vShade)), a);
    ${OUTPUT}
  }
`;

/** Stars: tiny gold-ivory points that breathe (still in capture mode). */
export const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uTw;
  uniform float uPx;
  varying float vA;
  varying float vSeed;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPx;
    vA = 0.7 + 0.3 * sin(uTime * (0.5 + aSeed * 1.3) + aSeed * 31.0) * uTw;
    vSeed = aSeed;
  }
`;

export const STAR_FRAG = /* glsl */ `
  uniform vec3 uA;
  uniform vec3 uB;
  varying float vA;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vA;
    gl_FragColor = vec4(mix(uA, uB, vSeed), a);
    ${OUTPUT}
  }
`;

/** A flat map marker on the surface: gold dot, ring and expanding ripples. */
export const MARKER_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const MARKER_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHalo;
  uniform float uTime;
  uniform float uPulse;
  uniform float uOpacity;
  uniform float uGlow;
  varying vec2 vUv;
  void main() {
    float r = length(vUv);
    float aa = max(fwidth(r), 1e-3);
    float dotK = 1.0 - smoothstep(0.12 - aa, 0.12 + aa, r);
    float ring = 1.0 - smoothstep(0.018, 0.018 + aa * 1.5, abs(r - 0.27));
    float rip = 0.0;
    for (int k = 0; k < 2; k++) {
      float ph = fract(uTime * 0.5 + float(k) * 0.5);
      rip += (1.0 - ph) * (1.0 - ph) * (1.0 - smoothstep(0.014, 0.014 + aa * 2.0, abs(r - (0.22 + ph * 0.74))));
    }
    float glow = exp(-r * r * 6.0) * uGlow;
    float a = max(max(dotK, ring * 0.92), rip * uPulse * 0.85);
    vec3 col = mix(uHalo, uColor, a);
    a = max(a, glow * 0.55) * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(col * (1.0 + glow * 0.6), a);
    ${OUTPUT}
  }
`;
