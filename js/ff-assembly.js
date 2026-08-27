(function () {
  'use strict';
  var root = document.querySelector('[data-assembly-sequence]');
  if (!root) return;
  root.removeAttribute('aria-labelledby');
  root.setAttribute('aria-label', 'How the solar study light is built');

  // Critical preloader presentation lives here as well as in CSS so a stale,
  // delayed, or blocked stylesheet can never expose the screen-reader list as
  // giant page content. The interactive module replaces this markup on start.
  root.style.position = 'relative';
  root.style.minHeight = '100svh';
  root.style.overflow = 'hidden';
  var runtime = root.querySelector('.ff-assembly-runtime');
  if (runtime) {
    var preloaderContent = getComputedStyle(runtime, '::before').content;
    runtime.textContent = preloaderContent === 'none' || preloaderContent === 'normal'
      ? 'Loading interactive assembly…'
      : '';
    runtime.style.minHeight = '100svh';
    runtime.style.display = 'grid';
    runtime.style.placeContent = 'center';
    runtime.style.textAlign = 'center';
    runtime.style.padding = '96px 20px 48px';
  }
  var accessible = root.querySelector('.ff-assembly-accessible');
  if (accessible) {
    accessible.style.position = 'absolute';
    accessible.style.width = '1px';
    accessible.style.height = '1px';
    accessible.style.padding = '0';
    accessible.style.margin = '-1px';
    accessible.style.overflow = 'hidden';
    accessible.style.clip = 'rect(0,0,0,0)';
    accessible.style.clipPath = 'inset(50%)';
    accessible.style.whiteSpace = 'nowrap';
    accessible.style.border = '0';
  }

  var started = false;
  var observer = null;
  function start() {
    if (started) return;
    started = true;
    if (observer) observer.disconnect();
    root.dataset.assemblyLoading = '';
    import('./home-candidate-assembly.js?v=candidate-35').catch(function (err) {
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

  // IntersectionObserver can be delayed by browser zoom, restored scroll
  // positions, extensions, or a foreground tab that resumes mid-layout. Keep
  // a tiny geometry fallback on real viewport changes so a visible assembly
  // can never remain as its static preloader indefinitely.
  function startIfNear() {
    if (started) return;
    var rect = root.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) start();
  }
  window.addEventListener('scroll', startIfNear, { passive: true });
  window.addEventListener('resize', startIfNear, { passive: true });
  window.addEventListener('pageshow', startIfNear, { once: true });
  requestAnimationFrame(startIfNear);

  document.querySelectorAll('a[href="#assembly-sequence"]').forEach(function (link) {
    link.addEventListener('pointerenter', start, { once: true, passive: true });
    link.addEventListener('focus', start, { once: true });
    link.addEventListener('click', start, { once: true });
  });
  if (location.hash === '#assembly-sequence') start();
})();
