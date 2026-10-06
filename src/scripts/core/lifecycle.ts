/**
 * Page lifecycle for Astro view transitions.
 * Module scripts run once; page-specific enhancements must be (re)mounted on every
 * `astro:page-load` and torn down on `astro:before-swap`. Every init receives an
 * AbortSignal (use it as `addEventListener(..., { signal })`) and may return a cleanup.
 */
import { prefersReducedMotion, hasFinePointer } from './env';

type Cleanup = () => void;
type PageInit = (signal: AbortSignal) => void | Cleanup | Promise<void | Cleanup>;

const inits: Array<{ name: string; fn: PageInit }> = [];
let cleanups: Cleanup[] = [];
let controller: AbortController | null = null;
let started = false;

export function registerPage(name: string, fn: PageInit): void {
  inits.push({ name, fn });
}

function teardown(): void {
  controller?.abort();
  controller = null;
  const list = cleanups;
  cleanups = [];
  for (const fn of list) {
    try {
      fn();
    } catch (error) {
      console.error('[lifecycle] cleanup failed', error);
    }
  }
}

function mount(): void {
  teardown();
  const ctrl = new AbortController();
  controller = ctrl;
  const bucket: Cleanup[] = [];
  cleanups = bucket;
  for (const { name, fn } of inits) {
    try {
      Promise.resolve(fn(ctrl.signal))
        .then((cleanup) => {
          if (typeof cleanup !== 'function') return;
          // The user may have navigated away while a lazy chunk was loading.
          if (ctrl.signal.aborted) cleanup();
          else bucket.push(cleanup);
        })
        .catch((error) => console.error(`[lifecycle] "${name}" failed`, error));
    } catch (error) {
      console.error(`[lifecycle] "${name}" failed`, error);
    }
  }
}

/** Flags on <html> are reset by view transitions (root attributes are swapped), so we re-apply them. */
let cursorActive = false;
export function setCursorFlag(active: boolean): void {
  cursorActive = active;
  document.documentElement.classList.toggle('has-cursor', active);
}

export function applyHtmlFlags(): void {
  const root = document.documentElement;
  root.classList.add('js');
  root.classList.toggle('motion', !prefersReducedMotion());
  root.classList.toggle('has-cursor', cursorActive && hasFinePointer() && !prefersReducedMotion());
}

export function startLifecycle(): void {
  if (started) return;
  started = true;
  document.addEventListener('astro:before-swap', teardown);
  document.addEventListener('astro:after-swap', applyHtmlFlags);
  document.addEventListener('astro:page-load', mount);
  window.addEventListener('pagehide', teardown);
  // Astro fires page-load once on the first load too, but if the script runs late we still need to mount.
  if (document.readyState !== 'loading') queueMicrotask(() => controller ?? mount());
}
