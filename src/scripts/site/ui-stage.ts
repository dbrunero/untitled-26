import { registerPage } from '../core/lifecycle';

/**
 * [data-ui-stage]: `is-active` is added once when the stage first enters the viewport (entrance),
 * `is-live` follows visibility so idle animations only run while the stage is on screen.
 */
registerPage('ui-stage', (signal) => {
  const stages = Array.from(document.querySelectorAll<HTMLElement>('[data-ui-stage]'));
  if (!stages.length) return;
  if (!('IntersectionObserver' in window)) {
    stages.forEach((s) => s.classList.add('is-active'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) el.classList.add('is-active', 'is-live');
        else el.classList.remove('is-live');
      }
    },
    { threshold: 0.2 },
  );
  stages.forEach((s) => io.observe(s));
  document.addEventListener('visibilitychange', () => stages.forEach((s) => document.hidden && s.classList.remove('is-live')), { signal });
  return () => io.disconnect();
});
