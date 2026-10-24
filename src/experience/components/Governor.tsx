import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { store } from '../core/store';

const WARMUP_MS = 1200; // ignore shader compilation and the first uploads
const WINDOW = 90; // frames per verdict
const SLOW_MS = 21; // median frame time above this (~48 fps) means "too heavy"
const SCROLL_QUIET_MS = 450; // never change quality while the page is moving...
const SCROLL_QUIET_FRAMES = 20; // ...measured in frames too, so slow devices count fairly

/**
 * Watches real frame times and asks for one step down the quality ladder when
 * the device is consistently too slow. It never steps back up, and it waits
 * for a pause in scrolling before acting, so a downgrade is at most a single
 * unnoticed hitch instead of a recurring stutter.
 */
export function Governor({ canStepDown, onStepDown }: { canStepDown: boolean; onStepDown: () => void }) {
  const state = useRef({
    start: -1,
    samples: [] as number[],
    pending: false,
    cooldownUntil: 0,
    seenScroll: -Infinity,
    quietFrames: 0,
  });

  useFrame((_, delta) => {
    const s = state.current;
    const now = performance.now();
    if (s.start < 0) s.start = now;
    if (store.lastScroll !== s.seenScroll) {
      s.seenScroll = store.lastScroll;
      s.quietFrames = 0;
    } else s.quietFrames++;
    // on-demand rendering (motion off) produces meaningless frame times
    if (!store.motion || !canStepDown || document.hidden) return;
    if (now - s.start < WARMUP_MS || now < s.cooldownUntil) return;

    if (s.pending) {
      if (now - store.lastScroll > SCROLL_QUIET_MS && s.quietFrames >= SCROLL_QUIET_FRAMES) {
        s.pending = false;
        s.samples.length = 0;
        s.cooldownUntil = now + 1500; // let the new settings settle before judging again
        onStepDown();
      }
      return;
    }

    // a gap over a second is a tab switch or a debugger pause, not slowness;
    // anything shorter counts, however slow (that device needs help most)
    if (delta < 1) s.samples.push(delta * 1000);
    if (s.samples.length < WINDOW) return;
    const sorted = [...s.samples].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    s.samples.length = 0;
    if (median > SLOW_MS) s.pending = true;
  });

  return null;
}
