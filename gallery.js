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

  document.querySelector('.site-name a[href="#top"]')?.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    stop();
    if (window.location.hash !== '#top') history.pushState(null, '', '#top');
    const start = window.scrollY;
    if (reducedMotion.matches || start === 0) {
      window.scrollTo(0, 0);
      return;
    }
    targetIndex = 0;
    const duration = Math.min(3200, 1800 + start / 12);
    const started = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - started) / duration);
      const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      window.scrollTo(0, start * (1 - eased));
      if (progress < 1) animation = requestAnimationFrame(step);
      else stop();
    }
    animation = requestAnimationFrame(step);
  });

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

  const albumNav = document.querySelector('.album-nav');
  if (albumNav) {
    const links = [...albumNav.querySelectorAll('a')];
    links.forEach(link => link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute('href');
      const photo = document.getElementById(hash.slice(1));
      if (!photo) return;
      event.preventDefault();
      stop();
      if (window.location.hash !== hash) history.pushState(null, '', hash);
      const start = window.scrollY;
      const bounds = photo.getBoundingClientRect();
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const destination = Math.max(0, Math.min(maximum,
        start + bounds.top + bounds.height / 2 - window.innerHeight / 2
      ));
      if (reducedMotion.matches) {
        window.scrollTo(0, destination);
        return;
      }
      targetIndex = photos.indexOf(photo);
      // Longer journeys get more time, with a soft start and finish.
      const duration = Math.min(3200, 1800 + Math.abs(destination - start) / 12);
      const started = performance.now();
      function step(now) {
        const progress = Math.min(1, (now - started) / duration);
        const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
        window.scrollTo(0, start + (destination - start) * eased);
        if (progress < 1) animation = requestAnimationFrame(step);
        else stop();
      }
      animation = requestAnimationFrame(step);
    }));
    const photoAlbums = photos.map(photo =>
      photo.querySelector('.photo-name').textContent.trim().match(/^[A-Z]+/)?.[0]
    );
    const underline = document.createElement('span');
    underline.className = 'album-underline';
    underline.setAttribute('aria-hidden', 'true');
    albumNav.append(underline);
    let pending = false;

    function updateAlbum() {
      pending = false;
      const album = photoAlbums[nearestPhoto()];
      const active = links.find(link => link.textContent.trim() === album);
      if (!active) return;
      links.forEach(link => {
        if (link === active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      const navBounds = albumNav.getBoundingClientRect();
      let from = active.getBoundingClientRect();
      let to = from;
      let progress = 0;
      const center = window.innerHeight / 2;
      // Interpolate across the last photo of one album and the first of the next.
      // Stopping between them leaves the underline stretched at that position.
      if (!reducedMotion.matches) {
        for (let i = 0; i < photos.length - 1; i++) {
          if (photoAlbums[i] === photoAlbums[i + 1]) continue;
          const before = photos[i].getBoundingClientRect();
          const after = photos[i + 1].getBoundingClientRect();
          const start = before.top + before.height / 2;
          const end = after.top + after.height / 2;
          if (center < start || center > end) continue;
          from = links.find(link => link.textContent.trim() === photoAlbums[i]).getBoundingClientRect();
          to = links.find(link => link.textContent.trim() === photoAlbums[i + 1]).getBoundingClientRect();
          progress = (center - start) / (end - start);
          break;
        }
      }
      const ease = value => {
        const t = Math.max(0, Math.min(1, value));
        return t * t * (3 - 2 * t);
      };
      const leading = ease(progress / .85);
      const trailing = ease((progress - .15) / .85);
      const rightward = to.left >= from.left;
      const leftProgress = rightward ? trailing : leading;
      const rightProgress = rightward ? leading : trailing;
      const left = from.left + (to.left - from.left) * leftProgress;
      const right = from.right + (to.right - from.right) * rightProgress;
      underline.style.left = `${left - navBounds.left}px`;
      underline.style.right = `${navBounds.right - right}px`;
    }

    function scheduleAlbumUpdate() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(updateAlbum);
    }

    window.addEventListener('scroll', scheduleAlbumUpdate, { passive: true });
    window.addEventListener('resize', scheduleAlbumUpdate);
    window.addEventListener('pageshow', scheduleAlbumUpdate);
    document.fonts.ready.then(scheduleAlbumUpdate);
    reducedMotion.addEventListener('change', scheduleAlbumUpdate);
    updateAlbum();
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
