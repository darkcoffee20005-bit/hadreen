'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { inviteDict } from '@/lib/i18n';
import { dirOf } from '@/lib/lang';
import { paletteCssVars } from '@/lib/palette';
import { FALLBACK_LOADERS, type FallbackModule } from '@/templates/fallbacks';
import { SCENE_LOADERS } from '@/templates/scenes';
import { audio } from '../audio/engine';
import { track } from '../beacon';
import { detectCapability, saveOptIn3d } from '../capability';
import { publishProbe, readCapture } from '../capture';
import { Backdrop2D } from '../fallback/Backdrop2D';
import { Gate2D, GATE_2D_OPENING_MS } from '../fallback/Gate2D';
import { haptics } from '../interaction/haptics';
import { inviteStore, totalProgress, useInvite } from '../machine';
import type { SceneProps } from '../scene-types';
import { buildSceneView } from '../scene-view';
import type { InviteView } from '../view';
import { activateTweaks } from '../lab/tweaks';
import { Gyro, MuteButton, SkipButton } from './Controls';
import { GateAction } from './GateAction';

// three.js and the renderer load only on the 3D path; 2D guests never download them.
const Stage = dynamic(() => import('../stage/Stage').then((m) => m.Stage), { ssr: false });
const LabPanel = dynamic(() => import('../lab/LabPanel'), { ssr: false });
const LabPerf = dynamic(() => import('../lab/LabPerf'), { ssr: false });

const LOADING_TIMEOUT_MS = 15_000;
const HANDOFF_MS = 800;

/**
 * Orchestrates one invitation: capability check → loading (3D) → gate → opening → hand-off →
 * content. The gate is server-rendered so it paints first; the 3D scene is a separate chunk
 * loaded behind it. The content (children) is always in the DOM.
 */
export function InviteShell({ view, lab = false, children }: { view: InviteView; lab?: boolean; children: React.ReactNode }) {
  useState(() => lab && activateTweaks());
  const t = inviteDict(view.wedding.lang);
  const sceneView = useMemo(() => buildSceneView(view), [view]);
  const template = view.template;
  const path = useInvite((s) => s.path);
  const phase = useInvite((s) => s.phase);
  const tier = useInvite((s) => s.tier);
  const reason2d = useInvite((s) => s.reason2d);
  const progress = useInvite((s) => totalProgress(s.progress));
  const capture = useInvite((s) => s.capture);
  const [Scene, setScene] = useState<ComponentType<SceneProps> | null>(null);
  const [fallback, setFallback] = useState<FallbackModule | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 1. Decide the path once, on the client.
  useEffect(() => {
    setHydrated(true);
    const store = inviteStore.getState();
    store.reset();
    store.setCapture(readCapture(window.location.search));
    let cancelled = false;
    detectCapability(window.location.search).then((cap) => {
      if (!cancelled) inviteStore.getState().choosePath(cap.path, cap.tier, cap.reason ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. 3D: load the scene chunk and prepare sound in parallel; time out to 2D.
  useEffect(() => {
    if (path === 'pending') return;
    const store = inviteStore.getState();
    void audio.prepare(view.wedding.musicTrack, (p) => store.setProgress('audio', p));
    if (path !== '3d') return;
    let cancelled = false;
    // The scene chunk and the stage (three.js) download in parallel.
    Promise.all([SCENE_LOADERS[template.id](), import('../stage/Stage')])
      .then(([mod]) => {
        if (cancelled) return;
        setScene(() => mod.default);
        store.setProgress('chunk', 1);
      })
      .catch(() => store.fallBackTo2d('chunk-failed'));
    const timeout = setTimeout(() => {
      if (inviteStore.getState().phase === 'loading') inviteStore.getState().fallBackTo2d('timeout');
    }, LOADING_TIMEOUT_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [path, template.id, view.wedding.musicTrack]);

  // 2D: the template's own CSS/SVG gate and backdrop (the generic ones stand in until it loads).
  useEffect(() => {
    if (path !== '2d') return;
    let cancelled = false;
    FALLBACK_LOADERS[template.id]()
      .then((mod) => !cancelled && setFallback(mod))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [path, template.id]);
  const openingMs2d = fallback?.OPENING_MS ?? GATE_2D_OPENING_MS;
  const Gate = fallback?.Gate2D ?? Gate2D;
  const Backdrop = fallback?.Backdrop2D ?? Backdrop2D;

  // 3. Real progress complete → gate.
  useEffect(() => {
    if (phase === 'loading' && progress >= 0.999) inviteStore.getState().completeLoading();
  }, [phase, progress]);

  // 2D opening is a CSS animation of known length.
  useEffect(() => {
    if (path !== '2d' || phase !== 'opening' || capture === 'mid') return;
    const id = setTimeout(() => inviteStore.getState().finishOpening(), openingMs2d);
    return () => clearTimeout(id);
  }, [path, phase, capture, openingMs2d]);

  // Hand-off: the gate fades, then the content takes the stage.
  useEffect(() => {
    if (phase === 'handoff') {
      track('intro_completed');
      const id = setTimeout(() => inviteStore.getState().finishHandoff(), capture ? 0 : HANDOFF_MS);
      return () => clearTimeout(id);
    }
    if (phase === 'content') {
      window.scrollTo(0, 0);
      contentRef.current?.querySelector<HTMLElement>('#invite-hero')?.focus({ preventScroll: true });
    }
  }, [phase, capture]);

  // The page can't scroll behind the gate.
  useEffect(() => {
    const locked = hydrated && phase !== 'content' && phase !== 'handoff';
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [hydrated, phase]);

  // Esc skips the opening; hidden tab silences sound.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') inviteStore.getState().skip();
    };
    const onVisibility = () => audio.setVisible(!document.hidden);
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Scroll position and interaction feed the ambient scene and the idle frame cap.
  useEffect(() => {
    if (phase !== 'content') return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const s = inviteStore.getState();
        s.setScroll(max > 0 ? window.scrollY / max : 0);
        s.touch();
      });
    };
    const onPointer = () => inviteStore.getState().touch();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      cancelAnimationFrame(raf);
    };
  }, [phase]);

  // Capture mode: drive the requested moment deterministically for screenshots and videos.
  useEffect(() => {
    if (!capture) return;
    const s = inviteStore.getState();
    let id: ReturnType<typeof setTimeout> | undefined;
    const ready = (ms: number) => (id = setTimeout(() => publishProbe({ ready: true }), ms));
    if (phase === 'gate') {
      if (capture === 'gate') ready(900);
      else s.open();
    } else if (phase === 'opening') {
      if (capture === 'mid') {
        if (s.intro) s.intro.seek(s.intro.duration * 0.55);
        ready(path === '2d' ? openingMs2d / 2 : 900);
      } else s.skip();
    } else if (phase === 'content' && capture === 'content') {
      ready(1200);
    }
    return () => clearTimeout(id);
  }, [capture, phase, path, openingMs2d]);

  useEffect(() => {
    publishProbe({ path, phase, tier, introReady: phase === 'gate' || phase === 'opening' || phase === 'handoff' || phase === 'content' });
  }, [path, phase, tier]);

  const open = () => {
    inviteStore.getState().open();
    // Sound is a bonus: a broken audio stack must never keep the invitation closed.
    try {
      audio.unlock();
      audio.startMusic();
      haptics.tap();
    } catch (err) {
      console.warn('audio unavailable', err);
    }
  };

  const gateVisible = phase !== 'content';
  const gateReady = phase === 'gate';
  const opening = phase === 'opening';
  const vars = paletteCssVars(view.palette) as React.CSSProperties;
  const header = template.gate.header ?? 'full';

  return (
    <div style={vars} dir={dirOf(view.wedding.lang)} className={`invite-lang-${view.wedding.lang}`} data-path={path} data-phase={phase}>
      {path === '3d' && Scene && (
        <Stage className="!fixed inset-0 !h-svh !w-full">
          <Scene view={sceneView} />
          {lab && <LabPerf />}
        </Stage>
      )}
      {path === '2d' && <Backdrop view={sceneView} />}

      {/* The content waits, invisible, under the gate; it rises in during the hand-off. */}
      <div
        ref={contentRef}
        className={`relative z-10 transition-[opacity,transform] duration-700 ${hydrated && phase !== 'content' && phase !== 'handoff' ? 'invisible translate-y-3 opacity-0' : 'opacity-100'}`}
        inert={hydrated && phase !== 'content' && phase !== 'handoff'}
      >
        {children}
      </div>

      {gateVisible && (
        <div
          className={`invite-gate fixed inset-0 z-30 flex flex-col items-center justify-between px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center text-inv-on-band transition-opacity duration-700 ${phase === 'handoff' ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        >
          {/* Until the 3D scene has drawn, a painted backdrop stands in for it. */}
          <div
            aria-hidden="true"
            className={`absolute inset-0 -z-10 transition-opacity duration-1000 ${path === '3d' && phase !== 'boot' && phase !== 'loading' ? 'opacity-0' : 'opacity-100'}`}
            style={{ background: `radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--c-gold) 20%, var(--c-band)) 0%, var(--c-band) 60%, color-mix(in srgb, var(--c-band) 55%, black) 100%)` }}
          />
          <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-1/3 bg-gradient-to-b from-black/35 to-transparent" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />

          <header className={`relative z-10 transition duration-700 ${opening ? '-translate-y-4 opacity-0' : ''} ${header === 'none' ? 'sr-only' : ''}`}>
            <p className="text-sm text-inv-gold">{view.guest ? t.greetingGuest(view.guest.displayName) : t.greetingGeneric}</p>
            <p className="mt-3 text-xs tracking-wide text-inv-on-band/80">{t.shell.weddingOf}</p>
            <h1 className="mt-1 font-inv-display text-[clamp(2.2rem,9vw,3.6rem)] leading-display text-inv-on-band">
              {view.wedding.groomName} <span className="font-inv-serif text-[0.5em] text-inv-gold">{t.and}</span> {view.wedding.brideName}
            </h1>
            {/* Templates whose gate reveals the date (scratch tiles) keep it out of the header. */}
            {header === 'full' && <p className="font-inv-serif text-base text-inv-on-band/85">{view.dateLine}</p>}
          </header>

          <div className="flex w-full flex-1 items-center justify-center">
            {path === '2d' && <Gate view={sceneView} opening={opening} />}
            {path === '3d' && gateReady && template.gate.gesture === 'tap' && (
              // The envelope itself is the button: a tap anywhere on it opens the invitation.
              <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-x-0 top-1/4 h-1/2 cursor-pointer" onClick={open} />
            )}
          </div>

          <footer className={`relative z-10 flex flex-col items-center gap-4 transition duration-500 ${opening ? 'opacity-0' : ''}`}>
            {!opening && phase !== 'handoff' && (
              <GateAction
                gesture={template.gate.gesture}
                ready={gateReady}
                progress={path === '2d' ? 1 : progress}
                label={view.wedding.lang === 'ar' ? template.gate.labelAr : template.gate.labelEn}
                view={sceneView}
                t={t}
                onOpen={open}
              />
            )}
            {reason2d === 'reduced-motion' && gateReady && (
              <button
                type="button"
                className="text-xs text-inv-on-band/80 underline underline-offset-4"
                onClick={() => {
                  saveOptIn3d();
                  window.location.reload();
                }}
              >
                {t.shell.play3d}
              </button>
            )}
            <a href="#details" onClick={() => inviteStore.getState().jumpToContent()} className="sr-only focus:not-sr-only focus:rounded-full focus:bg-black/40 focus:px-4 focus:py-2">
              {t.skipToContent}
            </a>
          </footer>
        </div>
      )}

      {hydrated && path !== 'pending' && (
        <div className="pointer-events-none fixed bottom-0 end-0 z-40 flex flex-col items-end gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <MuteButton t={t} />
          {path === '3d' && phase === 'content' && <Gyro t={t} />}
        </div>
      )}
      {opening && !capture && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SkipButton t={t} onSkip={() => inviteStore.getState().skip()} />
        </div>
      )}
      {lab && <LabPanel />}
      <noscript>
        <style>{'.invite-gate{display:none!important}'}</style>
      </noscript>
    </div>
  );
}
