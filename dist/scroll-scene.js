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
    cancelNavigation();
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
    const model = scene.querySelector('#bowl-model');
    if (!mobile.matches && model.loaded) {
      // Reserve a rotation-safe silhouette and center the details between it and the map.
      const size = model.getDimensions(), orbit = model.getCameraOrbit();
      let radius = Math.hypot(size.x, size.z) / 2;
      const key = Object.getOwnPropertySymbols(model).find(key => key.description === 'scene');
      const rendered = key && model[key];
      if (rendered?.model && rendered.camera?.position) {
        if (!model.addressRotationRadius) {
          const center = model.getBoundingBoxCenter();
          rendered.model.updateWorldMatrix(true, true);
          const inverse = rendered.model.matrixWorld.clone().invert();
          const point = rendered.camera.position.clone();
          let measured = 0;
          rendered.model.traverse(mesh => {
            const positions = mesh.geometry?.attributes?.position;
            if (!positions) return;
            const matrix = inverse.clone().multiply(mesh.matrixWorld);
            for (let i = 0; i < positions.count; i++) {
              point.fromBufferAttribute(positions, i).applyMatrix4(matrix);
              measured = Math.max(measured, Math.hypot(point.x - center.x, point.z - center.z));
            }
          });
          model.addressRotationRadius = measured;
        }
        radius = model.addressRotationRadius || radius;
      }
      const tanFov = Math.tan(model.getFieldOfView() * Math.PI / 360);
      let extent = 0;
      for (let i = 0; i < 96; i++) {
        const angle = i / 96 * Math.PI * 2;
        const depth = size.y / 2 * Math.abs(Math.cos(orbit.phi)) + radius * Math.sin(angle) * Math.sin(orbit.phi);
        extent = Math.max(extent, Math.abs(radius * Math.cos(angle)) / ((orbit.radius - depth) * tanFov));
      }
      hero.style.setProperty('--visit-bowl-left', `${w * .74 - model.clientHeight * visitScale * extent / 2}px`);
    }
    update(); paint();
  };
  scene.querySelector('#bowl-model').addEventListener('load', measure);
  let idleTimer = 0, direction = 1, lastScroll = scrollY, touching = false;
  let automatic = false, waitingForSugar = false, continuation = null;
  const sceneProgress = () => -scene.getBoundingClientRect().top / (hero.offsetHeight * 1.2);
  const settle = () => {
    if (reduced.matches || touching || automatic || waitingForSugar) return;
    const p = sceneProgress();
    if (p <= .015 || p >= 2.3) return;
    const destination = direction > 0 ? (p < 1.08 ? 1 : 2.3) : (p > .92 ? 1 : 0);
    navigateTo(destination);
  };
  addEventListener('scroll', () => {
    update();
    if (Math.abs(scrollY - lastScroll) > .5 && !automatic && !waitingForSugar) direction = scrollY > lastScroll ? 1 : -1;
    lastScroll = scrollY;
    clearTimeout(idleTimer);
    if (!automatic && !waitingForSugar) idleTimer = setTimeout(settle, 220);
  }, { passive: true });
  addEventListener('resize', measure, { passive: true });
  reduced.addEventListener('change', measure);
  mobile.addEventListener('change', measure);
  let navigationFrame = 0;
  const cancelNavigation = () => {
    cancelAnimationFrame(navigationFrame);
    navigationFrame = 0;
    automatic = waitingForSugar = false;
    continuation = null;
    clearTimeout(idleTimer);
  };
  addEventListener('wheel', cancelNavigation, { passive: true });
  addEventListener('touchstart', cancelNavigation, { passive: true });
  const menuScroller = menu.querySelector('.menu-scroll-content');
  let menuGesture = null;
  addEventListener('touchstart', event => {
    touching = true;
    menuGesture = null;
    if (!mobile.matches || reduced.matches || event.touches.length !== 1
      || !menuScroller.contains(event.target)) return;
    const touch = event.touches[0];
    // Decide at the start: reaching the edge during this swipe still reads
    // the menu; a fresh swipe at that edge can leave the menu scene.
    menuGesture = {
      id: touch.identifier, x: touch.clientX, y: touch.clientY,
      atBottom: menuScroller.scrollTop + menuScroller.clientHeight >= menuScroller.scrollHeight - 2,
      atTop: menuScroller.scrollTop <= 2
    };
  }, { passive: true });
  addEventListener('touchend', event => {
    touching = event.touches.length > 0;
    if (touching) return;
    const gesture = menuGesture;
    menuGesture = null;
    if (gesture) {
      const touch = [...event.changedTouches].find(item => item.identifier === gesture.id);
      if (!touch) return;
      const dy = gesture.y - touch.clientY;
      const dx = gesture.x - touch.clientX;
      if (Math.abs(dy) < 40 || Math.abs(dy) <= Math.abs(dx)) return;
      if (dy > 0 && gesture.atBottom) { direction = 1; navigateTo(2.3); }
      else if (dy < 0 && gesture.atTop) { direction = -1; navigateTo(0); }
      return;
    }
    idleTimer = setTimeout(settle, 220);
  }, { passive: true });
  addEventListener('touchcancel', () => { touching = false; menuGesture = null; }, { passive: true });
  addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancelNavigation();
  });
  const navigateTo = (stop, bypassCheckpoint = false) => {
    const p = sceneProgress();
    const crossesMenu = (p < .94 && stop > 1) || (p > 1.35 && stop < 1);
    const checkpoint = !bypassCheckpoint && (crossesMenu || stop === 1 || (stop === 0 && p > .6));
    const waypoint = checkpoint ? 1 : stop;
    continuation = checkpoint && stop !== 1 ? stop : null;
    const destination = scrollY + scene.getBoundingClientRect().top + hero.offsetHeight * 1.2 * waypoint;
    const origin = scrollY;
    const returning = p > 1.35 || direction < 0;
    automatic = true;
    const duration = Math.max(650, Math.min(2200, Math.abs(destination - origin) / hero.offsetHeight * 1100));
    const started = performance.now();
    const navigate = now => {
      const progress = clamp((now - started) / duration);
      scrollTo({ top: origin + (destination - origin) * ease(progress), behavior: 'instant' });
      navigationFrame = progress < 1 ? requestAnimationFrame(navigate) : 0;
      if (progress === 1) {
        automatic = false;
        clearTimeout(idleTimer);
        if (checkpoint) {
          waitingForSugar = true;
          scene.dispatchEvent(new CustomEvent('bowl-pour-request', { detail: { replay: returning } }));
        }
      }
    };
    navigationFrame = requestAnimationFrame(navigate);
  };
  scene.addEventListener('bowl-pour-complete', () => {
    if (!waitingForSugar) return;
    waitingForSugar = false;
    const stop = continuation;
    continuation = null;
    if (stop !== null) navigateTo(stop, true);
  });
  document.querySelectorAll('a[href="#menu"],a[href="#visit"]').forEach(link => link.addEventListener('click', event => {
    if (reduced.matches) return;
    event.preventDefault();
    cancelNavigation();
    navigateTo(link.hash === '#visit' ? 2.3 : 1);
  }));
  measure();
})();
