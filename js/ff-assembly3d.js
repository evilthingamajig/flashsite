import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const GLB_URL = 'assets/3d/flashlight-assembly.glb';
const MM = 0.001;
const DPR_CAP = 1.75;
const FOV = 34;

const PART_IDS = ['enclosure', 'switch', 'solar_lid', 'battery', 'charge_module', 'led_pair'];
const CHAPTERS = [
  { id: 'solar_lid', key: 'solar', num: '01 / DAYLIGHT IN', title: '5V solar panel', body: 'Captures daylight to recharge the light.', turn: 200, slot: [-120, 70, 34], mobileSlot: [0, 130, 28], inspect: [0, 4, 74], anchor: [-34, 0, 1.25] },
  { id: 'battery', key: 'battery', num: '02 / POWER HELD', title: 'Rechargeable battery', body: 'Stores energy for study after dark.', turn: 185, slot: [-26, -10, 22], mobileSlot: [-42, -18, 20], inspect: [-16, -2, 46], anchor: [18, 0, 0] },
  { id: 'charge_module', key: 'module', num: '03 / CHARGE CONTROLLED', title: 'Recharge module', body: 'Manages safe charging from the panel.', turn: 175, slot: [30, 12, 21], mobileSlot: [44, -14, 20], inspect: [0, 0, 46], anchor: [-10, 0, 2.8] },
  { id: 'led_pair', key: 'leds', num: '04 / LIGHT OUT', title: 'Two LEDs', body: 'Turn stored energy into focused study light.', turn: 205, slot: [-12, -42, 18], mobileSlot: [-30, 36, 16], inspect: [0, -54, 26], anchor: [8, -4.5, 0] },
  { id: 'switch', key: 'switch', num: '05 / SWITCHED BY HAND', title: 'Slide switch', body: 'Completes the circuit so study light flows.', turn: 190, slot: [90, 36, 18], mobileSlot: [40, 40, 16], inspect: [0, 64, 26], anchor: [-24, 41, 3] },
  { id: 'enclosure', key: 'enclosure', num: '06 / BUILT TO PROTECT', title: '3D-printed enclosure', body: 'Shields every component.', turn: 40, slot: [0, 0, 0], mobileSlot: [0, 0, 0], inspect: [0, -6, 36], anchor: [38, -36, 1] },
];
const REASSEMBLY_ORDER = ['enclosure', 'switch', 'led_pair', 'charge_module', 'battery', 'solar_lid'];

const T_INTRO_END = 0.075;
const T_EXPLODE = [0.075, 0.125];
const T_CH_START = 0.125;
const CH_W = 0.108;
// Leave a dedicated exploded-tableau beat after the final solo chapter. The
// slightly tighter reassembly cadence keeps the finished state before p=1.
const T_RE_START = 0.82;
const RE_SPACING = 0.025;
const RE_W = 0.05;
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
      '<article class="ff-asm3d-callout' + (i % 2 === 1 ? ' is-right' : '') + (c.key === 'enclosure' ? ' is-enclosure' : '') + '" data-callout="' + c.key + '">' +
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
  let disposed = false;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    loadingEl.classList.add('is-error');
    loadingEl.textContent = '3D preview unavailable — the accessible parts list remains below.';
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.005, 6);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x33443a, 1.65));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  scene.add(sun);
  const fill = new THREE.PointLight(0xc5e7d8, 0.8, 2.4);
  fill.position.set(-0.35, -0.55, 0.6);
  scene.add(fill);

  const groups = {};
  const meshNodes = {};
  const seats = {};
  let root = null;
  let ready = false;
  let manifestBounds = null;
  fetch('assets/3d/assembly-manifest.json').then((r) => r.ok ? r.json() : null).then((m) => { manifestBounds = m?.parts?.summary || null; }).catch(() => {});

  function showLoadError(err) {
    ready = false;
    loadingEl.classList.add('is-error');
    loadingEl.textContent = '3D preview unavailable — the accessible parts list remains below.';
    section.classList.add('ff-asm3d-load-error');
    if (err) console.warn('Assembly 3D load failed', err);
  }

  function materialFor(id) {
    const props = {
      enclosure: { color: 0x202a25, roughness: 0.72, metalness: 0.02 },
      solar_lid: { color: 0x0b2332, roughness: 0.42, metalness: 0.28 },
      // The three procedural parts below are rendered from their authored
      // runtime detail meshes. Keep the manifest geometry in the hierarchy
      // for seated bounds checks, but do not let its block proxy compete with
      // the product-readable pouch/PCB/LED construction.
      battery: { color: 0xaeb9b4, roughness: 0.46, metalness: 0.08, transparent: true, opacity: 0 },
      charge_module: { color: 0x126047, roughness: 0.55, metalness: 0.1, transparent: true, opacity: 0 },
      led_pair: { color: 0xbbe6ed, roughness: 0.12, metalness: 0, transparent: true, opacity: 0 },
      switch: { color: 0x202824, roughness: 0.58, metalness: 0.03 },
    }[id];
    const material = new THREE.MeshStandardMaterial({ ...props, envMapIntensity: 0.35 });
    material.userData.baseOpacity = props.opacity ?? 1;
    material.userData.baseTransparent = props.transparent ?? false;
    material.userData.baseDepthWrite = true;
    material.transparent = material.userData.baseTransparent;
    material.depthWrite = true;
    return material;
  }

  function addProductDetails(id, holder) {
    const matte = (color, roughness = 0.52, metalness = 0.05) => {
      const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      material.userData.baseOpacity = 1;
      material.userData.baseTransparent = true;
      material.userData.baseDepthWrite = false;
      material.transparent = true;
      material.depthWrite = false;
      return material;
    };
    const solid = (color, roughness = 0.52, metalness = 0.05) => {
      const material = new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 0.35 });
      material.userData.baseOpacity = 1;
      material.userData.baseTransparent = false;
      material.userData.baseDepthWrite = true;
      material.transparent = false;
      material.depthWrite = true;
      return material;
    };
    const detail = (geo, material, position) => {
      const m = new THREE.Mesh(geo, material);
      // Authoring dimensions below are millimetres; the GLB scene is metres.
      m.scale.setScalar(MM);
      m.position.set(...position.map((v) => v * MM));
      holder.add(m);
      return m;
    };
    if (id === 'solar_lid') {
      const gridMat = matte(0x06131b, 0.34, 0.2);
      for (const z of [-1.29, 1.29]) {
        for (let i = -4; i <= 4; i++) detail(new THREE.BoxGeometry(0.45, 78, 0.08), gridMat, [i * 8.6, 0, z]);
        for (let i = -4; i <= 4; i++) detail(new THREE.BoxGeometry(78, 0.45, 0.08), gridMat, [0, i * 8.6, z]);
      }
      detail(new THREE.BoxGeometry(81.5, 1.2, 0.32), matte(0x0a1111, 0.62, 0.04), [0, -40, 0.05]);
      detail(new THREE.BoxGeometry(81.5, 1.2, 0.32), matte(0x0a1111, 0.62, 0.04), [0, 40, 0.05]);
    } else if (id === 'battery') {
      // A 600mAh LiPo is a thin foil pouch, not a framed rectangular slab.
      // Keep the broad face softly rounded and make the z-depth visibly
      // shallow; the foil seams and crimped amber tab provide scale cues.
      const pouch = solid(0xc1cbc6, 0.42, 0.12);
      const roundedPouch = () => {
        const s = new THREE.Shape(); const w = 20.5, h = 14.3, r = 3.0;
        s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
        s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h);
        s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
        const g = new THREE.ExtrudeGeometry(s, { depth: 2.15, bevelEnabled: true, bevelSegments: 4, bevelSize: 0.65, bevelThickness: 0.08 });
        g.translate(0, 0, -1.075); return g;
      };
      detail(roundedPouch(), pouch, [0, 0, 0]);
      const foil = solid(0xd6ddda, 0.3, 0.22);
      for (const z of [-1.12, 1.12]) {
        const faceZ = z + Math.sign(z) * 0.045;
        detail(new THREE.BoxGeometry(34, 0.16, 0.05), foil, [0, -9.8, faceZ]);
        detail(new THREE.BoxGeometry(30, 0.13, 0.05), foil, [0, 8.6, faceZ]);
        detail(new THREE.BoxGeometry(0.13, 22, 0.05), solid(0xb6c2bc, 0.38, 0.16), [-16.8, 0, faceZ]);
        detail(new THREE.BoxGeometry(0.13, 22, 0.05), solid(0xb6c2bc, 0.38, 0.16), [16.8, 0, faceZ]);
        detail(new THREE.BoxGeometry(0.08, 17, 0.035), solid(0xaebbb4, 0.46, 0.1), [-4.5, -0.5, faceZ]);
      }
      const amber = solid(0xd78c2d, 0.4, 0.22);
      detail(new THREE.BoxGeometry(31, 1.7, 2.35), amber, [0, 14.85, 0.35]);
      detail(new THREE.BoxGeometry(5.2, 1.0, 2.5), solid(0xf0ad42, 0.32, 0.28), [-10, 15.7, 0.44]);
      detail(new THREE.BoxGeometry(5.2, 1.0, 2.5), solid(0xf0ad42, 0.32, 0.28), [10, 15.7, 0.44]);
      const blackLead = solid(0x171d1a, 0.46, 0.02);
      const redLead = solid(0x9c2524, 0.46, 0.02);
      detail(new THREE.CylinderGeometry(0.48, 0.48, 5.0, 12), blackLead, [-10, 18.0, 0.45]);
      detail(new THREE.CylinderGeometry(0.46, 0.46, 5.0, 12), redLead, [10, 18.0, 0.45]);
      detail(new THREE.CylinderGeometry(0.68, 0.68, 0.7, 12), blackLead, [-10, 16.55, 0.45]);
      detail(new THREE.CylinderGeometry(0.66, 0.66, 0.7, 12), redLead, [10, 16.55, 0.45]);
    } else if (id === 'charge_module') {
      // TP4056-style board: a slim green PCB with low SMD relief and a
      // proportionate metal USB charging port on the +Y edge.
      const pcb = solid(0x14634a, 0.62, 0.04);
      detail(new THREE.BoxGeometry(26.0, 17.0, 0.38), pcb, [0, 0, 0]);
      const edge = solid(0x23815d, 0.52, 0.05);
      for (const z of [-0.25, 0.25]) {
        detail(new THREE.BoxGeometry(24.8, 0.18, 0.08), edge, [0, -8.25, z]);
        detail(new THREE.BoxGeometry(24.8, 0.18, 0.08), edge, [0, 8.25, z]);
        detail(new THREE.BoxGeometry(0.18, 16.4, 0.08), edge, [-12.6, 0, z]);
        detail(new THREE.BoxGeometry(0.18, 16.4, 0.08), edge, [12.6, 0, z]);
      }
      const chip = solid(0x111916, 0.32, 0.18);
      const chipSmall = solid(0x1d2521, 0.34, 0.1);
      const pad = solid(0xd19d48, 0.3, 0.62);
      const trace = solid(0x39a46f, 0.46, 0.08);
      // The module is spun through the inspection turn, so populate both PCB
      // faces. Only the camera-facing face contributes visually at a time;
      // this keeps the board readable without changing the chapter yaw.
      for (const z of [-0.22, 0.22]) {
        const outward = z;
        const sign = Math.sign(outward);
        detail(new THREE.BoxGeometry(5.0, 4.0, 1.05), chip, [-5.8, -1.8, outward + sign * 0.34]);
        detail(new THREE.BoxGeometry(4.1, 3.1, 1.0), chip, [4.5, 3.6, outward + sign * 0.33]);
        detail(new THREE.BoxGeometry(2.1, 1.8, 0.88), chipSmall, [4.4, -3.7, outward + sign * 0.30]);
        for (let i = -4; i <= 4; i += 2) detail(new THREE.BoxGeometry(0.85, 1.5, 0.12), pad, [i, -6.25, outward + sign * 0.11]);
        for (let i = -4; i <= 4; i += 2) detail(new THREE.BoxGeometry(0.85, 1.5, 0.12), pad, [i, 6.15, outward + sign * 0.11]);
        for (const x of [-8, 0, 8]) detail(new THREE.BoxGeometry(0.55, 10.4, 0.08), trace, [x, 0.0, outward + sign * 0.07]);
        for (const y of [-2.0, 2.7, 7.0]) detail(new THREE.BoxGeometry(14.0, 0.42, 0.08), trace, [0, y, outward + sign * 0.07]);
      }
      const portShell = solid(0xb4bcb6, 0.27, 0.72);
      detail(new THREE.BoxGeometry(8.2, 3.0, 1.3), portShell, [0, 9.15, 0]);
      detail(new THREE.BoxGeometry(4.8, 0.18, 0.85), solid(0x101613, 0.42, 0.1), [0, 10.7, 0]);
      detail(new THREE.BoxGeometry(4.8, 1.35, 0.12), solid(0x101613, 0.42, 0.1), [0, 9.2, 0.70]);
      detail(new THREE.BoxGeometry(4.8, 1.35, 0.12), solid(0x101613, 0.42, 0.1), [0, 9.2, -0.70]);
    } else if (id === 'led_pair') {
      const shell = new THREE.MeshPhysicalMaterial({ color: 0xdff8fb, emissive: 0x8aeef2, emissiveIntensity: 1.2, roughness: 0.12, transparent: true, opacity: 0.60, transmission: 0.2, thickness: 0.3 });
      // One hemispherical emitting dome, one short cylindrical body, and two
      // rear leads per through-hole LED. No second lens or centre pin.
      const domeMat = new THREE.MeshStandardMaterial({ color: 0x9deaf0, emissive: 0x55dce7, emissiveIntensity: 2.5, roughness: 0.16, metalness: 0.02 });
      domeMat.userData.baseOpacity = 1;
      domeMat.userData.baseTransparent = false;
      domeMat.userData.baseDepthWrite = true;
      shell.userData.baseOpacity = 0.60;
      shell.userData.baseTransparent = true;
      shell.userData.baseDepthWrite = false;
      shell.depthWrite = false;
      const leadMat = solid(0x8f9893, 0.34, 0.45);
      [-8, 8].forEach((x) => {
        detail(new THREE.CylinderGeometry(2.02, 2.02, 5.6, 24), shell, [x, 0, 0]);
        const front = detail(new THREE.SphereGeometry(2.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat, [x, -2.8, 0]);
        front.rotation.x = Math.PI;
        detail(new THREE.CylinderGeometry(0.42, 0.42, 3.6, 10), leadMat, [x - 1.15, 4.35, 0]);
        detail(new THREE.CylinderGeometry(0.42, 0.42, 3.6, 10), leadMat, [x + 1.15, 4.35, 0]);
      });
    } else if (id === 'switch') {
      // Retain the STL silhouette underneath, then articulate it with a
      // dark body/rim and a clearly separated light actuator/fill.
      const body = solid(0x3f5d4d, 0.48, 0.08);
      const rim = solid(0x12221a, 0.38, 0.22);
      const actuator = solid(0xd0ddd4, 0.28, 0.22);
      detail(new THREE.BoxGeometry(28, 8.4, 2.8), body, [-5, 41.3, 0.8]);
      detail(new THREE.BoxGeometry(13.0, 6.4, 1.0), rim, [-1.0, 41.3, 2.55]);
      detail(new THREE.BoxGeometry(9.2, 4.6, 3.8), actuator, [-1.0, 41.3, 5.0]);
      detail(new THREE.BoxGeometry(5.8, 2.2, 0.18), solid(0xdce8df, 0.27, 0.12), [-1.0, 41.3, 6.95]);
      detail(new THREE.BoxGeometry(28, 8.4, 2.8), body, [-5, 41.3, -0.8]);
      detail(new THREE.BoxGeometry(13.0, 6.4, 1.0), rim, [-1.0, 41.3, -2.55]);
      detail(new THREE.BoxGeometry(9.2, 4.6, 3.8), actuator, [-1.0, 41.3, -5.0]);
      detail(new THREE.BoxGeometry(5.8, 2.2, 0.18), solid(0xdce8df, 0.27, 0.12), [-1.0, 41.3, -6.95]);
    } else if (id === 'enclosure') {
      const layer = matte(0x26302a, 0.88, 0.01);
      for (let i = 0; i < 8; i++) detail(new THREE.BoxGeometry(81, 0.24, 0.16), layer, [0, -42.08, -4.8 + i * 1.55]);
      const rim = matte(0x39483f, 0.64, 0.02);
      detail(new THREE.BoxGeometry(82.5, 1.1, 0.42), rim, [0, -41.7, 6.8]);
      detail(new THREE.BoxGeometry(82.5, 1.1, 0.42), rim, [0, 41.7, 6.8]);
      detail(new THREE.BoxGeometry(1.1, 81, 0.42), rim, [-41.7, 0, 6.8]);
      detail(new THREE.BoxGeometry(1.1, 81, 0.42), rim, [41.7, 0, 6.8]);
      // The enclosure STL is the authoritative open cavity: its 84 mm walls,
      // floor and corner ribs provide the real seat/aperture depth. Keep only
      // the subtle FDM layer/rim cues above; synthetic tray slabs and beige
      // seat rectangles would float outside that authored cavity.
      const cavityFloor = new THREE.MeshStandardMaterial({
        color: 0x344239, roughness: 0.82, metalness: 0.01,
        transparent: false, opacity: 1, depthWrite: true,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      });
      cavityFloor.userData.baseOpacity = 1;
      cavityFloor.userData.baseTransparent = false;
      cavityFloor.userData.baseDepthWrite = true;
      const floorSurface = detail(new THREE.PlaneGeometry(75, 75), cavityFloor, [0, 0, -4.249]);
      floorSurface.userData.visualOnly = true;
      floorSurface.userData.cavityFloor = true;
    }
  }

  function loadModel() {
    if (disposed || root || section.classList.contains('ff-asm3d-load-error')) return;
    loadingEl.classList.remove('is-idle');
    new GLTFLoader().load(GLB_URL, (gltf) => {
      if (disposed) return;
    root = gltf.scene;
    scene.add(root);
    const byName = {};
    root.traverse((o) => { if (o.name && PART_IDS.indexOf(o.name) >= 0) byName[o.name] = o; });
    CHAPTERS.forEach((c) => {
      const node = byName[c.id];
      if (!node) return;
      const originalPos = node.position.clone();
      const originalQuat = node.quaternion.clone();
      const originalScale = node.scale.clone();
      const pivot = new THREE.Group();
      root.add(pivot);
      pivot.position.copy(originalPos);
      pivot.quaternion.copy(originalQuat);
      pivot.scale.copy(originalScale);
      const holder = new THREE.Group();
      pivot.add(holder);
      holder.add(node);
      node.position.set(0, 0, 0);
      node.quaternion.identity();
      node.scale.set(1, 1, 1);
      // Bounds are geometry-local, while the seat remains the authored GLB
      // translation. This prevents recentering from cancelling the seat.
      node.traverse((o) => {
        if (o.isMesh) {
          o.material = materialFor(c.id);
          o.material.transparent = true;
        }
      });
      node.updateMatrixWorld(true);
      addProductDetails(c.id, holder);
      groups[c.id] = pivot;
      meshNodes[c.id] = node;
      seats[c.id] = originalPos.clone();
    });
    if (PART_IDS.some((id) => !groups[id])) { showLoadError(new Error('GLB is missing a required named part')); return; }
    ready = true;
    loadingEl.classList.add('is-done');
    requestRender(true);
    }, undefined, showLoadError);
  }

  function worldBox(id, out) {
    // Recompute from the final hierarchy/pose so leader and camera bounds are
    // always the geometry actually submitted to the renderer.
    out.copy(new THREE.Box3().setFromObject(groups[id]));
    return out;
  }

  const tmpBox = new THREE.Box3();
  // Keep the per-part query box separate from the destination accumulator.
  // Reusing tmpBox for both causes Box3.union() to union an object with
  // itself, leaving an "all" bounds query equal to the final part visited.
  const partBox = new THREE.Box3();
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
      // Copy occupies the editorial gutter on one side; the viewport to its
      // right is the actual model stage. Do not halve that stage again.
      return { x: Math.max(24, gutter - 28), y: 64, w: Math.max(180, w - gutter - 44), h: Math.max(120, h - 96), mobile };
    }
    let dock = 190;
    for (const k in callouts) {
      const r = callouts[k].getBoundingClientRect();
      if (r.height > 0) dock = Math.max(dock, r.height + 32);
    }
    return { x: 24, y: 72, w: Math.max(80, w - 48), h: Math.max(120, h - 72 - dock), mobile };
  }

  const ANGLE_KEYS = [
    { at: 0.02, azim: 34, elev: -28 },
    { at: T_EXPLODE[1], azim: 30, elev: -12 },
    ...CHAPTERS.map((c, i) => ({ at: T_CH_START + (i + 0.69) * CH_W, azim: 24 + i * 13, elev: 8 })),
    { at: T_CH_START + CHAPTERS.length * CH_W, azim: 40, elev: 18 },
    { at: T_RE_START, azim: 40, elev: 18 },
    { at: T_RE_START + 0.04, azim: 40, elev: 18 },
    { at: 0.99, azim: 20, elev: -24 },
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
    // Keep the active component framed through the last inspection beat. The
    // copy remains active while the surrounding assembly fades back in, so a
    // late chapter sample never collapses to a tiny interpolation between the
    // solo and full-assembly camera distances.
    const EXIT = 0.86;
    let w = 0;
    if (t < ENTER) w = smooth(t / ENTER);
    else if (t > EXIT) w = 1 - smooth((t - EXIT) / (1 - EXIT));
    else w = 1;
    return { id: c.id, w };
  }

  function boxForSubject(sub, out) {
    out.makeEmpty();
    if (sub === 'all') {
      for (const id in groups) if (groups[id].visible) out.union(worldBox(id, partBox));
    } else {
      out.union(worldBox(sub, tmpBox));
    }
    return out;
  }

  function fullAssemblyBox(out) {
    out.makeEmpty();
    for (const id in groups) out.union(worldBox(id, partBox));
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
    if (pane.mobile && blend.id === 'switch' && blend.w > 0.5) {
      // The switch is a shallow, wide part. Give it the same visual weight as
      // the other mobile solos, then bias it a few pixels away from the left
      // editorial copy while preserving the pane's 16px safety edge.
      dist *= 0.95;
      const right = new THREE.Vector3(Math.cos(azim), 0, -Math.sin(azim));
      center.addScaledVector(right, 0.001);
    }
    if (pane.mobile && blend.id === 'led_pair' && blend.w > 0.5) {
      // The protruding domes add a few pixels beyond the authored barrel;
      // preserve the mobile safety edge without materially shrinking the solo.
      dist *= 1.035;
    }
    if (!pane.mobile && blend.id === 'led_pair' && blend.w > 0.5) {
      // The explicit lens and rear leads extend the desktop three-quarter
      // bounds slightly beyond the manifest cylinder. Give that wider
      // silhouette a small desktop-only fit allowance; mobile keeps its
      // existing viewport scale target.
      dist *= 1.08;
    }
    if (p < T_INTRO_END) center.y += pane.mobile ? 0.012 : 0.025;
    const chapterEnd = T_CH_START + CHAPTERS.length * CH_W;
    // Begin refitting before the last solo settles and finish after the
    // tableau beat begins, so distance/center/scale do not jump at chapterEnd.
    const bridgeStart = chapterEnd - 0.023;
    const bridgeEnd = chapterEnd + 0.047;
    const bridgeT = clamp01((p - bridgeStart) / (bridgeEnd - bridgeStart));
    // Ease toward the fixed full-assembly fit quickly after the final solo
    // settles, while remaining scroll-linked on both sides of chapterEnd.
    const compositionBlend = p >= T_FINAL ? 1 : 1 - Math.pow(1 - bridgeT, 3);
    if (compositionBlend > 0) {
      // Tableau, reassembly and final are viewport compositions rather than
      // editorial-pane solos. Refit against the full viewport so the closed
      // product and the spread assembly read at the requested scale.
      const finalBridgeT = smooth((p - (T_FINAL - 0.025)) / 0.040);
      const tableauW = pane.mobile ? 0.82 : 0.68;
      const tableauH = pane.mobile ? 0.56 : 0.65;
      const finalW = pane.mobile ? 0.76 : 0.46;
      const finalH = pane.mobile ? 0.52 : 0.60;
      const targetW = sticky.clientWidth * lerp(tableauW, finalW, finalBridgeT);
      const targetH = sticky.clientHeight * lerp(tableauH, finalH, finalBridgeT);
      // Use a visibility-independent box for the bridge. During the last
      // solo, dimmed parts are hidden, but the target tableau must remain the
      // same fixed full-assembly composition on both sides of chapterEnd.
      const compositionBox = fullAssemblyBox(boxA);
      const compositionCenter = compositionBox.getCenter(new THREE.Vector3());
      let compositionDist = dist;
      // Use a damped solve. A hard clamp of the raw ratio can overshoot when
      // the projected box changes abruptly with a three-quarter view (most
      // noticeably on the spread tableau), leaving the composition smaller
      // than the viewport target after the final iteration.
      for (let iter = 0; iter < 24; iter++) {
        const bb = projectedPixelBBox(compositionBox, compositionCenter, compositionDist, azim, elev, pane);
        const wPx = bb.maxX - bb.minX;
        const hPx = bb.maxY - bb.minY;
        const scale = Math.max(wPx / Math.max(1, targetW), hPx / Math.max(1, targetH));
        if (Math.abs(scale - 1) < 0.01) break;
        compositionDist *= Math.min(1.10, Math.max(0.90, scale));
      }
      // The finished exterior has a compact depth box, so the pane fit is
      // height-dominated. Bring it a little closer to the viewport target
      // while retaining the safe margin around the final marker.
      compositionDist *= lerp(1, 0.94, finalBridgeT);
      center.lerp(compositionCenter, compositionBlend);
      dist = lerp(dist, compositionDist, compositionBlend);
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
    // Subject scale is viewport-relative. The pane remains a collision and
    // copy-clearance constraint only; it must not make the active component
    // tiny merely because editorial copy occupies one side.
    const cfg = pane.mobile
      ? { targetW: sticky.clientWidth * 0.80, targetH: sticky.clientHeight * 0.54, maxW: sticky.clientWidth * 0.86, maxH: sticky.clientHeight * 0.60, clearX: 20, clearY: 20 }
      : { targetW: sticky.clientWidth * 0.56, targetH: sticky.clientHeight * 0.72, maxW: sticky.clientWidth * 0.66, maxH: sticky.clientHeight * 0.72, clearX: 36, clearY: 40 };
    const sph = box.getBoundingSphere(tmpSphere);
    const c = tmpSphere.center;
    const targetFrac = pane.mobile ? 0.54 : 0.52;
    let d = Math.max(sph.radius, 0.02) / (Math.tan((FOV * Math.PI) / 360) * targetFrac);
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
      const desiredScale = pane.mobile
        ? wPx / Math.max(1, cfg.targetW)
        : Math.max(wPx / Math.max(1, cfg.targetW), hPx / Math.max(1, cfg.targetH));
      let scale = desiredScale;
      if (overMax > 0.5) {
        scale = Math.max(scale, 1 + overMax / Math.max(10, Math.min(hPx, inH)));
      }
      if (wPx > cfg.maxW) scale = Math.max(scale, wPx / cfg.maxW);
      if (hPx > cfg.maxH) scale = Math.max(scale, hPx / cfg.maxH);
      const paneMaxFrac = pane.mobile ? 0.84 : 0.72;
      scale = Math.max(scale, wPx / Math.max(1, pane.w * paneMaxFrac), hPx / Math.max(1, pane.h * (pane.mobile ? 0.60 : 0.72)));
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
    const tableauStart = T_CH_START + CHAPTERS.length * CH_W;
    const mobileTableau = sticky.clientWidth < 700 && p >= (tableauStart - 0.023);
    const soloId = chIdx >= 0 ? CHAPTERS[chIdx].id : null;
    CHAPTERS.forEach((c, i) => {
      const g = groups[c.id];
      if (!g) return;
      const slot = mobileTableau ? (c.mobileSlot || c.slot) : c.slot;
      let x = slot[0] * MM * ex * reassemblyK(p, c.id);
      let y = slot[1] * MM * ex * reassemblyK(p, c.id);
      let z = slot[2] * MM * ex * reassemblyK(p, c.id);
      let yaw = 0;
      const reassemblyProgress = smooth((p - T_RE_START) / Math.max(0.001, T_FINAL - T_RE_START));
      const hasCompletedSolo = chIdx > i || (chIdx === i && chapterT(p, i) >= 0.72) || p >= tableauStart;
      if (hasCompletedSolo) {
        // Finish the inspection around the product's useful face and carry
        // the remaining turn gradually through the tableau and reassembly.
        yaw = ((c.turn + (360 - c.turn) * reassemblyProgress) * Math.PI) / 180;
      }
      if (i === chIdx) {
        const t = chapterT(p, i);
        const liftIn = smooth(t / 0.22);
        const liftOut = smooth((t - 0.78) / 0.22);
        const liftAmt = liftIn - liftOut;
        // Advance slowly to the readable three-quarter face, then preserve
        // that orientation instead of rushing a final 150° in the last beat.
        const turnUp = smooth(t / 0.72);
        yaw = ((c.turn * turnUp + (t >= 0.72 ? (360 - c.turn) * reassemblyProgress : 0)) * Math.PI) / 180;
        x += c.inspect[0] * MM * liftAmt;
        y += c.inspect[1] * MM * liftAmt;
        z += c.inspect[2] * MM * liftAmt;
      }
      if (c.id === 'enclosure' && p >= tableauStart && p < T_RE_START) {
        // Carry the final enclosure inspection offset across the short
        // chapter/tableau bridge instead of snapping back to its seat.
        const settleBridge = smooth((p - tableauStart) / Math.max(0.001, T_RE_START - tableauStart));
        x += c.inspect[0] * MM * (1 - settleBridge);
        y += c.inspect[1] * MM * (1 - settleBridge);
        z += c.inspect[2] * MM * (1 - settleBridge);
      }
      g.position.set(seats[c.id].x + x, seats[c.id].y + y, seats[c.id].z + z);
      g.rotation.set(0, yaw, 0, 'YXZ');
      // Keep every component in the scene so transitions remain scroll-linked;
      // applyDim controls the readable emphasis without a visibility snap.
      g.visible = true;
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
    const b = id === 'all'
      ? (lastProgress >= (T_CH_START + CHAPTERS.length * CH_W - 0.023) ? fullAssemblyBox(tmpBox) : boxForSubject('all', tmpBox))
      : worldBox(id, tmpBox);
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
    const sil = silhouettePx(keyToId(activeKey));
    if (!sil) return;
    // Route the leader in the whitespace around the subject, then use only a
    // short terminal segment to the mesh-attached anchor. This avoids slicing
    // diagonally through the active silhouette.
    let routeX = pt.x, routeY = pt.y;
    if (mobile) routeY = sil.y + sil.h + 14;
    else routeX = el.classList.contains('is-right') ? sil.x + sil.w + 14 : sil.x - 14;
    const ns = 'http://www.w3.org/2000/svg';
    const route = document.createElementNS(ns, 'polyline');
    route.setAttribute('points', `${sx},${sy} ${routeX},${routeY}`);
    leadersSvg.appendChild(route);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', routeX); line.setAttribute('y1', routeY);
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
    return t >= 0.26 && t <= 0.85 ? CHAPTERS[i].key : null;
  }

  const SUN_OFF = new THREE.Vector3(0.3, 0.9, 0.4);
  function applyDim(p) {
    const blend = chapterBlend(p);
    const activeId = blend.id && blend.w > 0 ? blend.id : null;
    const exteriorOnly = p < T_EXPLODE[0] || p >= T_FINAL;
    const exteriorParts = new Set(['enclosure', 'solar_lid', 'led_pair', 'switch']);
    CHAPTERS.forEach((c) => {
      const hiddenInterior = exteriorOnly && !exteriorParts.has(c.id);
      const dim = hiddenInterior ? 0 : (c.id === activeId ? 1 : (blend.id ? Math.max(0, 1 - blend.w * 4) : 1));
      groups[c.id].visible = dim > 0.001 || c.id === activeId;
      groups[c.id].traverse((o) => {
        if (o.isMesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            m.opacity = (m.userData.baseOpacity ?? 1) * dim;
            const fading = dim < 0.999;
            m.transparent = fading || (m.userData.baseTransparent ?? false);
            m.depthWrite = fading ? false : (m.userData.baseDepthWrite ?? true);
          });
        }
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
    const chapterIndex = chapterAt(p);
    CHAPTERS.forEach((c, i) => {
      const el = callouts[c.key];
      const t = chapterIndex === i ? chapterT(p, i) : (chapterIndex < i ? 0 : 1);
      const fadeIn = smooth(t / 0.26);
      const fadeOut = smooth((1 - t) / 0.14);
      const alpha = chapterIndex === i && t >= 0.26 && t <= 0.90 ? Math.min(fadeIn, fadeOut) : 0;
      el.style.opacity = alpha.toFixed(3);
      el.classList.toggle('is-active', alpha > 0.32);
    });
    introCopy.classList.toggle('is-hidden', p > 0.085);
    finalMark.classList.toggle('is-active', p >= 0.985);
    updateLeaders(activeKey);
    frameStats = {
      progress: p,
      activeCallout: activeKey,
      stage: { w: sticky.clientWidth, h: sticky.clientHeight },
      pane: { x: pane.x, y: pane.y, w: pane.w, h: pane.h },
      silhouette: activeKey ? silhouettePx(keyToId(activeKey)) : null,
      allSilhouette: silhouettePx('all'),
      // The visible enclosure mesh itself is the cavity sentinel; no extra
      // overlay is substituted for the authored floor/walls.
      trayVisible: p >= T_EXPLODE[1] && p < T_FINAL && !!groups.enclosure?.visible,
      cavityFloor: {
        visible: p >= T_EXPLODE[1] && p < T_FINAL && !!groups.enclosure?.visible,
        visualOnly: true,
        thicknessMm: 0,
        zMm: -4.249,
        seatBottomMm: -4.25,
      },
      introBox: (() => { const r = introCopy.getBoundingClientRect(), s = sticky.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; })(),
      finalBox: (() => { const r = finalMark.getBoundingClientRect(), s = sticky.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; })(),
      calloutBox: activeKey ? (() => { const r = callouts[activeKey].getBoundingClientRect(), s = sticky.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; })() : null,
      pose: Object.fromEntries(PART_IDS.map((id) => [id, {
        position: groups[id].position.toArray().map((v) => +v.toFixed(6)),
        rotation: groups[id].rotation.toArray().slice(0, 3).map((v) => +v.toFixed(5)),
        visible: groups[id].visible,
      }])),
      leaderPath: (() => {
        const p = leadersSvg.querySelector('polyline');
        return p ? p.getAttribute('points') : null;
      })(),
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
        document.body.classList.toggle('ff-assembly-active', p > 0.001 && p <= 1);
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

  const observerAvailable = 'IntersectionObserver' in window;
  const io = observerAvailable ? new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) { loadModel(); requestRender(true); }
  }, { rootMargin: '25% 0%' }) : null;
  if (io) io.observe(section);
  else { inView = true; loadModel(); }

  const onScroll = () => requestRender(false);
  const onResize = () => requestRender(true);
  const onVisibility = () => {
    docHidden = document.hidden;
    if (!docHidden) requestRender(true);
  };
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    io?.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    Object.values(groups).forEach((g) => g.traverse((o) => {
      if (!o.isMesh) return;
      if (o.geometry && o.geometry.dispose) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose && m.dispose());
      }
    }));
    if (renderer) { renderer.dispose(); renderer.forceContextLoss?.(); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', cleanup, { once: true });

  window.__ffasm3d = {
    version: 'pass4',
    get ready() { return ready; },
    progress: () => lastProgress,
    cam: () => {
      const center = lastView ? lastView.center : new THREE.Vector3();
      const dx = camera.position.x - center.x;
      const dy = camera.position.y - center.y;
      const dz = camera.position.z - center.z;
      return { pos: camera.position.toArray(), dist: lastView ? lastView.dist : null, center: center.toArray(), azim: Math.atan2(dx, dz), elev: Math.atan2(dy, Math.hypot(dx, dz)) };
    },
    activeCallout: () => (frameStats ? frameStats.activeCallout : null),
    frame: () => frameStats,
    seatedCheck: () => {
      if (!ready || !manifestBounds) return false;
      const missing = PART_IDS.filter((id) => !groups[id]);
      if (missing.length) return false;
      applyPose(1);
      return PART_IDS.every((id) => {
        const m = new THREE.Matrix4().extractRotation(groups[id].matrixWorld);
        const posOk = groups[id].getWorldPosition(V).distanceTo(seats[id]) < 1e-6;
        const rotOk = Math.abs(m.elements[0] - 1) < 1e-6 && Math.abs(m.elements[5] - 1) < 1e-6 && Math.abs(m.elements[10] - 1) < 1e-6;
        const b = new THREE.Box3().setFromObject(meshNodes[id]);
        const eb = manifestBounds[id]?.worldBoundsMm;
        const boundsOk = eb && b.min.distanceTo(new THREE.Vector3(...eb.lo.map((v) => v * MM))) < 1e-5 && b.max.distanceTo(new THREE.Vector3(...eb.hi.map((v) => v * MM))) < 1e-5;
        return posOk && rotOk && boundsOk;
      });
    },
    parts: () => Object.keys(groups),
  };

  requestRender(true);
}

const section = document.querySelector('[data-assembly-sequence]');
if (section) init(section);

export default { init };
