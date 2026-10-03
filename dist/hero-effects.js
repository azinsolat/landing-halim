(() => {
  'use strict';
  // All x/y values are fractions of the full bowl image, measured from its top-left.
  const CONFIG = {
    duration: 5.8,
    emitter: { x: 0.503, y: 0.43, spread: 0.016 },
    steamSources: [{ x: 0.37, y: 0.36 }, { x: 0.46, y: 0.32 }, { x: 0.56, y: 0.34 }, { x: 0.64, y: 0.37 }],
    cinnamon: { particlesPerSecond: 185, maxParticles: 240, speed: 1.2, size: [0.35, 0.95], pourEnd: 3.45 },
    deposit: { width: 0.032, height: 0.03, grains: 900, fadeStart: 4.65 }
  };
  const hero = document.querySelector('.hero');
  const bowl = hero?.querySelector('.hero-bowl-image');
  const stage = bowl?.parentElement;
  if (!bowl || !stage) return;
  const canvases = ['steam', 'cinnamon-surface', 'cinnamon-fall'].map(name => {
    const canvas = document.createElement('canvas');
    canvas.className = `hero-effects-canvas hero-${name}`;
    canvas.setAttribute('aria-hidden', 'true');
    stage.append(canvas);
    return canvas;
  });
  const contexts = canvases.map(canvas => canvas.getContext('2d'));
  if (contexts.some(context => !context)) return;
  const texture = document.createElement('canvas');
  const textureContext = texture.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const particles = [];
  let width = 0, height = 0, top = 0, dpr = 1;
  let frame = 0, previous = 0, elapsed = 0, carry = 0, hits = 0;
  let visible = false, disposed = false, suspended = false;
  let seed = 53;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const grains = Array.from({ length: CONFIG.deposit.grains }, () => {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * (0.78 + random() * 0.22);
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
      size: 0.25 + random() * 0.65, alpha: 0.18 + random() * 0.43, shade: Math.floor(85 + random() * 45) };
  });
  const smooth = (a, b, value) => {
    const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  function cacheDeposit() {
    const w = CONFIG.deposit.width * width * 2, h = CONFIG.deposit.height * height * 2;
    texture.width = Math.max(1, Math.ceil((w + 4) * dpr));
    texture.height = Math.max(1, Math.ceil((h + 4) * dpr));
    textureContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    grains.forEach(grain => {
      textureContext.fillStyle = `rgba(${grain.shade},${Math.floor(grain.shade * 0.55)},${Math.floor(grain.shade * 0.28)},${grain.alpha})`;
      textureContext.beginPath();
      textureContext.ellipse(w / 2 + 2 + grain.x * w / 2, h / 2 + 2 + grain.y * h / 2,
        grain.size * Math.max(0.7, width / 950), grain.size * Math.max(0.45, width / 1400), 0, 0, Math.PI * 2);
      textureContext.fill();
    });
  }
  function measure() {
    const box = bowl.getBoundingClientRect(), heroBox = hero.getBoundingClientRect();
    const nextTop = Math.max(0, box.top - heroBox.top), nextDpr = Math.min(devicePixelRatio || 1, 2);
    if (width === box.width && height === box.height && top === nextTop && dpr === nextDpr) return;
    width = box.width; height = box.height; top = nextTop; dpr = nextDpr;
    canvases.forEach((canvas, i) => {
      canvas.style.top = `${-top}px`;
      canvas.style.height = `${height + top}px`;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round((height + top) * dpr));
      contexts[i].setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    particles.length = 0; carry = 0; hits = 0; elapsed = 0; previous = 0;
    cacheDeposit(); clear();
  }
  function clear() { contexts.forEach(context => context.clearRect(0, 0, width, height + top)); }
  function drawSteam(time) {
    const context = contexts[0];
    const theta = time / CONFIG.duration * Math.PI * 2;
    context.save(); context.filter = 'blur(2.5px)'; context.lineCap = 'round';
    CONFIG.steamSources.forEach((source, i) => {
      for (let ribbon = 0; ribbon < 2; ribbon++) {
        const phase = (time / CONFIG.duration + i * 0.19 + ribbon * 0.5) % 1;
        const envelope = Math.sin(Math.PI * phase) ** 2;
        const baseX = source.x * width, baseY = top + source.y * height;
        const rise = height * (0.07 + phase * 0.28);
        const gradient = context.createLinearGradient(0, baseY, 0, baseY - rise);
        gradient.addColorStop(0, 'rgba(255,252,244,0)');
        gradient.addColorStop(0.18, `rgba(255,252,244,${0.28 * envelope})`);
        gradient.addColorStop(0.64, `rgba(238,230,211,${0.18 * envelope})`);
        gradient.addColorStop(1, 'rgba(255,252,244,0)');
        context.strokeStyle = gradient; context.lineWidth = Math.max(1.6, width * 0.0035);
        context.beginPath();
        for (let step = 0; step <= 28; step++) {
          const u = step / 28;
          const x = baseX + Math.sin(u * 8 + theta + i * 2) * width * 0.009 * u
            + Math.sin(u * 13 - theta * 2 + i) * width * 0.004 * u;
          const y = baseY - u * rise;
          if (step === 0) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.stroke();
      }
    });
    context.restore();
  }
  function drawDeposit(cycle) {
    const amount = smooth(0, CONFIG.cinnamon.particlesPerSecond * 2.6, hits);
    const fade = 1 - smooth(CONFIG.deposit.fadeStart, CONFIG.duration, cycle);
    if (amount <= 0 || fade <= 0) return;
    const context = contexts[1];
    const scale = 0.93 + amount * 0.07;
    const w = texture.width / dpr * scale, h = texture.height / dpr * scale;
    context.save(); context.globalAlpha = amount * fade * 0.85;
    context.drawImage(texture, CONFIG.emitter.x * width - w / 2, top + CONFIG.emitter.y * height - h / 2, w, h);
    context.restore();
  }
  function tick(timestamp) {
    frame = 0;
    const dt = previous ? Math.min((timestamp - previous) / 1000, 0.05) : 0;
    previous = timestamp;
    const lastCycle = Math.floor(elapsed / CONFIG.duration);
    elapsed += dt;
    if (Math.floor(elapsed / CONFIG.duration) !== lastCycle) { hits = 0; carry = 0; particles.length = 0; }
    const cycle = elapsed % CONFIG.duration;
    const rate = CONFIG.cinnamon.particlesPerSecond * smooth(0.1, 0.55, cycle)
      * (1 - smooth(CONFIG.cinnamon.pourEnd - 0.6, CONFIG.cinnamon.pourEnd, cycle));
    carry += rate * dt;
    const targetY = top + CONFIG.emitter.y * height;
    while (carry >= 1) {
      carry--;
      if (particles.length >= CONFIG.cinnamon.maxParticles) continue;
      const offset = (Math.random() + Math.random() - 1) * CONFIG.emitter.spread * width;
      particles.push({ x: CONFIG.emitter.x * width + offset, y: -3,
        target: targetY + (Math.random() - 0.5) * CONFIG.deposit.height * height,
        velocity: (height + top) * CONFIG.cinnamon.speed * (0.62 + Math.random() * 0.24),
        gravity: (height + top) * 0.65,
        drift: (Math.random() - 0.5) * width * 0.012,
        phase: Math.random() * Math.PI * 2,
        size: CONFIG.cinnamon.size[0] + Math.random() * (CONFIG.cinnamon.size[1] - CONFIG.cinnamon.size[0]),
        shade: Math.floor(95 + Math.random() * 48), alpha: 0.38 + Math.random() * 0.4 });
    }
    clear(); drawSteam(cycle);
    const context = contexts[2];
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.velocity += particle.gravity * dt;
      particle.y += particle.velocity * dt;
      particle.x += particle.drift * dt;
      if (particle.y >= particle.target) { particles.splice(i, 1); hits++; continue; }
      const x = particle.x + Math.sin(elapsed * 3 + particle.phase) * width * 0.001;
      context.fillStyle = `rgba(${particle.shade},${Math.floor(particle.shade * 0.56)},${Math.floor(particle.shade * 0.3)},${particle.alpha})`;
      context.beginPath();
      context.ellipse(x, particle.y, particle.size, particle.size * 0.72, particle.phase, 0, Math.PI * 2);
      context.fill();
    }
    drawDeposit(cycle);
    frame = requestAnimationFrame(tick);
  }
  function update() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; previous = 0;
    if (!disposed && !suspended && visible && !document.hidden && !motion.matches && bowl.complete && bowl.naturalWidth > 0 && width > 0) {
      frame = requestAnimationFrame(tick);
    }
    if (motion.matches) { particles.length = 0; elapsed = 0; hits = 0; carry = 0; clear(); }
  }
  const resize = new ResizeObserver(() => { measure(); update(); });
  resize.observe(hero); resize.observe(bowl);
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); });
  intersection.observe(hero);
  function loaded() { measure(); update(); }
  function pageShow() { suspended = false; measure(); update(); }
  function cleanup(event) {
    suspended = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0; previous = 0;
    if (event.persisted) return;
    disposed = true;
    resize.disconnect(); intersection.disconnect(); particles.length = 0;
    bowl.removeEventListener('load', loaded);
    motion.removeEventListener('change', update);
    document.removeEventListener('visibilitychange', update);
    window.removeEventListener('pagehide', cleanup); window.removeEventListener('pageshow', pageShow);
  }
  bowl.addEventListener('load', loaded);
  motion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pagehide', cleanup); window.addEventListener('pageshow', pageShow);
  measure(); update();
})();
