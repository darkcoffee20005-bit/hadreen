import { Color, type Material } from 'three';

/**
 * Small shader patches for stock three.js materials:
 *  - haze: aerial perspective measured from the arch plane (world z), so the mosque and the
 *    garden sink into golden haze the same way from every camera position;
 *  - sweep: a band of light that travels along gilded edges (the gate's idle glint).
 */
export interface HazeOptions {
  color: string;
  /** World depth (−z) where haze starts and where it reaches `max`. */
  near: number;
  far: number;
  max?: number;
}

export interface SweepUniforms {
  uSweep: { value: number };
  uSweepColor: { value: Color };
}

export function sweepUniforms(color: string): SweepUniforms {
  return { uSweep: { value: -10 }, uSweepColor: { value: new Color(color) } };
}

export function patchMaterial<M extends Material>(material: M, opts: { haze?: HazeOptions; sweep?: SweepUniforms }): M {
  const { haze, sweep } = opts;
  const hazeUniforms = haze
    ? {
        uHazeColor: { value: new Color(haze.color) },
        uHazeNear: { value: haze.near },
        uHazeFar: { value: haze.far },
        uHazeMax: { value: haze.max ?? 1 },
      }
    : null;
  material.onBeforeCompile = (shader) => {
    if (hazeUniforms) Object.assign(shader.uniforms, hazeUniforms);
    if (sweep) Object.assign(shader.uniforms, sweep);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRgWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 rgw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            rgw = instanceMatrix * rgw;
          #endif
          vRgWorld = (modelMatrix * rgw).xyz;
        }`,
      );
    let head = 'varying vec3 vRgWorld;\n';
    if (hazeUniforms) head += 'uniform vec3 uHazeColor; uniform float uHazeNear; uniform float uHazeFar; uniform float uHazeMax;\n';
    if (sweep) head += 'uniform float uSweep; uniform vec3 uSweepColor;\n';
    let frag = shader.fragmentShader.replace('#include <common>', `#include <common>\n${head}`);
    if (sweep) {
      frag = frag.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          float d = (vRgWorld.x * 0.8 + vRgWorld.y) - uSweep;
          totalEmissiveRadiance += uSweepColor * exp(-d * d * 18.0);
        }`,
      );
    }
    if (hazeUniforms) {
      frag = frag.replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        {
          float hz = clamp((-vRgWorld.z - uHazeNear) / (uHazeFar - uHazeNear), 0.0, 1.0);
          hz = (1.0 - exp(-hz * 2.2)) / (1.0 - exp(-2.2));
          // Thicker near the ground.
          hz = min(1.0, hz * (1.0 + 0.35 * (1.0 - smoothstep(0.0, 6.0, vRgWorld.y))));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, hz * uHazeMax);
        }`,
      );
    }
    shader.fragmentShader = frag;
  };
  const key = `rg:${haze ? 'h' : ''}${sweep ? 's' : ''}`;
  material.customProgramCacheKey = () => key;
  return material;
}
