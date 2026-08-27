const legacy = document.querySelector('[data-assembly-sequence]');
if (legacy) {
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'css/candidate-preview.css?v=candidate-22';
  document.head.appendChild(style);
  legacy.className = 'cpv-main';
  legacy.id = 'assembly-sequence';
  legacy.setAttribute('aria-labelledby', 'assembly-heading');
  legacy.innerHTML = `
    <div class="cpv-stage" aria-label="Scroll-driven assembly of a solar study light">
      <canvas class="cpv-canvas" id="cpv-canvas" aria-hidden="true"></canvas>
      <svg class="cpv-leaders" id="cpv-leaders" aria-hidden="true" focusable="false"></svg>
      <div class="cpv-callouts" id="cpv-callouts" role="group" aria-live="polite" aria-atomic="true"></div>
      <header class="cpv-head"><p class="cpv-eyebrow">Flash Forward · Assembly study</p><h2 id="assembly-heading">One light. Built to study.</h2><p class="cpv-sub">Scroll to see every part take its place.</p></header>
      <details class="cpv-parts"><summary>Parts in this assembly <span class="cpv-count">7</span></summary><ol class="cpv-part-list" id="cpv-part-list">
        <li data-cpv-part="enclosure"><span class="cpv-part-index">01</span><span class="cpv-part-name">Case</span><span class="cpv-part-note">3D-printed shell · ≈ 100 × 60 × 15 mm</span></li>
        <li data-cpv-part="solar_panel_placeholder"><span class="cpv-part-index">02</span><span class="cpv-part-name">Solar panel</span><span class="cpv-part-note">reference-informed cell geometry · 98 × 58 mm</span></li>
        <li data-cpv-part="battery"><span class="cpv-part-index">03</span><span class="cpv-part-name">Battery</span><span class="cpv-part-note">rechargeable LiPo cell</span></li>
        <li data-cpv-part="charge_module"><span class="cpv-part-index">04</span><span class="cpv-part-name">Charge module</span><span class="cpv-part-note">TP4056 USB-C board</span></li>
        <li data-cpv-part="led_pair"><span class="cpv-part-index">05</span><span class="cpv-part-name">5 mm LED</span><span class="cpv-part-note">study-light LED</span></li>
        <li data-cpv-part="led_pair"><span class="cpv-part-index">06</span><span class="cpv-part-name">5 mm LED</span><span class="cpv-part-note">second unit</span></li>
        <li data-cpv-part="switch"><span class="cpv-part-index">07</span><span class="cpv-part-name">Switch</span><span class="cpv-part-note">slide switch</span></li>
      </ol></details>
      <div class="cpv-progress" role="progressbar" aria-label="Assembly sequence progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="cpv-progress"><span class="cpv-progress-track" aria-hidden="true"><span class="cpv-progress-fill" id="cpv-progress-fill"></span><span class="cpv-chapter cpv-chapter-closed"><span>Closed</span></span><span class="cpv-chapter cpv-chapter-exploded"><span>Exploded review</span></span><span class="cpv-chapter cpv-chapter-reassembled"><span>Reassembled</span></span></span><span class="cpv-progress-label" id="cpv-progress-label">scrub 000%</span></div>
      <div class="cpv-controls" aria-label="Assembly controls"><button class="cpv-reset" id="cpv-reset" type="button">Reset</button><button class="cpv-copy-link" id="cpv-copy-link" type="button">Copy pose link</button><div class="cpv-pose-buttons" role="group" aria-label="Jump to authored pose"><button type="button" data-cpv-pose="0">Closed</button><button type="button" data-cpv-pose="0.67">Exploded</button><button type="button" data-cpv-pose="1">Reassembled</button></div><label class="cpv-range-label" for="cpv-range"><span>Timeline</span><input id="cpv-range" type="range" min="0" max="1" step="0.001" value="0" aria-label="Scrub the authored assembly timeline"></label></div>
      <p class="cpv-status" id="cpv-status" role="status" aria-live="polite">Loading assembly…</p><div class="cpv-fallback" id="cpv-fallback" hidden><p class="cpv-eyebrow">3D assembly unavailable</p><p id="cpv-fallback-message">This assembly needs WebGL.</p></div>
    </div>`;
  import('./candidate-preview.js?v=candidate-22').catch((err) => {
    document.body.classList.add('cpv-no3d');
    console.warn('Candidate homepage runtime:', err);
  });
}
