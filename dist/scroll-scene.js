(() => {
  const scene = document.querySelector('.hero-scroll-scene');
  const hero = scene.querySelector('.hero');
  const visual = scene.querySelector('.hero-visual');
  const menu = scene.querySelector('#menu');
  const visit = scene.querySelector('#visit');
  const addressShortcut = document.querySelector('.mobile-address-link');
  const intro = [...scene.querySelectorAll('.hero-content,.hero-copy,.hero-side,.hero-bottom')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:900px)');
  scene.classList.add('scroll-enabled');
  let current = 0, target = 0, raf = 0, previous = 0;
  let travelX = 0, travelY = 0, endScale = 1;
  let visitX = 0, visitY = 0, visitScale = 1;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = t => t * t * t * (t * (t * 6 - 15) + 10);
  const palette = getComputedStyle(document.documentElement);
  const rgb = hex => hex.trim().replace('#', '').match(/../g).map(value => parseInt(value, 16));
  const red = rgb(palette.getPropertyValue('--red'));
  const green = rgb(palette.getPropertyValue('--green'));
  const paint = () => {
    const colorProgress = ease(clamp((current - 1.05) / 1.25));
    const background = red.map((value, index) => Math.round(value + (green[index] - value) * colorProgress));
    document.documentElement.style.setProperty('--scene-background', `rgb(${background.join(',')})`);
    const menuProgress = clamp(current);
    const next = ease(clamp((current - 1.35) / .95));
    const p = ease(menuProgress);
    const startScale = mobile.matches ? 1.08 : 1.2;
    visual.style.transform = `translate3d(${travelX * p + (visitX - travelX) * next}px,${20 * (1 - p) + travelY * p + (visitY - travelY) * next}px,0) scale(${startScale + (endScale - startScale) * p + (visitScale - endScale) * next})`;
    const fade = 1 - ease(clamp(current / .42));
    intro.forEach(el => {
      el.style.opacity = fade;
      el.style.transform = `translate3d(0,${-32 * (1 - fade)}px,0)`;
      el.style.visibility = fade < .01 ? 'hidden' : 'visible';
      el.inert = fade < .1;
    });
    const reveal = ease(clamp((current - .3) / .6)) * (1 - ease(clamp((current - 1.35) / .4)));
    menu.style.opacity = reveal;
    menu.style.transform = `translate3d(${48 * (1 - reveal)}px,${20 * (1 - reveal)}px,0)`;
    menu.style.visibility = reveal > .001 ? 'visible' : 'hidden';
    menu.style.pointerEvents = reveal > .8 ? 'auto' : 'none';
    menu.inert = reveal < .8;
    visit.style.opacity = next;
    visit.style.transform = `translate3d(0,${24 * (1 - next)}px,0)`;
    visit.style.visibility = next > .001 ? 'visible' : 'hidden';
    visit.style.pointerEvents = next > .8 ? 'auto' : 'none';
    visit.inert = next < .8;
    const atAddress = next > .8;
    addressShortcut.classList.toggle('is-hidden', atAddress);
    addressShortcut.inert = atAddress;
    scene.dispatchEvent(new CustomEvent('bowl-scroll-progress', { detail: current }));
  };
  const tick = now => {
    const dt = Math.min((now - previous) / 1000 || 1 / 60, .05);
    previous = now;
    // Frame-rate independent catch-up softens wheel steps without a long delay.
    current += (target - current) * (1 - Math.exp(-14 * dt));
    if (Math.abs(target - current) < .0001) current = target;
    paint();
    raf = current === target ? 0 : requestAnimationFrame(tick);
  };
  const update = () => {
    if (reduced.matches) return;
    target = Math.max(0, Math.min(2.6, -scene.getBoundingClientRect().top / (hero.offsetHeight * 1.2)));
    if (!raf) { previous = performance.now(); raf = requestAnimationFrame(tick); }
  };
  const measure = () => {
    scene.classList.add('scroll-enabled');
    if (reduced.matches) {
      cancelAnimationFrame(raf); raf = 0;
      current = target = 0;
      document.documentElement.style.removeProperty('--scene-background');
      [visual, menu, visit, ...intro].forEach(el => { el.removeAttribute('style'); el.inert = false; });
      addressShortcut.classList.remove('is-hidden');
      addressShortcut.inert = false;
      scene.dispatchEvent(new CustomEvent('bowl-scroll-progress', { detail: 0 }));
      return;
    }
    const w = hero.clientWidth, h = hero.clientHeight;
    const centerX = visual.offsetLeft + visual.offsetWidth / 2;
    const centerY = visual.offsetTop + visual.offsetHeight / 2;
    endScale = mobile.matches ? .65 : .9;
    // Center the mobile bowl above the menu; retain desktop's left destination.
    const halfWidth = visual.offsetWidth * endScale / 2;
    const inset = Math.min(16, w * .04);
    const destinationX = Math.max(halfWidth + inset,
      Math.min(w - halfWidth - inset, w * (mobile.matches ? .5 : .26)));
    travelX = destinationX - centerX;
    travelY = h * (mobile.matches ? .30 : .61) - centerY;
    visitScale = mobile.matches ? .62 : .88;
    visitX = w * (mobile.matches ? .5 : .74) - centerX;
    visitY = h * (mobile.matches ? .79 : .57) - centerY;
    update(); paint();
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', measure, { passive: true });
  reduced.addEventListener('change', measure);
  mobile.addEventListener('change', measure);
  let navigationFrame = 0;
  const cancelNavigation = () => {
    cancelAnimationFrame(navigationFrame);
    navigationFrame = 0;
  };
  addEventListener('wheel', cancelNavigation, { passive: true });
  addEventListener('touchstart', cancelNavigation, { passive: true });
  addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancelNavigation();
  });
  document.querySelectorAll('a[href="#menu"],a[href="#visit"]').forEach(link => link.addEventListener('click', event => {
    if (reduced.matches) return;
    event.preventDefault();
    cancelNavigation();
    const destination = scrollY + scene.getBoundingClientRect().top + hero.offsetHeight * 1.2 * (link.hash === '#visit' ? 2.3 : 1);
    if (link.hash !== '#visit') {
      scrollTo({ top: destination, behavior: 'smooth' });
      return;
    }
    const origin = scrollY;
    const duration = 3300;
    const started = performance.now();
    const navigate = now => {
      const progress = clamp((now - started) / duration);
      scrollTo({ top: origin + (destination - origin) * ease(progress), behavior: 'instant' });
      navigationFrame = progress < 1 ? requestAnimationFrame(navigate) : 0;
    };
    navigationFrame = requestAnimationFrame(navigate);
  }));
  measure();
})();
