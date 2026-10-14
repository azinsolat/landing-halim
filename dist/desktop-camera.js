(async () => {
  await customElements.whenDefined('model-viewer');
  const model = document.querySelector('#bowl-model');
  if (!model) return;
  const desktop = matchMedia('(min-width:901px)');
  const original = { orbit:model.cameraOrbit, target:model.cameraTarget, fov:model.fieldOfView,
    maxOrbit:model.maxCameraOrbit, minFov:model.minFieldOfView, maxFov:model.maxFieldOfView };
  let frame = 0, adapted = false, rotationRadius = null;

  const getRotationRadius = (size, center) => {
    if (rotationRadius !== null) return rotationRadius;
    const fallback = Math.hypot(size.x, size.z) / 2;
    // The locally pinned viewer already exposes this scene to bowl-lighting.
    // Measure the actual handles once per load; bounding-box corners would
    // add empty space that is not occupied by any part of the rotating bowl.
    const sceneKey = Object.getOwnPropertySymbols(model).find(key => key.description === 'scene');
    const scene = sceneKey ? model[sceneKey] : null;
    if (!scene?.model || !scene.camera?.position) return fallback;
    scene.model.updateWorldMatrix(true, true);
    const inverse = scene.model.matrixWorld.clone().invert();
    const point = scene.camera.position.clone();
    let radius = 0;
    scene.model.traverse(mesh => {
      const position = mesh.geometry?.attributes?.position;
      if (!position) return;
      const matrix = inverse.clone().multiply(mesh.matrixWorld);
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(matrix);
        radius = Math.max(radius, Math.hypot(point.x - center.x, point.z - center.z));
      }
    });
    rotationRadius = radius > 0 && Number.isFinite(radius) ? radius : fallback;
    return rotationRadius;
  };

  const fit = () => {
    frame = 0;
    if (!desktop.matches) {
      if (adapted) {
        model.cameraOrbit = original.orbit;
        model.cameraTarget = original.target;
        model.fieldOfView = original.fov;
        model.maxCameraOrbit = original.maxOrbit;
        model.minFieldOfView = original.minFov;
        model.maxFieldOfView = original.maxFov;
        model.jumpCameraToGoal();
        adapted = false;
      }
      return;
    }
    if (!model.loaded || !model.clientWidth || !model.clientHeight) return;
    const size = model.getDimensions();
    const center = model.getBoundingBoxCenter();
    const aspect = model.clientWidth / model.clientHeight;
    const phi = 52 * Math.PI / 180;
    const tanHalfFov = Math.tan(32 * Math.PI / 360);
    // A cylinder enclosing the bounds keeps both handles visible at every
    // turntable angle. Perspective depth is included, not just a 2D width fit.
    const radius = getRotationRadius(size, center);
    const halfHeight = size.y / 2;
    const fill = .95;
    let distance = 0;
    for (let i = 0; i < 96; i++) {
      const angle = i / 96 * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      for (const y of [-halfHeight, halfHeight]) {
        const depth = y * Math.cos(phi) + z * Math.sin(phi);
        const vertical = y * Math.sin(phi) - z * Math.cos(phi);
        distance = Math.max(distance,
          depth + Math.abs(x) / (tanHalfFov * aspect * fill),
          depth + Math.abs(vertical) / (tanHalfFov * fill));
      }
    }
    // model-viewer's own ResizeObserver updates the canvas and camera aspect.
    // Keep the original lens and polar angle; change distance/target to fit.
    // Compensate for model-viewer's automatic widening in tall containers,
    // so the rendered vertical lens stays at 32° across aspect ratios.
    const aspectCorrection = Math.max(1, model.getIdealAspect() / aspect);
    const nominalFov = `${(2 * Math.atan(tanHalfFov / aspectCorrection) * 180 / Math.PI).toFixed(6)}deg`;
    model.fieldOfView = nominalFov;
    // Explicit limits prevent the viewer's automatic zoom bounds from
    // clamping this container-specific distance or the original 32° lens.
    model.minFieldOfView = nominalFov;
    model.maxFieldOfView = nominalFov;
    model.maxCameraOrbit = `auto auto ${(distance * 1.05).toFixed(6)}m`;
    model.cameraTarget = `${center.x}m ${center.y}m ${center.z}m`;
    model.cameraOrbit = `0deg 52deg ${distance.toFixed(6)}m`;
    model.jumpCameraToGoal();
    adapted = true;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(fit);
  };
  new ResizeObserver(schedule).observe(model);
  model.addEventListener('load', () => { rotationRadius = null; schedule(); });
  desktop.addEventListener('change', schedule);
  window.visualViewport?.addEventListener('resize', schedule, {passive:true});
  schedule();
})();
