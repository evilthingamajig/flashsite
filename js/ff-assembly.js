(function () {
  'use strict';
  var root = document.querySelector('[data-assembly-sequence]');
  if (!root) return;
  root.removeAttribute('aria-labelledby');
  root.setAttribute('aria-label', 'How the solar study light is built');

  var started = false;
  var observer = null;
  function start() {
    if (started) return;
    started = true;
    if (observer) observer.disconnect();
    root.dataset.assemblyLoading = '';
    import('./home-candidate-assembly.js?v=candidate-30').catch(function (err) {
      delete root.dataset.assemblyLoading;
      console.warn('Homepage assembly:', err);
    });
  }

  // Keep Three.js and the 1.8 MB model out of the hero's critical path. The
  // section starts loading shortly before it occupies the viewport, or as
  // soon as a visitor signals intent through the assembly CTA.
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) start();
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.01 });
    observer.observe(root);
  } else {
    window.addEventListener('load', start, { once: true });
  }

  document.querySelectorAll('a[href="#assembly-sequence"]').forEach(function (link) {
    link.addEventListener('pointerenter', start, { once: true, passive: true });
    link.addEventListener('focus', start, { once: true });
    link.addEventListener('click', start, { once: true });
  });
  if (location.hash === '#assembly-sequence') start();
})();
