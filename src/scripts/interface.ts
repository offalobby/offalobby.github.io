/**
 * The DOM side of the experience: scroll → act coordinate, the depth gauge,
 * the index (menu), the motion toggle, the loader and the opening sequence.
 * It talks to the 3D world only through the shared store.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { store, subscribe, setMotion, onFrame } from '../experience/core/store';
import { initIndexMenu } from './indexMenu';

gsap.registerPlugin(ScrollTrigger);
// Animations follow wall-clock time even if the GPU is busy, so text never
// waits on the frame rate to appear.
gsap.ticker.lagSmoothing(0);

const root = document.documentElement;
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(document.querySelectorAll<T>(sel));

// ------------------------------------------------------------------ scroll --
// Each act after the first contributes 0→1 while its top edge travels from
// the bottom of the viewport to the top. Their sum is the act coordinate:
// 0 = Act I, 4 = Act V, regardless of how tall each section is.

const sections = $$<HTMLElement>('main > .act[data-act]');
const progress = sections.map(() => 0);
const gaugeLinks = $$<HTMLAnchorElement>('.gauge a');
const gauge = $('.gauge');
const annotation = $('.annotation');

function onActChange() {
  const a = progress.reduce((sum, p) => sum + p, 0);
  store.act = a;
  const last = sections.length - 1;
  gauge?.style.setProperty('--progress', String(a / last));
  const current = Math.round(a);
  gaugeLinks.forEach((link, i) => link.setAttribute('aria-current', String(i === current)));
  // the paper theme belongs to the 3D print; the static fallback stays dark
  root.dataset.theme = a > last - 0.45 && store.renderer === 'webgl' ? 'paper' : 'field';
  annotation?.style.setProperty('--annotation', String(Math.max(0, 1 - a * 2.5)));
}

sections.forEach((section, i) => {
  if (i === 0) return;
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'top top',
    onUpdate: (self) => {
      progress[i] = self.progress;
      onActChange();
    },
    onRefresh: (self) => {
      progress[i] = self.progress;
      onActChange();
    },
  });
});
onActChange();

// ----------------------------------------------------------- smooth scroll --
// A mouse wheel moves the page in ~100 px jumps, so the text lurched in steps
// while the 3D world glided. Lenis eases those steps on the same GSAP ticker
// that drives ScrollTrigger, so text, triggers and camera move together.
// Touch and keyboard scrolling stay native; with motion off it is removed.

let lenis: Lenis | null = null;
function syncSmoothScroll() {
  if (store.motion && !lenis) {
    lenis = new Lenis({ lerp: 0.12, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
  } else if (!store.motion && lenis) {
    lenis.destroy();
    lenis = null;
  }
}
gsap.ticker.add((time) => lenis?.raf(time * 1000));
syncSmoothScroll();
subscribe(syncSmoothScroll);

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Every in-page link (gauge, index, scroll cue) goes through here. */
function goTo(hash: string) {
  const target = document.getElementById(hash.slice(1));
  if (!target) return false;
  if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: easeInOut, force: true });
  else target.scrollIntoView({ behavior: store.motion ? 'smooth' : 'auto' });
  history.replaceState(null, '', hash);
  // move focus to the destination so keyboard users land where they jumped
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  return true;
}

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!link) return;
  // only links to a section of this very page ("#projects" or "/#projects")
  const to = new URL(link.href, location.href);
  if (to.origin !== location.origin || to.pathname !== location.pathname || !to.hash) return;
  if (link.hasAttribute('data-index-link')) closeIndex(false);
  if (goTo(to.hash)) e.preventDefault();
});

// ------------------------------------------------------------ live readout --

const ro = { x: $('#ro-x'), z: $('#ro-z'), ring: $('#ro-ring') };
const annLine = $<SVGLineElement>('#ann-line');
const annDot = $<SVGCircleElement>('#ann-dot');
const annLabel = $('#ann-label');
const fmt = (v: number) => (v < 0 ? '−' : ' ') + Math.abs(v).toFixed(3);

// Measured once (and on resize), never inside the frame callback: reading
// layout right after writing styles would force a reflow every frame.
let labelWidth = annLabel?.offsetWidth ?? 0;
const measureLabel = () => (labelWidth = annLabel?.offsetWidth ?? 0);
window.addEventListener('resize', measureLabel);
document.fonts?.ready.then(measureLabel);
const last = { x: '', z: '', ring: '', visible: true };

onFrame((r) => {
  // text only changes the DOM when the value does
  const x = fmt(r.x);
  const z = fmt(r.z);
  const ring = String(Math.max(0, r.ring));
  if (ro.x && x !== last.x) ro.x.textContent = last.x = x;
  if (ro.z && z !== last.z) ro.z.textContent = last.z = z;
  if (ro.ring && ring !== last.ring) ro.ring.textContent = last.ring = ring;

  if (!annLine || !annDot || !annLabel) return;
  // the annotation belongs to Act I; past it, it is invisible, so skip the work
  const show = !!r.pith && store.act < 0.45;
  if (show !== last.visible) {
    annotation?.style.setProperty('visibility', show ? 'visible' : 'hidden');
    last.visible = show;
  }
  if (!show || !r.pith) return;
  // label sits up and to the right of the pith, clear of the hero text
  const lx = Math.min(r.pith.x + 120, window.innerWidth - labelWidth - 24);
  const ly = Math.max(r.pith.y - 110, 70);
  annLabel.style.transform = `translate(${lx + 8}px, ${ly - 8}px)`;
  annDot.setAttribute('cx', r.pith.x.toFixed(1));
  annDot.setAttribute('cy', r.pith.y.toFixed(1));
  annLine.setAttribute('x1', (r.pith.x + 3).toFixed(1));
  annLine.setAttribute('y1', (r.pith.y - 3).toFixed(1));
  annLine.setAttribute('x2', lx.toFixed(1));
  annLine.setAttribute('y2', ly.toFixed(1));
});

// ------------------------------------------------------------------ motion --

const motionBtn = $<HTMLButtonElement>('#motion-toggle');
function syncMotion() {
  if (!motionBtn) return;
  motionBtn.textContent = store.motion ? 'Motion on' : 'Motion off';
  motionBtn.setAttribute('aria-pressed', String(store.motion));
}
motionBtn?.addEventListener('click', () => setMotion(!store.motion));
setMotion(store.motion, false);
subscribe(syncMotion);
syncMotion();

// ------------------------------------------------------------------- index --

const menu = initIndexMenu({
  onOpen: () => lenis?.stop(), // the page behind the open index stays put
  onClose: () => lenis?.start(),
  closeDelay: () => (store.motion ? 700 : 0),
});
const closeIndex = (restoreFocus = true) => menu.close(restoreFocus);

// ------------------------------------------------- loader + opening sequence --

const loader = $('#loader');
const count = $('#loader-count');
const rings = $$<SVGCircleElement>('#loader circle');
const lines = $$('[data-line]');
const reveals = $$('[data-reveal]');
let opened = false;

// The loader draws its rings as a counter while the GPU compiles shaders.
const loaderTl = gsap.timeline();
if (store.motion) {
  gsap.set(rings, { attr: { 'stroke-dasharray': '0 1' } });
  rings.forEach((ring, i) => {
    loaderTl.to(ring, { attr: { 'stroke-dasharray': '1 0' }, duration: 0.5, ease: 'power2.out' }, i * 0.18);
  });
  const counter = { n: 0 };
  loaderTl.to(counter, { n: 60, duration: 1.4, ease: 'power1.out', onUpdate: () => {
    if (count) count.textContent = String(Math.round(counter.n));
  } }, 0);
  gsap.set(lines, { yPercent: 105 });
  gsap.set(reveals, { autoAlpha: 0, y: 14 });
}

function open() {
  if (opened) return;
  opened = true;
  root.dataset.ready = '';
  const go = () => {
    if (loader) loader.dataset.done = '';
    if (!store.motion) return;
    const tl = gsap.timeline({ delay: 0.25 });
    tl.to(lines, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 });
    tl.to(reveals, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1 }, '-=0.9');
    tl.fromTo('.gauge', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, '-=0.8');
  };
  // let the loader finish its count, but never hold the page hostage
  if (store.motion && loaderTl.progress() < 1) loaderTl.eventCallback('onComplete', go);
  else go();
}

subscribe(onActChange);
subscribe(() => {
  if (store.ready || store.renderer === 'fallback') open();
});
// Safety net: show the page even if the GPU is slow or something failed.
setTimeout(open, 6000);
if (store.ready || store.renderer === 'fallback') open();

window.addEventListener('load', () => ScrollTrigger.refresh());
