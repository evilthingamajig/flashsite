const legacy = document.querySelector('[data-assembly-sequence]');
if (legacy) {
  const runtimePreload = document.createElement('link');
  runtimePreload.rel = 'modulepreload';
  runtimePreload.href = 'js/candidate-preview.js?v=candidate-31';
  document.head.appendChild(runtimePreload);
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'css/home-candidate-assembly.css?v=candidate-31';
  const styleReady = new Promise((resolve) => {
    style.addEventListener('load', resolve, { once: true });
    style.addEventListener('error', resolve, { once: true });
  });
  document.head.appendChild(style);
  await styleReady;
  legacy.className = 'cpv-main cpv-home';
  legacy.dataset.cpvEmbedded = '';
  legacy.id = 'assembly-sequence';
  legacy.removeAttribute('aria-label');
  legacy.setAttribute('aria-labelledby', 'assembly-heading');
  legacy.innerHTML = `
    <div class="cpv-stage" aria-label="Scroll-driven assembly of a solar study light">
      <canvas class="cpv-canvas" id="cpv-canvas" aria-hidden="true"></canvas>
      <svg class="cpv-leaders" id="cpv-leaders" aria-hidden="true" focusable="false"></svg>
      <div class="cpv-callouts" id="cpv-callouts" role="group" aria-live="polite" aria-atomic="true"></div>
      <header class="cpv-head"><p class="cpv-eyebrow">How it is built</p><h2 id="assembly-heading">One light. Built to study.</h2><p class="cpv-sub">Scroll to see every part take its place.</p></header>
      <div class="cpv-progress" role="progressbar" aria-label="Assembly sequence progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="cpv-progress"><span class="cpv-progress-track" aria-hidden="true"><span class="cpv-progress-fill" id="cpv-progress-fill"></span><span class="cpv-chapter cpv-chapter-closed"><span>Closed</span></span><span class="cpv-chapter cpv-chapter-exploded"><span>Exploded review</span></span><span class="cpv-chapter cpv-chapter-reassembled"><span>Reassembled</span></span></span><span class="cpv-progress-label" id="cpv-progress-label">scrub 000%</span></div>
      <p class="cpv-status" id="cpv-status" role="status" aria-live="polite">Loading assembly…</p><div class="cpv-fallback" id="cpv-fallback" hidden><p class="cpv-eyebrow">3D assembly unavailable</p><p id="cpv-fallback-message">This assembly needs WebGL.</p></div>
    </div>`;
  import('./candidate-preview.js?v=candidate-31').catch((err) => {
    document.body.classList.add('cpv-no3d');
    console.warn('Candidate homepage runtime:', err);
  });
}
