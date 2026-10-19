/**
 * The DOM side of the experience: scroll → act coordinate, the depth gauge,
 * the index (menu), the motion toggle, the loader and the opening sequence.
 * It talks to the 3D world only through the shared store.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { store, subscribe, setMotion, onFrame } from '../experience/core/store';

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

// ------------------------------------------------------------ live readout --

const ro = { x: $('#ro-x'), z: $('#ro-z'), ring: $('#ro-ring') };
const annLine = $<SVGLineElement>('#ann-line');
const annDot = $<SVGCircleElement>('#ann-dot');
const annLabel = $('#ann-label');
const fmt = (v: number) => (v < 0 ? '−' : ' ') + Math.abs(v).toFixed(3);

onFrame((r) => {
  if (ro.x) ro.x.textContent = fmt(r.x);
  if (ro.z) ro.z.textContent = fmt(r.z);
  if (ro.ring) ro.ring.textContent = String(Math.max(0, r.ring));

  if (!annLine || !annDot || !annLabel) return;
  if (!r.pith) {
    annotation?.style.setProperty('visibility', 'hidden');
    return;
  }
  annotation?.style.setProperty('visibility', 'visible');
  // label sits up and to the right of the pith, clear of the hero text
  const lx = Math.min(r.pith.x + 120, window.innerWidth - annLabel.offsetWidth - 24);
  const ly = Math.max(r.pith.y - 110, 70);
  annLabel.style.transform = `translate(${lx + 8}px, ${ly - 8}px)`;
  annDot.setAttribute('cx', String(r.pith.x));
  annDot.setAttribute('cy', String(r.pith.y));
  annLine.setAttribute('x1', String(r.pith.x + 3));
  annLine.setAttribute('y1', String(r.pith.y - 3));
  annLine.setAttribute('x2', String(lx));
  annLine.setAttribute('y2', String(ly));
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

const index = $<HTMLElement>('#index');
const openBtn = $<HTMLButtonElement>('#index-open');
const closeBtn = $<HTMLButtonElement>('#index-close');
const main = $('main');
let lastFocus: HTMLElement | null = null;

function openIndex() {
  if (!index) return;
  lastFocus = document.activeElement as HTMLElement;
  index.hidden = false;
  requestAnimationFrame(() => {
    index.dataset.open = '';
    openBtn?.setAttribute('aria-expanded', 'true');
    main?.setAttribute('inert', '');
    index.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
  });
}

function closeIndex(restoreFocus = true) {
  if (!index || !('open' in index.dataset)) return;
  delete index.dataset.open;
  openBtn?.setAttribute('aria-expanded', 'false');
  main?.removeAttribute('inert');
  const done = () => {
    if (!('open' in index.dataset)) index.hidden = true;
  };
  if (store.motion) setTimeout(done, 700);
  else done();
  if (restoreFocus) lastFocus?.focus({ preventScroll: true });
}

openBtn?.addEventListener('click', openIndex);
closeBtn?.addEventListener('click', () => closeIndex());
index?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeIndex();
  if (e.key === 'Tab') {
    // keep focus inside the open dialog
    const focusable = $$<HTMLElement>('#index a, #index button');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
$$<HTMLAnchorElement>('[data-index-link]').forEach((a) =>
  a.addEventListener('click', () => {
    closeIndex(false);
    // move focus to the destination so keyboard users land where they jumped
    const target = document.querySelector<HTMLElement>(a.getAttribute('href') ?? '');
    if (target) {
      target.setAttribute('tabindex', '-1');
      setTimeout(() => target.focus({ preventScroll: true }), 50);
    }
  }),
);

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
