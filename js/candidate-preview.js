import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GLB_URL = 'assets/3d/flashlight-assembly-blender-candidate.glb?v=refined-20260909a';
const CLIP_PATTERN = /^ScrollSequence/;
const EMBED_ROOT = document.querySelector('[data-cpv-embedded]');
const HOME_EMBEDDED = Boolean(EMBED_ROOT);
if (!HOME_EMBEDDED && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
// Allocate a stable drawing buffer on resize only. The pixel budget caps very
// large desktop canvases while the 1x floor keeps edges crisp during motion.
const DPR_CAP = 1.5;
const MIN_RENDER_DPR = 1;
const MAX_RENDER_PIXELS = 2_400_000;
const SCRUB_IDLE_MS = 140;
const SCROLL_DAMPING = HOME_EMBEDDED ? 28 : 18;
const SCROLL_SNAP_EPSILON = 0.00035;
// Complete the authored motion well before sticky positioning releases. The
// remaining runway is a visible end hold, not hidden animation time. This is
// especially important after a large wheel/touchpad impulse: the time-based
// follower can settle while the stage is still fully pinned.
const HOME_TIMELINE_SCROLL_FRACTION = 0.90;
const HOME_FORCE_SETTLE_FRACTION = 0.98;
const FOV = 32;
const REASSEMBLY_START = 0.8333333333;
const CAMERA_SETTLE_START_PROGRESS = 108 / 120;
const ASSEMBLY_COMPLETE_PROGRESS = 114 / 120;

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
let scrubQuality = false;
let scrubIdleTimer = 0;
let hasAppliedProgress = false;
let lastCalloutProjectionTime = 0;
let activeCalloutPart = '';
let renderedCalloutIndex = -2;
let lastUiPercent = -1;
let lastUiPose = '';
let lastUiButtonState = '';
let cachedScrollRange = null;
let stageMetrics = { width: 1, height: 1, mobile: window.innerWidth < 760 };
const calloutSpecs = [
  { part: 'enclosure', name: 'Case', cost: '$1.10', side: 'left', row: 0 },
  { part: 'solar_panel_placeholder', name: 'Solar panel', cost: '$1.50', side: 'left', row: 1 },
  { part: 'battery', name: 'LiPo battery', cost: '$1.65', side: 'right', row: 0 },
  { part: 'charge_module', name: 'TP4056 board', cost: '$0.45', side: 'right', row: 1 },
  { part: 'led_pair', name: '5 mm LEDs', cost: '$0.12', side: 'right', row: 2 },
  { part: 'switch', name: 'Slide switch', cost: '$0.35', side: 'right', row: 2 },
];
const calloutTargets = new Map();
const calloutLines = new Map();
const calloutDots = new Map();
const calloutLocalBounds = new Map();
const projectedCorner = new THREE.Vector3();

function setStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
    if (poseEl.textContent && !statusEl.contains(poseEl)) statusEl.appendChild(poseEl);
  }
}

function poseStateFor(p) {
  if (p <= 0) return 'Closed';
  if (p >= ASSEMBLY_COMPLETE_PROGRESS) return 'Reassembled';
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
  scrollAnimating = false;
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
  return Math.max(MIN_RENDER_DPR, Math.min(deviceDpr, pixelBudgetDpr));
}

function applyRenderResolution() {
  if (!stage || !renderer || failed) return;
  const { width: w, height: h } = stageMetrics;
  const nextDpr = renderPixelRatio(w, h);
  const canvasWidth = Math.round(w * nextDpr);
  const canvasHeight = Math.round(h * nextDpr);
  if (canvas.width === canvasWidth && canvas.height === canvasHeight) return;
  renderer.setPixelRatio(nextDpr);
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
  let needsRender = dirty;
  dirty = false;
  if (scrollAnimating) {
    const elapsedMs = scrollFrameTime ? now - scrollFrameTime : 1000 / 60;
    const dt = Math.min(0.05, elapsedMs / 1000);
    scrollFrameTime = now;
    // Native scroll is the sole input owner. Refreshing the numeric target is
    // layout-free because the runway geometry is cached on resize.
    if (HOME_EMBEDDED) scrollTarget = progressFromScroll();
    let next = reducedMotion
      ? scrollTarget
      : THREE.MathUtils.damp(progress, scrollTarget, SCROLL_DAMPING, dt);
    if (Math.abs(next - scrollTarget) <= SCROLL_SNAP_EPSILON) {
      next = scrollTarget;
      scrollAnimating = false;
      scrollFrameTime = 0;
    }
    applyProgress(next, false, true);
    if (!scrollAnimating) finishScrubQuality();
    needsRender = true;
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

function homeWideFactor() {
  if (!HOME_EMBEDDED) return 0;
  const aspect = camera ? camera.aspect : 1;
  return clamp01((aspect - 0.95) / 0.65);
}

function homeDistanceScale() {
  if (!HOME_EMBEDDED) return 1;
  // Keep the product comfortably framed on phones, but use the extra width
  // of a desktop stage instead of leaving the assembly thumbnail-sized.
  return THREE.MathUtils.lerp(1.06, 0.98, homeWideFactor());
}

function headerSafeShift(p) {
  if (!HOME_EMBEDDED) return 0.1;
  // The compact closed product can sit near 60% of the viewport with a clear
  // lower margin. Ease into the deeper title-safe lane as parts separate.
  const inspection = easeInOutCubic(clamp01(p / 0.14));
  const inspectionShift = THREE.MathUtils.lerp(0.06, 0.15, inspection);
  // Once assembly is complete, a short camera settle lifts the final product
  // clear of the timeline without forcing the entire sequence to remain tiny.
  const settle = easeInOutCubic(clamp01(
    (p - CAMERA_SETTLE_START_PROGRESS) / (ASSEMBLY_COMPLETE_PROGRESS - CAMERA_SETTLE_START_PROGRESS)
  ));
  const wideShift = THREE.MathUtils.lerp(inspectionShift, 0.075, settle);
  return THREE.MathUtils.lerp(0.15, wideShift, homeWideFactor());
}

function updateCamera(p) {
  if (!closedFrame || !explodedFrame) return;
  const explosionEnd = 0.67;
  const cameraSettleStart = HOME_EMBEDDED ? CAMERA_SETTLE_START_PROGRESS : REASSEMBLY_START;
  const cameraSettleEnd = HOME_EMBEDDED ? ASSEMBLY_COMPLETE_PROGRESS : 1;
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
      (p - cameraSettleStart) / (cameraSettleEnd - cameraSettleStart)
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

function cacheCalloutLabelSizes() {
  if (!calloutsEl) return;
  const wasHidden = calloutsEl.hidden;
  const previousDisplay = calloutsEl.style.display;
  const previousVisibility = calloutsEl.style.visibility;
  const boxDisplays = [];
  calloutsEl.hidden = false;
  calloutsEl.style.display = 'block';
  calloutsEl.style.visibility = 'hidden';
  for (const box of calloutTargets.values()) {
    boxDisplays.push([box, box.style.display]);
    box.style.display = 'block';
  }
  const measurements = boxDisplays.map(([box]) => ({
    box,
    width: Math.max(box.offsetWidth, box.scrollWidth),
    height: box.offsetHeight,
  }));
  for (const { box, width, height } of measurements) {
    box.dataset.cpvWidth = String(width || 208);
    box.dataset.cpvHeight = String(height || 56);
  }
  for (const [box, display] of boxDisplays) box.style.display = display;
  calloutsEl.hidden = wasHidden;
  calloutsEl.style.display = previousDisplay;
  calloutsEl.style.visibility = previousVisibility;
}

function buildCallouts(root) {
  if (!calloutsEl || !leadersEl) return;
  calloutsEl.replaceChildren();
  leadersEl.replaceChildren();
  calloutTargets.clear();
  calloutLines.clear();
  calloutDots.clear();
  calloutLocalBounds.clear();
  for (const spec of calloutSpecs) {
    const box = document.createElement('div');
    box.className = 'cpv-callout cpv-callout-' + spec.side;
    // Position changes share the WebGL frame; only opacity eases. This keeps
    // labels and SVG connectors attached without a second layout-reading RAF.
    box.style.transitionProperty = 'opacity';
    box.dataset.part = spec.part;
    box.innerHTML = '<span class="cpv-callout-name"></span><span class="cpv-callout-cost"></span>';
    box.querySelector('.cpv-callout-name').textContent = spec.name;
    box.querySelector('.cpv-callout-cost').textContent = spec.cost;
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
    const localBounds = [];
    for (const object of objects) {
      if (!object) continue;
      object.traverse((mesh) => {
        if (!mesh.isMesh || !mesh.geometry) return;
        if (spec.part === 'switch') {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          if (!materials.some((material) => material?.name === 'SwitchPlastic')) return;
        }
        mesh.geometry.computeBoundingBox();
        if (!mesh.geometry.boundingBox) return;
        const bounds = mesh.geometry.boundingBox;
        const corners = [];
        for (const x of [bounds.min.x, bounds.max.x]) {
          for (const y of [bounds.min.y, bounds.max.y]) {
            for (const z of [bounds.min.z, bounds.max.z]) {
              corners.push(new THREE.Vector3(x, y, z));
            }
          }
        }
        // Cache a bounded sample of real surface vertices once. A projected
        // bounding rectangle can include empty space (especially the slider).
        const positions = mesh.geometry.attributes.position;
        const surfacePoints = [];
        const stride = Math.max(1, Math.ceil(positions.count / 64));
        for (let vertex = 0; vertex < positions.count; vertex += stride) {
          surfacePoints.push(new THREE.Vector3().fromBufferAttribute(positions, vertex));
        }
        if (spec.part === 'switch') {
          // The rail also extends inside the case. Attach to the outward grip,
          // not the nearest hidden rail edge behind the enclosure wall.
          surfacePoints.splice(0, surfacePoints.length, new THREE.Vector3(
            (bounds.min.x + bounds.max.x) / 2,
            (bounds.min.y + bounds.max.y) / 2,
            bounds.max.z
          ));
        }
        localBounds.push({ object: mesh, corners, surfacePoints });
      });
    }
    calloutLocalBounds.set(spec.part, localBounds);
  }
  cacheCalloutLabelSizes();
  updateCallouts(root);
}

function nearestProjectedSurfacePoint(part, target, width, height) {
  let nearest = target;
  let minimumDistance = Infinity;
  for (const { object, surfacePoints } of calloutLocalBounds.get(part) || []) {
    for (const point of surfacePoints) {
      projectedCorner.copy(point).applyMatrix4(object.matrixWorld).project(camera);
      const x = (projectedCorner.x * 0.5 + 0.5) * width;
      const y = (-projectedCorner.y * 0.5 + 0.5) * height;
      const distance = (x - target.x) ** 2 + (y - target.y) ** 2;
      if (distance < minimumDistance) {
        minimumDistance = distance;
        nearest = { x, y };
      }
    }
  }
  return nearest;
}

function projectedBoundsFor(root, part, width, height) {
  const entries = calloutLocalBounds.get(part) || [];
  if (!entries.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { object, corners } of entries) {
    for (const corner of corners) {
      projectedCorner.copy(corner).applyMatrix4(object.matrixWorld).project(camera);
      const screenX = (projectedCorner.x * 0.5 + 0.5) * width;
      const screenY = (-projectedCorner.y * 0.5 + 0.5) * height;
      minX = Math.min(minX, screenX);
      minY = Math.min(minY, screenY);
      maxX = Math.max(maxX, screenX);
      maxY = Math.max(maxY, screenY);
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
  // Editorial inspection ends before the first returning part begins its
  // authored route, so connectors never chase reassembling components.
  const annotationEnd = 82 / 120;
  const annotationSpan = (annotationEnd - annotationStart) / calloutSpecs.length;
  return p >= annotationStart && p <= annotationEnd
    ? Math.min(calloutSpecs.length - 1, Math.floor((p - annotationStart) / annotationSpan))
    : -1;
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
  // Label projection walks geometry and updates several DOM/SVG nodes. The
  // 3D scene can still follow every display frame, while editorial labels are
  // refreshed at 30 Hz during active scrubbing. This keeps Chrome's main
  // thread inside its frame budget without making the model itself stutter.
  const projectionNow = performance.now();
  if (HOME_EMBEDDED && scrubQuality && !activeChanged
      && projectionNow - lastCalloutProjectionTime < 1000 / 30) return;
  lastCalloutProjectionTime = projectionNow;
  const { width, height, mobile } = stageMetrics;
  // Match the stylesheet breakpoint against the viewport, not the sticky
  // stage width (the vertical scrollbar can make the latter slightly smaller
  // and incorrectly switch a desktop review into mobile lanes).
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
    if (!Number.isFinite(labelWidth) || labelWidth <= 0) labelWidth = Math.min(208, width * 0.24);
    if (!Number.isFinite(labelHeight) || labelHeight <= 0) labelHeight = 56;
    let boxX;
    let boxY;
    if (mobile) {
      // A fixed left/right percentage clipped wide labels on narrow phones
      // and left very long leaders. Place the label beside the actual pose.
      boxX = THREE.MathUtils.clamp(
        (bounds.minX + bounds.maxX) / 2,
        labelWidth / 2 + 12, width - labelWidth / 2 - 12
      );
      const above = bounds.minY - 20 - labelHeight / 2;
      const below = bounds.maxY + 20 + labelHeight / 2;
      boxY = THREE.MathUtils.clamp(
        above >= height * 0.31 ? above : below,
        height * 0.31, height - labelHeight / 2 - 20
      );
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
    const target = nearestProjectedSurfacePoint(
      spec.part, nearestRectEdge(bounds, boxX, boxY, 3), width, height
    );
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
  const buttonState = p <= 0.02 ? 'closed' : p >= 0.52 && p <= 0.82 ? 'exploded' : p >= ASSEMBLY_COMPLETE_PROGRESS ? 'reassembled' : '';
  if (buttonState !== lastUiButtonState) {
    lastUiButtonState = buttonState;
    for (const button of poseButtons) {
      const target = Number(button.dataset.cpvPose);
      const active = target === 0 ? p <= 0.02 : target === 0.67 ? p >= 0.52 && p <= 0.82 : p >= ASSEMBLY_COMPLETE_PROGRESS;
      button.setAttribute('aria-pressed', String(active));
    }
  }
  if (rangeEl && document.activeElement !== rangeEl) rangeEl.value = p.toFixed(3);
}

function authoredPoseProgress(p) {
  // Keep the embedded homepage on the same linear authored timeline as the
  // standalone preview. The previous homepage-only remap accelerated the
  // final reassembly by roughly 40%, which read as dropped frames even when
  // Chrome was rendering every frame on time.
  return p;
}

function applyProgress(p, scheduleRender = true, force = false) {
  const nextProgress = clamp01(p);
  if (!force && ready && hasAppliedProgress && Math.abs(nextProgress - progress) < 0.0005) return;
  progress = nextProgress;
  if (ready) {
    hasAppliedProgress = true;
    setScrubQuality();
    samplePose(authoredPoseProgress(progress));
    assetRoot?.updateMatrixWorld(true);
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
      scrollFrameTime = 0;
      scrollTarget = 1;
      applyProgress(1);
      return;
    }
  }
  if (reducedMotion) {
    scrollAnimating = false;
    scrollFrameTime = 0;
    applyProgress(scrollTarget);
    return;
  }
  if (!scrollAnimating) {
    scrollFrameTime = 0;
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
  stageMetrics = { width: w, height: h, mobile: window.innerWidth < 760 };
  refreshScrollRange();
  cacheCalloutLabelSizes();
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

  window.addEventListener('resize', () => {
    measureStage();
  });

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
      scrollFrameTime = 0;
      scrollTarget = next;
      applyProgress(next);
      history.replaceState(null, '', poseLinkFor(next));
      scrollToProgress(next);
    });
  }
  if (stage && typeof ResizeObserver !== 'undefined') new ResizeObserver(measureStage).observe(stage);
  document.fonts?.ready.then(() => {
    cacheCalloutLabelSizes();
    if (ready && inView && !document.hidden) {
      updateCallouts();
      requestRender();
    }
  });

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
        rafId = 0;
        scrollAnimating = false;
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
      rafId = 0;
      scrollAnimating = false;
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
    clearTimeout(scrubIdleTimer);
    document.body.classList.remove('cpv-scrubbing');
    rafId = 0;
    scrollAnimating = false;
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
      scrollAnimating,
      activeCallout: activeCalloutIndex(progress) >= 0 ? calloutSpecs[activeCalloutIndex(progress)].part : null,
      renderPaused: !inView || document.hidden,
      cameraPosition: camera ? {
        x: Number(camera.position.x.toFixed(4)),
        y: Number(camera.position.y.toFixed(4)),
        z: Number(camera.position.z.toFixed(4)),
      } : null,
      renderPixelRatio: renderer ? Number(renderer.getPixelRatio().toFixed(3)) : null,
      renderQualityScale: 1,
      renderSize: renderer ? {
        width: renderer.domElement.width,
        height: renderer.domElement.height,
      } : null,
      renderStats: renderer ? {
        frame: renderer.info.render.frame,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        lines: renderer.info.render.lines,
        points: renderer.info.render.points,
      } : null,
      scrubQuality,
      inputMode: 'native-scroll',
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
