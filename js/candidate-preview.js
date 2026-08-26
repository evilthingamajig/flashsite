import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GLB_URL = 'assets/3d/flashlight-assembly-blender-candidate.glb';
const CLIP_PATTERN = /^ScrollSequence/;
// A full browser window can contain several times as many pixels as the
// embedded review pane. Bound both device-pixel ratio and total framebuffer
// area so scrubbing remains responsive on large/high-DPI displays.
const DPR_CAP = 1.25;
const MIN_RENDER_DPR = 0.75;
const MAX_RENDER_PIXELS = 2_600_000;
const SCRUB_DPR_CAP = 0.8;
const SCRUB_MIN_RENDER_DPR = 0.6;
const SCRUB_MAX_RENDER_PIXELS = 900_000;
const SCRUB_IDLE_MS = 140;
const FOV = 32;
const SHADOW_CASTERS = new Set([
  'enclosure',
  'solar_panel_placeholder',
  'battery',
  'charge_module',
  'led_left',
  'led_right',
  'switch',
]);

const canvas = document.getElementById('cpv-canvas');
const stage = canvas?.parentElement ?? null;
const statusEl = document.getElementById('cpv-status');
const progressEl = document.getElementById('cpv-progress');
const progressFill = document.getElementById('cpv-progress-fill');
const progressLabel = document.getElementById('cpv-progress-label');
const rangeEl = document.getElementById('cpv-range');
const resetEl = document.getElementById('cpv-reset');
const copyLinkEl = document.getElementById('cpv-copy-link');
const poseButtons = [...document.querySelectorAll('[data-cpv-pose]')];
const leadersEl = document.getElementById('cpv-leaders');
const calloutsEl = document.getElementById('cpv-callouts');
const fallbackEl = document.getElementById('cpv-fallback');
const fallbackMessage = document.getElementById('cpv-fallback-message');
const partsEl = document.querySelector('.cpv-parts');
const partListItems = [...document.querySelectorAll('#cpv-part-list [data-cpv-part]')];

// Keep the product visible on narrow screens while preserving the native
// details disclosure so the full parts list remains one tap away.
if (partsEl && window.innerWidth < 760) partsEl.open = false;

const poseEl = document.createElement('span');
poseEl.className = 'cpv-pose-state';
poseEl.setAttribute('aria-hidden', 'true');

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let renderer = null;
let mixer = null;
let assetRoot = null;
let actions = [];
let duration = 0;
let closedFrame = null;
let explodedFrame = null;
let shadowGround = null;
let progress = 0;
let ready = false;
let failed = false;
let inView = true;
let dirty = false;
let rafId = 0;
let scrubQuality = false;
let scrubIdleTimer = 0;
const calloutSpecs = [
  { part: 'enclosure', name: 'Case', cost: 'Cost: TBD', side: 'left', row: 0 },
  { part: 'solar_panel_placeholder', name: 'Solar panel', cost: 'Cost: TBD', side: 'left', row: 1 },
  { part: 'battery', name: 'LiPo battery', cost: 'Cost: TBD', side: 'right', row: 0 },
  { part: 'charge_module', name: 'TP4056 board', cost: 'Cost: TBD', side: 'right', row: 1 },
  { part: 'led_pair', name: '5 mm LEDs', cost: 'Cost: TBD', side: 'left', row: 2 },
  { part: 'switch', name: 'Slide switch', cost: 'Cost: TBD', side: 'right', row: 2 },
];
const calloutTargets = new Map();
const calloutLines = new Map();
const projection = new THREE.Vector3();
const ledProjection = new THREE.Vector3();

function setStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
    if (poseEl.textContent && !statusEl.contains(poseEl)) statusEl.appendChild(poseEl);
  }
}

function poseStateFor(p) {
  if (p <= 0) return 'Closed';
  if (p >= 0.9) return 'Reassembled';
  if (p >= 0.52 && p <= 0.82) return 'Exploded';
  return 'Scrubbing';
}

function showFallback(reason, err) {
  failed = true;
  ready = false;
  document.body.classList.add('cpv-no3d');
  if (fallbackEl) fallbackEl.hidden = false;
  if (fallbackMessage && reason) fallbackMessage.textContent = reason + ' The parts list stays available beside this notice.';
  setStatus('Preview unavailable.');
  cancelAnimationFrame(rafId);
  rafId = 0;
  dirty = false;
  if (err) console.warn('Candidate preview:', err);
}

function requestRender() {
  dirty = true;
  startLoop();
}

function renderPixelRatio(w, h) {
  const dprCap = scrubQuality ? SCRUB_DPR_CAP : DPR_CAP;
  const minDpr = scrubQuality ? SCRUB_MIN_RENDER_DPR : MIN_RENDER_DPR;
  const pixelBudget = scrubQuality ? SCRUB_MAX_RENDER_PIXELS : MAX_RENDER_PIXELS;
  const deviceDpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const pixelBudgetDpr = Math.sqrt(pixelBudget / Math.max(1, w * h));
  return Math.max(minDpr, Math.min(deviceDpr, pixelBudgetDpr));
}

function setScrubQuality() {
  if (!renderer || failed) return;
  clearTimeout(scrubIdleTimer);
  if (!scrubQuality) {
    scrubQuality = true;
    measureStage();
  }
  scrubIdleTimer = window.setTimeout(() => {
    scrubQuality = false;
    measureStage();
    // Shadows stay frozen while parts move; refresh them once at the final
    // settled pose instead of rebuilding the shadow map every scrub frame.
    renderer.shadowMap.needsUpdate = true;
    requestRender();
  }, SCRUB_IDLE_MS);
}

function startLoop() {
  if (rafId || !dirty || !inView || document.hidden || !ready || failed) return;
  rafId = requestAnimationFrame(tick);
}

function tick() {
  rafId = 0;
  if (!inView || document.hidden || !dirty) return;
  dirty = false;
  renderer.render(scene, camera);
}

function samplePose(p) {
  // setTime() is absolute: it resets every action time before advancing, so
  // the same scroll offset always reproduces the identical frame in either
  // scrub direction. A finished LoopOnce clamp parks actions in a paused
  // state that freezes later seeks in Three r160, so clear the pause first.
  for (const action of actions) action.paused = false;
  mixer.setTime(p * duration);
}

function frameFor(box) {
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const halfFov = THREE.MathUtils.degToRad(FOV) / 2;
  const dist = (sphere.radius / Math.sin(halfFov)) * 1.04;
  return { center: sphere.center.clone(), dist };
}

const PORTRAIT_MAX_ASPECT = 0.9;
const PORTRAIT_DISTANCE_CAP = 1.75;

function portraitDistanceScale() {
  const aspect = camera ? camera.aspect : 1;
  if (aspect >= PORTRAIT_MAX_ASPECT) return 1;
  const halfVertical = THREE.MathUtils.degToRad(FOV) / 2;
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
  const fit = Math.sin(halfVertical) / Math.sin(halfHorizontal);
  const gate = clamp01((PORTRAIT_MAX_ASPECT - aspect) / PORTRAIT_MAX_ASPECT);
  const blend = gate * gate * (3 - 2 * gate);
  return Math.min(1 + (fit - 1) * blend, PORTRAIT_DISTANCE_CAP);
}

function updateCamera(p) {
  if (!closedFrame || !explodedFrame) return;
  const explosionEnd = 0.67;
  const reassemblyStart = 0.8333333333;
  let center;
  let dist;
  let azim;
  let elev;
  if (p <= explosionEnd) {
    const t = easeInOutCubic(clamp01(p / explosionEnd));
    center = closedFrame.center.clone().lerp(explodedFrame.center, t);
    dist = THREE.MathUtils.lerp(closedFrame.dist, explodedFrame.dist, t);
    azim = THREE.MathUtils.lerp(-0.55, 0.5, t);
    elev = THREE.MathUtils.lerp(0.62, 0.4, t);
  } else if (p <= reassemblyStart) {
    // Keep the full exploded bounds in frame while the parts are still
    // separated. The authored reassembly does not begin until frame 100;
    // closing the camera before then makes the switch and its leader
    // disappear behind the other components.
    center = explodedFrame.center.clone();
    dist = explodedFrame.dist;
    azim = 0.5;
    elev = 0.4;
  } else {
    // Settle into a distinct final three-quarter product angle. The target
    // and distance come from the measured closed frame, so this remains
    // deterministic when the supplied case dimensions change.
    // Blender's authored parts return to their seats over frames 100–120,
    // which is the final 1/6 of the 120-frame action. Reach the final camera
    // at the same authored boundary, then hold it for the finished product.
    const t = easeInOutCubic(clamp01((p - reassemblyStart) / (1 - reassemblyStart)));
    center = explodedFrame.center.clone().lerp(closedFrame.center, t);
    dist = THREE.MathUtils.lerp(explodedFrame.dist, closedFrame.dist * 1.08, t);
    azim = THREE.MathUtils.lerp(0.5, -0.78, t);
    elev = THREE.MathUtils.lerp(0.4, 0.52, t);
  }
  dist *= portraitDistanceScale();
  camera.position.set(
    center.x + dist * Math.cos(elev) * Math.sin(azim),
    center.y + dist * Math.sin(elev),
    center.z + dist * Math.cos(elev) * Math.cos(azim)
  );
  camera.lookAt(center);
}

function buildCallouts(root) {
  if (!calloutsEl || !leadersEl) return;
  calloutsEl.replaceChildren();
  leadersEl.replaceChildren();
  calloutTargets.clear();
  calloutLines.clear();
  for (const spec of calloutSpecs) {
    const box = document.createElement('div');
    box.className = 'cpv-callout cpv-callout-' + spec.side;
    box.dataset.part = spec.part;
    box.innerHTML = '<span class="cpv-callout-name"></span><span class="cpv-callout-cost"></span>';
    box.querySelector('.cpv-callout-name').textContent = spec.name;
    box.querySelector('.cpv-callout-cost').textContent = spec.cost;
    calloutsEl.append(box);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke-linecap', 'round');
    leadersEl.append(line);
    calloutTargets.set(spec.part, box);
    calloutLines.set(spec.part, line);
  }
  updateCallouts(root);
}

function targetFor(root, part) {
  if (part === 'led_pair') {
    const left = root.getObjectByName('led_left');
    const right = root.getObjectByName('led_right');
    if (!left || !right) return null;
    left.getWorldPosition(projection);
    right.getWorldPosition(ledProjection);
    return projection.clone().lerp(ledProjection, 0.5);
  }
  const object = root.getObjectByName(part);
  if (!object) return null;
  object.getWorldPosition(projection);
  return projection.clone();
}

function activeCalloutIndex(p) {
  const annotationStart = 0.16;
  const annotationEnd = 0.88;
  const annotationSpan = (annotationEnd - annotationStart) / calloutSpecs.length;
  return p >= annotationStart && p <= annotationEnd
    ? Math.min(calloutSpecs.length - 1, Math.floor((p - annotationStart) / annotationSpan))
    : -1;
}

function syncPartListHighlight(spec) {
  for (const item of partListItems) {
    const match = spec !== null && item.dataset.cpvPart === spec.part;
    item.classList.toggle('is-active', match);
    if (match) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  }
}

function updateCallouts(root = assetRoot) {
  if (!root || !calloutsEl || !leadersEl || !camera || !stage) return;
  const activeIndex = activeCalloutIndex(progress);
  const visible = activeIndex >= 0;
  const activeSpec = visible ? calloutSpecs[activeIndex] : null;
  syncPartListHighlight(activeSpec);
  calloutsEl.hidden = !visible;
  leadersEl.hidden = !visible;
  calloutsEl.style.display = visible ? '' : 'none';
  leadersEl.style.display = visible ? 'block' : 'none';
  if (!visible) {
    for (const spec of calloutSpecs) {
      const box = calloutTargets.get(spec.part);
      const line = calloutLines.get(spec.part);
      if (box) {
        box.classList.remove('is-active');
        box.style.display = 'none';
        box.setAttribute('aria-hidden', 'true');
      }
      if (line) line.style.opacity = '0';
    }
    return;
  }
  const width = stage.clientWidth || 1;
  const height = stage.clientHeight || 1;
  // Match the stylesheet breakpoint against the viewport, not the sticky
  // stage width (the vertical scrollbar can make the latter slightly smaller
  // and incorrectly switch a desktop review into mobile lanes).
  const mobile = window.innerWidth < 760;
  // On narrow screens the parts list occupies the lower review lane. Keep
  // all three editorial label lanes above it so the active text never hides
  // behind the open list.
  const slots = mobile ? [0.30, 0.35, 0.40] : [0.24, 0.40, 0.56];
  for (const [index, spec] of calloutSpecs.entries()) {
    const box = calloutTargets.get(spec.part);
    const line = calloutLines.get(spec.part);
    if (!box || !line) continue;
    const active = index === activeIndex;
    box.classList.toggle('is-active', active);
    // Keep inactive labels mounted so the CSS opacity transition can crossfade
    // from one editorial caption to the next instead of snapping via display.
    box.style.display = 'block';
    box.setAttribute('aria-hidden', String(!active));
    line.style.opacity = active ? '0.88' : '0';
    // Only the visible label needs a world-matrix lookup, projection, and DOM
    // geometry update. Inactive labels stay mounted for their opacity fade.
    if (!active) continue;
    const point = targetFor(root, spec.part);
    if (!point) continue;
    point.project(camera);
    const targetX = (point.x * 0.5 + 0.5) * width;
    const targetY = (-point.y * 0.5 + 0.5) * height;
    // The side panels occupy the outer lanes. Keep labels in the two clear
    // lanes between the reference panel, the model, and the parts panel.
    const boxX = width * (mobile ? (spec.side === 'left' ? 0.22 : 0.78) : (spec.side === 'left' ? 0.35 : 0.52));
    const boxY = height * slots[spec.row];
    box.style.left = boxX + 'px';
    box.style.top = boxY + 'px';
    line.setAttribute('x1', String(targetX));
    line.setAttribute('y1', String(targetY));
    line.setAttribute('x2', String(boxX));
    line.setAttribute('y2', String(boxY));
  }
}

function updateProgressUI(p) {
  const pct = Math.round(p * 100);
  progressFill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  progressLabel.textContent = 'scrub ' + String(pct).padStart(3, '0') + '%';
  progressEl.setAttribute('aria-valuenow', String(pct));
  const pose = poseStateFor(p);
  progressEl.setAttribute('aria-valuetext', pose + ' — ' + pct + '%');
  poseEl.textContent = ' · ' + pose;
  if (statusEl && !statusEl.contains(poseEl)) statusEl.appendChild(poseEl);
  if (rangeEl && document.activeElement !== rangeEl) rangeEl.value = p.toFixed(3);
  for (const button of poseButtons) {
    const target = Number(button.dataset.cpvPose);
    const active = target === 0 ? p <= 0.02 : target === 0.67 ? p >= 0.52 && p <= 0.82 : p >= 0.9;
    button.setAttribute('aria-pressed', String(active));
  }
}

function applyProgress(p) {
  progress = clamp01(p);
  if (ready) {
    setScrubQuality();
    samplePose(progress);
    updateCamera(progress);
    updateCallouts();
    updateProgressUI(progress);
    requestRender();
  }
}

function computeProgressFromScroll() {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  applyProgress(clamp01(window.scrollY / max));
}

function scrollToProgress(p, instant = false) {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  window.scrollTo({ top: clamp01(p) * max, behavior: instant || reducedMotion ? 'auto' : 'smooth' });
}

function requestedReviewProgress() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('p') ?? params.get('candidate-review');
  if (raw === null || raw.trim() === '') return null;
  const num = Number(raw);
  return Number.isFinite(num) ? clamp01(num) : null;
}

function poseLinkFor(progressValue) {
  const url = new URL(window.location.href);
  url.searchParams.set('p', clamp01(progressValue).toFixed(3));
  return url.toString();
}

async function copyPoseLink() {
  const link = poseLinkFor(progress);
  if (!navigator.clipboard?.writeText) {
    setStatus('Clipboard unavailable — copy the address bar link.');
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    setStatus('Link copied.');
  } catch (err) {
    setStatus('Copy blocked by the browser — copy the address bar link.');
    console.warn('Candidate preview clipboard:', err);
  }
}

function measureStage() {
  if (!stage || !renderer || !camera || failed) return;
  const w = stage.clientWidth || 1;
  const h = stage.clientHeight || 1;
  renderer.setPixelRatio(renderPixelRatio(w, h));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (closedFrame && explodedFrame) {
    updateCamera(progress);
    updateCallouts();
    requestRender();
  }
}

function computeFrames(root) {
  root.updateMatrixWorld(true);
  samplePose(0);
  root.updateMatrixWorld(true);
  const closedBox = new THREE.Box3().setFromObject(root);
  samplePose(0.67);
  root.updateMatrixWorld(true);
  const explodedBox = new THREE.Box3().setFromObject(root);
  samplePose(progress);
  root.updateMatrixWorld(true);
  closedFrame = frameFor(closedBox);
  explodedFrame = frameFor(explodedBox);
  if (shadowGround) {
    shadowGround.position.y = closedBox.min.y - 0.004;
    shadowGround.receiveShadow = true;
  }
}

function studioEnvironment(scene) {
  const faces = [];
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 32, 32);
    g.addColorStop(0, i === 2 ? '#3a423e' : '#222825');
    g.addColorStop(1, i === 3 ? '#141917' : '#2c332f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    faces.push(c);
  }
  const env = new THREE.CubeTexture(faces);
  env.colorSpace = THREE.SRGBColorSpace;
  env.needsUpdate = true;
  scene.environment = env;
}

let scene = null;
let camera = null;

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, 1, 0.002, 4);

  studioEnvironment(scene);
  scene.add(new THREE.HemisphereLight(0xdfe8e2, 0x11150f, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(0.35, 0.7, 0.45);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.bias = -0.0002;
  key.shadow.camera.left = -0.15;
  key.shadow.camera.right = 0.15;
  key.shadow.camera.top = 0.15;
  key.shadow.camera.bottom = -0.15;
  key.shadow.camera.near = 0.05;
  key.shadow.camera.far = 2;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe6d2, 0.6);
  rim.position.set(-0.5, 0.3, -0.6);
  scene.add(rim);
  const fill = new THREE.PointLight(0xcfdde6, 0.3, 1.5);
  fill.position.set(-0.3, -0.2, 0.5);
  scene.add(fill);

  shadowGround = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.ShadowMaterial({ opacity: 0.3 })
  );
  shadowGround.rotation.x = -Math.PI / 2;
  shadowGround.receiveShadow = true;
  scene.add(shadowGround);
}

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  showFallback('WebGL is unavailable in this browser.', err);
}
if (renderer && !failed) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  initScene();

  new GLTFLoader().load(GLB_URL, (gltf) => {
    if (failed) return;
    const root = gltf.scene;
    assetRoot = root;
    scene.add(root);
    root.traverse((o) => {
      if (o.isMesh) {
        // Detail meshes still render normally, but excluding them from the
        // shadow pass avoids duplicating dozens of tiny draw calls per frame.
        o.castShadow = SHADOW_CASTERS.has(o.name);
        o.receiveShadow = o.name === 'enclosure';
      }
    });

    const clips = (Array.isArray(gltf.animations) ? gltf.animations : []).filter(
      (clip) => clip && CLIP_PATTERN.test(clip.name)
    );
    if (clips.length) {
      mixer = new THREE.AnimationMixer(root);
      duration = clips.reduce((max, clip) => Math.max(max, clip.duration || 0), 0) || 0;
      actions = clips.map((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        return action;
      });
    }

    computeFrames(root);
    buildCallouts(root);
    measureStage();
    ready = true;
    setStatus(
      clips.length
        ? 'Ready — assembly review'
        : 'Ready — static assembly review'
    );
    const requested = requestedReviewProgress();
    if (requested === null) {
      computeProgressFromScroll();
    } else {
      applyProgress(requested);
      scrollToProgress(requested, true);
    }
  }, (evt) => {
    if (evt.total > 0) {
      setStatus('Loading assembly…');
    }
  }, (err) => {
    showFallback('The assembly preview failed to load.', err);
  });
}

if (renderer && !failed) {
  let scrollScheduled = false;
  window.addEventListener('scroll', () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => {
      scrollScheduled = false;
      computeProgressFromScroll();
    });
  }, { passive: true });

  window.addEventListener('resize', measureStage);

  // Harden against GPU/WebGL context loss: prevent the browser default, stop
  // rendering, and surface the existing fallback without a reload loop. The
  // parts list and controls remain usable alongside the notice.
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showFallback('The assembly preview lost its connection.', new Error('webglcontextlost'));
  });

  rangeEl?.addEventListener('input', () => {
    const next = clamp01(Number(rangeEl.value));
    applyProgress(next);
    scrollToProgress(next);
  });
  resetEl?.addEventListener('click', () => {
    scrollToProgress(0);
    applyProgress(0);
    rangeEl?.focus({ preventScroll: true });
  });
  copyLinkEl?.addEventListener('click', () => {
    copyPoseLink();
  });
  for (const button of poseButtons) {
    button.addEventListener('click', () => {
      const next = clamp01(Number(button.dataset.cpvPose));
      applyProgress(next);
      history.replaceState(null, '', poseLinkFor(next));
      scrollToProgress(next);
    });
  }
  if (stage && typeof ResizeObserver !== 'undefined') new ResizeObserver(measureStage).observe(stage);

  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      if (inView) requestRender();
      else {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }, { threshold: 0 });
    if (stage) io.observe(stage);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else {
      requestRender();
    }
  });

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    cancelAnimationFrame(rafId);
    clearTimeout(scrubIdleTimer);
    rafId = 0;
    if (mixer) mixer.stopAllAction();
    if (renderer) renderer.dispose();
  });
}

window.__ffCandidatePreview = {
  info() {
    return {
      ready,
      failed,
      clips: actions.length,
      duration,
      progress,
      activeCallout: activeCalloutIndex(progress) >= 0 ? calloutSpecs[activeCalloutIndex(progress)].part : null,
      renderPaused: !inView || document.hidden,
      cameraPosition: camera ? {
        x: Number(camera.position.x.toFixed(4)),
        y: Number(camera.position.y.toFixed(4)),
        z: Number(camera.position.z.toFixed(4)),
      } : null,
      renderPixelRatio: renderer ? Number(renderer.getPixelRatio().toFixed(3)) : null,
      renderSize: renderer ? {
        width: renderer.domElement.width,
        height: renderer.domElement.height,
      } : null,
      scrubQuality,
      actionTimes: actions.map((action) => Number(action.time.toFixed(4))),
      trackNames: actions.slice(0, 2).map((action) => action.getClip().tracks.map((track) => track.name)),
      trackSamples: actions.slice(0, 2).map((action) => action.getClip().tracks.slice(0, 2).map((track) => ({
        name: track.name,
        first: Array.from(track.values.slice(0, 3)).map((v) => Number(v.toFixed(4))),
        last: Array.from(track.values.slice(-3)).map((v) => Number(v.toFixed(4))),
      }))),
      partTransforms: assetRoot ? Object.fromEntries(assetRoot.children.map((o) => [o.name, {
        x: Number(o.position.x.toFixed(4)),
        y: Number(o.position.y.toFixed(4)),
        z: Number(o.position.z.toFixed(4)),
      }])) : {},
    };
  },
  setProgress(p) {
    applyProgress(p);
  },
};
