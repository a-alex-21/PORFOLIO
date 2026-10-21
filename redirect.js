(() => {
  const target = document.querySelector('script[data-target]').dataset.target;
  window.location.replace(target + window.location.search + window.location.hash);
})();
