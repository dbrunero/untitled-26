/**
 * Custom cursor: dot + lagging ring, transform-only, rAF-driven.
 * Enabled only for a precise pointer (mouse/trackpad) without reduced motion.
 * The native cursor is hidden only AFTER the first real mouse movement.
 */
import { createLoop, hasFinePointer, lerp, prefersReducedMotion } from '../core/env';
import { setCursorFlag } from '../core/lifecycle';

type State = 'default' | 'link' | 'view' | 'drag' | 'text' | 'hidden';

let started = false;

export function initCursor(): void {
  if (started) return;
  started = true;
  // The cursor markup can be replaced by a view transition, so element references are
  // re-resolved after every swap (see `bind`) instead of being captured once.
  let root!: HTMLElement;
  let dot!: HTMLElement;
  let ring!: HTMLElement;
  let label!: HTMLElement;
  const bind = (): boolean => {
    const r = document.querySelector<HTMLElement>('[data-cursor-root]');
    const d = r?.querySelector<HTMLElement>('[data-cursor-dot]');
    const g = r?.querySelector<HTMLElement>('[data-cursor-ring]');
    const l = r?.querySelector<HTMLElement>('[data-cursor-label]');
    if (!r || !d || !g || !l) return false;
    [root, dot, ring, label] = [r, d, g, l];
    return true;
  };
  if (!bind()) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  let enabled = false;
  let x = -100;
  let y = -100;
  let rx = -100;
  let ry = -100;
  let state: State = 'default';

  const loop = createLoop(() => {
    rx = lerp(rx, x, 0.18);
    ry = lerp(ry, y, 0.18);
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    return Math.abs(rx - x) > 0.1 || Math.abs(ry - y) > 0.1;
  });

  const setState = (next: State, text = '') => {
    if (next === state && label.textContent === text) return;
    state = next;
    root.dataset.state = next;
    label.textContent = text;
  };

  const resolve = (target: EventTarget | null) => {
    const el = target instanceof Element ? target : null;
    if (!el) return setState('default');
    const custom = el.closest<HTMLElement>('[data-cursor]');
    if (custom) {
      const kind = custom.dataset.cursor;
      if (kind === 'view') return setState('view', custom.dataset.cursorLabel ?? 'VIEW');
      if (kind === 'drag') return setState('drag', custom.dataset.cursorLabel ?? 'DRAG');
      if (kind === 'hidden') return setState('hidden');
    }
    if (el.closest('input, textarea, select, [role="combobox"], [role="listbox"], [contenteditable="true"]')) return setState('text');
    if (el.closest('a[href], button, summary, [role="button"], label[for], [data-magnetic]')) return setState('link');
    setState('default');
  };

  const enable = () => {
    if (enabled) return;
    enabled = true;
    root.dataset.ready = 'true';
    setCursorFlag(true);
  };
  const disable = () => {
    enabled = false;
    loop.stop();
    delete root.dataset.ready;
    delete root.dataset.visible;
    setCursorFlag(false);
  };

  const evaluate = () => {
    if (!fine.matches || reduced.matches) disable();
  };
  reduced.addEventListener('change', evaluate);
  fine.addEventListener('change', evaluate);

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || !hasFinePointer() || prefersReducedMotion()) return;
      if (!enabled) {
        x = rx = e.clientX;
        y = ry = e.clientY;
        enable();
      }
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      root.dataset.visible = 'true';
      loop.start();
    },
    { passive: true },
  );
  document.addEventListener('pointerover', (e) => enabled && resolve(e.target), { passive: true });
  document.addEventListener('pointerdown', () => enabled && (root.dataset.pressed = 'true'), { passive: true });
  document.addEventListener('pointerup', () => delete root.dataset.pressed, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => (root.dataset.visible = 'false'));
  document.documentElement.addEventListener('mouseenter', () => enabled && (root.dataset.visible = 'true'));
  document.addEventListener('visibilitychange', () => document.hidden && loop.stop());
  // After a view transition: re-bind to the (possibly new) element and restore position and state,
  // so the cursor is visible immediately on the new page without waiting for a mouse move.
  document.addEventListener('astro:after-swap', () => {
    if (!bind()) return;
    state = 'hidden'; // force setState to write to the new element
    setState('default');
    if (!enabled) return;
    root.dataset.ready = 'true';
    root.dataset.visible = 'true';
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    setCursorFlag(true);
    loop.start();
  });
}
