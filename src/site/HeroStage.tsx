'use client';

import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import { Canvas, createPortal, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  CanvasTexture,
  HalfFloatType,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  ShapeGeometry,
  Shape,
  Vector3,
  SRGBColorSpace,
  WebGLRenderTarget,
  type Group,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type Texture,
} from 'three';
import { setHapticsEnabled } from '@/lib/invite/interaction/haptics';
import { mixHex, shadeHex } from '@/lib/invite/stage/color';
import { createMiniStore, InviteStoreContext } from '@/lib/invite/machine';
import { TIER_SETTINGS, type Tier } from '@/lib/invite/quality/tiers';
import type { SceneProps, SceneView } from '@/lib/invite/scene-types';
import type { TemplateMeta } from '@/lib/invite/types';
import { PUBLIC_TEMPLATES } from '@/templates';
import { SCENE_LOADERS } from '@/templates/scenes';
import { heroStore, useHero } from './hero-store';
import { playSting } from './sting';

/** Thumbnail resolution (a phone screen at a quarter scale). */
const W = 300;
const H = 600;
const CARD_W = 1.5;
const CARD_H = 3;
const STEP = (Math.PI * 2) / PUBLIC_TEMPLATES.length;

interface MiniTarget {
  scene: Scene;
  camera: PerspectiveCamera;
  target: WebGLRenderTarget;
}

/**
 * The hero carousel: the designs as floating cards in emerald-and-gold space. Each card is a
 * live, low-tier render of its template (its own scene, store and camera, rendered into a texture
 * round-robin — the front card most often). On the low tier the cards show painted posters.
 */
export default function HeroStage({ views, tier, visible }: { views: SceneView[]; tier: Tier; visible: boolean }) {
  const live = tier !== 'low';
  useEffect(() => {
    setHapticsEnabled(false); // the thumbnails' openings must never buzz the visitor's phone
    return () => setHapticsEnabled(true);
  }, []);
  return (
    <Canvas
      aria-hidden="true"
      className="!absolute inset-0"
      dpr={[1, Math.min(TIER_SETTINGS[tier].dpr, 2)]}
      frameloop={visible ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping }}
      camera={{ fov: 32, position: [0, 0, 10], near: 0.1, far: 60 }}
    >
      <Carousel views={views} live={live} tier={tier} />
    </Canvas>
  );
}

function Carousel({ views, live, tier }: { views: SceneView[]; live: boolean; tier: Tier }) {
  const ring = useRef<Group>(null);
  const minis = useRef<(MiniTarget | null)[]>([]);
  const frame = useRef(0);
  const drag = useRef({ active: false, startX: 0, offset: 0, moved: 0 });
  const angle = useRef(0);
  const dragged = useRef(() => drag.current.moved > 8);
  const size = useThree((s) => s.size);
  // Phones give the carousel its own band; desktops give it the left of a wide hero.
  const wide = size.width > size.height * 1.3;
  const active = useHero((s) => s.active);
  // Mount thumbnails one at a time (front card first) so the page never stalls on all the scenes.
  const [mounted, setMounted] = useState(0);
  useEffect(() => {
    if (!live || mounted >= views.length) return;
    const id = setTimeout(() => setMounted((m) => m + 1), mounted === 0 ? 0 : 700);
    return () => clearTimeout(id);
  }, [live, mounted, views.length]);

  // Drag anywhere on the canvas turns the ring (it follows the finger); release snaps to a card.
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = { active: true, startX: e.clientX, offset: 0, moved: 0 };
    };
    const move = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      drag.current.offset = (dx / Math.max(320, el.clientWidth)) * Math.PI * 1.4;
      drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
    };
    const up = () => {
      if (!drag.current.active) return;
      const { offset, moved } = drag.current;
      drag.current.active = false;
      if (moved > 8) {
        const s = heroStore.getState();
        const steps = Math.round(offset / STEP);
        if (steps !== 0) s.setActive(s.active + steps);
        else s.setActive(s.active); // counts as a touch
      }
      drag.current.offset = 0;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.style.touchAction = 'pan-y';
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  // Bring a sting with each new front card the visitor chose.
  const lastActive = useRef(active);
  useEffect(() => {
    if (active !== lastActive.current && performance.now() - heroStore.getState().touchedAt < 400) playSting(active);
    lastActive.current = active;
  }, [active]);

  useFrame((state, delta) => {
    const g = ring.current;
    if (!g) return;
    // Index i sits at angle -i·STEP, so the next design enters from the left (RTL reading order).
    const target = heroStore.getState().active * STEP + drag.current.offset;
    let diff = target - angle.current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    angle.current += diff * Math.min(1, delta * (drag.current.active ? 14 : 4.5));
    const scroll = typeof window === 'undefined' ? 0 : Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
    g.rotation.y = angle.current + scroll * STEP * 0.8;
    g.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.04;

    // Live thumbnails: the front card every other frame, the rest round-robin.
    const list = minis.current;
    if (list.some(Boolean)) {
      frame.current += 1;
      const front = heroStore.getState().active;
      const others = list.map((_, i) => i).filter((i) => i !== front && list[i]);
      const pick = frame.current % 2 === 0 || others.length === 0 ? front : others[(frame.current >> 1) % others.length]!;
      const m = list[pick];
      if (m) {
        // Thumbnails are opaque: clear with alpha 1 (the hero canvas itself is transparent, and
        // a transparent clear would let the emerald page show through the scene).
        state.gl.setClearAlpha(1);
        state.gl.setRenderTarget(m.target);
        state.gl.render(m.scene, m.camera);
        state.gl.setClearAlpha(0);
      }
    }
    state.gl.setRenderTarget(null);
    state.gl.render(state.scene, state.camera);
  }, 1);

  const radius = wide ? 2.9 : 2.3;
  const offsetX = wide ? -1.9 : 0; // RTL: the text sits on the right, the ring on the left
  const scale = wide ? 0.8 : 1.2;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 6]} intensity={1.4} color="#fff4dc" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#f3e3bc" position={[0, 4, 3]} scale={[8, 1.4, 1]} />
        <Lightformer form="ring" intensity={1.5} color="#c9a96e" position={[-4, 0, 3]} scale={3} />
        <Lightformer form="rect" intensity={0.8} color="#1a6a50" position={[4, -1, 2]} rotation-y={-Math.PI / 3} scale={[4, 6, 1]} />
      </Environment>
      <Sparkles count={tier === 'high' ? 160 : 90} scale={[12, 7, 6]} size={2.4} speed={0.2} opacity={0.6} color="#e8cc8c" noise={0.8} />
      <group position={[offsetX, 0, 0]} scale={scale}>
        <FrontGlow />
        <group ref={ring}>
          {PUBLIC_TEMPLATES.map((t, i) => {
            const view = views.find((v) => v.templateId === t.id);
            const a = -i * STEP;
            return (
              <group key={t.id} position={[Math.sin(a) * radius, 0, Math.cos(a) * radius]} rotation-y={a}>
                <Card template={t} index={i} view={live && view && i < mounted ? view : null} tier={tier} minis={minis} dragged={dragged} />
              </group>
            );
          })}
        </group>
      </group>
    </>
  );
}

function FrontGlow() {
  const texture = useMemo(() => radialTexture('rgba(232,204,140,0.55)'), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 0, 0.6]} renderOrder={-1}>
      <planeGeometry args={[5, 6]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Card({
  template,
  index,
  view,
  tier,
  minis,
  dragged,
}: {
  template: TemplateMeta;
  index: number;
  view: SceneView | null;
  tier: Tier;
  minis: React.RefObject<(MiniTarget | null)[]>;
  dragged: React.RefObject<() => boolean>;
}) {
  const screen = useMemo(() => roundedRect(CARD_W, CARD_H, 0.12), []);
  const frame = useMemo(() => roundedRect(CARD_W + 0.08, CARD_H + 0.08, 0.15), []);
  const poster = useMemo(() => posterTexture(template), [template]);
  const material = useRef<MeshBasicMaterial>(null);
  const frameMaterial = useRef<MeshStandardMaterial>(null);
  const group = useRef<Group>(null);
  const [live, setLive] = useState<Texture | null>(null);
  const facing = useMemo(() => new Vector3(), []);

  // Cards turned away fade, so the side cards never fight the headline for attention.
  useFrame(() => {
    if (!group.current || !material.current || !frameMaterial.current) return;
    const f = Math.max(0, group.current.getWorldDirection(facing).z);
    const o = 0.18 + 0.82 * f * f;
    material.current.opacity = o;
    frameMaterial.current.opacity = o;
  });
  useEffect(
    () => () => {
      screen.dispose();
      frame.dispose();
      poster.dispose();
    },
    [screen, frame, poster],
  );

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!dragged.current()) heroStore.getState().setActive(index);
  };

  return (
    <group ref={group}>
      <mesh geometry={frame} position-z={-0.01}>
        <meshStandardMaterial ref={frameMaterial} color="#c9a96e" metalness={0.9} roughness={0.32} emissive="#7a5c26" emissiveIntensity={0.25} transparent />
      </mesh>
      <mesh geometry={screen} onClick={onClick}>
        <meshBasicMaterial ref={material} map={live ?? poster} toneMapped={Boolean(live)} transparent />
      </mesh>
      {view && <MiniScreen view={view} index={index} tier={tier} minis={minis} onLive={setLive} />}
    </group>
  );
}

/** One template running in its own portal scene, rendered into a texture by the carousel. */
function MiniScreen({
  view,
  index,
  tier,
  minis,
  onLive,
}: {
  view: SceneView;
  index: number;
  tier: Tier;
  minis: React.RefObject<(MiniTarget | null)[]>;
  onLive: (t: Texture | null) => void;
}) {
  const [Comp, setComp] = useState<ComponentType<SceneProps> | null>(null);
  const mini = useMemo(() => createMiniStore(tier === 'high' ? 'medium' : 'low', { delay: 300 + index * 900 }), [tier, index]);
  const target = useMemo(() => new WebGLRenderTarget(W, H, { type: HalfFloatType, depthBuffer: true }), []);
  const portal = useMemo(() => new Scene(), []);
  const camera = useMemo(() => {
    const c = new PerspectiveCamera(35, W / H, 0.05, 200);
    c.position.set(0, 0, 6);
    return c;
  }, []);

  useEffect(() => {
    let cancelled = false;
    SCENE_LOADERS[view.templateId]()
      .then((m) => !cancelled && setComp(() => m.default))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [view.templateId]);

  useEffect(() => {
    const list = minis.current;
    list[index] = { scene: portal, camera, target };
    // Show the live texture once the scene has its assets, text and shaders.
    const check = () => {
      const p = mini.store.getState().progress;
      if (p.assets >= 1 && p.fonts >= 1 && p.shaders >= 1) {
        onLive(target.texture);
        return true;
      }
      return false;
    };
    const unsubscribe = check() ? () => undefined : mini.store.subscribe(() => check() && unsubscribe());
    return () => {
      unsubscribe();
      list[index] = null;
      onLive(null);
    };
  }, [mini, portal, camera, target, minis, index, onLive]);

  useEffect(
    () => () => {
      mini.dispose();
      target.dispose();
    },
    [mini, target],
  );

  if (!Comp) return null;
  return createPortal(
    <InviteStoreContext.Provider value={mini.store}>
      <Suspense fallback={null}>
        <Comp view={view} />
      </Suspense>
    </InviteStoreContext.Provider>,
    portal,
    { camera, size: { width: W, height: H, top: 0, left: 0 } },
  );
}

function roundedRect(w: number, h: number, r: number): ShapeGeometry {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new ShapeGeometry(s, 8);
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

function radialTexture(color: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** A painted poster in the design's colours with its name, shown until (or instead of) the live render. */
function posterTexture(t: TemplateMeta): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = W * 2;
  c.height = H * 2;
  const ctx = c.getContext('2d')!;
  const p = t.palette;
  const g = ctx.createRadialGradient(c.width / 2, c.height * 0.25, 10, c.width / 2, c.height * 0.4, c.height * 0.8);
  g.addColorStop(0, mixHex(p.band, p.gold, 0.3));
  g.addColorStop(0.6, p.band);
  g.addColorStop(1, shadeHex(p.band, 0.5));
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-aref').trim() || 'serif';
  const font = `700 ${Math.round(c.width * 0.13)}px ${family}`;
  const draw = () => {
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = p.gold;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, c.width - 72, c.height - 72);
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.gold;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.font = font;
    ctx.fillText(t.nameAr, c.width / 2, c.height * 0.5, c.width * 0.8);
  };
  draw();
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  // Redraw once the display face has loaded (the first draw may use the fallback).
  document.fonts
    .load(font, t.nameAr)
    .then(() => {
      draw();
      tex.needsUpdate = true;
    })
    .catch(() => undefined);
  return tex;
}
