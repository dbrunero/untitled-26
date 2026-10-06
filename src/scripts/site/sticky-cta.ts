import { registerPage } from '../core/lifecycle';

/**
 * Mobile sticky CTA: shows after the hero, hides near forms/footer, while the menu is open
 * and while the cookie banner is on screen, so it never covers content or controls.
 */
registerPage('sticky-cta', (signal) => {
  const cta = document.querySelector<HTMLElement>('[data-sticky-cta]');
  if (!cta || !('IntersectionObserver' in window)) return;
  let pastHero = false;
  const blockers = new Set<Element>();

  const render = () => {
    const bannerOpen = document.documentElement.classList.contains('consent-open');
    cta.classList.toggle('is-visible', pastHero && blockers.size === 0 && !bannerOpen);
  };

  // The sentinel is 1px tall, so IntersectionObserver would miss it on fast jumps: measure on scroll instead.
  const heroEnd = document.querySelector('[data-sticky-sentinel]');
  const observers: IntersectionObserver[] = [];
  let ticking = false;
  const measure = () => {
    ticking = false;
    pastHero = heroEnd ? heroEnd.getBoundingClientRect().top < 0 : window.scrollY > window.innerHeight * 0.8;
    render();
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(measure);
      }
    },
    { passive: true, signal },
  );
  window.addEventListener('resize', measure, { passive: true, signal });
  const hideTargets = document.querySelectorAll('[data-hide-sticky]');
  if (hideTargets.length) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) blockers.add(entry.target);
        else blockers.delete(entry.target);
      }
      render();
    });
    hideTargets.forEach((t) => io.observe(t));
    observers.push(io);
  }
  window.addEventListener('consent:banner', render, { signal });
  measure();
  return () => observers.forEach((o) => o.disconnect());
});
