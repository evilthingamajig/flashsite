import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GLB_URL = 'assets/3d/flashlight-assembly-blender-candidate.glb';
const CLIP_PATTERN = /^ScrollSequence/;
const DPR_CAP = 1.75;
const FOV = 32;

const canvas = document.getElementById('cpv-canvas');
const stage = canvas.parentElement;
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
const calloutSpecs = [
  { part: 'enclosure', name: 'Enclosure', side: 'left', row: 0 },
  { part: 'solar_panel_placeholder', name: 'Solar panel', side: 'left', row: 1 },
  { part: 'battery', name: 'LiPo battery', side: 'right', row: 0 },
  { part: 'charge_module', name: 'TP4056 board', side: 'right', row: 1 },
  { part: 'led_pair', name: 'LED pair', side: 'left', row: 2 },
  { part: 'switch', name: 'Slide switch', side: 'right', row: 2 },
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

function updateCamera(p) {
  if (!closedFrame || !explodedFrame) return;
  const explosionEnd = 0.67;
  const cameraProgress = p <= explosionEnd
    ? p / explosionEnd
    : 1 - ((p - explosionEnd) / (1 - explosionEnd));
  const t = easeInOutCubic(clamp01(cameraProgress));
  const center = closedFrame.center.clone().lerp(explodedFrame.center, t);
  const dist = THREE.MathUtils.lerp(closedFrame.dist, explodedFrame.dist, t);
  const azim = THREE.MathUtils.lerp(-0.55, 0.5, t);
  const elev = THREE.MathUtils.lerp(0.62, 0.4, t);
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
    box.innerHTML = '<span class="cpv-callout-name"></span><span class="cpv-callout-cost">Cost TBD</span>';
    box.querySelector('.cpv-callout-name').textContent = spec.name;
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

function updateCallouts(root = assetRoot) {
  if (!root || !calloutsEl || !leadersEl || !camera) return;
  const activeIndex = activeCalloutIndex(progress);
  const visible = activeIndex >= 0;
  const activeSpec = visible ? calloutSpecs[activeIndex] : null;
  calloutsEl.setAttribute(
    'aria-label',
    activeSpec ? 'Current part: ' + activeSpec.name + '. Cost TBD.' : 'Current candidate part annotation'
  );
  calloutsEl.hidden = !visible;
  leadersEl.hidden = !visible;
  calloutsEl.style.display = visible ? '' : 'none';
  leadersEl.style.display = visible ? 'block' : 'none';
  if (!visible) return;
  const width = stage.clientWidth || 1;
  const height = stage.clientHeight || 1;
  // Match the stylesheet breakpoint against the viewport, not the sticky
  // stage width (the vertical scrollbar can make the latter slightly smaller
  // and incorrectly switch a desktop review into mobile lanes).
  const mobile = window.innerWidth < 760;
  const slots = mobile ? [0.24, 0.36, 0.48] : [0.24, 0.40, 0.56];
  for (const [index, spec] of calloutSpecs.entries()) {
    const box = calloutTargets.get(spec.part);
    const line = calloutLines.get(spec.part);
    const point = targetFor(root, spec.part);
    if (!box || !line || !point) continue;
    const active = index === activeIndex;
    box.classList.toggle('is-active', active);
    box.style.display = active ? 'block' : 'none';
    box.setAttribute('aria-hidden', String(!active));
    line.style.opacity = active ? '0.72' : '0';
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
    setStatus('Pose link copied.');
  } catch (err) {
    setStatus('Copy blocked by the browser — copy the address bar link.');
    console.warn('Candidate preview clipboard:', err);
  }
}

function measureStage() {
  const w = stage.clientWidth || 1;
  const h = stage.clientHeight || 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
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
  key.shadow.mapSize.set(1024, 1024);
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
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
} catch (err) {
  showFallback('WebGL is unavailable in this browser.', err);
}
if (renderer && !failed) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  initScene();

  new GLTFLoader().load(GLB_URL, (gltf) => {
    if (failed) return;
    const root = gltf.scene;
    assetRoot = root;
    scene.add(root);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
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
        ? 'Ready — ' + clips.length + ' ScrollSequence clip' + (clips.length > 1 ? 's' : '') + ' · ' + duration.toFixed(2) + ' s'
        : 'No ScrollSequence clips found — static candidate view.'
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
      setStatus('Loading candidate asset… ' + Math.round((evt.loaded / evt.total) * 100) + '%');
    }
  }, (err) => {
    showFallback('The candidate GLB failed to load.', err);
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
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measureStage).observe(stage);

  const io = new IntersectionObserver((entries) => {
    inView = entries.some((entry) => entry.isIntersecting);
    if (inView) requestRender();
    else {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }, { threshold: 0 });
  io.observe(stage);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else {
      requestRender();
    }
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
