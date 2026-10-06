/** Media-query helpers shared by every enhancement. Always evaluate lazily: users can change settings at runtime. */
const q = (query: string) => (typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia(query) : null);

export const reducedMotionQuery = () => q('(prefers-reduced-motion: reduce)');
export const prefersReducedMotion = (): boolean => reducedMotionQuery()?.matches ?? false;
export const hasFinePointer = (): boolean => q('(hover: hover) and (pointer: fine)')?.matches ?? false;
export const isDesktop = (): boolean => q('(min-width: 1024px)')?.matches ?? false;
export const isTablet = (): boolean => q('(min-width: 768px)')?.matches ?? false;
export const saveData = (): boolean => {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return nav.connection?.saveData === true;
};

/** Heavy motion (parallax, tilt, scrubbed effects) = allowed motion + capable viewport. */
export const motionAllowed = (): boolean => !prefersReducedMotion();
export const heavyMotionAllowed = (): boolean => motionAllowed() && isDesktop() && hasFinePointer();

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Runs `cb` on every frame while `active()` is true; stops itself when idle. Returns a trigger to (re)start. */
export function createLoop(step: (dt: number) => boolean) {
  let raf = 0;
  let last = 0;
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const keep = step(dt);
    raf = keep ? requestAnimationFrame(tick) : 0;
  };
  return {
    start() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
