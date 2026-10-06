/** Light magnetic pull for [data-magnetic] elements. Delegated: no per-page listeners to clean. */
import { heavyMotionAllowed } from '../core/env';

let started = false;

export function initMagnetic(): void {
  if (started) return;
  started = true;
  let current: HTMLElement | null = null;
  let frame = 0;

  const reset = (el: HTMLElement | null) => {
    if (!el) return;
    el.style.setProperty('--mx', '0px');
    el.style.setProperty('--my', '0px');
    el.classList.remove('is-magnetic');
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || !heavyMotionAllowed()) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-magnetic]') ?? null;
      if (el !== current) {
        reset(current);
        current = el;
      }
      if (!el) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const strength = Number(el.dataset.magnetic) || 0.28;
        const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
        const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
        el.classList.add('is-magnetic');
        el.style.setProperty('--mx', `${dx.toFixed(1)}px`);
        el.style.setProperty('--my', `${dy.toFixed(1)}px`);
      });
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => reset(current), true);
  document.addEventListener('astro:before-swap', () => {
    reset(current);
    current = null;
  });
}
