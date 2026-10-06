import { motionAllowed } from '../core/env';
import { loadGsap } from '../core/gsap';

/**
 * Scroll reveals: [data-reveal] (fade/translate), [data-mask] (clip-path image reveal),
 * [data-lines] (line-by-line text rise). Content is visible by default; `html.motion`
 * provides the hidden pre-state, and everything is created inside a gsap.context
 * so it can be reverted on navigation.
 */
export async function init() {
  const targets = document.querySelectorAll('[data-reveal], [data-mask], [data-lines]');
  const root = document.documentElement;
  if (!targets.length || !motionAllowed()) {
    root.dataset.motionReady = 'true';
    return;
  }
  const { gsap, ScrollTrigger } = await loadGsap();
  const mobile = window.matchMedia('(max-width: 767px)').matches;

  const ctx = gsap.context(() => {
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => {
          const delay = Number(el.dataset.delay ?? 0);
          el.classList.add('is-in');
          gsap.fromTo(
            el,
            { opacity: 0, y: mobile ? 18 : 32 },
            { opacity: 1, y: 0, duration: 0.9, delay, ease: 'power3.out', clearProps: 'transform,opacity' },
          );
        },
      });
    });

    document.querySelectorAll<HTMLElement>('[data-mask]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          const delay = Number(el.dataset.delay ?? 0);
          const inner = el.firstElementChild;
          el.classList.add('is-in');
          gsap.fromTo(
            el,
            { clipPath: 'inset(0% 0% 100% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, delay, ease: 'expo.out', clearProps: 'clipPath' },
          );
          if (inner) gsap.fromTo(inner, { scale: 1.2 }, { scale: 1, duration: 1.6, delay, ease: 'expo.out', clearProps: 'transform' });
        },
      });
    });

    document.querySelectorAll<HTMLElement>('[data-lines]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          const delay = Number(el.dataset.delay ?? 0);
          el.classList.add('is-in');
          gsap.fromTo(
            el.querySelectorAll('.line > span'),
            { yPercent: 112 },
            { yPercent: 0, duration: 1.1, stagger: 0.09, delay, ease: 'expo.out', clearProps: 'transform' },
          );
        },
      });
    });
  });

  // Layout can change after the first measurement (accordions, lazy images, fonts):
  // keep ScrollTrigger positions fresh by watching the height of <main>.
  const main = document.querySelector('main');
  let timer = 0;
  const refreshSoon = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      // Refreshing resets the scroll position, which would cancel an in-flight smooth scroll.
      if (ScrollTrigger.isScrolling()) refreshSoon();
      else ScrollTrigger.refresh();
    }, 200);
  };
  const observer = new ResizeObserver(refreshSoon);
  if (main) observer.observe(main);

  root.dataset.motionReady = 'true';
  ScrollTrigger.refresh();
  return () => {
    window.clearTimeout(timer);
    observer.disconnect();
    ctx.revert();
  };
}
