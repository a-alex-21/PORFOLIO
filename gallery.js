(() => {
  const photos = [...document.querySelectorAll('.photo')];
  if (!photos.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let targetIndex = null;
  let animation = null;

  function stop() {
    cancelAnimationFrame(animation);
    animation = null;
    targetIndex = null;
  }

  function nearestPhoto() {
    let nearest = 0;
    let distance = Infinity;
    photos.forEach((photo, index) => {
      const bounds = photo.getBoundingClientRect();
      const delta = Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2);
      if (delta < distance) {
        nearest = index;
        distance = delta;
      }
    });
    return nearest;
  }

  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof Element && event.target.closest(
      'input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="slider"]'
    )) return;

    const direction = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!direction) {
      if (['PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) stop();
      return;
    }
    event.preventDefault();
    // Holding a key should not race through the entire gallery.
    if (event.repeat) return;

    const current = targetIndex ?? nearestPhoto();
    const next = Math.max(0, Math.min(photos.length - 1, current + direction));
    if (next === current) return;
    stop();
    targetIndex = next;

    const start = window.scrollY;
    const bounds = photos[next].getBoundingClientRect();
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const destination = Math.max(0, Math.min(maximum,
      start + bounds.top + bounds.height / 2 - window.innerHeight / 2
    ));

    if (reducedMotion.matches) {
      window.scrollTo(0, destination);
      stop();
      return;
    }

    const started = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - started) / 1250);
      const eased = progress * progress * (3 - 2 * progress);
      window.scrollTo(0, start + (destination - start) * eased);
      if (progress < 1) animation = requestAnimationFrame(step);
      else stop();
    }
    animation = requestAnimationFrame(step);
  });

  // Let mouse, touch, and scrollbar interactions take over immediately.
  window.addEventListener('wheel', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('pointerdown', stop, { passive: true });
  window.addEventListener('resize', stop);
  reducedMotion.addEventListener('change', stop);
})();
