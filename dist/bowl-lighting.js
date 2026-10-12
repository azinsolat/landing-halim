(async () => {
  await customElements.whenDefined('model-viewer');
  const model = document.querySelector('#bowl-model');
  if (!model) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true, frame = 0, previous = 0, elapsed = 0, lastPaint = 0;
  const baseExposure = 1.05;
  // This site ships a pinned local model-viewer build. Its Three scene lets
  // the studio rig move independently of the bowl and camera.
  const sceneKey = Object.getOwnPropertySymbols(model).find(key => key.description === 'scene');
  const scene = sceneKey ? model[sceneKey] : null;
  const movingRig = scene?.environmentRotation && typeof scene.queueRender === 'function';

  const finish = () => {
    // A satin ceramic finish catches the studio panels as the bowl rotates.
    // Keep the food and deposited sugar materials unchanged.
    model.model?.materials.forEach(material => {
      if (material.name === 'Warm darker cream #D6C3AC' ||
          material.name === 'Current motif repeated at 30 degrees') {
        material.pbrMetallicRoughness.setRoughnessFactor(.24);
      }
    });
    sync();
  };
  const paint = now => {
    elapsed += Math.min((now - previous) / 1000, .1);
    previous = now;
    // Sweep the actual HDR light rig around the ceramic every ten seconds.
    // The bright reflection moves across the curved surface, not the page.
    if (now - lastPaint >= 1000 / 24) {
      if (movingRig) {
        scene.environmentRotation.y = elapsed * Math.PI * 2 / 10;
        scene.queueRender();
      }
      // Retain the visible sweep with a slightly softer intensity change.
      model.exposure = baseExposure + .10 * Math.sin(elapsed * Math.PI * 2 / 10);
      lastPaint = now;
    }
    frame = requestAnimationFrame(paint);
  };
  function sync() {
    const active = model.loaded && visible && !document.hidden && !reduced.matches;
    if (active && !frame) {
      previous = performance.now();
      frame = requestAnimationFrame(paint);
    } else if (!active) {
      cancelAnimationFrame(frame);
      frame = 0;
      model.exposure = baseExposure;
      if (reduced.matches && movingRig) {
        scene.environmentRotation.y = 0;
        scene.queueRender();
      }
    }
  }
  model.addEventListener('load', finish);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(model);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  if (model.loaded) finish();
})();
