import { registerPage } from '../core/lifecycle';
import { motionAllowed } from '../core/env';
import { loadFlip } from '../core/gsap';

export interface WorkFilter {
  category: string;
  year: string;
}

/**
 * Applies filters to the server-rendered project list. The Preact island only owns the controls
 * and URL; this module owns the DOM so the full list stays crawlable and works without JS.
 */
registerPage('work-filter', (signal) => {
  const grid = document.querySelector<HTMLElement>('[data-work-grid]');
  if (!grid) return;
  const items = Array.from(grid.querySelectorAll<HTMLElement>('[data-work-item]'));
  const empty = document.querySelector<HTMLElement>('[data-work-empty]');
  const count = document.querySelector<HTMLElement>('[data-work-count]');
  let busy = false;
  let queued: WorkFilter | null = null;
  let current: WorkFilter = { category: '', year: '' };

  const matches = (el: HTMLElement, f: WorkFilter) =>
    (!f.category || el.dataset.category === f.category) && (!f.year || el.dataset.year === f.year);

  const announce = (visible: number) => {
    if (count) count.textContent = visible === 1 ? '1 progetto' : `${visible} progetti`;
    if (empty) empty.hidden = visible !== 0;
  };

  const applyInstant = (f: WorkFilter) => {
    let visible = 0;
    items.forEach((el) => {
      const show = matches(el, f);
      el.hidden = !show;
      if (show) visible++;
    });
    announce(visible);
    current = f;
  };

  const apply = async (f: WorkFilter) => {
    if (!motionAllowed()) return applyInstant(f);
    if (busy) {
      queued = f;
      return;
    }
    busy = true;
    try {
      const { gsap, Flip } = await loadFlip();
      const state = Flip.getState(items);
      let visible = 0;
      items.forEach((el) => {
        const show = matches(el, f);
        el.hidden = !show;
        if (show) visible++;
      });
      announce(visible);
      current = f;
      await new Promise<void>((resolve) => {
        Flip.from(state, {
          duration: 0.8,
          ease: 'power3.inOut',
          absolute: true,
          nested: true,
          onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.25, clearProps: 'all' }),
          onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.25, clearProps: 'opacity' }),
          onComplete: resolve,
        });
      });
    } finally {
      busy = false;
      if (queued) {
        const next = queued;
        queued = null;
        void apply(next);
      }
    }
  };

  const fromUrl = (): WorkFilter => {
    const p = new URLSearchParams(location.search);
    return { category: p.get('categoria') ?? '', year: p.get('anno') ?? '' };
  };

  // Initial state from the URL (no animation).
  applyInstant(fromUrl());

  window.addEventListener(
    'work:filter',
    (e) => {
      const detail = (e as CustomEvent<WorkFilter>).detail;
      if (detail.category === current.category && detail.year === current.year) return;
      void apply(detail);
    },
    { signal },
  );
});
