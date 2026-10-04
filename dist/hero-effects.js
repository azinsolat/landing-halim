(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  const bowl = hero?.querySelector('.hero-bowl-image');
  if (!hero || !bowl) return;
  const still = bowl.getAttribute('src');
  const film = 'assets/hero-film.webp';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false, ready = false, failed = false, requested = false;
  function update() {
    const play = visible && !document.hidden && !motion.matches;
    if (play && !requested && !failed) {
      requested = true;
      const preload = new Image();
      preload.onload = () => { ready = true; update(); };
      preload.onerror = () => { failed = true; update(); };
      preload.src = film;
    }
    const next = play && ready && !failed ? film : still;
    if (bowl.getAttribute('src') !== next) bowl.setAttribute('src', next);
    hero.dataset.motion = next === film ? 'film' : 'still';
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    update();
  }, { threshold: 0.08 });
  observer.observe(hero);
  document.addEventListener('visibilitychange', update);
  motion.addEventListener('change', update);
  window.addEventListener('pagehide', () => { visible = false; update(); });
  window.addEventListener('pageshow', () => { observer.unobserve(hero); observer.observe(hero); });
})();
