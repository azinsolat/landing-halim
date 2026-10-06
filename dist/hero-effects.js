(() => {
  'use strict';

  const scene = document.querySelector('.hero-scroll-scene');
  const hero = scene?.querySelector('.hero');
  const foreground = hero?.querySelector('.hero-video-main');
  if (!foreground) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 700px)');
  let frame = 0;
  let sceneTop = 0;
  let distance = 1;
  let sceneVisible = true;
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => { const p = clamp(value); return p * p * (3 - 2 * p); };

  function syncPlayback() {
    if (document.hidden || reducedMotion.matches || !sceneVisible) {
      foreground.pause();
      return;
    }
    const request = foreground.play();
    if (request?.catch) request.catch(() => {});
  }

  function render() {
    frame = 0;
    const progress = reducedMotion.matches ? 0 : clamp((scrollY - sceneTop) / distance);
    const move = ease((progress - 0.08) / 0.76);
    const fade = ease(progress / 0.38);
    const enter = ease((progress - 0.28) / 0.5);
    hero.style.setProperty('--bowl-x', `${-move * (compact.matches ? 15 : 23)}vw`);
    hero.style.setProperty('--bowl-y', `${move * (compact.matches ? 9 : 2)}vh`);
    hero.style.setProperty('--bowl-scale', (1 - move * (compact.matches ? 0.17 : 0.08)).toFixed(4));
    hero.style.setProperty('--intro-opacity', (1 - fade).toFixed(4));
    hero.style.setProperty('--intro-y', `${-fade * 24}px`);
    hero.style.setProperty('--menu-opacity', enter.toFixed(4));
    hero.style.setProperty('--menu-x', `${(1 - enter) * (compact.matches ? 32 : 100)}px`);
    hero.style.setProperty('--menu-y', `${(1 - enter) * 18}px`);
    hero.style.setProperty('--rule-scale', enter.toFixed(4));
    hero.classList.toggle('scene-transitioning', fade > 0.95);
  }
  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function measure() {
    scene.classList.toggle('scroll-enabled', !reducedMotion.matches);
    sceneTop = scene.getBoundingClientRect().top + scrollY;
    distance = Math.max(1, scene.offsetHeight - hero.offsetHeight);
    requestRender();
    syncPlayback();
  }
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  reducedMotion.addEventListener('change', measure);
  compact.addEventListener('change', measure);
  if ('IntersectionObserver' in window) {
    const playbackObserver = new IntersectionObserver(entries => {
      sceneVisible = entries[0].isIntersecting;
      syncPlayback();
    });
    playbackObserver.observe(scene);
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.menu-topline, .menu-heading, .menu-tabs, .menu-layout, .menu-note').forEach(element => {
      revealObserver.observe(element);
      element.classList.add('scroll-reveal');
    });
  }
  document.addEventListener('visibilitychange', syncPlayback);
  measure();
})();
