import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GLB_URL = 'assets/3d/flashlight-assembly.glb';
const MM = 0.001;
const DPR_CAP = 1.75;
const FOV = 34;

const PART_IDS = ['enclosure', 'switch', 'solar_lid', 'battery', 'charge_module', 'led_pair'];
const CHAPTERS = [
  { id: 'solar_lid', key: 'solar', num: '01 / DAYLIGHT IN', title: '5V solar panel', body: 'Captures daylight to recharge the light.', turn: 200, slot: [0, 0, 52], inspect: [0, 4, 74], anchor: [30, -30, 1.25] },
  { id: 'battery', key: 'battery', num: '02 / POWER HELD', title: 'Rechargeable battery', body: 'Stores energy for study after dark.', turn: 185, slot: [-16, -2, 30], inspect: [-16, -2, 46], anchor: [-21, -15, 2.5] },
  { id: 'charge_module', key: 'module', num: '03 / CHARGE CONTROLLED', title: 'Recharge module', body: 'Manages safe charging from the panel.', turn: 175, slot: [16, -2, 30], inspect: [16, -2, 46], anchor: [13.2, -8.6, 2.8] },
  { id: 'led_pair', key: 'leds', num: '04 / LIGHT OUT', title: 'Two LEDs', body: 'Turn stored energy into focused study light.', turn: 205, slot: [0, -30, 10], inspect: [0, -54, 26], anchor: [9.5, -40.5, 1] },
  { id: 'switch', key: 'switch', num: '05 / SWITCHED BY HAND', title: 'Slide switch', body: 'Completes the circuit so study light flows.', turn: 190, slot: [0, 44, 12], inspect: [0, 64, 26], anchor: [19, 41, 5] },
  { id: 'enclosure', key: 'enclosure', num: '06 / BUILT TO PROTECT', title: '3D-printed enclosure', body: 'Shields every component.', turn: 210, slot: [0, 0, 0], inspect: [0, -6, 36], anchor: [42, -42, 7.75] },
];
const REASSEMBLY_ORDER = ['enclosure', 'switch', 'led_pair', 'charge_module', 'battery', 'solar_lid'];

const T_INTRO_END = 0.075;
const T_EXPLODE = [0.075, 0.125];
const T_CH_START = 0.125;
const CH_W = 0.108;
const T_RE_START = T_CH_START + CHAPTERS.length * CH_W;
const RE_SPACING = 0.022;
const RE_W = 0.082;
const T_FINAL = Math.max(0.955, T_RE_START + 5 * RE_SPACING + RE_W);

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (v) => easeInOutCubic(clamp01(v));
const lerp = (a, b, t) => a + (b - a) * t;

function ramp(p, a, b) { return smooth((p - a) / (b - a)); }

function chapterAt(p) {
  if (p < T_CH_START || p >= T_RE_START) return -1;
  return Math.min(CHAPTERS.length - 1, Math.floor((p - T_CH_START) / CH_W));
}
function chapterT(p, i) {
  return clamp01((p - (T_CH_START + i * CH_W)) / CH_W);
}

function reassemblyK(p, partId) {
  const idx = REASSEMBLY_ORDER.indexOf(partId);
  if (idx < 0) return 1;
  const s = T_RE_START + idx * RE_SPACING;
  if (p <= s) return 1;
  return 1 - smooth((p - s) / RE_W);
}

function explodeK(p) {
  return ramp(p, T_EXPLODE[0], T_EXPLODE[1]);
}

function init(section) {
  section.classList.add('ff-asm3d');
  const shell = document.createElement('div');
  shell.className = 'ff-asm3d-shell';
  let html =
    '<div class="ff-asm3d-sticky">' +
    '<canvas class="ff-asm3d-canvas" aria-hidden="true"></canvas>' +
    '<div class="ff-asm3d-loading" aria-hidden="true"><span></span></div>' +
    '<svg class="ff-asm3d-leaders" aria-hidden="true"></svg>' +
    '<div class="ff-asm3d-copy">' +
    '<div class="ff-asm3d-intro-copy"><p class="ff-assembly-eyebrow">How it is built</p>' +
    '<h2 id="assembly-heading">One light. Built to study.</h2><p>Scroll to see every part take its place.</p></div>';
  for (let i = 0; i < CHAPTERS.length; i++) {
    const c = CHAPTERS[i];
    html +=
      '<article class="ff-asm3d-callout' + (i % 2 === 1 ? ' is-right' : '') + '" data-callout="' + c.key + '">' +
      '<p class="ff-assembly-eyebrow">' + c.num + '</p><h3>' + c.title + '</h3><p>' + c.body + '</p></article>';
  }
  html +=
    '<div class="ff-assembly-final-mark ff-asm3d-final-mark"><p class="ff-assembly-eyebrow">Assembled and ready</p></div>' +
    '</div></div>';
  shell.innerHTML = html;
  const accessible = section.querySelector('.ff-assembly-accessible');
  if (accessible && !accessible.querySelector('[data-switch-li]')) {
    const li = document.createElement('li');
    li.setAttribute('data-switch-li', '');
    li.innerHTML = '<strong>Slide switch.</strong> Completes the circuit so study light flows.';
    accessible.appendChild(li);
  }
  section.insertBefore(shell, section.firstChild);
  const sticky = shell.querySelector('.ff-asm3d-sticky');
  const canvas = shell.querySelector('.ff-asm3d-canvas');
  const loadingEl = shell.querySelector('.ff-asm3d-loading');
  const introCopy = shell.querySelector('.ff-asm3d-intro-copy');
  const finalMark = shell.querySelector('.ff-asm3d-final-mark');
  const leadersSvg = shell.querySelector('.ff-asm3d-leaders');
  const callouts = {};
  CHAPTERS.forEach((c) => { callouts[c.key] = shell.querySelector('[data-callout="' + c.key + '"]'); });

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    loadingEl.remove();
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.005, 6);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x33443a, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  scene.add(sun);

  const groups = {};
  const localBoxes = {};
  const seats = {};
  let root = null;
  let ready = false;

  new GLTFLoader().load(GLB_URL, (gltf) => {
    root = gltf.scene;
    scene.add(root);
    const byName = {};
    root.traverse((o) => { if (o.name && PART_IDS.indexOf(o.name) >= 0) byName[o.name] = o; });
    CHAPTERS.forEach((c) => {
      const node = byName[c.id];
      const pivot = new THREE.Group();
      root.add(pivot);
      const holder = new THREE.Group();
      pivot.add(holder);
      holder.add(node);
      node.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.transparent = true;
        }
      });
      node.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(node);
      const center = box.getCenter(new THREE.Vector3());
      holder.position.copy(center).negate();
      groups[c.id] = pivot;
      localBoxes[c.id] = box;
      seats[c.id] = pivot.position.clone();
    });
    ready = true;
    loadingEl.classList.add('is-done');
    requestRender(true);
  });

  function worldBox(id, out) {
    out.copy(localBoxes[id]).applyMatrix4(groups[id].matrixWorld);
    return out;
  }

  const tmpBox = new THREE.Box3();
  const tmpSphere = new THREE.Sphere();
  const V = new THREE.Vector3();

  function paneRect() {
    const w = sticky.clientWidth;
    const h = sticky.clientHeight;
    const mobile = w < 700;
    if (!mobile) {
      const cRect = Object.values(callouts)[0].getBoundingClientRect();
      const sRect = sticky.getBoundingClientRect();
      const gutter = Math.max(0, cRect.width) + (cRect.left - sRect.left) + 24;
      return { x: gutter, y: 84, w: Math.max(80, w - 2 * gutter), h: Math.max(120, h - 148), mobile };
    }
    let dock = 190;
    for (const k in callouts) {
      const r = callouts[k].getBoundingClientRect();
      if (r.height > 0) dock = Math.max(dock, r.height + 32);
    }
    return { x: 16, y: 72, w: Math.max(80, w - 32), h: Math.max(120, h - 72 - dock), mobile };
  }

  const ANGLE_KEYS = [
    { at: 0.02, azim: 28, elev: 14 },
    { at: T_EXPLODE[1], azim: 30, elev: 18 },
    ...CHAPTERS.map((c, i) => ({ at: T_CH_START + (i + 0.69) * CH_W, azim: 24 + i * 13, elev: 15 })),
    { at: T_RE_START + 0.04, azim: 30, elev: 18 },
    { at: 0.99, azim: 26, elev: 13 },
  ];

  function viewAngles(p) {
    const ks = ANGLE_KEYS;
    if (p <= ks[0].at) return { azim: ks[0].azim, elev: ks[0].elev };
    for (let i = 0; i < ks.length - 1; i++) {
      if (p >= ks[i].at && p <= ks[i + 1].at) {
        const t = smooth((p - ks[i].at) / Math.max(1e-6, ks[i + 1].at - ks[i].at));
        return {
          azim: lerp(ks[i].azim, ks[i + 1].azim, t),
          elev: lerp(ks[i].elev, ks[i + 1].elev, t),
        };
      }
    }
    const last = ks[ks.length - 1];
    return { azim: last.azim, elev: last.elev };
  }

  function chapterBlend(p) {
    const i = chapterAt(p);
    if (i < 0) return { id: null, w: 0 };
    const c = CHAPTERS[i];
    const t = chapterT(p, i);
    const ENTER = 0.34;
    const EXIT = 0.8;
    let w = 0;
    if (t < ENTER) w = smooth(t / ENTER);
    else if (t > EXIT) w = 1 - smooth((t - EXIT) / (1 - EXIT));
    else w = 1;
    return { id: c.id, w };
  }

  function boxForSubject(sub, out) {
    out.makeEmpty();
    if (sub === 'all') {
      for (const id in groups) out.union(worldBox(id, tmpBox));
    } else {
      out.union(worldBox(sub, tmpBox));
    }
    return out;
  }

  const boxA = new THREE.Box3();
  const boxB = new THREE.Box3();
  const centerV = new THREE.Vector3();

  function frameCamera(p, azim, elev, pane) {
    const blend = chapterBlend(p);
    const dAll = solveDistance(boxForSubject('all', boxA), azim, elev, pane);
    let center, dist, dPart = null;
    if (!blend.id || blend.w <= 0) {
      center = boxA.getCenter(centerV);
      dist = dAll;
    } else {
      dPart = solveDistance(boxForSubject(blend.id, boxB), azim, elev, pane);
      if (blend.w >= 1) {
        center = boxB.getCenter(centerV);
        dist = dPart;
      } else {
        const ca = boxA.getCenter(new THREE.Vector3());
        const cb = boxB.getCenter(new THREE.Vector3());
        center = ca.lerp(cb, blend.w);
        dist = lerp(dAll, dPart, blend.w);
      }
    }
    return { center, dist };
  }

  const fitCam = new THREE.PerspectiveCamera(FOV, 1, 0.005, 6);
  const projPt = new THREE.Vector3();
  function projectedPixelBBox(box, center, dist, azim, elev, pane) {
    const ce = Math.cos(elev);
    fitCam.aspect = sticky.clientWidth / Math.max(1, sticky.clientHeight);
    fitCam.updateProjectionMatrix();
    fitCam.position.set(
      center.x + dist * ce * Math.sin(azim),
      center.y + dist * Math.sin(elev),
      center.z + dist * ce * Math.cos(azim)
    );
    fitCam.lookAt(center);
    fitCam.updateMatrixWorld(true);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      projPt.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      projPt.project(fitCam);
      const x = (projPt.x * 0.5 + 0.5) * sticky.clientWidth;
      const y = (-projPt.y * 0.5 + 0.5) * sticky.clientHeight;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
  }

  function solveDistance(box, azim, elev, pane) {
    const cfg = pane.mobile
      ? { targetFrac: 0.44, maxFrac: 0.46, clearX: 16, clearY: 16 }
      : { targetFrac: 0.63, maxFrac: 0.68, clearX: 32, clearY: 40 };
    const sph = box.getBoundingSphere(tmpSphere);
    const c = tmpSphere.center;
    let d = Math.max(sph.radius, 0.02) / (Math.tan((FOV * Math.PI) / 360) * cfg.targetFrac);
    const inX = pane.x + cfg.clearX;
    const inY = pane.y + cfg.clearY;
    const inW = pane.w - 2 * cfg.clearX;
    const inH = pane.h - 2 * cfg.clearY;
    for (let iter = 0; iter < 30; iter++) {
      const bb = projectedPixelBBox(box, c, d, azim, elev, pane);
      const wPx = bb.maxX - bb.minX;
      const hPx = bb.maxY - bb.minY;
      const overMax = Math.max(inX - bb.minX, bb.maxX - (inX + inW), inY - bb.minY, bb.maxY - (inY + inH), 0);
      const fill = Math.max(hPx / pane.h, wPx / pane.w);
      let scale = 1;
      if (overMax > 0.5) {
        scale = Math.max(scale, 1 + overMax / Math.max(10, Math.min(hPx, inH)));
      } else if (Math.abs(fill - cfg.targetFrac) > 0.004 && fill > 0) {
        scale = Math.max(0.5, fill / cfg.targetFrac);
      }
      if (fill > cfg.maxFrac) scale = Math.max(scale, fill / cfg.maxFrac);
      if (Math.abs(scale - 1) < 0.0015) break;
      d *= Math.min(1.35, Math.max(0.75, scale));
    }
    return d;
  }

  const posePos = new THREE.Vector3();
  const poseEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  function applyPose(p) {
    const ex = explodeK(p);
    const chIdx = chapterAt(p);
    CHAPTERS.forEach((c, i) => {
      const g = groups[c.id];
      if (!g) return;
      let x = c.slot[0] * MM * ex * reassemblyK(p, c.id);
      let y = c.slot[1] * MM * ex * reassemblyK(p, c.id);
      let z = c.slot[2] * MM * ex * reassemblyK(p, c.id);
      let yaw = 0;
      if (i === chIdx) {
        const t = chapterT(p, i);
        const liftIn = smooth(t / 0.22);
        const liftOut = smooth((t - 0.78) / 0.22);
        const liftAmt = liftIn - liftOut;
        const turnUp = smooth(Math.max(0, Math.min(1, (t - 0.22) / 0.36)));
        const turnDown = smooth(Math.max(0, Math.min(1, (t - 0.78) / 0.2)));
        yaw = ((c.turn * (turnUp - turnDown)) * Math.PI) / 180;
        x += c.inspect[0] * MM * liftAmt;
        y += c.inspect[1] * MM * liftAmt;
        z += c.inspect[2] * MM * liftAmt;
      }
      g.position.set(seats[c.id].x + x, seats[c.id].y + y, seats[c.id].z + z);
      g.rotation.set(0, yaw, 0, 'YXZ');
      g.updateMatrixWorld(true);
    });
  }

  let lastProgress = -1;
  let renderQueued = false;
  let dirty = true;
  let inView = false;
  let docHidden = document.hidden;

  function currentProgress() {
    const rect = section.getBoundingClientRect();
    const span = Math.max(1, rect.height - window.innerHeight);
    return clamp01(-rect.top / span);
  }

  const projV = new THREE.Vector3();
  function projectToScreen(v3, pane) {
    projV.copy(v3).project(camera);
    return {
      x: (projV.x * 0.5 + 0.5) * sticky.clientWidth,
      y: (-projV.y * 0.5 + 0.5) * sticky.clientHeight,
      inside: projV.z < 1,
    };
  }

  const anchorV = new THREE.Vector3();
  function projectedAnchors() {
    const out = {};
    CHAPTERS.forEach((c) => {
      const g = groups[c.id];
      if (!g) return;
      anchorV.set(c.anchor[0] * MM, c.anchor[1] * MM, c.anchor[2] * MM);
      g.localToWorld(anchorV);
      out[c.key] = projectToScreen(anchorV);
    });
    return out;
  }

  function silhouettePx(id) {
    const b = worldBox(id, tmpBox);
    const corners = [];
    for (let i = 0; i < 8; i++) {
      V.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
      corners.push(projectToScreen(V));
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of corners) {
      if (!c.inside) return null;
      minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function updateLeaders(activeKey) {
    while (leadersSvg.firstChild) leadersSvg.removeChild(leadersSvg.firstChild);
    if (!activeKey) return;
    const pts = projectedAnchors();
    const pt = pts[activeKey];
    if (!pt || !pt.inside) return;
    const el = callouts[activeKey];
    const cr = el.getBoundingClientRect();
    const sr = sticky.getBoundingClientRect();
    const mobile = sticky.clientWidth < 700;
    const sx = mobile ? cr.left - sr.left + cr.width / 2 : (el.classList.contains('is-right') ? cr.left - sr.left : cr.right - sr.left);
    const sy = mobile ? cr.top - sr.top - 6 : cr.top - sr.top + cr.height * 0.45;
    const ns = 'http://www.w3.org/2000/svg';
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', sx); line.setAttribute('y1', sy);
    line.setAttribute('x2', pt.x); line.setAttribute('y2', pt.y);
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); dot.setAttribute('r', 3);
    leadersSvg.appendChild(line);
    leadersSvg.appendChild(dot);
  }

  function activeCalloutKey(p) {
    const i = chapterAt(p);
    if (i < 0) return null;
    const t = chapterT(p, i);
    return t >= 0.26 && t <= 0.94 ? CHAPTERS[i].key : null;
  }

  const SUN_OFF = new THREE.Vector3(0.3, 0.9, 0.4);
  function applyDim(p) {
    const blend = chapterBlend(p);
    const activeId = blend.id && blend.w > 0 ? blend.id : null;
    CHAPTERS.forEach((c) => {
      const dim = c.id === activeId ? 1 : 1 - 0.75 * blend.w;
      groups[c.id].traverse((o) => {
        if (o.isMesh) o.material.opacity = dim;
      });
    });
  }
  function renderFrame() {
    const p = lastProgress;
    applyPose(p);
    applyDim(p);
    const pane = paneRect();
    const ang = viewAngles(p);
    const azim = (ang.azim * Math.PI) / 180;
    const elev = (ang.elev * Math.PI) / 180;
    const view = frameCamera(p, azim, elev, pane);
    lastView = view;
    const center = view.center;
    const dist = view.dist;
    camera.aspect = sticky.clientWidth / Math.max(1, sticky.clientHeight);
    camera.updateProjectionMatrix();
    const ce = Math.cos(elev);
    camera.position.set(
      center.x + dist * ce * Math.sin(azim),
      center.y + dist * Math.sin(elev),
      center.z + dist * ce * Math.cos(azim)
    );
    camera.lookAt(center);
    sun.position.copy(camera.position).add(SUN_OFF.clone().multiplyScalar(dist));
    renderer.render(scene, camera);
    const activeKey = activeCalloutKey(p);
    for (const k in callouts) callouts[k].classList.toggle('is-active', k === activeKey);
    introCopy.classList.toggle('is-hidden', p > 0.085);
    finalMark.classList.toggle('is-active', p >= 0.985);
    updateLeaders(activeKey);
    frameStats = {
      progress: p,
      activeCallout: activeKey,
      stage: { w: sticky.clientWidth, h: sticky.clientHeight },
      pane: { x: pane.x, y: pane.y, w: pane.w, h: pane.h },
      silhouette: activeKey ? silhouettePx(keyToId(activeKey)) : null,
      anchors: projectedAnchors(),
      leaderEnd: (() => {
        const l = leadersSvg.querySelector('line');
        return l ? { x: +l.getAttribute('x2'), y: +l.getAttribute('y2') } : null;
      })(),
    };
  }
  let frameStats = null;
  let lastView = null;

  function keyToId(key) {
    const c = CHAPTERS.find((c) => c.key === key);
    return c ? c.id : null;
  }

  function requestRender(force) {
    if (force) dirty = true;
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if (!ready || docHidden || !inView) return;
      const p = currentProgress();
      if (dirty || Math.abs(p - lastProgress) > 1e-5) {
        dirty = false;
        lastProgress = p;
        resizeIfNeeded();
        renderFrame();
        document.body.classList.toggle('ff-assembly-active', p > 0.001 && p < 0.999);
      }
    });
  }

  let lastW = 0, lastH = 0;
  function resizeIfNeeded() {
    const w = sticky.clientWidth, h = sticky.clientHeight;
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    renderer.setSize(w, h, false);
  }

  const io = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) requestRender(true);
  }, { rootMargin: '25% 0%' });
  io.observe(section);

  document.addEventListener('visibilitychange', () => {
    docHidden = document.hidden;
    if (!docHidden) requestRender(true);
  });

  window.addEventListener('scroll', () => requestRender(false), { passive: true });
  window.addEventListener('resize', () => requestRender(true));

  window.__ffasm3d = {
    version: 'proto-1',
    get ready() { return ready; },
    progress: () => lastProgress,
    cam: () => ({ pos: camera.position.toArray(), dist: lastView ? lastView.dist : null, center: lastView ? lastView.center.toArray() : null }),
    activeCallout: () => (frameStats ? frameStats.activeCallout : null),
    frame: () => frameStats,
    seatedCheck: () => {
      if (!ready) return false;
      const missing = PART_IDS.filter((id) => !groups[id]);
      if (missing.length) return false;
      applyPose(1);
      return PART_IDS.every((id) => {
        const m = new THREE.Matrix4().extractRotation(groups[id].matrixWorld);
        const posOk = groups[id].getWorldPosition(V).distanceTo(seats[id]) < 1e-6;
        const rotOk = Math.abs(m.elements[0] - 1) < 1e-6 && Math.abs(m.elements[5] - 1) < 1e-6 && Math.abs(m.elements[10] - 1) < 1e-6;
        return posOk && rotOk;
      });
    },
    parts: () => Object.keys(groups),
  };

  requestRender(true);
}

const section = document.querySelector('[data-assembly-sequence]');
if (section) init(section);

export default { init };
