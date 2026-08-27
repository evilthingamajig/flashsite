(function () {
  'use strict';
  if (!document.querySelector('[data-assembly-sequence]')) return;
  import('./home-candidate-assembly.js?v=candidate-26').catch(function (err) {
    console.warn('Homepage assembly:', err);
  });
})();
