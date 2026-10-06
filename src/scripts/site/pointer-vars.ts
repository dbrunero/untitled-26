/**
 * Writes normalised pointer coordinates (-1…1) to --px / --py on the closest [data-pointer-vars].
 * CSS does the rest (tilt, pan, depth) with transitions, so there is no per-frame JS loop.
 */
import { heavyMotionAllowed } from '../core/env';

let started = false;

export function initPointerVars(): void {
  if (started) return;
  started = true;
  let current: HTMLElement | null = null;
  let frame = 0;
  const reset = (el: HTMLElement | null) => {
    if (!el) return;
    el.style.setProperty('--px', '0');
    el.style.setProperty('--py', '0');
    el.classList.remove('is-pointed');
  };
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || !heavyMotionAllowed()) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-pointer-vars]') ?? null;
      if (el !== current) {
        reset(current);
        current = el;
      }
      if (!el) return;
      const { clientX, clientY } = e;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = ((clientX - r.left) / r.width) * 2 - 1;
        const py = ((clientY - r.top) / r.height) * 2 - 1;
        el.classList.add('is-pointed');
        el.style.setProperty('--px', Math.max(-1, Math.min(1, px)).toFixed(3));
        el.style.setProperty('--py', Math.max(-1, Math.min(1, py)).toFixed(3));
      });
    },
    { passive: true },
  );
  document.addEventListener('mouseleave', () => reset(current));
  document.addEventListener('astro:before-swap', () => {
    reset(current);
    current = null;
  });
}
