import { registerPage } from '../core/lifecycle';
import { prefersReducedMotion, saveData } from '../core/env';

/**
 * Lazy portfolio videos: the file is requested only when the video is near the viewport,
 * plays while visible, pauses off-screen / in background tabs, and never autoplays with
 * reduced motion or data-saver. A visible toggle allows pausing/playing (WCAG 2.2.2).
 */
registerPage('video', (signal) => {
  const wrappers = Array.from(document.querySelectorAll<HTMLElement>('[data-video]'));
  if (!wrappers.length) return;
  const cleanups: Array<() => void> = [];

  wrappers.forEach((wrap) => {
    const video = wrap.querySelector<HTMLVideoElement>('video');
    const toggle = wrap.querySelector<HTMLButtonElement>('[data-video-toggle]');
    const src = video?.dataset.src;
    if (!video || !src) return;
    let loaded = false;
    let userPaused = false;
    let visible = false;

    const setToggle = (playing: boolean) => {
      if (!toggle) return;
      toggle.setAttribute('aria-label', playing ? 'Metti in pausa il video' : 'Riproduci il video');
      toggle.dataset.state = playing ? 'playing' : 'paused';
    };

    const load = () => {
      if (loaded) return;
      loaded = true;
      video.src = src;
      video.load();
    };
    const play = () => {
      if (userPaused || prefersReducedMotion() || saveData() || document.hidden) return;
      load();
      video.play().then(() => {
        wrap.classList.add('is-playing');
        setToggle(true);
      }).catch(() => setToggle(false));
    };
    const pause = () => {
      video.pause();
      wrap.classList.remove('is-playing');
    };

    setToggle(false);
    video.addEventListener('ended', () => setToggle(false), { signal });

    toggle?.addEventListener(
      'click',
      () => {
        if (video.paused) {
          userPaused = false;
          load();
          video.play().then(() => {
            wrap.classList.add('is-playing');
            setToggle(true);
          });
        } else {
          userPaused = true;
          pause();
          setToggle(false);
        }
      },
      { signal },
    );

    const preload = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && !prefersReducedMotion() && !saveData() && load(),
      { rootMargin: '300px 0px' },
    );
    const watch = new IntersectionObserver(
      ([entry]) => {
        visible = !!entry?.isIntersecting;
        if (visible) play();
        else pause();
      },
      { threshold: 0.35 },
    );
    preload.observe(wrap);
    watch.observe(wrap);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) pause();
        else if (visible) play();
      },
      { signal },
    );
    cleanups.push(() => {
      preload.disconnect();
      watch.disconnect();
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
  });

  return () => cleanups.forEach((fn) => fn());
});
