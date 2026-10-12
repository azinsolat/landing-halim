(async () => {
  await customElements.whenDefined('model-viewer');
  const model = document.querySelector('#bowl-model');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'bowl-steam';
  canvas.setAttribute('aria-hidden', 'true');
  model.after(canvas);
  const ctx = canvas.getContext('2d');
  const source = document.createElement('span');
  source.slot = 'hotspot-steam';
  source.className = 'steam-source';
  source.dataset.normal = '0 1 0';
  source.setAttribute('aria-hidden', 'true');
  model.append(source);

  // Uneven, translucent mist patches overlap into wisps without hard edges.
  const mist = document.createElement('canvas');
  mist.width = mist.height = 128;
  const brush = mist.getContext('2d');
  for (let i = 0; i < 32; i++) {
    const x = 38 + Math.random() * 52;
    const y = 20 + Math.random() * 88;
    const radius = 10 + Math.random() * 22;
    const gradient = brush.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255,245,231,.17)');
    gradient.addColorStop(1, 'rgba(255,245,231,0)');
    brush.fillStyle = gradient;
    brush.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  let width = 0, height = 0, frame = 0, previous = 0, emission = 0;
  let visible = true;
  const particles = [];
  const resize = () => {
    width = model.clientWidth;
    height = model.clientHeight + 140;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  new ResizeObserver(resize).observe(model);
  const draw = now => {
    const dt = Math.min((now - previous) / 1000 || 0, .05);
    previous = now;
    ctx.clearRect(0, 0, width, height);
    const anchor = model.queryHotspot('hotspot-steam')?.canvasPosition;
    if (anchor && width && height) {
      const scale = Math.min(width, height - 140) / 450;
      emission += dt * 15;
      while (emission >= 1) {
        emission--;
        particles.push({ age: 0, life: 3.8 + Math.random() * 2,
          x: (Math.random() - .5) * 95, phase: Math.random() * Math.PI * 2,
          speed: 25 + Math.random() * 15, drift: (Math.random() - .5) * 12,
          size: 25 + Math.random() * 16, turn: (Math.random() - .5) * .6 });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        const t = p.age / p.life;
        if (t >= 1) { particles.splice(i, 1); continue; }
        const sway = Math.sin(p.age * 1.5 + p.phase) * (6 + p.age * 4);
        const x = anchor.x + (p.x + p.drift * p.age + sway) * scale;
        const y = anchor.y + 140 - (p.age * p.speed + 8) * scale;
        const size = (p.size + p.age * 12) * scale;
        ctx.save();
        ctx.globalAlpha = .15 * Math.sin(Math.PI * t) ** 1.4;
        ctx.translate(x, y);
        ctx.rotate(p.turn * p.age);
        ctx.drawImage(mist, -size / 2, -size, size, size * 1.8);
        ctx.restore();
      }
    }
    frame = requestAnimationFrame(draw);
  };
  const sync = () => {
    const active = model.loaded && !motion.matches && !document.hidden && visible;
    // Keep rotation independent of the steam and sugar overlays.
    model.autoRotate = !motion.matches;
    if (active && !frame) { previous = performance.now(); frame = requestAnimationFrame(draw); }
    if (!active) {
      cancelAnimationFrame(frame);
      frame = 0;
      particles.length = 0;
      emission = 0;
      ctx.clearRect(0, 0, width, height);
    }
  };
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(model);
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  model.addEventListener('load', () => {
    const center = model.getBoundingBoxCenter();
    const size = model.getDimensions();
    model.updateHotspot({ name: 'hotspot-steam',
      position: `${center.x} ${center.y + size.y * .38} ${center.z}` });
    resize();
    sync();
  });
  model.addEventListener('error', event => {
    // An unavailable custom light must not prevent the bowl from loading.
    if (event.detail?.type === 'loadfailure' && model.environmentImage) {
      const sourceUrl = model.src;
      model.environmentImage = null;
      model.src = null;
      requestAnimationFrame(() => { model.src = sourceUrl; });
      return;
    }
    model.querySelector('.model-status').textContent = 'نمای سه‌بعدی بارگذاری نشد؛ صفحه را دوباره باز کنید.';
  });
  sync();
})();
