import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GLB_URL = 'assets/3d/flashlight-assembly-blender-candidate.glb?v=candidate-27';
const CLIP_PATTERN = /^ScrollSequence/;
const EMBED_ROOT = document.querySelector('[data-cpv-embedded]');
const HOME_EMBEDDED = Boolean(EMBED_ROOT);
if (!HOME_EMBEDDED && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
// Never upscale a sub-CSS-pixel framebuffer on the homepage. That shortcut
// made the assembly visibly grainy, and resizing the drawing buffer at the
// start/end of every scrub also introduced GPU allocation hitches. Keep a
// stable, antialiased backing store: 1x on ordinary displays and up to 1.25x
// on HiDPI screens, with a soft pixel budget that never drops below 1x.
const DPR_CAP = HOME_EMBEDDED ? 1.25 : 1.0;
const MIN_RENDER_DPR = HOME_EMBEDDED ? 1.0 : 0.75;
const MAX_RENDER_PIXELS = HOME_EMBEDDED ? 2_400_000 : 1_500_000;
const SCRUB_IDLE_MS = 140;
const SCROLL_DAMPING = HOME_EMBEDDED ? 24 : 18;
const SCROLL_SNAP_EPSILON = 0.00035;
// Scroll chooses a destination and the renderer approaches it with a short
// exponential ease. This absorbs uneven wheel/touchpad event timing while
// staying responsive to reversals and scrollbar dragging.
const HOME_SCROLL_DAMPING = 18;
const HOME_FRAME_INTERVAL_MS = 1000 / 60;
const CALLOUT_FOLLOW_INTERVAL_MS = 1000 / 60;
// Complete the authored motion well before sticky positioning releases. The
// remaining runway is a visible end hold, not hidden animation time. This is
// especially important after a large wheel/touchpad impulse: the time-based
// follower can settle while the stage is still fully pinned.
const HOME_TIMELINE_SCROLL_FRACTION = 0.84;
const HOME_FORCE_SETTLE_FRACTION = 0.98;
const ADAPTIVE_DPR_STEPS = [1, 0.85, 0.7];
const SLOW_FRAME_MS = HOME_EMBEDDED ? 18 : 22;
const SLOW_FRAME_SCORE_LIMIT = 4;
const FOV = 32;
const REASSEMBLY_START = 0.8333333333;
const ASSEMBLY_SETTLED_PROGRESS = 0.95;
const HOME_MATERIAL_CONTRAST = new Map([
  ['LedClear', 0x78978f],
  ['LedDie', 0xd29f32],
  ['BatteryFoil', 0xcbd2cd],
  ['BatteryLead', 0x65736b],
  ['SwitchPlastic', 0x929b94],
  ['SolarFrame', 0xc7d1ca],
  ['SolarScrew', 0xaeb9b1],
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
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let renderer = null;
let mixer = null;
let assetRoot = null;
let actions = [];
let duration = 0;
let closedFrame = null;
let explodedFrame = null;
let progress = 0;
let ready = false;
let failed = false;
let inView = true;
let dirty = false;
let rafId = 0;
let scrollTarget = 0;
let scrollFrameTime = 0;
let scrollAnimating = false;
let scrollVelocity = 0;
let homeNextFrameTime = 0;
let scrubQuality = false;
let scrubIdleTimer = 0;
let hasAppliedProgress = false;
let renderQualityIndex = 0;
let slowFrameScore = 0;
let calloutFollowRaf = 0;
let calloutFollowUntil = 0;
let calloutFollowFrameTime = 0;
let activeCalloutPart = '';
let renderedCalloutIndex = -2;
let lastUiPercent = -1;
let lastUiPose = '';
let lastUiButtonState = '';
let cachedScrollRange = null;
const calloutSpecs = [
  { part: 'enclosure', name: 'Case', cost: 'Cost: TBD', side: 'left', row: 0 },
  { part: 'solar_panel_placeholder', name: 'Solar panel', cost: 'Cost: TBD', side: 'left', row: 1 },
  { part: 'battery', name: 'LiPo battery', cost: 'Cost: TBD', side: 'right', row: 0 },
  { part: 'charge_module', name: 'TP4056 board', cost: 'Cost: TBD', side: 'right', row: 1 },
  { part: 'led_pair', name: '5 mm LEDs', cost: 'Cost: TBD', side: 'right', row: 2 },
  { part: 'switch', name: 'Slide switch', cost: 'Cost: TBD', side: 'right', row: 2 },
];
const calloutTargets = new Map();
const calloutLines = new Map();
const calloutDots = new Map();
const calloutSurfaceSamples = new Map();
const calloutLocalBounds = new Map();
const projectedCorner = new THREE.Vector3();
const projectedSurfacePoint = new THREE.Vector3();

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
  cancelAnimationFrame(calloutFollowRaf);
  rafId = 0;
  calloutFollowRaf = 0;
  scrollAnimating = false;
  scrollVelocity = 0;
  scrollFrameTime = 0;
  clearTimeout(scrubIdleTimer);
  dirty = false;
  if (err) console.warn('Candidate preview:', err);
}

function requestRender() {
  dirty = true;
  startLoop();
}

function renderPixelRatio(w, h) {
  const deviceDpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  const pixelBudgetDpr = Math.sqrt(MAX_RENDER_PIXELS / Math.max(1, w * h));
  const baseDpr = Math.max(MIN_RENDER_DPR, Math.min(deviceDpr, pixelBudgetDpr));
  const absoluteFloor = HOME_EMBEDDED ? 1 : 0.55;
  const adaptiveScale = HOME_EMBEDDED ? 1 : ADAPTIVE_DPR_STEPS[renderQualityIndex];
  return Math.max(
    absoluteFloor,
    baseDpr * adaptiveScale
  );
}

function applyRenderResolution() {
  if (!stage || !renderer || failed) return;
  const w = stage.clientWidth || 1;
  const h = stage.clientHeight || 1;
  renderer.setPixelRatio(renderPixelRatio(w, h));
  renderer.setSize(w, h, false);
}

function finishScrubQuality() {
  clearTimeout(scrubIdleTimer);
  scrubIdleTimer = 0;
  if (!scrubQuality || !renderer || failed) return;
  scrubQuality = false;
  document.body.classList.remove('cpv-scrubbing');
  if (inView && !document.hidden) {
    updateCallouts();
    requestRender();
  }
}

function setScrubQuality() {
  if (!renderer || failed) return;
  if (!scrubQuality) {
    scrubQuality = true;
    document.body.classList.add('cpv-scrubbing');
    cancelAnimationFrame(calloutFollowRaf);
    calloutFollowRaf = 0;
  }
  // The homepage follower has an authoritative settled state, so it restores
  // quality directly instead of cancelling/recreating a timer every frame.
  if (HOME_EMBEDDED && scrollAnimating) return;
  clearTimeout(scrubIdleTimer);
  scrubIdleTimer = window.setTimeout(finishScrubQuality, SCRUB_IDLE_MS);
}

function startLoop() {
  if (rafId || (!dirty && !scrollAnimating) || !inView || document.hidden || !ready || failed) return;
  rafId = requestAnimationFrame(tick);
}

function tick(now) {
  rafId = 0;
  if (!inView || document.hidden || (!dirty && !scrollAnimating)) return;
  // High-refresh displays can call rAF at 120–240 Hz. Keep animation time
  // correct but run pose/layout/WebGL work at at most 60 Hz; the accumulated
  // deadline avoids coupling playback speed to the monitor refresh rate.
  if (HOME_EMBEDDED && scrollAnimating) {
    if (homeNextFrameTime && now + 0.5 < homeNextFrameTime) {
      startLoop();
      return;
    }
    if (!homeNextFrameTime) homeNextFrameTime = now;
    do homeNextFrameTime += HOME_FRAME_INTERVAL_MS;
    while (homeNextFrameTime <= now);
  }
  let needsRender = dirty;
  dirty = false;
  if (scrollAnimating) {
    if (HOME_EMBEDDED) {
      const elapsedMs = scrollFrameTime ? now - scrollFrameTime : 1000 / 60;
      const dt = Math.min(0.05, elapsedMs / 1000);
      scrollFrameTime = now;
      // Scroll position is the sole authority. Sample it on every accepted
      // visual frame so native wheel/touch, scrollbar dragging, browser
      // restoration, and third-party smooth scrolling cannot leave a stale
      // event-derived target behind.
      scrollTarget = progressFromScroll();
      const remaining = scrollTarget - progress;
      let next = THREE.MathUtils.damp(progress, scrollTarget, HOME_SCROLL_DAMPING, dt);
      const settled = Math.abs(remaining) <= SCROLL_SNAP_EPSILON
        || Math.abs(next - scrollTarget) <= SCROLL_SNAP_EPSILON;
      if (settled) {
        next = scrollTarget;
        scrollAnimating = false;
        scrollVelocity = 0;
        scrollFrameTime = 0;
        homeNextFrameTime = 0;
      }
      // This loop has already coalesced work to one accepted visual frame, so
      // never discard its small final increments behind the general UI guard.
      applyProgress(next, false, true);
      if (!scrollAnimating) finishScrubQuality();
      needsRender = true;
    } else {
      const elapsedMs = scrollFrameTime ? now - scrollFrameTime : 1000 / 60;
      const dt = Math.min(0.05, elapsedMs / 1000);
      scrollFrameTime = now;
      slowFrameScore = elapsedMs > SLOW_FRAME_MS
        ? slowFrameScore + 1
        : Math.max(0, slowFrameScore - 0.35);
      if (slowFrameScore >= SLOW_FRAME_SCORE_LIMIT && renderQualityIndex < ADAPTIVE_DPR_STEPS.length - 1) {
        renderQualityIndex += 1;
        slowFrameScore = 0;
        applyRenderResolution();
        needsRender = true;
      }
      let next = THREE.MathUtils.damp(progress, scrollTarget, SCROLL_DAMPING, dt);
      if (Math.abs(next - scrollTarget) <= SCROLL_SNAP_EPSILON) {
        next = scrollTarget;
        scrollAnimating = false;
        scrollFrameTime = 0;
      }
      applyProgress(next, false, true);
      needsRender = true;
    }
  }
  if (needsRender) renderer.render(scene, camera);
  if (scrollAnimating) startLoop();
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
  const blend = HOME_EMBEDDED
    ? gate * (2 - gate)
    : gate * gate * (3 - 2 * gate);
  const cap = HOME_EMBEDDED ? 2.15 : PORTRAIT_DISTANCE_CAP;
  return Math.min(1 + (fit - 1) * blend, cap);
}

function tuneHomepageMaterial(material) {
  if (!material || !HOME_EMBEDDED) return;
  const color = HOME_MATERIAL_CONTRAST.get(material.name);
  if (color !== undefined && material.color) material.color.setHex(color);
  if (material.name === 'LedClear') {
    if ('roughness' in material) material.roughness = Math.max(material.roughness, 0.38);
    if ('metalness' in material) material.metalness = Math.min(material.metalness, 0.08);
  }
}

function homeWideFactor() {
  if (!HOME_EMBEDDED) return 0;
  const aspect = camera ? camera.aspect : 1;
  return clamp01((aspect - 0.95) / 1.05);
}

function homeDistanceScale() {
  if (!HOME_EMBEDDED) return 1;
  // Keep the product comfortably framed on phones, but use the extra width
  // of a desktop stage instead of leaving the assembly thumbnail-sized.
  return THREE.MathUtils.lerp(1.06, 0.94, homeWideFactor());
}

function headerSafeShift(p) {
  if (!HOME_EMBEDDED) return 0.1;
  // Keep separated parts below the headline. Once assembly is complete, a
  // short desktop-only camera settle lifts the compact final product clear of
  // the timeline without forcing the entire sequence to remain tiny.
  const settle = easeInOutCubic(clamp01(
    (p - ASSEMBLY_SETTLED_PROGRESS) / (1 - ASSEMBLY_SETTLED_PROGRESS)
  ));
  const wideShift = THREE.MathUtils.lerp(0.15, 0.075, settle);
  return THREE.MathUtils.lerp(0.15, wideShift, homeWideFactor());
}

function updateCamera(p) {
  if (!closedFrame || !explodedFrame) return;
  const explosionEnd = 0.67;
  const cameraSettleStart = HOME_EMBEDDED ? ASSEMBLY_SETTLED_PROGRESS : REASSEMBLY_START;
  let center;
  let dist;
  let azim;
  let elev;
  if (p <= explosionEnd) {
    const normalized = clamp01(p / explosionEnd);
    // On the homepage the parts begin separating before an ease-in camera
    // has created enough room. Open the technical view early so small pieces
    // never cross the title or leave the viewport mid-scrub.
    const t = HOME_EMBEDDED ? easeOutCubic(normalized) : easeInOutCubic(normalized);
    center = closedFrame.center.clone().lerp(explodedFrame.center, t);
    dist = THREE.MathUtils.lerp(closedFrame.dist, explodedFrame.dist, t);
    azim = THREE.MathUtils.lerp(-0.55, 0.5, t);
    elev = THREE.MathUtils.lerp(0.62, 0.4, t);
  } else if (p <= cameraSettleStart) {
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
    // The standalone review follows Blender's authored camera boundary. On
    // the homepage, the product finishes assembling first and the camera then
    // settles over the final scroll interval so loose parts never cross text.
    const t = easeInOutCubic(clamp01(
      (p - cameraSettleStart) / (1 - cameraSettleStart)
    ));
    center = explodedFrame.center.clone().lerp(closedFrame.center, t);
    dist = THREE.MathUtils.lerp(explodedFrame.dist, closedFrame.dist * 1.08, t);
    azim = THREE.MathUtils.lerp(0.5, -0.78, t);
    elev = THREE.MathUtils.lerp(0.4, 0.52, t);
  }
  dist *= portraitDistanceScale();
  dist *= homeDistanceScale();
  // The title occupies the upper stage lane. Aim the camera slightly above
  // the assembly so the rendered product sits lower on screen and never
  // disappears behind the headline during intermediate inspection poses.
  center.y += dist * headerSafeShift(p);
  camera.position.set(
    center.x + dist * Math.cos(elev) * Math.sin(azim),
    center.y + dist * Math.sin(elev),
    center.z + dist * Math.cos(elev) * Math.cos(azim)
  );
  camera.lookAt(center);
  // Callout anchors are projected before the renderer's next draw. Refresh
  // the camera matrices now so dots and lines follow this exact camera pose
  // rather than lagging one frame behind (or projecting off-screen).
  camera.updateMatrixWorld(true);
}

function buildCallouts(root) {
  if (!calloutsEl || !leadersEl) return;
  calloutsEl.replaceChildren();
  leadersEl.replaceChildren();
  calloutTargets.clear();
  calloutLines.clear();
  calloutDots.clear();
  calloutSurfaceSamples.clear();
  calloutLocalBounds.clear();
  for (const spec of calloutSpecs) {
    const box = document.createElement('div');
    box.className = 'cpv-callout cpv-callout-' + spec.side;
    box.dataset.part = spec.part;
    box.innerHTML = '<span class="cpv-callout-name"></span><span class="cpv-callout-cost"></span>';
    box.querySelector('.cpv-callout-name').textContent = spec.name;
    box.querySelector('.cpv-callout-cost').textContent = spec.cost;
    box.addEventListener('transitionend', (event) => {
      if (event.propertyName === 'transform' && box.classList.contains('is-active')) {
        syncLeaderToMovingLabel(spec.part);
      }
    });
    calloutsEl.append(box);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke-linecap', 'round');
    leadersEl.append(line);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.classList.add('cpv-leader-dot');
    dot.dataset.part = spec.part;
    dot.setAttribute('r', '6.5');
    leadersEl.append(dot);
    calloutTargets.set(spec.part, box);
    calloutLines.set(spec.part, line);
    calloutDots.set(spec.part, dot);
    const objects = spec.part === 'led_pair'
      ? [root.getObjectByName('led_left'), root.getObjectByName('led_right')]
      : [root.getObjectByName(spec.part)];
    const samples = [];
    const localBounds = [];
    for (const object of objects) {
      const positions = object?.geometry?.getAttribute('position');
      if (!object || !positions) continue;
      object.geometry.computeBoundingBox();
      if (object.geometry.boundingBox) {
        localBounds.push({ object, box: object.geometry.boundingBox.clone() });
      }
      const sampleLimit = HOME_EMBEDDED ? 128 : 320;
      const stride = Math.max(1, Math.ceil(positions.count / sampleLimit));
      const points = [];
      for (let index = 0; index < positions.count; index += stride) {
        points.push(new THREE.Vector3().fromBufferAttribute(positions, index));
      }
      samples.push({ object, points });
    }
    calloutSurfaceSamples.set(spec.part, samples);
    calloutLocalBounds.set(spec.part, localBounds);
  }
  updateCallouts(root);
}

function surfaceAnchorFor(part, labelX, labelY, width, height, fallbackBounds) {
  let best = null;
  let bestDistance = Infinity;
  for (const sample of calloutSurfaceSamples.get(part) || []) {
    sample.object.updateWorldMatrix(true, false);
    for (const localPoint of sample.points) {
      projectedSurfacePoint.copy(localPoint).applyMatrix4(sample.object.matrixWorld).project(camera);
      if (projectedSurfacePoint.z < -1 || projectedSurfacePoint.z > 1) continue;
      const x = (projectedSurfacePoint.x * 0.5 + 0.5) * width;
      const y = (-projectedSurfacePoint.y * 0.5 + 0.5) * height;
      const distance = (x - labelX) ** 2 + (y - labelY) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x, y };
      }
    }
  }
  return best || nearestRectEdge(fallbackBounds, labelX, labelY, 3);
}

function projectedBoundsFor(root, part, width, height) {
  const entries = calloutLocalBounds.get(part) || [];
  if (!entries.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { object, box } of entries) {
    object.updateWorldMatrix(true, false);
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          projectedCorner.set(x, y, z).applyMatrix4(object.matrixWorld).project(camera);
          const screenX = (projectedCorner.x * 0.5 + 0.5) * width;
          const screenY = (-projectedCorner.y * 0.5 + 0.5) * height;
          minX = Math.min(minX, screenX);
          minY = Math.min(minY, screenY);
          maxX = Math.max(maxX, screenX);
          maxY = Math.max(maxY, screenY);
        }
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

function nearestRectEdge(rect, x, y, inset = 0) {
  const left = rect.minX + inset;
  const right = rect.maxX - inset;
  const top = rect.minY + inset;
  const bottom = rect.maxY - inset;
  const clampedX = THREE.MathUtils.clamp(x, left, right);
  const clampedY = THREE.MathUtils.clamp(y, top, bottom);
  if (x < left) return { x: left, y: clampedY };
  if (x > right) return { x: right, y: clampedY };
  if (y < top) return { x: clampedX, y: top };
  if (y > bottom) return { x: clampedX, y: bottom };
  const edges = [
    { distance: x - left, x: left, y },
    { distance: right - x, x: right, y },
    { distance: y - top, x, y: top },
    { distance: bottom - y, x, y: bottom },
  ];
  edges.sort((a, b) => a.distance - b.distance);
  return edges[0];
}

function activeCalloutIndex(p) {
  const annotationStart = 0.16;
  const annotationEnd = 0.88;
  const annotationSpan = (annotationEnd - annotationStart) / calloutSpecs.length;
  return p >= annotationStart && p <= annotationEnd
    ? Math.min(calloutSpecs.length - 1, Math.floor((p - annotationStart) / annotationSpan))
    : -1;
}

function syncLeaderToMovingLabel(part) {
  if (!stage) return;
  const box = calloutTargets.get(part);
  const line = calloutLines.get(part);
  if (!box || !line || !box.classList.contains('is-active')) return;
  const target = { x: Number(line.dataset.anchorX), y: Number(line.dataset.anchorY) };
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return;
  const stageRect = stage.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  const labelBounds = {
    minX: boxRect.left - stageRect.left,
    minY: boxRect.top - stageRect.top,
    maxX: boxRect.right - stageRect.left,
    maxY: boxRect.bottom - stageRect.top,
  };
  const labelEdge = nearestRectEdge(labelBounds, target.x, target.y);
  line.setAttribute('x2', String(labelEdge.x));
  line.setAttribute('y2', String(labelEdge.y));
}

function followMovingCallout(now) {
  calloutFollowRaf = 0;
  if (!calloutFollowFrameTime || now - calloutFollowFrameTime >= CALLOUT_FOLLOW_INTERVAL_MS) {
    calloutFollowFrameTime = now;
    const active = calloutSpecs[activeCalloutIndex(progress)];
    if (active) syncLeaderToMovingLabel(active.part);
  }
  if (now < calloutFollowUntil) {
    calloutFollowRaf = requestAnimationFrame(followMovingCallout);
  } else {
    calloutFollowFrameTime = 0;
  }
}

function scheduleCalloutFollow() {
  if (reducedMotion) {
    const active = calloutSpecs[activeCalloutIndex(progress)];
    if (active) syncLeaderToMovingLabel(active.part);
    return;
  }
  // The caption itself eases for 240 ms; keep the connector synchronized for
  // one final frame so its text-end never trails behind the CSS transition.
  calloutFollowUntil = performance.now() + 300;
  if (!calloutFollowRaf) calloutFollowRaf = requestAnimationFrame(followMovingCallout);
}

function syncPartListHighlight(spec) {
  const nextPart = spec?.part || '';
  if (nextPart === activeCalloutPart) return;
  activeCalloutPart = nextPart;
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
  const activeChanged = activeIndex !== renderedCalloutIndex;
  if (activeChanged) {
    renderedCalloutIndex = activeIndex;
    syncPartListHighlight(activeSpec);
    calloutsEl.hidden = !visible;
    leadersEl.hidden = !visible;
    calloutsEl.style.display = visible ? '' : 'none';
    leadersEl.style.display = visible ? 'block' : 'none';
    for (const spec of calloutSpecs) {
      const box = calloutTargets.get(spec.part);
      const line = calloutLines.get(spec.part);
      const dot = calloutDots.get(spec.part);
      const active = visible && spec === activeSpec;
      if (box) {
        box.classList.toggle('is-active', active);
        box.style.display = visible ? 'block' : 'none';
        box.setAttribute('aria-hidden', String(!active));
      }
      if (line) line.style.opacity = active ? '0.94' : '0';
      if (dot) dot.style.opacity = active ? '1' : '0';
    }
  }
  if (!visible || !activeSpec) return;
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
  const spec = activeSpec;
  const box = calloutTargets.get(spec.part);
  const line = calloutLines.get(spec.part);
  const dot = calloutDots.get(spec.part);
  if (!box || !line || !dot) return;
    const bounds = projectedBoundsFor(root, spec.part, width, height);
    if (!bounds) return;
    let labelWidth = Number(box.dataset.cpvWidth);
    let labelHeight = Number(box.dataset.cpvHeight);
    if (!Number.isFinite(labelWidth) || !Number.isFinite(labelHeight)) {
      // No-wrap names can be wider than their styled box. Use the actual
      // painted width so long labels are clamped inside the viewport instead
      // of being cut off at an edge.
      labelWidth = Math.max(box.offsetWidth, box.scrollWidth) || Math.min(208, width * 0.24);
      labelHeight = box.offsetHeight || 56;
      box.dataset.cpvWidth = String(labelWidth);
      box.dataset.cpvHeight = String(labelHeight);
    }
    let boxX;
    let boxY;
    if (mobile) {
      boxX = width * (spec.side === 'left' ? 0.22 : 0.78);
      boxY = height * slots[spec.row];
    } else {
      // Keep each active caption beside its actual projected silhouette. If
      // the authored side has no room, flip to the clearer side automatically.
      const gap = 22;
      const leftSpace = bounds.minX;
      const rightSpace = width - bounds.maxX;
      if (leftSpace < labelWidth + gap && rightSpace < labelWidth + gap) {
        // Wide subjects such as the enclosure can consume both side lanes.
        // Put the caption above/below the silhouette instead of overlapping it.
        const topSpace = bounds.minY;
        const bottomSpace = height - bounds.maxY;
        const useTop = topSpace >= labelHeight + gap || topSpace >= bottomSpace;
        boxX = THREE.MathUtils.clamp(
          (bounds.minX + bounds.maxX) / 2,
          labelWidth / 2 + 12,
          width - labelWidth / 2 - 12
        );
        boxY = useTop
          ? bounds.minY - gap - labelHeight / 2
          : bounds.maxY + gap + labelHeight / 2;
      } else {
        let side = spec.side;
        if (side === 'left' && leftSpace < labelWidth + gap) side = 'right';
        if (side === 'right' && rightSpace < labelWidth + gap) side = 'left';
        boxX = side === 'left'
          ? bounds.minX - gap - labelWidth / 2
          : bounds.maxX + gap + labelWidth / 2;
        boxY = (bounds.minY + bounds.maxY) / 2;
      }
      boxX = THREE.MathUtils.clamp(boxX, labelWidth / 2 + 12, width - labelWidth / 2 - 12);
      boxY = THREE.MathUtils.clamp(
        boxY,
        Math.max(labelHeight / 2 + 12, height * 0.20),
        height * 0.76
      );
      // A side lane can still be pulled back over a narrow subject by the
      // viewport clamp. Resolve that last collision in a vertical lane so the
      // caption never sits on top of the part it is describing.
      const candidateBounds = {
        minX: boxX - labelWidth / 2,
        minY: boxY - labelHeight / 2,
        maxX: boxX + labelWidth / 2,
        maxY: boxY + labelHeight / 2,
      };
      const overlaps = candidateBounds.minX < bounds.maxX
        && candidateBounds.maxX > bounds.minX
        && candidateBounds.minY < bounds.maxY
        && candidateBounds.maxY > bounds.minY;
      if (overlaps) {
        const topSpace = bounds.minY;
        const bottomSpace = height - bounds.maxY;
        const useTop = topSpace >= labelHeight + gap || topSpace >= bottomSpace;
        boxX = THREE.MathUtils.clamp(
          (bounds.minX + bounds.maxX) / 2,
          labelWidth / 2 + 12,
          width - labelWidth / 2 - 12
        );
        boxY = useTop
          ? bounds.minY - gap - labelHeight / 2
          : bounds.maxY + gap + labelHeight / 2;
        boxY = THREE.MathUtils.clamp(
          boxY,
          Math.max(labelHeight / 2 + 12, height * 0.20),
          height * 0.76
        );
      }
    }
    // Transform-only movement stays on the compositor instead of invalidating
    // page layout on every projected label update.
    box.style.transform = `translate3d(${boxX}px,${boxY}px,0) translate(-50%,-50%)`;
    const target = surfaceAnchorFor(spec.part, boxX, boxY, width, height, bounds);
    line.setAttribute('x1', String(target.x));
    line.setAttribute('y1', String(target.y));
    line.dataset.anchorX = String(target.x);
    line.dataset.anchorY = String(target.y);
    dot.setAttribute('cx', String(target.x));
    dot.setAttribute('cy', String(target.y));
    line.dataset.targetBounds = [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY]
      .map((value) => value.toFixed(2)).join(',');
    // Set the first connector frame from the destination geometry immediately;
    // the follower below then tracks the label's CSS easing frames.
    const intendedLabelBounds = {
      minX: boxX - labelWidth / 2,
      minY: boxY - labelHeight / 2,
      maxX: boxX + labelWidth / 2,
      maxY: boxY + labelHeight / 2,
    };
    const intendedEdge = nearestRectEdge(intendedLabelBounds, target.x, target.y);
    line.setAttribute('x2', String(intendedEdge.x));
    line.setAttribute('y2', String(intendedEdge.y));
    // During active scrubbing, follow only when the editorial caption changes.
    // This preserves the quarter-second attachment animation without forcing a
    // layout read for every WebGL frame.
    // During scrubbing the CSS transition is disabled, so label and leader
    // share the exact projected destination without a layout-reading follower.
    if (!scrubQuality) scheduleCalloutFollow();
}

function updateProgressUI(p) {
  const pct = Math.round(p * 100);
  if (progressFill) progressFill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  const pose = poseStateFor(p);
  const percentChanged = pct !== lastUiPercent;
  const poseChanged = pose !== lastUiPose;
  if (percentChanged) {
    lastUiPercent = pct;
    if (progressLabel) progressLabel.textContent = 'scrub ' + String(pct).padStart(3, '0') + '%';
    progressEl?.setAttribute('aria-valuenow', String(pct));
  }
  if (percentChanged || poseChanged) {
    progressEl?.setAttribute('aria-valuetext', pose + ' — ' + pct + '%');
  }
  if (poseChanged) {
    lastUiPose = pose;
    poseEl.textContent = ' · ' + pose;
    if (statusEl && !statusEl.contains(poseEl)) statusEl.appendChild(poseEl);
  }
  const buttonState = p <= 0.02 ? 'closed' : p >= 0.52 && p <= 0.82 ? 'exploded' : p >= 0.9 ? 'reassembled' : '';
  if (buttonState !== lastUiButtonState) {
    lastUiButtonState = buttonState;
    for (const button of poseButtons) {
      const target = Number(button.dataset.cpvPose);
      const active = target === 0 ? p <= 0.02 : target === 0.67 ? p >= 0.52 && p <= 0.82 : p >= 0.9;
      button.setAttribute('aria-pressed', String(active));
    }
  }
  if (rangeEl && document.activeElement !== rangeEl) rangeEl.value = p.toFixed(3);
}

function authoredPoseProgress(p) {
  if (!HOME_EMBEDDED) return p;
  if (p <= REASSEMBLY_START) return p;
  const settleSpan = ASSEMBLY_SETTLED_PROGRESS - REASSEMBLY_START;
  const t = clamp01((p - REASSEMBLY_START) / settleSpan);
  return THREE.MathUtils.lerp(REASSEMBLY_START, 1, t);
}

function applyProgress(p, scheduleRender = true, force = false) {
  const nextProgress = clamp01(p);
  if (!force && ready && hasAppliedProgress && Math.abs(nextProgress - progress) < 0.0005) return;
  progress = nextProgress;
  if (ready) {
    hasAppliedProgress = true;
    setScrubQuality();
    samplePose(authoredPoseProgress(progress));
    updateCamera(progress);
    updateCallouts();
    updateProgressUI(progress);
    if (scheduleRender) requestRender();
  }
}

function refreshScrollRange() {
  if (HOME_EMBEDDED && EMBED_ROOT) {
    const rect = EMBED_ROOT.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const stickyRunway = Math.max(1, EMBED_ROOT.offsetHeight - viewportHeight);
    cachedScrollRange = {
      start: window.scrollY + rect.top,
      // Finish before the sticky section releases. The short final hold gives
      // the smoothed timeline room to settle even after a strong wheel flick.
      max: Math.max(1, stickyRunway * HOME_TIMELINE_SCROLL_FRACTION),
      stickyRunway,
    };
    return cachedScrollRange;
  }
  cachedScrollRange = { start: 0, max: Math.max(1, document.documentElement.scrollHeight - window.innerHeight) };
  return cachedScrollRange;
}

function scrollRange() {
  return cachedScrollRange || refreshScrollRange();
}

function progressFromScroll() {
  const range = scrollRange();
  return clamp01((window.scrollY - range.start) / range.max);
}

function computeProgressFromScroll() {
  scrollTarget = progressFromScroll();
  applyProgress(scrollTarget);
}

function targetProgressFromScroll() {
  const range = scrollRange();
  scrollTarget = clamp01((window.scrollY - range.start) / range.max);
  // Never let the time-smoothed pose continue after the sticky stage starts
  // leaving the viewport. The final part of the section is deliberately a
  // hold zone; settle the last pose inside it and release only when complete.
  if (HOME_EMBEDDED && range.stickyRunway) {
    const runwayProgress = clamp01((window.scrollY - range.start) / range.stickyRunway);
    if (runwayProgress >= HOME_FORCE_SETTLE_FRACTION && scrollTarget >= 1) {
      scrollAnimating = false;
      scrollVelocity = 0;
      scrollFrameTime = 0;
      scrollTarget = 1;
      applyProgress(1);
      return;
    }
  }
  if (reducedMotion) {
    scrollAnimating = false;
    scrollVelocity = 0;
    scrollFrameTime = 0;
    applyProgress(scrollTarget);
    return;
  }
  if (!scrollAnimating) {
    scrollFrameTime = 0;
    homeNextFrameTime = 0;
  }
  scrollAnimating = Math.abs(progress - scrollTarget) > SCROLL_SNAP_EPSILON;
  if (scrollAnimating) startLoop();
}

function scrollToProgress(p) {
  const range = scrollRange();
  // The Three.js timeline owns visual interpolation. A second native smooth
  // scroll would create a competing timeline and replay intermediate poses.
  window.scrollTo({ top: range.start + clamp01(p) * range.max, behavior: 'auto' });
}

function requestedReviewProgress() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('p') ?? params.get('candidate-review');
  if (raw === null || raw.trim() === '') return null;
  const num = Number(raw);
  return Number.isFinite(num) ? clamp01(num) : null;
}

function restoreRequestedProgress(p) {
  scrollAnimating = false;
  scrollVelocity = 0;
  scrollFrameTime = 0;
  scrollTarget = p;
  applyProgress(p);
  scrollToProgress(p);
  // Chrome may apply its saved scroll position after scripts and after the
  // final layout pass. Reassert the explicit review URL once on the next
  // frame so `?p=` wins without fighting later user scrolling.
  requestAnimationFrame(() => {
    scrollTarget = p;
    scrollToProgress(p);
    applyProgress(p);
  });
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
  refreshScrollRange();
  for (const box of calloutTargets.values()) {
    delete box.dataset.cpvWidth;
    delete box.dataset.cpvHeight;
  }
  applyRenderResolution();
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
  // Fit the review camera to the complete authored path, not only the 67%
  // checkpoint. Several parts reach their widest inspection offsets between
  // the named poses; omitting those bounds lets the assembly leave frame.
  const reviewBox = new THREE.Box3().makeEmpty();
  const frameSamples = HOME_EMBEDDED ? 12 : 24;
  for (let i = 0; i <= frameSamples; i++) {
    samplePose(i / frameSamples);
    root.updateMatrixWorld(true);
    reviewBox.union(new THREE.Box3().setFromObject(root));
  }
  samplePose(progress);
  root.updateMatrixWorld(true);
  closedFrame = frameFor(closedBox);
  explodedFrame = frameFor(reviewBox);
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
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe6d2, 0.6);
  rim.position.set(-0.5, 0.3, -0.6);
  scene.add(rim);
  const fill = new THREE.PointLight(0xcfdde6, 0.3, 1.5);
  fill.position.set(-0.3, -0.2, 0.5);
  scene.add(fill);

}

try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
} catch (err) {
  showFallback('WebGL is unavailable in this browser.', err);
}
if (renderer && !failed) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = false;

  initScene();

  new GLTFLoader().load(GLB_URL, async (gltf) => {
    if (failed) return;
    const root = gltf.scene;
    assetRoot = root;
    scene.add(root);
    root.traverse((o) => {
      if (o.isMesh) {
        if (HOME_EMBEDDED) {
          // These are small independently animated technical parts. Keeping
          // them out of frustum heuristics prevents stale bounds from dropping
          // an LED or wire for a frame during rapid camera/pose changes.
          o.frustumCulled = false;
          for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
            tuneHomepageMaterial(material);
          }
        }
        o.castShadow = false;
        o.receiveShadow = false;
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
    // Compile every visible material after the lazy GLB load, before the user
    // begins scrubbing. This moves one-time shader setup out of interaction.
    try {
      if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
      else renderer.compile(scene, camera);
    } catch (err) {
      // Compilation is an optional warm-up. Rendering can still compile the
      // same programs normally if a browser rejects the parallel extension.
      console.warn('Candidate preview shader warm-up:', err);
    }
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
      restoreRequestedProgress(requested);
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
  // Scroll events only update a numeric target. The single render loop above
  // samples that target, advances the authored pose, and draws once per frame.
  window.addEventListener('scroll', targetProgressFromScroll, { passive: true });
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', targetProgressFromScroll, { passive: true });
  }

  window.addEventListener('resize', measureStage);

  window.addEventListener('pageshow', () => {
    const requested = requestedReviewProgress();
    if (requested !== null) restoreRequestedProgress(requested);
  }, { once: true });

  // Harden against GPU/WebGL context loss: prevent the browser default, stop
  // rendering, and surface the existing fallback without a reload loop. The
  // parts list and controls remain usable alongside the notice.
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showFallback('The assembly preview lost its connection.', new Error('webglcontextlost'));
  });

  rangeEl?.addEventListener('input', () => {
    const next = clamp01(Number(rangeEl.value));
    scrollAnimating = false;
    scrollVelocity = 0;
    scrollFrameTime = 0;
    scrollTarget = next;
    applyProgress(next);
  });
  rangeEl?.addEventListener('change', () => {
    // Keep the range gesture single-owner: `input` drives the WebGL pose while
    // the thumb moves, then the committed value synchronizes page scroll once.
    // Scrolling on every input feeds back through the scroll listener and
    // schedules a second pose update for the same visual frame.
    scrollToProgress(clamp01(Number(rangeEl.value)));
  });
  resetEl?.addEventListener('click', () => {
    scrollAnimating = false;
    scrollVelocity = 0;
    scrollFrameTime = 0;
    scrollTarget = 0;
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
      scrollAnimating = false;
      scrollVelocity = 0;
      scrollFrameTime = 0;
      scrollTarget = next;
      applyProgress(next);
      history.replaceState(null, '', poseLinkFor(next));
      scrollToProgress(next);
    });
  }
  if (stage && typeof ResizeObserver !== 'undefined') new ResizeObserver(measureStage).observe(stage);

  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      if (inView) {
        updateCallouts();
        requestRender();
      } else {
        // Synchronize once before pausing so layout-driven exits/re-entries can
        // never reveal an abandoned intermediate pose.
        scrollTarget = progressFromScroll();
        applyProgress(scrollTarget, false, true);
        cancelAnimationFrame(rafId);
        cancelAnimationFrame(calloutFollowRaf);
        rafId = 0;
        calloutFollowRaf = 0;
        scrollAnimating = false;
        scrollVelocity = 0;
        scrollFrameTime = 0;
        finishScrubQuality();
      }
    }, { threshold: 0, rootMargin: '100px 0px' });
    // Observe the stationary runway on the homepage. Observing the sticky
    // child lets fast scrolls toggle it out while its timeline still needs to
    // settle, which used to stop the animation at arbitrary poses.
    const visibilityTarget = HOME_EMBEDDED ? EMBED_ROOT : stage;
    if (visibilityTarget) io.observe(visibilityTarget);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(calloutFollowRaf);
      rafId = 0;
      calloutFollowRaf = 0;
      scrollAnimating = false;
      scrollVelocity = 0;
      scrollFrameTime = 0;
      finishScrubQuality();
    } else {
      scrollTarget = progressFromScroll();
      if (Math.abs(progress - scrollTarget) > SCROLL_SNAP_EPSILON) targetProgressFromScroll();
      requestRender();
    }
  });

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(calloutFollowRaf);
    clearTimeout(scrubIdleTimer);
    document.body.classList.remove('cpv-scrubbing');
    rafId = 0;
    calloutFollowRaf = 0;
    scrollAnimating = false;
    scrollVelocity = 0;
    scrollFrameTime = 0;
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
      scrollTarget,
      scrollVelocity,
      scrollAnimating,
      activeCallout: activeCalloutIndex(progress) >= 0 ? calloutSpecs[activeCalloutIndex(progress)].part : null,
      renderPaused: !inView || document.hidden,
      cameraPosition: camera ? {
        x: Number(camera.position.x.toFixed(4)),
        y: Number(camera.position.y.toFixed(4)),
        z: Number(camera.position.z.toFixed(4)),
      } : null,
      renderPixelRatio: renderer ? Number(renderer.getPixelRatio().toFixed(3)) : null,
      renderQualityScale: ADAPTIVE_DPR_STEPS[renderQualityIndex],
      renderSize: renderer ? {
        width: renderer.domElement.width,
        height: renderer.domElement.height,
      } : null,
      scrubQuality,
      scrubBackdropDisabled: document.body.classList.contains('cpv-scrubbing'),
      panelBackdrop: partsEl ? getComputedStyle(partsEl).backdropFilter : null,
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
