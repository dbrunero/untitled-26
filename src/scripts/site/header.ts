import { registerPage } from '../core/lifecycle';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

registerPage('header', (signal) => {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const root = document.documentElement;
  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
  const toggleLabel = toggle?.querySelector<HTMLElement>('[data-menu-label]');

  /* ───── scrolled state ───── */
  let ticking = false;
  const update = () => {
    ticking = false;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  update();
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true, signal },
  );

  /* ───── theme under the header (dark / light sections) ───── */
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-theme]')).filter((s) => s.tagName !== 'HEADER');
  let io: IntersectionObserver | undefined;
  const observeThemes = () => {
    io?.disconnect();
    const probe = Math.round((header.offsetHeight || 72) / 2);
    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) header.dataset.over = (entry.target as HTMLElement).dataset.theme === 'light' ? 'light' : 'dark';
        }
      },
      { rootMargin: `-${probe}px 0px -${Math.max(0, window.innerHeight - probe - 1)}px 0px`, threshold: 0 },
    );
    sections.forEach((s) => io?.observe(s));
  };
  header.dataset.over = 'dark';
  if (sections.length && 'IntersectionObserver' in window) {
    observeThemes();
    window.addEventListener('resize', observeThemes, { passive: true, signal });
  }

  /* ───── mobile menu ───── */
  if (!toggle || !menu) return () => io?.disconnect();
  const inertTargets = () =>
    Array.from(document.querySelectorAll<HTMLElement>('main, [data-site-footer], [data-sticky-cta], .skip-link'));
  let open = false;

  const focusables = () =>
    [...header.querySelectorAll<HTMLElement>(FOCUSABLE), ...menu.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true',
    );

  const setOpen = (next: boolean, { restoreFocus = true } = {}) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    if (toggleLabel) toggleLabel.textContent = open ? 'Chiudi' : 'Menu';
    menu.classList.toggle('is-open', open);
    header.classList.toggle('is-menu-open', open);
    root.classList.toggle('is-locked', open);
    if (open) {
      menu.removeAttribute('inert');
      menu.removeAttribute('aria-hidden');
      inertTargets().forEach((el) => el.setAttribute('inert', ''));
      // Focus the first link once the panel is visible.
      requestAnimationFrame(() => menu.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: true }));
    } else {
      menu.setAttribute('inert', '');
      menu.setAttribute('aria-hidden', 'true');
      inertTargets().forEach((el) => el.removeAttribute('inert'));
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
  };

  // initial closed state
  menu.setAttribute('inert', '');
  menu.setAttribute('aria-hidden', 'true');
  toggle.removeAttribute('hidden');

  toggle.addEventListener('click', () => setOpen(!open), { signal });
  menu.addEventListener(
    'click',
    (e) => {
      if ((e.target as HTMLElement).closest('a[href]')) setOpen(false, { restoreFocus: false });
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    { signal },
  );

  const mq = window.matchMedia('(min-width: 1024px)');
  mq.addEventListener('change', () => mq.matches && setOpen(false, { restoreFocus: false }), { signal });

  return () => {
    io?.disconnect();
    if (open) {
      root.classList.remove('is-locked');
      inertTargets().forEach((el) => el.removeAttribute('inert'));
    }
  };
});
