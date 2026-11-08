(() => {
  const legacyAlbum = window.location.pathname.match(/^\/(?:albums\/(FG|KONICA)\.html|(FG|KONICA)\/index\.html)$/);
  if (legacyAlbum) {
    history.replaceState(history.state, '', `/${legacyAlbum[1] || legacyAlbum[2]}/` + window.location.search + window.location.hash);
  }
  const board = document.querySelector('.album-board');
  const photos = [...board.querySelectorAll('.album-photo')];
  const details = document.querySelector('.album-details');
  const compact = window.matchMedia('(max-width: 600px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let hovered = null;
  let focused = null;
  let tapped = null;
  let enlargedPhoto = null;
  let closing = false;
  let imageRequest = 0;
  const overlay = document.createElement('dialog');
  overlay.className = 'photo-overlay';
  overlay.tabIndex = -1;
  const enlargedImage = document.createElement('img');
  const overlayDetails = document.createElement('div');
  overlayDetails.className = 'overlay-details';
  overlayDetails.setAttribute('aria-live', 'polite');
  overlayDetails.setAttribute('aria-atomic', 'true');
  overlay.append(overlayDetails, enlargedImage);
  document.body.append(overlay);

  function openPhoto(photo) {
    if (overlay.open) return;
    showPhoto(photo);
    document.body.classList.add('photo-open');
    overlay.showModal();
    overlay.focus();
  }

  function cyclePhoto(direction) {
    if (!overlay.open || closing || !enlargedPhoto) return;
    const index = photos.indexOf(enlargedPhoto);
    showPhoto(photos[(index + direction + photos.length) % photos.length]);
  }

  function showPhoto(photo) {
    enlargedPhoto = photo;
    const original = photo.querySelector('img');
    enlargedImage.src = original.currentSrc || original.src;
    enlargedImage.alt = original.alt;
    // Reserve the final display size even while showing the smaller preview.
    enlargedImage.width = Number(original.getAttribute('width'));
    enlargedImage.height = Number(original.getAttribute('height'));
    enlargedImage.style.width = `${enlargedImage.width}px`;
    const request = ++imageRequest;
    const fullImage = new Image();
    fullImage.src = original.dataset.original || original.src;
    fullImage.decode().then(() => {
      if (request === imageRequest && overlay.open && !closing) {
        enlargedImage.src = fullImage.src;
      }
    }).catch(() => {
      // Keep the available preview if the original cannot be downloaded.
    });
    overlayDetails.replaceChildren();
    for (const key of ['name', 'date']) {
      const span = document.createElement('span');
      span.textContent = photo.dataset[key];
      overlayDetails.append(span);
    }
    overlay.setAttribute('aria-label', `${photo.dataset.name}, ${photo.dataset.date}. Click beside the photo or use the left and right arrow keys to browse. Press Escape or click the photo to close.`);
  }

  function closePhoto() {
    if (!overlay.open || closing) return;
    closing = true;
    imageRequest++;
    overlay.classList.add('is-closing');
    document.body.classList.remove('photo-open');
    setTimeout(() => {
      overlay.close();
      overlay.classList.remove('is-closing');
      enlargedPhoto?.focus({ preventScroll: true });
      enlargedPhoto = null;
      closing = false;
    }, reducedMotion.matches ? 0 : 550);
  }

  overlay.addEventListener('click', event => {
    const bounds = enlargedImage.getBoundingClientRect();
    // object-fit can leave empty space inside the image element itself.
    // Use the visible photo edges so that all of that space navigates too.
    const ratio = enlargedImage.naturalWidth && enlargedImage.naturalHeight
      ? enlargedImage.naturalWidth / enlargedImage.naturalHeight
      : enlargedImage.width / enlargedImage.height;
    const visibleWidth = Math.min(bounds.width, bounds.height * ratio);
    const left = bounds.left + (bounds.width - visibleWidth) / 2;
    const right = left + visibleWidth;
    if (event.clientX < left) cyclePhoto(-1);
    else if (event.clientX > right) cyclePhoto(1);
    else closePhoto();
  });
  overlay.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    cyclePhoto(event.key === 'ArrowLeft' ? -1 : 1);
  });
  overlay.addEventListener('cancel', event => {
    event.preventDefault();
    closePhoto();
  });

  function layout() {
    const rowCount = Math.ceil(photos.length / (compact.matches ? 2 : 3));
    const rows = [];
    let offset = 0;
    for (let i = 0; i < rowCount; i++) {
      const size = Math.floor(photos.length / rowCount) + (i < photos.length % rowCount ? 1 : 0);
      const row = document.createElement('div');
      row.className = 'album-row';
      photos.slice(offset, offset + size).forEach(photo => {
        const img = photo.querySelector('img');
        photo.style.setProperty('--ratio', Number(img.getAttribute('width')) / Number(img.getAttribute('height')));
        row.append(photo);
      });
      offset += size;
      rows.push(row);
    }
    board.replaceChildren(...rows);
  }

  function showDetails() {
    const photo = hovered || tapped || focused;
    details.replaceChildren();
    if (!photo) return;
    for (const key of ['name', 'date']) {
      const span = document.createElement('span');
      span.textContent = photo.dataset[key];
      details.append(span);
    }
  }

  photos.forEach(photo => {
    photo.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      hovered = photo;
      showDetails();
    });
    photo.addEventListener('pointerleave', () => {
      if (hovered === photo) hovered = null;
      showDetails();
    });
    photo.setAttribute('aria-haspopup', 'dialog');
    photo.setAttribute('aria-label', `Enlarge ${photo.dataset.name}, ${photo.dataset.date}`);
    photo.addEventListener('click', () => {
      tapped = photo;
      showDetails();
      openPhoto(photo);
    });
    // Keep keyboard access without making desktop mouse clicks pin details.
    photo.addEventListener('focus', () => {
      focused = photo.matches(':focus-visible') ? photo : null;
      showDetails();
    });
    photo.addEventListener('blur', () => { focused = null; showDetails(); });
  });
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !event.target.closest('.album-photo')) {
      tapped = null;
      focused = null;
      showDetails();
    }
  });
  compact.addEventListener('change', layout);
  layout();
})();
