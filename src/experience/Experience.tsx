import { Component, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Specimen } from './components/Specimen';
import { Spores } from './components/Spores';
import { Atmosphere } from './components/Atmosphere';
import { Filaments } from './components/Filaments';
import { Effects } from './components/Effects';
import { CameraRig } from './components/CameraRig';
import { Governor } from './components/Governor';
import { acts } from './core/acts';
import { detectTier, hasWebGL, qualityLadder } from './core/quality';
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
  const ladder = useMemo(() => qualityLadder(tier, window.devicePixelRatio || 1), [tier]);
  const [rung, setRung] = useState(0);
  const quality = ladder[rung];

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
        dpr={quality.dpr}
        frameloop={motion ? 'always' : 'demand'}
        flat
        gl={{
          // with post-processing, the composer does its own multisampling
          antialias: tier.antialias && !tier.post,
          alpha: false,
          stencil: false,
          powerPreference: 'high-performance',
        }}
        camera={{ fov: acts[0].fov, near: 0.1, far: 80, position: acts[0].camera }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setRenderer('fallback');
          });
        }}
      >
        <Governor
          canStepDown={rung < ladder.length - 1}
          onStepDown={() => setRung((r) => Math.min(r + 1, ladder.length - 1))}
        />
        <Atmosphere />
        <Specimen tier={tier} />
        <Filaments count={quality.filaments} octaves={tier.octaves} />
        <Spores count={tier.spores} />
        {/* 2x MSAA looks the same as 4x on these hairlines at half the memory traffic */}
        {quality.post && <Effects multisampling={tier.antialias ? 2 : 0} />}
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
    const scrolled = () => {
      store.lastScroll = performance.now();
      poke();
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', scrolled, { passive: true });
    window.addEventListener('resize', poke);
    const unsub = subscribe(poke);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', scrolled);
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
