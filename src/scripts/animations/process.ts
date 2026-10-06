import { motionAllowed } from '../core/env';
import { loadGsap } from '../core/gsap';

/** Process timeline: scrubbed progress line, active step highlight and a "01 / 04" indicator. */
export async function init() {
  const section = document.querySelector<HTMLElement>('[data-process]');
  if (!section) return;
  const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-process-step]'));
  const fill = section.querySelector<HTMLElement>('[data-process-fill]');
  const counter = section.querySelector<HTMLElement>('[data-process-current]');

  const activate = (index: number) => {
    steps.forEach((s, i) => s.classList.toggle('is-active', i <= index));
    steps.forEach((s, i) => s.classList.toggle('is-current', i === index));
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    section.style.setProperty('--step', String(index + 1));
  };

  if (!motionAllowed()) {
    steps.forEach((s) => s.classList.add('is-active'));
    if (fill) fill.style.transform = 'scaleY(1)';
    if (counter) counter.textContent = String(steps.length).padStart(2, '0');
    return;
  }

  const { gsap, ScrollTrigger } = await loadGsap();
  activate(0);
  const ctx = gsap.context(() => {
    if (fill) {
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: section.querySelector('[data-process-list]') ?? section, start: 'top 55%', end: 'bottom 55%', scrub: 0.4 },
        },
      );
    }
    steps.forEach((step, i) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 58%',
        end: 'bottom 58%',
        onToggle: (self) => self.isActive && activate(i),
        onEnter: () => activate(i),
        onEnterBack: () => activate(i),
      });
    });
  }, section);
  return () => ctx.revert();
}
