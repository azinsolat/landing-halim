(() => {
  const scene = document.querySelector('.hero-scroll-scene');
  const hero = scene.querySelector('.hero');
  const model = scene.querySelector('#bowl-model');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const layer = document.createElement('canvas');
  layer.className = 'sugar-animation';
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2' });
  hero.append(layer);
  const ctx = layer.getContext('2d');
  const hand = new Image();
  hand.src = 'assets/sugar-hand-woman.webp?v=20261013-lossless';
  const handPoses = [];
  // Bake a continuous deformation of the photographed fingers, keeping the wrist fixed.
  const prepareHandPoses = () => {
    if (handPoses.length || !hand.naturalWidth) return;
    const w = 384, h = 576, cols = 16, rows = 28;
    const deform = (x, y, amount, rub) => {
      const finger = Math.exp(-Math.pow((y / h - .78) / .105, 2));
      const index = Math.exp(-Math.pow((x / w - .78) / .12, 2));
      const thumb = Math.exp(-Math.pow((x / w - .60) / .07, 2));
      return { x: x + amount * finger * (index * 12 - thumb * 7),
        y: y + finger * (amount * index * 3.5 + rub * (thumb * 5 - index * 2.5)) };
    };
    for (let pose = 0; pose < 24; pose++) {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const brush = canvas.getContext('2d');
      const phase = pose / 24 * Math.PI * 2;
      const amount = (1 - Math.cos(phase)) / 2;
      const rub = Math.sin(phase);
      const triangle = points => {
        const [a,b,c] = points;
        const [p,q,r] = points.map(v => deform(v.x,v.y,amount,rub));
        const det = (b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);
        const ax = ((q.x-p.x)*(c.y-a.y)-(r.x-p.x)*(b.y-a.y))/det;
        const bx = ((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(c.x-a.x))/det;
        const ay = ((q.y-p.y)*(c.y-a.y)-(r.y-p.y)*(b.y-a.y))/det;
        const by = ((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(c.x-a.x))/det;
        // Overlap clip edges slightly to avoid antialiasing seams in the cached mesh.
        const center = { x:(p.x+q.x+r.x)/3, y:(p.y+q.y+r.y)/3 };
        const expand = v => { const dx=v.x-center.x, dy=v.y-center.y, length=Math.hypot(dx,dy); return {x:v.x+dx/length*.7,y:v.y+dy/length*.7}; };
        const [ep,eq,er]=[p,q,r].map(expand);
        brush.save(); brush.beginPath(); brush.moveTo(ep.x,ep.y); brush.lineTo(eq.x,eq.y); brush.lineTo(er.x,er.y); brush.closePath(); brush.clip();
        brush.setTransform(ax,ay,bx,by,p.x-ax*a.x-bx*a.y,p.y-ay*a.x-by*a.y);
        brush.drawImage(hand,0,0,w,h); brush.restore();
      };
      for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) {
        const a={x:x*w/cols,y:y*h/rows}, b={x:(x+1)*w/cols,y:y*h/rows};
        const c={x:x*w/cols,y:(y+1)*h/rows}, d={x:(x+1)*w/cols,y:(y+1)*h/rows};
        triangle([a,b,c]); triangle([b,d,c]);
      }
      handPoses.push(canvas);
    }
  };
  let progress = 0, state = 'idle', elapsed = 0, previous = 0, frame = 0, emission = 0;
  let width = 0, height = 0;
  let releaseEndedAt = null;
  let inView = true;
  const flying = [];
  let sugarMaterials = [], sugarOpacity = [];
  const revealSugar = () => {
    const coverage = deposits / maxDeposits * 6;
    sugarMaterials.forEach((material,index) => {
      const alpha = smooth(coverage - index) * .92;
      if (Math.abs(alpha - (sugarOpacity[index] ?? -1)) > .025 || alpha === 0 || alpha === .92) {
        if (alpha === sugarOpacity[index]) return;
        material.pbrMetallicRoughness.setBaseColorFactor([1,1,1,alpha]);
        sugarOpacity[index] = alpha;
      }
    });
  };
  const maxFlying = 160;
  const maxDeposits = 6500;
  let deposits = 0;
  let cycleDeposits = 0;
  const complete = () => scene.dispatchEvent(new CustomEvent('bowl-pour-complete'));
  // Matte, irregular sugar grains: tiny off-white solids with no glitter facets.
  const crystals = Array.from({ length: 12 }, (_, index) => {
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 16;
    const brush = sprite.getContext('2d'); brush.translate(8,8); brush.rotate(index * 2.399);
    brush.beginPath(); brush.moveTo(-4,-3); brush.lineTo(1,-4); brush.lineTo(4,-1);
    brush.lineTo(3,3); brush.lineTo(-2,4); brush.lineTo(-4,1); brush.closePath();
    brush.fillStyle = 'rgba(255,255,255,.98)'; brush.fill();
    brush.beginPath(); brush.moveTo(-3,-2); brush.lineTo(1,-3); brush.lineTo(0,0); brush.closePath();
    brush.fillStyle = 'rgba(255,255,255,.60)'; brush.fill();
    return sprite;
  });
  const resize = () => {
    width = hero.clientWidth; height = hero.clientHeight;
    // This decorative layer does not need a full retina-sized framebuffer.
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    layer.width = Math.round(width * dpr); layer.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(resize).observe(hero);
  const project = name => {
    const point = model.queryHotspot(name)?.canvasPosition;
    if (!point) return null;
    const rect = model.getBoundingClientRect(), parent = hero.getBoundingClientRect();
    return { x: rect.left - parent.left + point.x * rect.width / model.clientWidth,
      y: rect.top - parent.top + point.y * rect.height / model.clientHeight };
  };
  const clear = () => {
    cancelAnimationFrame(frame); frame = 0;
    flying.length = 0; deposits = 0; cycleDeposits = 0; releaseEndedAt = null;
    sugarOpacity = [];
    revealSugar();
    ctx.clearRect(0, 0, width, height); elapsed = emission = 0; state = 'idle';
  };
  const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const draw = now => {
    frame = 0;
    if (document.hidden || motion.matches || !inView) return;
    const dt = Math.min((now - previous) / 1000 || 0, .1); previous = now;
    elapsed += dt;
    ctx.clearRect(0, 0, width, height);
    const anchor = project('hotspot-steam');
    if (!anchor) { frame = requestAnimationFrame(draw); return; }
    // This overlay never adds nodes to, raycasts, or adjusts the 3D viewer.
    // All settled sugar is positioned relative to the bowl's live surface anchor.
    const rect = model.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * .24;
    const turn = -model.turntableRotation;
    const cosine = Math.cos(turn), sine = Math.sin(turn);
    const scale = Math.min(1, width / 900);
    const compact = width <= 900;
    const handScale = compact ? Math.max(.32, Math.min(.48, rect.width / 550)) : Math.max(.38, Math.min(.85, height / 950)) * 1.14;
    // The mobile wrist extends beyond the top edge throughout the pour.
    const tipY = compact ? 271 * handScale - 18 : Math.max(70, Math.min(271 * handScale - 30, anchor.y - 110 * Math.max(.7, scale)));
    // Reserved grains exhaust the pinch before the last falling grains land.
    if (releaseEndedAt === null && (elapsed >= 5.8 || cycleDeposits + flying.length * 5 >= maxDeposits)) {
      releaseEndedAt = elapsed;
      emission = 0;
    }
    const enter = smooth(elapsed / .9);
    const exit = releaseEndedAt === null ? 0 : smooth((elapsed - releaseEndedAt) / .55);
    const pouring = elapsed > 1 && releaseEndedAt === null;
    const pinchPhase = (elapsed - 1) * 6.8;
    const shake = pouring ? Math.sin(pinchPhase) * .8 * scale : 0;
    const tipX = anchor.x + Math.sin((elapsed - 1) * 1.3) * radius * .45 + shake;
    const lift = (1 - enter + exit) * (tipY + 100);
    if (state === 'pouring' && exit < 1 && progress > .94) {
      ctx.save(); ctx.globalAlpha = enter * (1 - exit);
      ctx.translate(tipX, tipY - lift);
      ctx.rotate((-.07 + Math.sin(elapsed * 2.3) * .035 + (pouring ? Math.sin(pinchPhase) * .012 : 0)) * enter);
      const pose = pouring && handPoses.length ? handPoses[Math.floor(((pinchPhase % (Math.PI * 2)) / (Math.PI * 2)) * handPoses.length)] : hand;
      ctx.drawImage(pose, -136 * handScale, -271 * handScale, 213.333 * handScale, 320 * handScale); ctx.restore();
    }
    if (pouring && progress > .94) {
      // Rubbing fingers releases brief uneven handfuls, with real gaps between them.
      const release = Math.max(0, Math.sin(pinchPhase - .35));
      const rate = (300 + 680 * Math.pow(release, .7)) * (.85 + Math.random() * .30);
      emission = Math.min(32, emission + dt * rate * smooth((elapsed - 1) / .18) * (1 - smooth((elapsed - 5.4) / .4)));
      while (emission >= 1) {
        emission--;
        if (flying.length >= maxFlying || cycleDeposits + flying.length * 5 >= maxDeposits) break;
        // A narrow stream leaves the pinch and carries a little sideways momentum.
        // Landing follows the hand; grains never fan toward arbitrary points of the bowl.
        const landingX = Math.max(-.82, Math.min(.82, (tipX - anchor.x) / radius + (Math.random() + Math.random() - 1) * .42));
        const landingZ = Math.sin((elapsed - 1) * 1.6) * .23 + (Math.random() + Math.random() - 1) * .42;
        const startY = tipY + (Math.random() - .5) * 2 * scale;
        const fall = Math.max(20, anchor.y + landingZ * radius * .55 - startY);
        const gravity = (1750 + Math.random() * 180) * Math.max(.65, scale);
        const velocityY = (8 + Math.random() * 22) * scale;
        const duration = (Math.sqrt(velocityY * velocityY + 2 * gravity * fall) - velocityY) / gravity;
        flying.push({ landingX, landingZ, age: -Math.random() * dt, duration, gravity, velocityY,
          startX: tipX + (Math.random() - .5) * 2.5 * scale, startY,
          targetX: anchor.x + landingX * radius,
          crystal: Math.floor(Math.random() * crystals.length), alpha: .78 + Math.random() * .2,
          size: (2 + Math.random() * 1.8) * Math.max(.8, scale),
          tumble: Math.random() * Math.PI * 2 });
      }
    }
    for (let i = flying.length - 1; i >= 0; i--) {
      const grain = flying[i];
      grain.age += dt;
      if (grain.age < 0) continue;
      const t = Math.min(1, grain.age / grain.duration);
      if (t === 1) {
        deposits = Math.min(maxDeposits, deposits + 5);
        cycleDeposits += 5;
        flying.splice(i, 1); continue;
      }
      const x = grain.startX + (grain.targetX - grain.startX) * t;
      const y = grain.startY + grain.velocityY * grain.age + .5 * grain.gravity * grain.age * grain.age;
      ctx.globalAlpha = grain.alpha;
      // Short exposure blur grows with falling speed; grains do not look like glowing dots.
      const blur = Math.min(2.8, (grain.velocityY + grain.gravity * grain.age) / 300);
      const breadth = grain.size * (.8 + .2 * Math.sin(grain.tumble + grain.age * 15));
      ctx.drawImage(crystals[grain.crystal], x - breadth / 2, y - (grain.size + blur) / 2, breadth, grain.size + blur);
    }
    // Settled crystals are actual geometry on the food, rendered by the 3D viewer.
    revealSugar();
    ctx.globalAlpha = 1;
    if (releaseEndedAt !== null && exit === 1 && flying.length === 0) {
      state = 'settled';
      complete();
      return;
    }
    frame = requestAnimationFrame(draw);
  };
  const start = () => {
    if (state !== 'idle' || Math.abs(progress - 1) > .005 || !model.loaded || !hand.naturalWidth || motion.matches || document.hidden || !inView) return;
    if (!model.queryHotspot('hotspot-steam')?.canvasPosition) return;
    elapsed = emission = cycleDeposits = 0; releaseEndedAt = null;
    state = 'pouring'; previous = performance.now(); frame = requestAnimationFrame(draw);
  };
  scene.addEventListener('bowl-scroll-progress', event => {
    progress = event.detail;
    if ((progress < .94 || progress > 1.35) && state === 'pouring') {
      state = 'settled'; releaseEndedAt = elapsed - .55;
      // Preserve grains already poured when the same bowl travels to the address.
      deposits = Math.min(maxDeposits, deposits + flying.length * 5);
      flying.length = 0; revealSugar();
      ctx.clearRect(0, 0, width, height);
      cancelAnimationFrame(frame); frame = 0;
      complete();
    }
    start();
  });
  scene.addEventListener('bowl-pour-request', event => {
    if (state === 'settled' && !event.detail.replay) { complete(); return; }
    if (state === 'settled') state = 'idle';
    start();
  });
  model.addEventListener('load', () => {
    sugarMaterials = model.model.materials.filter(material => material.name.startsWith('SettledSugar-'));
    sugarMaterials.forEach(material => {
      material.pbrMetallicRoughness.setMetallicFactor(0);
      material.pbrMetallicRoughness.setRoughnessFactor(1);
      // A neutral fill keeps white grains from turning gray in the moving rig.
      material.setEmissiveFactor([.65, .65, .65]);
    });
    sugarOpacity = []; revealSugar(); start();
  }); hand.addEventListener('load', () => { prepareHandPoses(); start(); });
  motion.addEventListener('change', () => { clear(); start(); });
  const resume = () => {
    if (document.hidden || !inView || motion.matches || frame) return;
    if (state === 'pouring') { previous = performance.now(); frame = requestAnimationFrame(draw); }
    else start();
  };
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!inView) { cancelAnimationFrame(frame); frame = 0; }
    else resume();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else resume();
  });
  resize();
})();
