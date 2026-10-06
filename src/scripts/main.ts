/**
 * Single client entry point. Small vanilla modules are bundled together; everything that
 * needs GSAP is split into its own chunk and only fetched on pages that use it.
 */
import { applyHtmlFlags, registerPage, startLifecycle } from './core/lifecycle';
import { initCursor } from './site/cursor';
import { initMagnetic } from './site/magnetic';
import { initPointerVars } from './site/pointer-vars';
import { initThirdParty } from '../lib/third-party';
import { openConsentPreferences } from '../lib/consent';
import './site/header';
import './site/progress';
import './site/sticky-cta';
import './site/video';
import './site/services';
import './site/ui-stage';
import './site/work-filter';

applyHtmlFlags();

// GSAP-powered modules: split chunks, loaded only when the page contains their hooks.
const has = (sel: string) => !!document.querySelector(sel);
registerPage('reveal', async () => {
  if (!has('[data-reveal], [data-mask], [data-lines]')) {
    document.documentElement.dataset.motionReady = 'true';
    return;
  }
  return (await import('./animations/reveal')).init();
});
registerPage('scroll-fx', async () => {
  if (!has('[data-hero-float], [data-parallax], [data-marquee], [data-footer-reveal]')) return;
  return (await import('./animations/scroll-fx')).init();
});
registerPage('process', async () => {
  if (!has('[data-process]')) return;
  return (await import('./animations/process')).init();
});

initCursor();
initMagnetic();
initPointerVars();
initThirdParty();

// Footer / policy buttons that reopen the cookie preferences panel (event delegation).
document.addEventListener('click', (event) => {
  const trigger = (event.target as Element | null)?.closest<HTMLElement>('[data-consent-open]');
  if (trigger) {
    event.preventDefault();
    openConsentPreferences(trigger);
  }
});

// Watchdog: if the animation layer failed to load, never leave content hidden.
window.setTimeout(() => {
  const root = document.documentElement;
  if (root.dataset.motionReady !== 'true') {
    root.classList.remove('motion');
    document.querySelectorAll('[data-reveal], [data-mask], [data-lines]').forEach((el) => el.classList.add('is-in'));
  }
}, 6000);
document.addEventListener('astro:before-swap', () => {
  delete document.documentElement.dataset.motionReady;
});

startLifecycle();
