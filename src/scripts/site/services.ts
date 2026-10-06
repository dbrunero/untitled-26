import { registerPage } from '../core/lifecycle';
import { createLoop, hasFinePointer, lerp, prefersReducedMotion } from '../core/env';

/**
 * Services accordion. One row open at a time.
 *  - Desktop: hover or keyboard focus opens a row (peek), click/Enter pins it, a second click closes it.
 *  - Touch: tap opens (and pins), a second tap closes (aria-expanded stays truthful at all times).
 *  - CREATE row: the preview image drifts after the pointer inside the row.
 */
registerPage('services', (signal) => {
  const list = document.querySelector<HTMLElement>('[data-services]');
  if (!list) return;
  const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-service-row]'));

  const setOpen = (row: HTMLElement, open: boolean) => {
    row.classList.toggle('is-open', open);
    if (!open) delete row.dataset.pinned;
    row.querySelector<HTMLElement>('[data-service-trigger]')?.setAttribute('aria-expanded', String(open));
  };
  const openOnly = (row: HTMLElement) => rows.forEach((r) => setOpen(r, r === row));

  rows.forEach((row) => {
    const trigger = row.querySelector<HTMLElement>('[data-service-trigger]');
    if (!trigger) return;
    // Hover / keyboard focus only "peek" a row. Click (or Enter/Space/tap) pins it; clicking a pinned row closes it.
    trigger.addEventListener(
      'click',
      () => {
        if (!row.classList.contains('is-open')) {
          openOnly(row);
          row.dataset.pinned = 'true';
        } else if (row.dataset.pinned === 'true') {
          setOpen(row, false);
        } else {
          row.dataset.pinned = 'true';
        }
      },
      { signal },
    );
    trigger.addEventListener(
      'focus',
      () => {
        if (trigger.matches(':focus-visible')) openOnly(row);
      },
      { signal },
    );
    // Hover "peek": only on real pointer movement (layout shifts under a resting cursor must not
    // swap rows) and never while a row is pinned by click/tap/Enter.
    row.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse' || !hasFinePointer()) return;
        if (Math.abs(e.movementX) + Math.abs(e.movementY) === 0) return;
        if (row.classList.contains('is-open')) return;
        if (rows.some((r) => r.dataset.pinned === 'true')) return;
        openOnly(row);
      },
      { signal },
    );

    // Image preview that follows the pointer (CREATE only).
    const follower = row.querySelector<HTMLElement>('[data-follow]');
    if (follower && !prefersReducedMotion()) {
      let tx = 0;
      let ty = 0;
      let cx = 0;
      let cy = 0;
      const loop = createLoop(() => {
        cx = lerp(cx, tx, 0.12);
        cy = lerp(cy, ty, 0.12);
        follower.style.setProperty('--fx', `${cx.toFixed(1)}px`);
        follower.style.setProperty('--fy', `${cy.toFixed(1)}px`);
        return Math.abs(cx - tx) > 0.2 || Math.abs(cy - ty) > 0.2;
      });
      row.addEventListener(
        'pointermove',
        (e) => {
          if (e.pointerType !== 'mouse' || !hasFinePointer()) return;
          const r = row.getBoundingClientRect();
          tx = ((e.clientX - r.left) / r.width - 0.5) * 120;
          ty = ((e.clientY - r.top) / r.height - 0.5) * 60;
          loop.start();
        },
        { signal },
      );
      signal.addEventListener('abort', () => loop.stop());
    }
  });
});
