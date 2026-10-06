(() => {
  'use strict';

  const hero = document.querySelector('.hero');
  const foreground = hero?.querySelector('.hero-video-main');
  if (!foreground) return;

  function syncPlayback() {
    if (document.hidden) {
      foreground.pause();
      return;
    }
    const request = foreground.play();
    if (request?.catch) request.catch(() => {});
  }
  document.addEventListener('visibilitychange', syncPlayback);
  syncPlayback();
})();
