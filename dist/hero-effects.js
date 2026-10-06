(() => {
  'use strict';

  const scene = document.querySelector('.hero-scroll-scene');
  const hero = scene?.querySelector('.hero');
  const foreground = hero?.querySelector('.hero-video-main');
  if (!foreground) return;
  const menu = document.querySelector('.menu-section');
  const scrollVideo = hero.querySelector('.hero-video-scroll');
  let wantsScrollVideo = false;
  let scrollVideoReady = scrollVideo.readyState >= 2;
  let scrollVideoFailed = false;
  let firstVideoFailed = false;
  let activeVideo = foreground;
  let scrollMix = 0;
  let targetMix = 0;
  let lastFrameTime = 0;
  let secondPlaying = false;
  scrollVideo.addEventListener('playing', () => { secondPlaying = true; requestRender(); });

  function updateVideo() {
    const useSecond = scrollVideoReady && !scrollVideoFailed && (wantsScrollVideo || firstVideoFailed);
    const next = useSecond ? scrollVideo : foreground;
    targetMix = useSecond && secondPlaying ? (firstVideoFailed ? 1 : desiredMix) : 0;
    if (next !== activeVideo) {
      activeVideo = next;
      syncPlayback();
    }
  }
  scrollVideo.addEventListener('loadeddata', () => {
    scrollVideoReady = true;
    updateVideo();
  });
  scrollVideo.addEventListener('error', () => {
    scrollVideoFailed = true;
    updateVideo();
  });
  foreground.addEventListener('error', () => {
    firstVideoFailed = true;
    updateVideo();
  });

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 700px)');
  let frame = 0;
  let sceneTop = 0;
  let distance = 1;
  let sceneVisible = true;
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
  let desiredMix = 0;

  function syncPlayback() {
    if (document.hidden || reducedMotion.matches || !sceneVisible) {
      foreground.pause();
      scrollVideo.pause();
      return;
    }
    const request = activeVideo.play();
    if (request?.catch) request.catch(() => {});
    // The underlying clip keeps playing during the fade to avoid a frozen transition.
    if (activeVideo === scrollVideo && !firstVideoFailed && scrollMix < 1) foreground.play()?.catch(() => {});
    if (activeVideo === foreground && scrollMix < 0.002) scrollVideo.pause();
  }

  function render(time) {
    frame = 0;
    const delta = Math.min(50, lastFrameTime ? time - lastFrameTime : 16);
    lastFrameTime = time;
    const progress = reducedMotion.matches ? 0 : clamp((scrollY - sceneTop) / distance);
    desiredMix = ease((progress - 0.14) / 0.42);
    // Hysteresis prevents flickering when scrolling around the transition point.
    if (progress > 0.18) wantsScrollVideo = true;
    else if (progress < 0.08) wantsScrollVideo = false;
    updateVideo();
    scrollMix = reducedMotion.matches ? targetMix : scrollMix + (targetMix - scrollMix) * (1 - Math.exp(-delta / 130));
    if (Math.abs(targetMix - scrollMix) < 0.001) scrollMix = targetMix;
    hero.style.setProperty('--video-mix', scrollMix.toFixed(4));
    hero.style.setProperty('--video-reveal-y', `${(1 - scrollMix) * 10}px`);
    const move = ease((progress - 0.08) / 0.76);
    const fade = ease(progress / 0.38);
    const enter = ease((progress - 0.28) / 0.5);
    hero.style.setProperty('--bowl-x', `${-move * (compact.matches ? 15 : 23)}vw`);
    hero.style.setProperty('--bowl-y', `${move * (compact.matches ? -27 : 2)}vh`);
    hero.style.setProperty('--bowl-scale', (1 - move * (compact.matches ? 0.45 : 0.08)).toFixed(4));
    hero.style.setProperty('--intro-opacity', (1 - fade).toFixed(4));
    hero.style.setProperty('--intro-y', `${-fade * 24}px`);
    hero.style.setProperty('--menu-opacity', enter.toFixed(4));
    hero.style.setProperty('--menu-x', `${(1 - enter) * (compact.matches ? 32 : 100)}px`);
    hero.style.setProperty('--menu-y', `${(1 - enter) * 18}px`);
    hero.style.setProperty('--rule-scale', enter.toFixed(4));
    hero.classList.toggle('scene-transitioning', fade > 0.95);
    menu.inert = !reducedMotion.matches && enter < 0.15;
    if (Math.abs(targetMix - scrollMix) > 0.001) requestRender();
    else if (activeVideo === foreground && scrollMix === 0) scrollVideo.pause();
    else if (activeVideo === scrollVideo && scrollMix === 1) foreground.pause();
  }
  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function measure() {
    scene.classList.toggle('scroll-enabled', !reducedMotion.matches);
    if (reducedMotion.matches) {
      scene.after(menu);
      menu.classList.remove('hero-menu-intro');
    } else {
      hero.append(menu);
      menu.classList.add('hero-menu-intro');
    }
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
  }
  document.querySelectorAll('a[href="#menu"]').forEach(link => link.addEventListener('click', event => {
    if (reducedMotion.matches) return;
    event.preventDefault();
    window.scrollTo({ top: sceneTop + distance * 0.9, behavior: 'smooth' });
  }));
  document.addEventListener('visibilitychange', syncPlayback);
  measure();
  if (location.hash === '#menu' && !reducedMotion.matches) {
    requestAnimationFrame(() => window.scrollTo({ top: sceneTop + distance * 0.9, behavior: 'instant' }));
  }
})();
