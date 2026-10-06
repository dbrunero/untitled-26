import { loadGsap } from '../core/gsap';

/**
 * Scroll-driven effects with gsap.matchMedia so desktop / mobile / reduced-motion
 * each get the right level, and everything reverts cleanly on navigation:
 *  - hero floating visuals (depth parallax) + hero copy fade
 *  - [data-parallax] images
 *  - [data-marquee] strips
 *  - footer reveal
 */
export async function init() {
  const hasFx = document.querySelector('[data-hero-float], [data-parallax], [data-marquee], [data-footer-reveal]');
  if (!hasFx) return;
  const { gsap } = await loadGsap();
  const mm = gsap.matchMedia();

  mm.add(
    { desktop: '(min-width: 1024px)', tablet: '(min-width: 768px) and (max-width: 1023px)', ok: '(prefers-reduced-motion: no-preference)' },
    (context) => {
      const { desktop, tablet, ok } = context.conditions as { desktop: boolean; tablet: boolean; ok: boolean };
      if (!ok) return;

      // Hero depth parallax
      const hero = document.querySelector<HTMLElement>('[data-hero]');
      if (hero && (desktop || tablet)) {
        gsap.utils.toArray<HTMLElement>('[data-hero-float]').forEach((el) => {
          const depth = Number(el.dataset.heroFloat) || 1;
          gsap.to(el, {
            yPercent: -(desktop ? 14 : 6) * depth,
            ease: 'none',
            scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 },
          });
        });
        const copy = hero.querySelector<HTMLElement>('[data-hero-copy]');
        if (copy && desktop) {
          gsap.to(copy, {
            opacity: 0.15,
            yPercent: -8,
            ease: 'none',
            scrollTrigger: { trigger: hero, start: '35% top', end: 'bottom top', scrub: true },
          });
        }
      }

      // Image parallax inside masks
      if (desktop || tablet) {
        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
          const amount = Number(el.dataset.parallax) || 8;
          const target = el.querySelector<HTMLElement>('[data-parallax-target]') ?? el;
          gsap.fromTo(
            target,
            { yPercent: -amount },
            {
              yPercent: amount,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          );
        });
      }

      // Scrubbed marquee (moves with scroll, never loops on its own)
      gsap.utils.toArray<HTMLElement>('[data-marquee]').forEach((el) => {
        const track = el.querySelector<HTMLElement>('[data-marquee-track]');
        if (!track) return;
        const dir = el.dataset.marquee === 'reverse' ? 1 : -1;
        gsap.fromTo(
          track,
          { xPercent: dir === -1 ? 0 : -33 },
          {
            xPercent: dir === -1 ? -33 : 0,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.5 },
          },
        );
      });

      // Footer reveal (desktop only)
      const footer = document.querySelector<HTMLElement>('[data-footer-reveal]');
      if (footer && desktop) {
        const target = footer.querySelector<HTMLElement>('[data-footer-headline]');
        if (target) {
          gsap.fromTo(
            target,
            { yPercent: -18, opacity: 0.4 },
            {
              yPercent: 0,
              opacity: 1,
              ease: 'none',
              scrollTrigger: { trigger: footer, start: 'top bottom', end: 'top 25%', scrub: true },
            },
          );
        }
      }
    },
  );

  return () => mm.revert();
}
