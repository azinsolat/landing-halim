(() => {
  const model = document.querySelector('#bowl-model');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sync = () => { model.autoRotate = !motion.matches && !document.hidden; };
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  model.addEventListener('load', sync);
  model.addEventListener('error', () => {
    model.querySelector('.model-status').textContent = 'نمای سه‌بعدی بارگذاری نشد؛ صفحه را دوباره باز کنید.';
  });
  sync();
})();
