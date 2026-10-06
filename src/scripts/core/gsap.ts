/** Lazy GSAP loader: the library is only downloaded on pages that actually animate. */
type GsapBundle = {
  gsap: typeof import('gsap').gsap;
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger;
};

let pending: Promise<GsapBundle> | null = null;

export function loadGsap(): Promise<GsapBundle> {
  pending ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, s]) => {
    g.gsap.registerPlugin(s.ScrollTrigger);
    g.gsap.defaults({ ease: 'power3.out' });
    // Keep ScrollTrigger quiet while the tab is hidden and avoid layout jumps on mobile toolbars.
    s.ScrollTrigger.config({ ignoreMobileResize: true });
    return { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger };
  });
  return pending;
}

export async function loadFlip() {
  const [{ gsap }, { Flip }] = await Promise.all([loadGsap(), import('gsap/Flip')]);
  gsap.registerPlugin(Flip);
  return { gsap, Flip };
}
