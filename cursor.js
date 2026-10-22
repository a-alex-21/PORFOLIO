(() => {
  const root = document.documentElement;
  const release = () => root.classList.remove('cursor-pressed');

  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button === 0) {
      root.classList.add('cursor-pressed');
    }
  }, true);
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
  // Avoid a stuck grab cursor after releasing outside the window or switching apps.
  window.addEventListener('blur', release);
  window.addEventListener('pageshow', release);
  document.addEventListener('visibilitychange', release);
  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' && !(event.buttons & 1)) release();
  }, true);
})();
