(() => {
  'use strict';
  // All x/y values are fractions of the full bowl image, measured from its top-left.
  const CONFIG = {
    duration: 5.8,
    emitter: { x: 0.493, y: 0.448, spread: 0.042 },
    steamSources: [{ x: 0.37, y: 0.36 }, { x: 0.46, y: 0.32 }, { x: 0.56, y: 0.34 }, { x: 0.64, y: 0.37 }],
    cinnamon: { particlesPerSecond: 1900, maxParticles: 1400, speed: 0.94, size: [0.35, 0.9], pourStart: 0.35, pourEnd: 3.8, shutter: 0.009, spiralRadius: 0.023, spiralTurns: 1.65, spiralSpeed: 2.4 },
    deposit: { width: 0.063, height: 0.06, grains: 8600, fadeStart: 4.65 }
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
  let depositedGrains = 0;
  let visible = false, disposed = false, suspended = false;
  let seed = 53;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const grains = Array.from({ length: CONFIG.deposit.grains }, () => {
    const angle = random() * Math.PI * 2;
    const edge = 0.9 + 0.045 * Math.sin(angle * 3 + 0.5) + 0.035 * Math.sin(angle * 7);
    const radius = Math.pow(random(), 0.68) * edge;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
      arrival: random() * 0.6 + radius * radius * 0.4,
      size: 0.22 + random() * 0.55, alpha: 0.24 + random() * 0.44, shade: Math.floor(112 + random() * 76) };
  }).sort((a, b) => a.arrival - b.arrival);
  const smooth = (a, b, value) => {
    const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  function cacheDeposit() {
    const w = CONFIG.deposit.width * width * 2, h = CONFIG.deposit.height * height * 2;
    texture.width = Math.max(1, Math.ceil((w + 4) * dpr));
    texture.height = Math.max(1, Math.ceil((h + 4) * dpr));
    textureContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    depositedGrains = 0;
  }
  function resetDeposit() {
    depositedGrains = 0;
    textureContext.clearRect(0, 0, texture.width / dpr, texture.height / dpr);
  }
  function accumulateDeposit() {
    // Add individual specks only after impacts. Already deposited specks stay fixed;
    // the denser center builds first, with scattered grains and a ragged outer edge.
    const count = Math.min(grains.length, Math.floor(hits / (CONFIG.cinnamon.particlesPerSecond * 2.65) * grains.length));
    const w = CONFIG.deposit.width * width * 2, h = CONFIG.deposit.height * height * 2;
    while (depositedGrains < count) {
      const grain = grains[depositedGrains++];
      textureContext.fillStyle = `rgba(${grain.shade},${Math.floor(grain.shade * 0.55)},${Math.floor(grain.shade * 0.23)},${grain.alpha})`;
      textureContext.beginPath();
      textureContext.ellipse(w / 2 + 2 + grain.x * w / 2, h / 2 + 2 + grain.y * h / 2,
        grain.size * Math.max(0.7, width / 950), grain.size * Math.max(0.45, width / 1400), 0, 0, Math.PI * 2);
      textureContext.fill();
    }
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
        const rise = height * (0.11 + phase * 0.45);
        const gradient = context.createLinearGradient(0, baseY, 0, baseY - rise);
        gradient.addColorStop(0, 'rgba(255,252,244,0)');
        gradient.addColorStop(0.18, `rgba(255,252,244,${0.48 * envelope})`);
        gradient.addColorStop(0.64, `rgba(178,173,162,${0.32 * envelope})`);
        gradient.addColorStop(1, 'rgba(255,252,244,0)');
        context.strokeStyle = gradient; context.lineWidth = Math.max(2, width * 0.0045);
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
    const fade = 1 - smooth(CONFIG.deposit.fadeStart, CONFIG.duration, cycle);
    if (hits <= 0 || fade <= 0) return;
    accumulateDeposit();
    const context = contexts[1];
    const w = texture.width / dpr, h = texture.height / dpr;
    context.save(); context.globalAlpha = fade;
    context.drawImage(texture, CONFIG.emitter.x * width - w / 2, top + CONFIG.emitter.y * height - h / 2, w, h);
    context.restore();
  }
  function fallingX(particle, y) {
    const flight = Math.min(1, Math.max(0, y / particle.target));
    // A shared rotating helix keeps the powder in a visible winding stream.
    // Taper its radius to zero at impact so it still lands in the same gap.
    const angle = flight * Math.PI * 2 * CONFIG.cinnamon.spiralTurns
      - elapsed * CONFIG.cinnamon.spiralSpeed + particle.swirl;
    const radius = width * CONFIG.cinnamon.spiralRadius * (1 - smooth(0.65, 1, flight));
    return particle.originX + (particle.landingX - particle.originX) * flight
      + Math.sin(angle) * radius;
  }
  function tick(timestamp) {
    frame = 0;
    const dt = previous ? Math.min((timestamp - previous) / 1000, 0.05) : 0;
    previous = timestamp;
    const lastCycle = Math.floor(elapsed / CONFIG.duration);
    elapsed += dt;
    if (Math.floor(elapsed / CONFIG.duration) !== lastCycle) { hits = 0; carry = 0; particles.length = 0; resetDeposit(); }
    const cycle = elapsed % CONFIG.duration;
    // Slight changes in flow make the stream behave like poured fine powder.
    const flow = 0.91 + 0.06 * Math.sin(cycle * 13) + 0.03 * Math.sin(cycle * 31);
    const rate = CONFIG.cinnamon.particlesPerSecond * flow
      * smooth(CONFIG.cinnamon.pourStart, CONFIG.cinnamon.pourStart + 0.5, cycle)
      * (1 - smooth(CONFIG.cinnamon.pourEnd - 0.5, CONFIG.cinnamon.pourEnd, cycle));
    carry += rate * dt;
    const targetY = top + CONFIG.emitter.y * height;
    while (carry >= 1) {
      carry--;
      if (particles.length >= CONFIG.cinnamon.maxParticles) continue;
      const offset = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      const depth = (Math.random() + Math.random() - 1);
      const originX = CONFIG.emitter.x * width + offset * CONFIG.emitter.spread * width * 0.62;
      const landingX = CONFIG.emitter.x * width + offset * CONFIG.deposit.width * width * 0.88;
      particles.push({ x: originX, originX, landingX, y: -3,
        target: targetY + depth * CONFIG.deposit.height * height * 0.82,
        velocity: (height + top) * CONFIG.cinnamon.speed * (0.72 + Math.random() * 0.18),
        gravity: (height + top) * 0.5,
        phase: Math.random() * Math.PI * 2, swirl: (Math.random() - 0.5) * 0.65,
        size: CONFIG.cinnamon.size[0] + Math.random() * (CONFIG.cinnamon.size[1] - CONFIG.cinnamon.size[0]),
        shade: Math.floor(140 + Math.random() * 46), alpha: 0.2 + Math.random() * 0.34 });
    }
    clear(); drawSteam(cycle);
    const context = contexts[2];
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.velocity += particle.gravity * dt;
      particle.y += particle.velocity * dt;
      if (particle.y >= particle.target) { particles.splice(i, 1); hits++; continue; }
      const x = fallingX(particle, particle.y);
      const color = `${particle.shade},${Math.floor(particle.shade * 0.55)},${Math.floor(particle.shade * 0.22)}`;
      // Short, translucent exposure streaks, followed by a sharp powder grain.
      // The trail ends at the grain; nothing is drawn below its impact point.
      const trail = Math.min(6, particle.velocity * CONFIG.cinnamon.shutter);
      context.strokeStyle = `rgba(${color},${particle.alpha * 0.32})`;
      context.lineWidth = Math.max(0.3, particle.size * 0.72);
      context.beginPath(); context.moveTo(fallingX(particle, particle.y - trail), particle.y - trail); context.lineTo(x, particle.y); context.stroke();
      context.fillStyle = `rgba(${color},${particle.alpha})`;
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
    if (motion.matches) { particles.length = 0; elapsed = 0; hits = 0; carry = 0; resetDeposit(); clear(); }
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
