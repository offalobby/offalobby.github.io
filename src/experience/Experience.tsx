import { Component, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Specimen } from './components/Specimen';
import { Spores } from './components/Spores';
import { CameraRig } from './components/CameraRig';
import { acts } from './core/acts';
import { detectTier, hasWebGL } from './core/quality';
import { store, subscribe, setRenderer } from './core/store';

/**
 * The 3D world: one fixed, full-viewport canvas behind the page.
 * Mounted as an Astro island with client:only="react" — it never renders on
 * the server, and the page is complete and readable without it.
 */
export default function Experience() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const tier = useMemo(() => detectTier(), []);
  const motion = useSyncExternalStore(subscribe, () => store.motion, () => true);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, tier.dpr[1]));

  useEffect(() => {
    const ok = hasWebGL();
    setSupported(ok);
    setRenderer(ok ? 'webgl' : 'fallback');
  }, []);

  if (!supported) return null;

  return (
    <SceneErrorBoundary onError={() => setRenderer('fallback')}>
      <Canvas
        className="world-canvas"
        dpr={dpr}
        frameloop={motion ? 'always' : 'demand'}
        gl={{ antialias: tier.antialias, alpha: false, stencil: false, powerPreference: 'high-performance' }}
        camera={{ fov: acts[0].fov, near: 0.1, far: 80, position: acts[0].camera }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setRenderer('fallback');
          });
        }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(tier.dpr[0], d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(tier.dpr[1], d + 0.25))}
          onFallback={() => setDpr(tier.dpr[0])}
        />
        <Specimen tier={tier} />
        <Spores count={tier.spores} />
        <CameraRig />
        <InputBridge />
      </Canvas>
    </SceneErrorBoundary>
  );
}

/**
 * The canvas sits *behind* the page content, so pointer input is read from
 * the window. When motion is off the loop renders on demand; this asks for a
 * frame whenever something visible could have changed.
 */
function InputBridge() {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      store.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      store.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      store.pointer.lastMove = performance.now() / 1000;
      store.pointer.inside = true;
      if (!store.motion) invalidate();
    };
    const leave = () => {
      store.pointer.inside = false;
      if (!store.motion) invalidate();
    };
    const poke = () => {
      if (!store.motion) invalidate();
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', poke, { passive: true });
    window.addEventListener('resize', poke);
    const unsub = subscribe(poke);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', poke);
      window.removeEventListener('resize', poke);
      unsub();
    };
  }, [invalidate]);

  return null;
}

class SceneErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[archive] 3D scene failed, showing the static specimen instead.', error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
