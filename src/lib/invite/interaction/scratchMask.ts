import {
  AdditiveBlending,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type MeshStandardMaterial,
  type Vector2,
  type WebGLRenderer,
} from 'three';
import { Coverage } from './coverage';

/**
 * Scratch-to-reveal on a 3D mesh: brush strokes are painted into a render-target mask at the
 * UVs the pointer hits, and the foil material hides wherever the mask is white.
 *
 *   const mask = new ScratchMask(); mask.init(gl);
 *   applyScratchMask(foilMaterial, mask);           // once
 *   onPointerMove={(e) => mask.paint(gl, e.uv!, 0.08)}
 *   if (mask.coverage.ratio > 0.55) reveal();
 */
export class ScratchMask {
  readonly target: WebGLRenderTarget;
  readonly coverage = new Coverage(24, 12);
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private brush: Mesh<PlaneGeometry, ShaderMaterial>;

  constructor(width = 512, height = 256) {
    this.target = new WebGLRenderTarget(width, height, { depthBuffer: false });
    this.brush = new Mesh(
      new PlaneGeometry(1, 1),
      new ShaderMaterial({
        transparent: true,
        depthTest: false,
        blending: AdditiveBlending,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.55, d); gl_FragColor = vec4(vec3(a), a); }',
      }),
    );
    this.scene.add(this.brush);
  }

  get aspect() {
    return this.target.width / this.target.height;
  }

  /** Clears the mask (nothing scratched yet). Call once the renderer exists. */
  init(gl: WebGLRenderer) {
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(this.target);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.setRenderTarget(prev);
    this.coverage.reset();
  }

  /** uv in 0..1 (three.js convention, v up); radius relative to the surface width. */
  paint(gl: WebGLRenderer, uv: Vector2, radius: number) {
    this.brush.position.set(uv.x * 2 - 1, uv.y * 2 - 1, 0);
    this.brush.scale.set(radius * 4, radius * 4 * this.aspect, 1);
    const prevTarget = gl.getRenderTarget();
    const prevAuto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(this.target);
    gl.render(this.scene, this.camera);
    gl.setRenderTarget(prevTarget);
    gl.autoClear = prevAuto;
    this.coverage.paint(uv.x, 1 - uv.y, radius, this.aspect);
  }

  dispose() {
    this.target.dispose();
    this.brush.geometry.dispose();
    this.brush.material.dispose();
  }
}

/** Makes a standard (PBR) foil material transparent where the mask has been scratched. */
export function applyScratchMask(material: MeshStandardMaterial, mask: ScratchMask) {
  material.alphaMap = mask.target.texture;
  material.transparent = true;
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <alphamap_fragment>',
      'diffuseColor.a *= 1.0 - texture2D( alphaMap, vAlphaMapUv ).g;',
    );
  };
  material.needsUpdate = true;
}
