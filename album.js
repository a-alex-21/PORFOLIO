(() => {
  const board = document.querySelector('.album-board');
  const photos = [...board.querySelectorAll('.album-photo')];
  const details = document.querySelector('.album-details');
  const compact = window.matchMedia('(max-width: 600px)');
  const touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)');
  let hovered = null;
  let focused = null;
  let tapped = null;

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
    for (const key of ['name', 'description', 'date']) {
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
    // Touch browsers do not consistently focus buttons after a tap.
    photo.addEventListener('click', event => {
      if (event.pointerType !== 'touch' && !touchOnly.matches) return;
      tapped = photo;
      showDetails();
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
