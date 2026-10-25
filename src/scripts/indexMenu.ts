/**
 * The index (menu) dialog: open/close, focus trap, Escape, and focus return.
 * Shared by the homepage and the section pages. Hooks let the homepage pause
 * its smooth scrolling while the dialog is open.
 */
export interface IndexMenuHooks {
  onOpen?: () => void;
  onClose?: () => void;
  /** milliseconds to wait before hiding (the clip-path wipe); 0 with motion off */
  closeDelay?: () => number;
}

export function initIndexMenu(hooks: IndexMenuHooks = {}) {
  const index = document.querySelector<HTMLElement>('#index');
  const openBtn = document.querySelector<HTMLButtonElement>('#index-open');
  const closeBtn = document.querySelector<HTMLButtonElement>('#index-close');
  const main = document.querySelector('main');
  let lastFocus: HTMLElement | null = null;

  function open() {
    if (!index) return;
    lastFocus = document.activeElement as HTMLElement;
    index.hidden = false;
    requestAnimationFrame(() => {
      index.dataset.open = '';
      openBtn?.setAttribute('aria-expanded', 'true');
      main?.setAttribute('inert', '');
      hooks.onOpen?.();
      index.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
    });
  }

  function close(restoreFocus = true) {
    if (!index || !('open' in index.dataset)) return;
    delete index.dataset.open;
    openBtn?.setAttribute('aria-expanded', 'false');
    main?.removeAttribute('inert');
    hooks.onClose?.();
    const done = () => {
      if (!('open' in index.dataset)) index.hidden = true;
    };
    const delay = hooks.closeDelay?.() ?? 700;
    if (delay > 0) setTimeout(done, delay);
    else done();
    if (restoreFocus) lastFocus?.focus({ preventScroll: true });
  }

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', () => close());
  index?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      // keep focus inside the open dialog
      const focusable = Array.from(index.querySelectorAll<HTMLElement>('a, button'));
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

  return { open, close };
}
