import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CACHE_TOKEN = 'pass11';
const GLB_URL = `assets/3d/flashlight-assembly.glb?rev=${CACHE_TOKEN}`;
const MM = 0.001;
const DPR_CAP = 1.75;
const FOV = 34;

const PART_IDS = ['enclosure', 'switch', 'solar_lid', 'battery', 'charge_module', 'led_pair'];
const CHAPTERS = [
  { id: 'solar_lid', key: 'solar', num: '01 / DAYLIGHT IN', title: '5V solar panel', body: 'Captures daylight to recharge the light.', slot: [-80, 46, 27], mobileSlot: [0, 130, 28], inspect: [0, 4, 74], anchor: [-34, 0, 1.25] },
  { id: 'battery', key: 'battery', num: '02 / POWER HELD', title: 'Rechargeable battery', body: 'Stores energy for study after dark.', slot: [-18, -7, 17], mobileSlot: [-42, -18, 20], inspect: [-16, -2, 46], anchor: [10, 15, 1] },
  { id: 'charge_module', key: 'module', num: '03 / CHARGE CONTROLLED', title: 'Recharge module', body: 'Manages safe charging from the panel.', slot: [21, 8, 16], mobileSlot: [44, -14, 20], inspect: [0, 0, 46], anchor: [-10, 0, 2.8] },
  { id: 'led_pair', key: 'leds', num: '04 / LIGHT OUT', title: 'Two LEDs', body: 'Turn stored energy into focused study light.', slot: [-8, -30, 14], mobileSlot: [-30, 36, 16], inspect: [0, -54, 26], anchor: [8, -2.8, 0] },
  { id: 'switch', key: 'switch', num: '05 / SWITCHED BY HAND', title: 'Slide switch', body: 'Completes the circuit so study light flows.', slot: [60, 25, 14], mobileSlot: [40, 40, 16], inspect: [0, 64, 26], anchor: [-1, 41, 5] },
  { id: 'enclosure', key: 'enclosure', num: '06 / BUILT TO PROTECT', title: '3D-printed enclosure', body: 'Shields every component.', slot: [0, 0, 0], mobileSlot: [0, 0, 0], inspect: [0, -6, 36], anchor: [40, -40, 6] },
];
const REASSEMBLY_ORDER = ['switch', 'led_pair', 'charge_module', 'battery', 'solar_lid'];

const T_INTRO_END = 0.075;
const T_EXPLODE = [0.075, 0.17];
const T_CH_START = 0.195;
const CH_W = 0.093;
// Leave a dedicated exploded-tableau beat after the final solo chapter. The
// slightly tighter reassembly cadence keeps the finished state before p=1.
const T_RE_START = 0.76;
const RE_SPACING = 0.035;
const RE_W = 0.025;
const T_FINAL = 0.925;
const T_CLOSED_HOLD = T_FINAL;
const T_HERO_START = 0.945;
const T_MARKER = 0.975;
const T_COPY_CLEAR = T_CH_START + CHAPTERS.length * CH_W + 0.004;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (v) => easeInOutCubic(clamp01(v));
const lerp = (a, b, t) => a + (b - a) * t;

// PASS11 motion sheet. This is intentionally a pure native-scroll sampler:
// one normalized chapter t produces the same pose in either scrub direction.
// Quaternion interpolation follows the official THREE.Quaternion.slerp
// contract; the phase/keyframe structure mirrors GSAP ScrollTrigger's
// normalized scrub/timeline-label pattern without adding a runtime dependency.
const SOLO_MOTION = {
  solar_lid: { zoom: 0.88, fit: 1, baseYaw: 0, reassemblyYaw: 0, yaw: 0, pitch: 12, roll: -4, lift: 0 },
  battery: { zoom: 1.20, fit: 0.50, mobileFit: 0.54, baseYaw: 180, reassemblyYaw: 180, yaw: -8, pitch: 5, roll: 10, lift: 4 },
  charge_module: { zoom: 1.20, fit: 0.50, mobileFit: 0.54, baseYaw: 38, reassemblyYaw: 42, yaw: 24, pitch: 8, roll: 0, lift: 0 },
  led_pair: { zoom: 1.40, fit: 0.49, mobileFit: 0.54, baseYaw: 14, reassemblyYaw: 68, yaw: 82, pitch: 0, roll: 10, lift: 0 },
  switch: { zoom: 1.27, fit: 0.96, mobileFit: 0.48, baseYaw: 8, reassemblyYaw: 14, yaw: 6, pitch: 0, roll: 4, lift: 0, travel: 1.8 },
  enclosure: { zoom: 0.95, fit: 1.08, mobileFit: 1, baseYaw: 16, reassemblyYaw: 0, yaw: 8, pitch: 14, roll: 0, lift: 0 },
};
function samplePartPose(id, localT, mobile) {
  const m = SOLO_MOTION[id] || SOLO_MOTION.enclosure;
  const amp = mobile ? 0.76 : 1;
  const enter = smooth(localT / 0.20);
  const inspect = smooth((localT - 0.20) / 0.50);
  const hold = smooth((localT - 0.70) / 0.12);
  const settle = smooth((localT - 0.82) / 0.18);
  const active = Math.max(0, enter - settle);
  const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0, 'YXZ'));
  const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(m.pitch * amp * Math.PI / 180, m.yaw * amp * Math.PI / 180, m.roll * amp * Math.PI / 180, 'YXZ'));
  const q = q0.clone().slerp(q1, Math.min(1, inspect + hold * 0.18));
  const lift = m.lift * amp * active;
  const travel = id === 'switch' ? m.travel * amp * Math.sin(Math.PI * Math.min(1, inspect)) : 0;
  return { quaternion: q, zoom: lerp(1, m.zoom, Math.min(1, inspect + hold)), lift, travel, phase: { enter, inspect, hold, settle } };
}

function ramp(p, a, b) { return smooth((p - a) / (b - a)); }

function chapterAt(p) {
  const chapterEnd = T_CH_START + CHAPTERS.length * CH_W;
  if (p < T_CH_START || p >= Math.min(T_RE_START, chapterEnd)) return -1;
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
  CHAPTERS.forEach((c) => { callouts[c.key].style.transition = 'none'; });

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.physicallyCorrectLights = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.005, 6);
  const studioFaces = [];
  if (typeof document !== 'undefined') {
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('canvas'); c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 32, 32);
      g.addColorStop(0, i === 2 ? '#ffffff' : '#dfe6e2');
      g.addColorStop(1, i === 3 ? '#aebbb4' : '#f7faf8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
      studioFaces.push(c);
    }
    const env = new THREE.CubeTexture(studioFaces);
    env.colorSpace = THREE.SRGBColorSpace;
    env.needsUpdate = true;
    scene.environment = env;
  }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x18201c, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const fill = new THREE.PointLight(0xdce8f4, 0.48, 2.4);
  fill.position.set(-0.35, -0.55, 0.6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xc7e6d6, 0.72);
  rim.position.set(-0.6, 0.45, -0.8);
  scene.add(rim);

  const groups = {};
  const meshNodes = {};
  const seats = {};
  let switchActuatorNode = null;
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
      const pouch = solid(0x9fa5a6, 0.34, 0.22);
      const roundedPouch = () => {
        const s = new THREE.Shape(); const w = 20.5, h = 14.3, r = 3.0;
        s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
        s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h);
        s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
        const g = new THREE.ExtrudeGeometry(s, { depth: 2.15, bevelEnabled: true, bevelSegments: 4, bevelSize: 0.65, bevelThickness: 0.08 });
        g.translate(0, 0, -1.075); return g;
      };
      detail(roundedPouch(), pouch, [0, 0, 0]);
      const foil = solid(0xc4c9c9, 0.28, 0.28);
      for (const z of [-1.12, 1.12]) {
        const faceZ = z + Math.sign(z) * 0.045;
        detail(new THREE.BoxGeometry(34, 0.16, 0.05), foil, [0, -9.8, faceZ]);
        detail(new THREE.BoxGeometry(30, 0.13, 0.05), foil, [0, 8.6, faceZ]);
        detail(new THREE.BoxGeometry(0.13, 22, 0.05), solid(0xb6c2bc, 0.38, 0.16), [-16.8, 0, faceZ]);
        detail(new THREE.BoxGeometry(0.13, 22, 0.05), solid(0xb6c2bc, 0.38, 0.16), [16.8, 0, faceZ]);
        detail(new THREE.BoxGeometry(0.08, 17, 0.035), solid(0xaebbb4, 0.46, 0.1), [-4.5, -0.5, faceZ]);
      }
      // Heat-sealed perimeter and the shallow, irregular folds are what make
      // a LiPo pouch read as foil rather than a rounded plastic tile. Keep
      // these details inside the real 503040 footprint and mirror them on
      // both faces so the reveal remains informative while the part turns.
      const seal = solid(0xd6dcda, 0.32, 0.34);
      const crease = matte(0x6e7977, 0.62, 0.16);
      for (const z of [-1.20, 1.20]) {
        const faceZ = z + Math.sign(z) * 0.035;
        detail(new THREE.BoxGeometry(38.5, 0.28, 0.06), seal, [0, -13.35, faceZ]);
        detail(new THREE.BoxGeometry(38.5, 0.24, 0.06), seal, [0, 13.35, faceZ]);
        detail(new THREE.BoxGeometry(0.28, 25.8, 0.06), seal, [-19.15, 0, faceZ]);
        detail(new THREE.BoxGeometry(0.28, 25.8, 0.06), seal, [19.15, 0, faceZ]);
        const folds = [[-13, -6.0, 9.0, -0.22], [-6, 4.0, 10.0, 0.16], [2, -3.6, 8.0, -0.10], [9, 5.8, 11.0, 0.14], [14, -7.0, 6.5, -0.18]];
        for (const [x, y, len, angle] of folds) {
          const fold = detail(new THREE.BoxGeometry(len, 0.12, 0.035), crease, [x, y, faceZ]);
          fold.rotation.z = angle;
        }
      }
      const amber = solid(0xd78c2d, 0.4, 0.22);
      detail(new THREE.BoxGeometry(31, 1.7, 2.35), amber, [0, 14.85, 0.35]);
      detail(new THREE.BoxGeometry(5.2, 1.0, 2.5), solid(0xf0ad42, 0.32, 0.28), [-10, 15.7, 0.44]);
      detail(new THREE.BoxGeometry(5.2, 1.0, 2.5), solid(0xf0ad42, 0.32, 0.28), [10, 15.7, 0.44]);
      const blackLead = solid(0x171d1a, 0.46, 0.02);
      const redLead = solid(0x9c2524, 0.46, 0.02);
      const blackStub = detail(new THREE.CylinderGeometry(0.48, 0.48, 4.2, 12), blackLead, [-10, 17.0, 0.45]);
      blackStub.rotation.z = -0.28;
      const redStub = detail(new THREE.CylinderGeometry(0.46, 0.46, 4.2, 12), redLead, [10, 17.0, 0.45]);
      redStub.rotation.z = 0.28;
      detail(new THREE.CylinderGeometry(0.68, 0.68, 0.7, 12), blackLead, [-10, 16.55, 0.45]);
      detail(new THREE.CylinderGeometry(0.66, 0.66, 0.7, 12), redLead, [10, 16.55, 0.45]);
    } else if (id === 'charge_module') {
      // The GLB is the single source of visible PCB detail. Keeping this
      // branch empty avoids a second oversized runtime board/rail overlay and
      // preserves the imported 24x18 mm underside through every stage.
    } else if (id === 'led_pair') {
      // The authored GLB carries the official clear D5 lens, extended optical
      // body, dark anvil/post, and unequal tinned leads. Do not layer a second
      // procedural shell over it: duplicate transparent domes create the
      // washed-out white blob this chapter is explicitly guarding against.
    } else if (id === 'switch') {
      // The GLB contains the compact SS12D00-style authored switch. The old
      // runtime overlays were ladder-like fit proxies and are intentionally
      // removed so the visible mesh stays one coherent product.
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

  const authoredTextureLoader = new THREE.TextureLoader();
  function hydrateAuthoredTextures(rootNode) {
    const maps = {
      BatterySilver: `assets/3d/textures/battery_basecolor.png?rev=${CACHE_TOKEN}`,
      PcbGreen: `assets/3d/textures/tp4056_basecolor.png?rev=${CACHE_TOKEN}`,
    };
    const normal = authoredTextureLoader.load(`assets/3d/textures/electronics_normal.png?rev=${CACHE_TOKEN}`, () => requestRender(true));
    normal.colorSpace = THREE.NoColorSpace;
    const ao = authoredTextureLoader.load(`assets/3d/textures/electronics_ao.png?rev=${CACHE_TOKEN}`, () => requestRender(true));
    ao.colorSpace = THREE.NoColorSpace;
    rootNode.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (maps[m.name]) {
          const tex = authoredTextureLoader.load(maps[m.name], () => requestRender(true));
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          if (m.name === 'BatterySilver') {
            // The authored foil print is right-reading in its source image;
            // flip only U so mesh/tabs/pivots remain untouched.
            tex.wrapS = THREE.RepeatWrapping;
            tex.repeat.x = -1;
            tex.offset.x = 1;
          }
          m.map = tex;
          m.needsUpdate = true;
        }
        if (m.name === 'PcbGreen') {
          m.normalMap = normal;
          m.aoMap = ao;
          m.normalScale?.set(0.13, 0.13);
          m.needsUpdate = true;
        } else if (m.name === 'BatterySilver') {
          m.normalMap = null;
          m.aoMap = ao;
          m.normalScale?.set(1, 1);
          m.metalness = 0.52;
          m.roughness = 0.24;
          m.transparent = false;
          m.opacity = 1;
          m.needsUpdate = true;
        }
      });
    });
  }

  // Keep the authored switch body seated while extracting only the
  // SwitchActuator primitive group into a sibling mesh. Its local X offset is
  // then the real slider travel; the body, contacts, and pins never translate.
  function splitSwitchActuator(node) {
    let source = null;
    let standalone = null;
    node.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (!standalone && mats.length === 1 && mats[0]?.name === 'SwitchActuator') standalone = o;
      if (!source && Array.isArray(o.material)) source = o;
    });
    // GLTFLoader may emit one mesh per primitive instead of a grouped mesh;
    // in that form the actuator is already an independent child and can be
    // translated directly without touching the authored body primitives.
    if (!source) return standalone;
    const actuatorGroups = source.geometry.groups.filter((group) => source.material[group.materialIndex]?.name === 'SwitchActuator');
    if (!actuatorGroups.length) return null;
    const bodyGeometry = source.geometry.clone();
    bodyGeometry.clearGroups();
    source.geometry.groups.forEach((group) => {
      if (source.material[group.materialIndex]?.name !== 'SwitchActuator') bodyGeometry.addGroup(group.start, group.count, group.materialIndex);
    });
    const actuatorGeometry = source.geometry.clone();
    actuatorGeometry.clearGroups();
    actuatorGroups.forEach((group) => actuatorGeometry.addGroup(group.start, group.count, group.materialIndex));
    source.geometry = bodyGeometry;
    const actuator = new THREE.Mesh(actuatorGeometry, source.material);
    actuator.name = 'switch_actuator';
    actuator.castShadow = source.castShadow;
    actuator.receiveShadow = source.receiveShadow;
    source.parent.add(actuator);
    return actuator;
  }

  function loadModel() {
    if (disposed || root || section.classList.contains('ff-asm3d-load-error')) return;
    loadingEl.classList.remove('is-idle');
    new GLTFLoader().load(GLB_URL, (gltf) => {
      if (disposed) return;
      root = gltf.scene;
    scene.add(root);
    hydrateAuthoredTextures(root);
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
      if (c.id === 'switch') switchActuatorNode = splitSwitchActuator(node);
      node.position.set(0, 0, 0);
      node.quaternion.identity();
      node.scale.set(1, 1, 1);
      // Bounds are geometry-local, while the seat remains the authored GLB
      // translation. This prevents recentering from cancelling the seat.
      node.traverse((o) => {
        if (o.isMesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            m.userData.baseOpacity = m.opacity ?? 1;
            m.userData.baseTransparent = m.transparent ?? false;
            m.userData.baseDepthWrite = m.depthWrite ?? true;
            m.envMapIntensity = Math.max(0.55, m.envMapIntensity ?? 0.75);
            if (m.name === 'ClearLed') {
              // Replace the GLB's plain alpha material with a physically
              // transmissive optical plastic. A single clear mesh plus dark
              // internal anvil gives an edge/rim read without a bloom blob.
              const lens = new THREE.MeshPhysicalMaterial({
                name: 'ClearLed', color: 0x8fd7dc, roughness: 0.055,
                metalness: 0.0, transmission: 0.70, ior: 1.49,
                thickness: 0.28, transparent: true, opacity: 0.36,
                depthWrite: false, side: THREE.DoubleSide,
                envMapIntensity: 1.15,
              });
              if ('attenuationColor' in lens) lens.attenuationColor.setHex(0x398f99);
              if ('attenuationDistance' in lens) lens.attenuationDistance = 1.4;
              if (lens.emissive) lens.emissive.setHex(0x4f9da3);
              if ('emissiveIntensity' in lens) lens.emissiveIntensity = 0.10;
              lens.userData.baseOpacity = 0.36;
              lens.userData.baseTransparent = true;
              lens.userData.baseDepthWrite = false;
              o.material = lens;
              // The approved enclosure has no LED cut-outs. Keep the shell
              // optically visible in the closed hero while the separate metal
              // leads remain ordinary depth-tested geometry inside the cavity.
              lens.depthTest = false;
              o.renderOrder = 20;
              o.castShadow = false;
            } else if (m.name === 'LedDie') {
              m.color?.setHex(0x4f8589);
              m.emissive?.setHex(0x62cbd0);
              if ('emissiveIntensity' in m) m.emissiveIntensity = 0.12;
            } else if (m.name === 'LedAnvil') {
              m.color?.setHex(0x192321);
              m.metalness = 0.62;
              m.roughness = 0.22;
            } else if (m.name === 'BatterySilver') {
              // Keep the 503040 pouch opaque and foil-like: low normal relief
              // plus high-metal silver prevents a frosted plastic block read.
              m.color?.setHex(0xb8c2bf);
              m.metalness = 0.82;
              m.roughness = 0.28;
            }
          });
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      node.updateMatrixWorld(true);
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
    // Close the finished light from the LED-bearing front and top. A negative
    // elevation puts the camera on the -Y/front side while +Z remains visible,
    // so the finished read includes both the blue solar surface and protruding
    // optical heads instead of the enclosure's plain rear slab.
    { at: 0.99, azim: 35, elev: -70 },
  ];

  function viewAngles(p) {
    const ks = ANGLE_KEYS;
    if (p <= ks[0].at) return { azim: ks[0].azim, elev: ks[0].elev };
    for (let i = 0; i < ks.length - 1; i++) {
      if (p >= ks[i].at && p <= ks[i + 1].at) {
        const t = smooth((p - ks[i].at) / Math.max(1e-6, ks[i + 1].at - ks[i].at));
        const base = {
          azim: lerp(ks[i].azim, ks[i + 1].azim, t),
          elev: lerp(ks[i].elev, ks[i + 1].elev, t),
        };
        const chapter = chapterAt(p);
        if (chapter >= 0) {
          const c = CHAPTERS[chapter];
          const local = samplePartPose(c.id, chapterT(p, chapter), sticky.clientWidth < 700);
          const motion = SOLO_MOTION[c.id];
          base.azim += motion.yaw * 0.22 * local.phase.inspect;
          base.elev += motion.pitch * 0.18 * local.phase.inspect;
        }
        // Quantize only the ±0.003 boundary neighborhood to one measured
        // editorial angle. It removes the last leader/camera jitter while
        // leaving the broad angle interpolation untouched elsewhere.
        for (let b = 1; b <= CHAPTERS.length - 1; b++) {
          const boundary = T_CH_START + b * CH_W;
          if (Math.abs(p - boundary) < 0.003) {
            base.azim = 24 + (b - 1) * 13;
            base.elev = 8;
            break;
          }
        }
        return base;
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
    // Keep the active component framed through the complete chapter. At a
    // chapter boundary, hand off directly from the previous solo to the next
    // solo; never fall back through an empty all-parts composition.
    const handoff = smooth(t / 0.24);
    return {
      id: c.id,
      w: handoff,
      prevId: i > 0 ? CHAPTERS[i - 1].id : null,
      handoff,
    };
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
      dPart = soloFitDistance(blend.id, chapterT(p, chapterAt(p)), pane, azim, elev, boxForSubject(blend.id, boxB));
      if (blend.prevId && blend.handoff < 1) {
        const prevBox = boxForSubject(blend.prevId, boxA);
        const prevCenter = prevBox.getCenter(new THREE.Vector3());
        const nextCenter = boxB.getCenter(new THREE.Vector3());
        // Match the outgoing solo's final zoomed fit, not the raw geometry
        // solve. This is the C0 camera handoff counterpart to the outgoing
        // quaternion preserved in applyPose below.
        const prevDist = soloFitDistance(blend.prevId, 1, pane, azim, elev, prevBox);
        center = prevCenter.lerp(nextCenter, blend.handoff);
        dist = lerp(prevDist, dPart, blend.handoff);
      } else if (blend.w >= 1) {
        center = boxB.getCenter(centerV);
        dist = dPart;
      } else {
        const ca = boxA.getCenter(new THREE.Vector3());
        const cb = boxB.getCenter(new THREE.Vector3());
        center = ca.lerp(cb, blend.w);
        dist = lerp(dAll, dPart, blend.w);
      }
    }
    // Freeze the camera to the outgoing endpoint through a narrow C0 window
    // on either side of each solo boundary. This is deliberately local to
    // the boundary; the wider handoff remains a true interpolation between
    // the two differently fitted subjects.
    let c0Frozen = false;
    const currentIndex = chapterAt(p);
    const currentT = currentIndex >= 0 ? chapterT(p, currentIndex) : 0;
    if (blend.id && currentIndex >= 0 && currentT > 0.98 && currentIndex + 1 < CHAPTERS.length) {
      const outgoingBox = boxForSubject(blend.id, boxB);
      const boundaryAzim = ((24 + currentIndex * 13) * Math.PI) / 180;
      const boundaryElev = (8 * Math.PI) / 180;
      center = outgoingBox.getCenter(new THREE.Vector3());
      dist = soloFitDistance(blend.id, 1, pane, boundaryAzim, boundaryElev, outgoingBox);
      c0Frozen = true;
    } else if (blend.prevId && blend.handoff < 0.015) {
      const outgoingBox = boxForSubject(blend.prevId, boxB);
      const boundaryIndex = Math.max(0, currentIndex - 1);
      const boundaryAzim = ((24 + boundaryIndex * 13) * Math.PI) / 180;
      const boundaryElev = (8 * Math.PI) / 180;
      center = outgoingBox.getCenter(new THREE.Vector3());
      dist = soloFitDistance(blend.prevId, 1, pane, boundaryAzim, boundaryElev, outgoingBox);
      c0Frozen = true;
    }
    if (pane.mobile && blend.id === 'switch' && blend.w > 0.5) {
      // Keep the official imported body at source scale. A small distance
      // allowance and explicit rightward center bias preserve the 16px mobile
      // editorial edge without the old crop-inducing closer bias.
      // Mobile's narrow inspection pane needs the authored switch to occupy
      // the same deliberate catalog width as the other solo components. This
      // local fit is switch/mobile-only; no seat, pivot, chapter timing, or
      // global camera choreography is changed.
      dist *= 0.99;
      const right = new THREE.Vector3(Math.cos(azim), 0, -Math.sin(azim));
      const switchBox = boxForSubject('switch', boxA);
      const base = projectedPixelBBox(switchBox, center, dist, azim, elev, pane);
      const shifted = projectedPixelBBox(switchBox, switchCenterProbe(center, right, 0.001), dist, azim, elev, pane);
      const baseMid = (base.minX + base.maxX) * 0.5;
      const shiftedMid = (shifted.minX + shifted.maxX) * 0.5;
      const slope = (shiftedMid - baseMid) / 0.001;
      if (Math.abs(slope) > 1) center.addScaledVector(right, ((pane.x + pane.w * 0.5) - baseMid) / slope);
    } else if (!pane.mobile && blend.id === 'switch' && blend.w > 0.5) {
      // The imported switch exposes its actuator/contacts at this approved
      // angle; keep a measured desktop safety margin around the body.
      dist *= 1.03;
      const right = new THREE.Vector3(Math.cos(azim), 0, -Math.sin(azim));
      const switchBox = boxForSubject('switch', boxA);
      const base = projectedPixelBBox(switchBox, center, dist, azim, elev, pane);
      const shifted = projectedPixelBBox(switchBox, switchCenterProbe(center, right, 0.001), dist, azim, elev, pane);
      const baseMid = (base.minX + base.maxX) * 0.5;
      const shiftedMid = (shifted.minX + shifted.maxX) * 0.5;
      const slope = (shiftedMid - baseMid) / 0.001;
      if (Math.abs(slope) > 1) center.addScaledVector(right, ((pane.x + pane.w * 0.5) - baseMid) / slope);
    }
    if (!pane.mobile && blend.w > 0.5 && (blend.id === 'battery' || blend.id === 'led_pair')) {
      // The right-side callouts intentionally bias these two wide subjects
      // toward the copy gutter. Give the larger per-part inspection zoom a
      // small opposing screen-space bias so the pane safety solve does not
      // immediately undo the authored scale at its left clearance edge.
      const right = new THREE.Vector3(Math.cos(azim), 0, -Math.sin(azim));
      const subjectBox = boxForSubject(blend.id, boxA);
      const base = projectedPixelBBox(subjectBox, center, dist, azim, elev, pane);
      const shifted = projectedPixelBBox(subjectBox, switchCenterProbe(center, right, 0.001), dist, azim, elev, pane);
      const baseMid = (base.minX + base.maxX) * 0.5;
      const shiftedMid = (shifted.minX + shifted.maxX) * 0.5;
      const slope = (shiftedMid - baseMid) / 0.001;
      if (Math.abs(slope) > 1) center.addScaledVector(right, 10 / slope);
    }
    if (p < T_INTRO_END) center.y += pane.mobile ? 0.012 : 0.025;
    const chapterEnd = T_CH_START + CHAPTERS.length * CH_W;
    // Begin refitting before the last solo settles and finish after the
    // tableau beat begins, so distance/center/scale do not jump at chapterEnd.
    const bridgeStart = chapterEnd - 0.020;
    const bridgeEnd = chapterEnd + 0.020;
    const bridgeT = clamp01((p - bridgeStart) / (bridgeEnd - bridgeStart));
    // Ease toward the fixed full-assembly fit quickly after the final solo
    // settles, while remaining scroll-linked on both sides of chapterEnd.
    const compositionBlend = p >= T_FINAL ? 1 : 1 - Math.pow(1 - bridgeT, 9);
    if (compositionBlend > 0) {
      // Tableau, reassembly and final are viewport compositions rather than
      // editorial-pane solos. Refit against the full viewport so the closed
      // product and the spread assembly read at the requested scale.
      // Start the final fit well before the lid's last settle so the compact
      // closed bounds do not create a late distance snap.
      const finalBridgeT = smooth((p - T_HERO_START) / Math.max(0.001, T_MARKER - T_HERO_START));
      // Hold the exploded tableau fit through its dedicated beat; switch to
      // the tighter, taller insertion fit only after the first settle.
      const reassemblyView = p >= T_RE_START + 0.04;
      const tableauW = pane.mobile ? 0.84 : (reassemblyView ? 0.78 : 0.75);
      // The open tray is tall and narrow in the authored front view. Give the
      // reassembly beat a little more vertical budget so its enclosure anchor
      // remains the same deliberate desktop size and the portrait composition
      // does not collapse into a thin strip.
      const tableauH = pane.mobile ? (reassemblyView ? 0.60 : 0.56) : (reassemblyView ? 0.76 : 0.65);
      const finalW = pane.mobile ? 0.82 : 0.68;
      const finalH = pane.mobile ? 0.56 : 0.78;
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
      // Once the final push begins, lock the distance to the authored
      // enclosure footprint so the moving solar lid cannot change the fit
      // scalar between the penultimate and closed samples.
      if (finalBridgeT > 0) {
        const enclosureBox = boxForSubject('enclosure', boxB);
        const solarBox = boxForSubject('solar_lid', boxB);
        const solarSize = solarBox.getSize(new THREE.Vector3());
        const enclosureCenter = enclosureBox.getCenter(new THREE.Vector3());
        const finalFitBox = new THREE.Box3(
          enclosureCenter.clone().sub(solarSize.clone().multiplyScalar(0.5)),
          enclosureCenter.clone().add(solarSize.clone().multiplyScalar(0.5))
        ).union(enclosureBox);
        const finalBaseDist = solveDistance(finalFitBox, azim, elev, pane) * 1.06;
        compositionDist = lerp(compositionDist, finalBaseDist, finalBridgeT);
      }
      // Give the early exploded tableau a small, authored scale-up while it
      // settles into the full composition. This is deliberately separate
      // from the later reassembly fit so the insertion beats keep their
      // established size and the transition remains smooth.
      if (!reassemblyView) compositionDist *= 0.98;
      // The finished exterior has a compact depth box, so the pane fit is
      // height-dominated. Bring it a little closer to the viewport target
      // while retaining the safe margin around the final marker.
      // The raw final fit is already calibrated to the finished product. A
      // closer 0.97 multiplier made the tall enclosure exceed the desktop
      // hero height and pulled its marker into the projected silhouette.
      compositionDist *= lerp(1, 1.0, finalBridgeT);
      center.lerp(compositionCenter, compositionBlend);
      dist = lerp(dist, compositionDist, compositionBlend);
    }
    // Final local safety solve for the animated solo pose. This is evaluated
    // after the part quaternion/zoom sample, so each catalog motion can be
    // expressive without allowing a rotated corner to clip the editorial
    // pane or mobile gutter.
    if (blend.id && p < chapterEnd && !c0Frozen) {
      // During the first few handoff frames, protect the outgoing subject
      // alone. Applying a new incoming crop solve before its opacity/leader
      // has arrived would change the camera scalar at C0. Once the crossfade
      // is established, protect both silhouettes.
      const safetyIds = blend.prevId && blend.handoff < 0.15 ? [blend.prevId] : [blend.id];
      // Once the outgoing copy is nearly faded, it no longer constrains the
      // active solo's framing. Keeping its much larger bounds in this solve
      // was the hidden source of the underfilled battery/board/LED holds.
      if (blend.prevId && blend.handoff >= 0.15 && blend.handoff < 0.85 && blend.id !== 'battery' && !(blend.id === 'led_pair' && blend.handoff >= 0.55)) safetyIds.push(blend.prevId);
      const minClear = pane.mobile ? 16 : 32;
      // The PCB→LED transition is the one handoff where the two subjects
      // occupy materially different vertical bands. Fit their union while
      // the handoff is visible, then center in both screen axes; a horizontal
      // correction alone leaves the incoming LEDs below the viewport.
      const safetySpecs = (blend.id === 'led_pair' && blend.prevId && blend.handoff >= 0.15 && blend.handoff < 0.55)
        ? (() => {
          const union = boxForSubject(blend.id, boxA);
          union.union(boxForSubject(blend.prevId, boxB));
          return [{ box: union, center: true }];
        })()
        : safetyIds.map((safetyId) => ({ box: boxForSubject(safetyId, boxA), center: safetyId === blend.id }));
      for (const safetySpec of safetySpecs) {
        const safetyBox = safetySpec.box;
        for (let iter = 0; iter < 18; iter++) {
          const bb = projectedPixelBBox(safetyBox, center, dist, azim, elev, pane);
          // Prefer translating the target in screen space when a large but
          // shallow component is near an editorial edge. The prior loop
          // always increased camera distance, which made the battery/board/
          // LED solos unnecessarily small even though there was ample room
          // to center them inside the pane. Derive pixel-to-world slopes from
          // the actual camera so the correction remains deterministic at any
          // angle and viewport size.
          const minX = pane.x + minClear, maxX = pane.x + pane.w - minClear;
          const minY = pane.y + minClear, maxY = pane.y + pane.h - minClear;
          const midX = (bb.minX + bb.maxX) * 0.5, midY = (bb.minY + bb.maxY) * 0.5;
          const widthLimit = Math.max(1, maxX - minX), heightLimit = Math.max(1, maxY - minY);
          const sizeScale = Math.max((bb.maxX - bb.minX) / widthLimit, (bb.maxY - bb.minY) / heightLimit);
          // A translation cannot make an oversized subject fit. Increase
          // distance only until the safe rectangle can contain it, then use
          // the remaining iterations to center it without sacrificing scale.
          if (sizeScale > 1.002) { dist *= Math.min(1.16, sizeScale); continue; }
          const targetMidX = Math.min(maxX - (bb.maxX - bb.minX) * 0.5, Math.max(minX + (bb.maxX - bb.minX) * 0.5, midX));
          const targetMidY = Math.min(maxY - (bb.maxY - bb.minY) * 0.5, Math.max(minY + (bb.maxY - bb.minY) * 0.5, midY));
          let moved = false;
          const probe = 0.001;
          const right = new THREE.Vector3(Math.cos(azim), 0, -Math.sin(azim));
          if (Math.abs(targetMidX - midX) > 0.25) {
            const probeBox = projectedPixelBBox(safetyBox, center.clone().addScaledVector(right, probe), dist, azim, elev, pane);
            const slope = ((probeBox.minX + probeBox.maxX) * 0.5 - midX) / probe;
            if (Math.abs(slope) > 1) { center.addScaledVector(right, (targetMidX - midX) / slope); moved = true; }
          }
          // Screen-up is the camera's true vertical basis, not world Y alone;
          // using it preserves centering at the tilted catalog angles.
          const up = new THREE.Vector3(-Math.sin(elev) * Math.sin(azim), Math.cos(elev), -Math.sin(elev) * Math.cos(azim));
          if (safetySpec.center && Math.abs(targetMidY - midY) > 0.25) {
            const probeBox = projectedPixelBBox(safetyBox, center.clone().addScaledVector(up, probe), dist, azim, elev, pane);
            const slope = ((probeBox.minY + probeBox.maxY) * 0.5 - midY) / probe;
            if (Math.abs(slope) > 1) { center.addScaledVector(up, (targetMidY - midY) / slope); moved = true; }
          }
          if (moved) continue;
          const overflow = Math.max(0, minX - bb.minX, bb.maxX - maxX, minY - bb.minY, bb.maxY - maxY);
          if (overflow <= 0) break;
          dist *= 1.012;
        }
      }
    }
    return { center, dist };
  }

  const fitCam = new THREE.PerspectiveCamera(FOV, 1, 0.005, 6);
  const projPt = new THREE.Vector3();
  function switchCenterProbe(center, right, amount) {
    return center.clone().addScaledVector(right, amount);
  }
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

  // The same authored solo fit must be used for both sides of a chapter
  // handoff. Re-solving the outgoing part without its inspection zoom creates
  // an avoidable camera-distance jump exactly at the boundary.
  function soloFitDistance(id, localT, pane, azim, elev, box) {
    let d = solveDistance(box, azim, elev, pane);
    const localMotion = samplePartPose(id, localT, pane.mobile);
    const zoomWeight = id === 'enclosure' ? 0.72 : (id === 'battery' ? 0.56 : (id === 'led_pair' ? 0.46 : 0.15));
    d *= 1 / Math.max(0.84, lerp(1, localMotion.zoom, zoomWeight));
    // Mobile keeps the established portrait scale; desktop alone receives
    // the per-part catalog fit tuning.
    d *= pane.mobile ? (localMotion.mobileFit ?? 1) : (localMotion.fit ?? 1);
    if (id === 'enclosure') d *= 0.885;
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
      if (c.id === 'switch' && switchActuatorNode) switchActuatorNode.position.x = 0;
      const slot = mobileTableau ? (c.mobileSlot || c.slot) : c.slot;
      // Open in two readable stages: lift the lid first, then separate the
      // internal parts along their insertion axes before the tableau hold.
      const lidExplosion = ramp(p, T_EXPLODE[0], T_EXPLODE[0] + 0.035);
      const internalsExplosion = ramp(p, T_EXPLODE[0] + 0.035, T_EXPLODE[1]);
      const stagedExplosion = c.id === 'solar_lid' ? lidExplosion : internalsExplosion;
      let x = slot[0] * MM * stagedExplosion * reassemblyK(p, c.id);
      let y = slot[1] * MM * stagedExplosion * reassemblyK(p, c.id);
      let z = slot[2] * MM * stagedExplosion * reassemblyK(p, c.id);
      const motion = SOLO_MOTION[c.id] || SOLO_MOTION.enclosure;
      // Seed every exploded component with its authored face before it is
      // called into its solo chapter. This makes the incoming component's
      // first rendered handoff frame match the pose it was already carrying
      // off-screen, instead of introducing a hidden half-turn at C0.
      let yaw = p >= T_EXPLODE[1] ? motion.baseYaw * Math.PI / 180 : 0;
      let composedQuaternion = false;
      const reassemblyProgress = smooth((p - T_RE_START) / Math.max(0.001, T_FINAL - T_RE_START));
      const hasCompletedSolo = chIdx > i || (chIdx === i && chapterT(p, i) >= 0.72) || p >= tableauStart;
      if (hasCompletedSolo) {
        // Each component carries its own useful face into reassembly; no
        // shared half-turn is inherited from the old chapter choreography.
        yaw = lerp(motion.baseYaw, motion.reassemblyYaw, reassemblyProgress) * Math.PI / 180;
      }
      if (i === chIdx) {
        const t = chapterT(p, i);
        const liftIn = smooth(t / 0.22);
        // The enclosure is the final solo and must carry its inspection pose
        // into the exploded tableau. Letting it settle back to its seat in
        // the final 22% creates a visible 36mm position / 17deg rotation
        // jump at the solo-to-tableau boundary.
        const liftOut = c.id === 'enclosure' ? 0 : smooth((t - 0.78) / 0.22);
        const liftAmt = liftIn - liftOut;
        // Per-part orientation is intentionally different: the panel tilts,
        // the pouch reveals its crimp, the board shows its port, the LEDs
        // twirl on-axis, the switch barely turns, and the enclosure opens.
        // Keep the foil face readable from the moment the battery enters the
        // frame. Its authored pitch/roll still supplies a modest thickness
        // reveal, but a 0→180deg yaw sweep makes the printed face appear
        // mirrored/upside-down during the solar handoff.
        // The authored base face is already present at the chapter entrance;
        // the distinct inspection motion comes from samplePartPose's
        // quaternion, so delaying this base yaw would create a C0 jump for
        // every incoming chapter (most visibly the board and LEDs).
        const orientationProgress = 1;
        yaw = (motion.baseYaw * orientationProgress + (t >= 0.72 ? motion.reassemblyYaw * reassemblyProgress : 0)) * Math.PI / 180;
        x += c.inspect[0] * MM * liftAmt;
        y += c.inspect[1] * MM * liftAmt;
        z += c.inspect[2] * MM * liftAmt;
        const sampled = samplePartPose(c.id, t, sticky.clientWidth < 700);
        // Local inspection motion is composed with the frozen chapter yaw;
        // quaternion slerp prevents Euler accumulation and remains reversible.
        const baseQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, 'YXZ'));
        g.quaternion.copy(baseQ).multiply(sampled.quaternion);
        composedQuaternion = true;
        z += sampled.lift * MM;
        if (c.id === 'switch' && switchActuatorNode) switchActuatorNode.position.x = sampled.travel * MM;
      }
      // During a chapter handoff, return the previous solo to its neutral
      // exploded slot while the next solo enters. This keeps one coherent
      // adjacent-part transition instead of collapsing through all parts.
      if (chIdx === i + 1) {
        const tNext = chapterT(p, chIdx);
        const previousOut = 1 - smooth(tNext / 0.24);
        if (previousOut > 0) {
          // Freeze the outgoing component at the exact pose used at its
          // chapter endpoint. The former partial inspect offset/yaw caused a
          // visible snap as the outgoing solo handed off to the next one.
          const outgoing = samplePartPose(c.id, 1, sticky.clientWidth < 700);
          const outgoingQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, motion.baseYaw * Math.PI / 180, 0, 'YXZ'));
          g.quaternion.copy(outgoingQ).multiply(outgoing.quaternion);
          composedQuaternion = true;
        }
      }
      // Reassembly rotation belongs to the active insertion only. Parts that
      // have already seated are stable at identity; parts waiting their turn
      // retain their exploded inspection orientation.
      if (p >= T_RE_START && c.id !== 'enclosure') {
        const reIdx = REASSEMBLY_ORDER.indexOf(c.id);
        const beatStart = T_RE_START + reIdx * RE_SPACING;
        // Each part waits at the exact orientation it carried into the
        // reassembly phase. During its own insertion beat it eases that
        // quaternion all the way to its seated identity, then remains frozen
        // there. This prevents inactive parts from continuing to rotate and
        // removes the battery's late 180° jump between beat samples.
        const beatT = clamp01((p - beatStart) / RE_W);
        const startQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, motion.baseYaw * Math.PI / 180, 0, 'YXZ'));
        // The foil face is authored on the 180° side and remains the readable
        // side while the open enclosure is being rebuilt. Only after the
        // closed hold begins may it ease to the hidden seated orientation.
        // Every component ultimately returns to the authored seated identity.
        // The battery keeps its readable 180° face through the open
        // reassembly, then turns only during the closed-product hold; using
        // startQ as both ends accidentally made that transition a no-op.
        const seatQ = new THREE.Quaternion();
        const seatT = c.id === 'battery'
          ? smooth((p - T_FINAL) / 0.012)
          : smooth(beatT);
        const reassemblyQ = startQ.clone().slerp(seatQ, seatT);
        g.quaternion.copy(reassemblyQ);
        composedQuaternion = true;
      }
      if (p >= T_RE_START && c.id === 'enclosure') {
        // A deliberate cavity-facing orientation is held through tableau,
        // every insertion beat, and the closed hero. This makes the base
        // genuinely stationary; the lid itself supplies the final exterior
        // read without a late enclosure rotation.
        const tableauSample = samplePartPose(c.id, 1, sticky.clientWidth < 700);
        const tableauQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, motion.baseYaw * Math.PI / 180, 0, 'YXZ')).multiply(tableauSample.quaternion);
        const cavityQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 40 * Math.PI / 180, 0, 'YXZ'));
        const cavityBlend = smooth((p - T_RE_START) / 0.02);
        const cavityPose = tableauQ.clone().slerp(cavityQ, cavityBlend);
        const closure = smooth((p - 0.91) / 0.015);
        const closedQ = cavityQ.clone().slerp(new THREE.Quaternion(), closure);
        g.quaternion.copy(cavityBlend < 1 ? cavityPose : closedQ);
        composedQuaternion = true;
      }
      if (c.id === 'enclosure' && p >= tableauStart && p < T_RE_START) {
        // Carry the final enclosure inspection offset across the short
        // chapter/tableau bridge instead of snapping back to its seat.
        const settleBridge = smooth((p - tableauStart) / Math.max(0.001, T_RE_START - tableauStart));
        x += c.inspect[0] * MM * (1 - settleBridge);
        y += c.inspect[1] * MM * (1 - settleBridge);
        z += c.inspect[2] * MM * (1 - settleBridge);
        // Preserve the final solo orientation while the enclosure transitions
        // into the tableau. This is the orientation counterpart to the
        // carried inspection offset above; both converge smoothly afterward.
        const tableauSample = samplePartPose(c.id, 1, sticky.clientWidth < 700);
        const tableauQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, motion.baseYaw * Math.PI / 180, 0, 'YXZ'));
        g.quaternion.copy(tableauQ).multiply(tableauSample.quaternion);
        composedQuaternion = true;
      }
      g.position.set(seats[c.id].x + x, seats[c.id].y + y, seats[c.id].z + z);
      if (i !== chIdx && !composedQuaternion) g.rotation.set(0, yaw, 0, 'YXZ');
      // Give the true enclosure rim/cavity enough visual weight in the
      // all-parts tableau. Solo and closed-product scales remain unchanged.
      const tableauScale = 1.35;
      if (c.id === 'enclosure' && p >= tableauStart && p < 0.91) {
        // Widen the inspection rim in screen space while preserving its
        // cavity depth/height and the authored insertion seats.
        g.scale.set(p < T_RE_START ? 1.93 : tableauScale, tableauScale, tableauScale);
      } else {
        g.scale.setScalar(1);
      }
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

  function authoritativeSeatedPose() {
    if (!ready || !manifestBounds) return false;
    return PART_IDS.every((id) => {
      const g = groups[id];
      if (!g) return false;
      const m = new THREE.Matrix4().extractRotation(g.matrixWorld);
      const posOk = g.getWorldPosition(V).distanceTo(seats[id]) < 1e-6;
      const rotOk = Math.abs(m.elements[0] - 1) < 1e-6 && Math.abs(m.elements[5] - 1) < 1e-6 && Math.abs(m.elements[10] - 1) < 1e-6;
      const b = new THREE.Box3().setFromObject(meshNodes[id]);
      const eb = manifestBounds[id]?.worldBoundsMm;
      const boundsOk = eb && b.min.distanceTo(new THREE.Vector3(...eb.lo.map((v) => v * MM))) < 1e-5 && b.max.distanceTo(new THREE.Vector3(...eb.hi.map((v) => v * MM))) < 1e-5;
      return posOk && rotOk && boundsOk;
    });
  }

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

  let leaderC0Cache = null;
  function updateLeaders(activeKey) {
    const mobile = sticky.clientWidth < 700;
    // Portrait copy is intentionally stacked below the product. Hiding the
    // desktop annotation layer keeps that layout clean instead of drawing a
    // misleading V through the LEDs or down to the viewport edge.
    leadersSvg.style.display = mobile ? 'none' : '';
    if (mobile) {
      while (leadersSvg.firstChild) leadersSvg.removeChild(leadersSvg.firstChild);
      leaderC0Cache = null;
      return;
    }
    const boundaryNear = CHAPTERS.slice(1).some((_, i) => Math.abs(lastProgress - (T_CH_START + (i + 1) * CH_W)) < 0.003);
    if (boundaryNear && leaderC0Cache?.key === activeKey) {
      leadersSvg.innerHTML = leaderC0Cache.svg;
      return;
    }
    while (leadersSvg.firstChild) leadersSvg.removeChild(leadersSvg.firstChild);
    if (!activeKey) { if (!boundaryNear) leaderC0Cache = null; return; }
    const pts = projectedAnchors();
    const pt = pts[activeKey];
    if (!pt || !pt.inside) return;
    const el = callouts[activeKey];
    const cr = el.getBoundingClientRect();
    const sr = sticky.getBoundingClientRect();
    const isRight = el.classList.contains('is-right');
    const sx = mobile
      ? cr.left - sr.left + cr.width / 2
      : (isRight ? cr.left - sr.left : cr.right - sr.left);
    // The leader starts on the nearest copy edge. On desktop it uses the
    // vertical midpoint of the copy; on portrait layouts the copy sits below
    // the product, so the line begins at its top edge.
    const copyTop = cr.top - sr.top;
    const sy = copyTop;
    const sil = silhouettePx(keyToId(activeKey));
    if (!sil) return;
    // Use one deliberate elbow outside the real silhouette, then a single
    // terminal segment to the mesh anchor. Keeping the route to two segments
    // avoids the old disconnected-looking lines that ran off-stage.
    const stageW = sticky.clientWidth;
    const stageH = sticky.clientHeight;
    let routeX;
    let routeY;
    let routePoints;
    if (mobile) {
      // The copy is below the product in portrait. For the LED pair, use the
      // open gap between the two lamps instead of sending a leader around the
      // whole viewport; this keeps the annotation visually attached and lets
      // the final segment identify the selected lamp.
      const clearY = Math.max(8, copyTop - 18);
      const isLedPair = keyToId(activeKey) === 'led_pair';
      if (isLedPair) {
        const centerX = sil.x + sil.w * 0.5;
        // Approach from the side of the center gap opposite the selected LED.
        routeX = pt.x >= centerX ? centerX - 16 : centerX + 16;
        routeX = Math.max(8, Math.min(stageW - 8, routeX));
        routeY = Math.min(stageH - 18, Math.max(clearY, sil.y + sil.h * 0.58));
        routePoints = [[sx, sy], [sx, clearY], [routeX, clearY], [routeX, routeY]];
      } else {
        routeX = sx <= sil.x + sil.w * 0.5 ? sil.x - 18 : sil.x + sil.w + 18;
        routeX = Math.max(8, Math.min(stageW - 8, routeX));
        routeY = Math.min(stageH - 18, Math.max(clearY, sil.y + sil.h + 18));
        routePoints = [[sx, sy], [sx, clearY], [routeX, clearY], [routeX, routeY]];
      }
    } else {
      // Run from the copy's top edge to the outside-side elbow, then rise
      // above the silhouette before the short terminal segment. Keeping the
      // first leg visible makes the annotation unmistakably attached.
      routeX = isRight ? sil.x + sil.w + 18 : sil.x - 18;
      routeY = Math.min(sy - 1, sil.y - 18);
      routeX = Math.max(8, Math.min(stageW - 8, routeX));
      routeY = Math.max(8, Math.min(stageH - 8, routeY));
      routePoints = [[sx, sy], [routeX, sy], [routeX, routeY]];
    }
    const ns = 'http://www.w3.org/2000/svg';
    const route = document.createElementNS(ns, 'polyline');
    const terminalX = routeX;
    const terminalY = routeY;
    route.setAttribute('points', routePoints.map(([x, y]) => `${x},${y}`).join(' '));
    // Keep the open leader path from inheriting SVG's default black fill.
    // Otherwise Chromium closes the polyline visually and paints a large
    // triangular wedge over the assembly and copy.
    route.setAttribute('fill', 'none');
    route.setAttribute('stroke', '#0b7f47');
    route.setAttribute('stroke-width', '1');
    leadersSvg.appendChild(route);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', terminalX); line.setAttribute('y1', terminalY);
    line.setAttribute('x2', pt.x); line.setAttribute('y2', pt.y);
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); dot.setAttribute('r', 3);
    leadersSvg.appendChild(line);
    leadersSvg.appendChild(dot);
    if (boundaryNear) leaderC0Cache = { key: activeKey, svg: leadersSvg.innerHTML };
    else leaderC0Cache = null;
  }

  function activeCalloutKey(p) {
    const i = chapterAt(p);
    const chapterEnd = T_CH_START + CHAPTERS.length * CH_W;
    // Keep the final solo label alive for a short, real crossfade as the
    // inspection ends and the copy clears for the exploded tableau.
    if (i < 0 && p >= chapterEnd && p < T_COPY_CLEAR) return CHAPTERS[CHAPTERS.length - 1].key;
    if (i < 0) return null;
    const t = chapterT(p, i);
    const c = CHAPTERS[i];
    // Keep the outgoing label/leader through the first part of the handoff so
    // the copy cannot blink out while the next component becomes visible.
    if (i > 0) {
      // Ownership follows the dominant visual subject. Battery and LEDs enter
      // before the outgoing part has fully faded; keeping the old label/leader
      // until 18% made the copy disagree with the visible component at the
      // exact transition samples.
      const ownershipT = (c.id === 'battery' || c.id === 'led_pair') ? 0.10 : 0.18;
      if (t < ownershipT) return CHAPTERS[i - 1].key;
    }
    // Non-final chapter copy stays present through its complete local window;
    // the next chapter owns the actual crossfade. This keeps the leader and
    // label state continuous at the exact solo boundary.
    return CHAPTERS[i].key;
  }

  const SUN_OFF = new THREE.Vector3(0.3, 0.9, 0.4);
  function applyDim(p) {
    const blend = chapterBlend(p);
    const activeId = blend.id || null;
    const exteriorOnly = p < T_EXPLODE[0] || p >= T_FINAL;
    const exteriorParts = new Set(['enclosure', 'solar_lid', 'led_pair', 'switch']);
    CHAPTERS.forEach((c) => {
      const hiddenInterior = exteriorOnly && !exteriorParts.has(c.id);
      let dim = hiddenInterior ? 0 : 1;
      if (!hiddenInterior && blend.id) {
        if (c.id === activeId) {
          // Never leave a blank frame at the PCB→LED handoff: the incoming
          // optical pair gets a visible floor opacity while the board fades.
          // Let the battery and optical pair become materially opaque before
          // their readable hold. At the dense handoff probes this prevents
          // translucent duplicate labels and keeps the incoming part legible
          // while the outgoing mesh is already yielding.
          const handoffFloor = c.id === 'led_pair' ? 0.56 : (c.id === 'battery' ? 0.72 : 0.14);
          dim = Math.max(handoffFloor, blend.handoff || blend.w);
        }
        else if (c.id === blend.prevId && blend.handoff < 1) {
          // Crossfade the outgoing solar panel promptly so its cropped edge
          // cannot linger above the readable battery face. The active part
          // remains visible for the full direct handoff.
          const outgoingFade = activeId === 'battery'
            ? smooth(blend.handoff / 0.22)
            : (activeId === 'led_pair' ? smooth((blend.handoff - 0.05) / 0.72) : blend.handoff);
          dim = Math.max(0, 1 - outgoingFade);
        }
        else dim = 0;
      }
      // Fully faded handoff subjects should leave the render list as well as
      // losing opacity. This prevents a solar-lid remnant from lingering in
      // the battery frame and keeps transition bounds honest.
      groups[c.id].userData.dim = dim;
      groups[c.id].visible = dim > 0.02 || c.id === activeId;
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
      let alpha = 0;
      if (chapterIndex === i) {
        const t = chapterT(p, i);
        alpha = i === CHAPTERS.length - 1 && t > 0.85 ? 1 - smooth((t - 0.85) / 0.15) : (i === 0 ? 1 : smooth(t / 0.18));
      } else if (chapterIndex === i + 1) {
        const t = chapterT(p, chapterIndex);
        alpha = 1 - smooth(t / 0.18);
      } else if (i === CHAPTERS.length - 1 && p >= T_CH_START + CHAPTERS.length * CH_W) {
        const chapterEnd = T_CH_START + CHAPTERS.length * CH_W;
        alpha = 1 - smooth((p - chapterEnd) / Math.max(0.001, T_COPY_CLEAR - chapterEnd));
      }
      el.style.opacity = alpha.toFixed(3);
      // Opacity can lag a compositor screenshot by one frame during the
      // tableau handoff; visibility makes the no-copy tableau state
      // deterministic without changing the continuous fade itself.
      el.style.visibility = alpha > 0.001 ? 'visible' : 'hidden';
      el.classList.toggle('is-active', alpha > 0.32);
    });
    introCopy.classList.toggle('is-hidden', p > 0.085);
    const closedGeometry = authoritativeSeatedPose();
    const markerActive = p >= T_MARKER && closedGeometry;
    finalMark.classList.toggle('is-active', markerActive);
    updateLeaders(activeKey);
    frameStats = {
      progress: p,
      activeCallout: activeKey,
      stage: { w: sticky.clientWidth, h: sticky.clientHeight },
      pane: { x: pane.x, y: pane.y, w: pane.w, h: pane.h },
      silhouette: activeKey ? silhouettePx(keyToId(activeKey)) : null,
      allSilhouette: silhouettePx('all'),
      enclosureSilhouette: silhouettePx('enclosure'),
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
      markerActive,
      closedGeometry,
      renderMetrics: { triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls },
      calloutBox: activeKey ? (() => { const r = callouts[activeKey].getBoundingClientRect(), s = sticky.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; })() : null,
      // Keep handoff coverage observable: the active callout can intentionally
      // remain on the outgoing label while the incoming subject is already
      // entering. A per-part projection prevents blank-stage regressions from
      // hiding behind that editorial label state.
      visibleSilhouettes: Object.fromEntries(PART_IDS.filter((id) => groups[id]?.visible).map((id) => [id, silhouettePx(id)])),
      partOpacity: Object.fromEntries(CHAPTERS.map((c) => [c.key, +(groups[c.id]?.userData?.dim ?? 0).toFixed(3)])),
      leaderSegments: (() => {
        const out = [];
        leadersSvg.querySelectorAll('polyline,line').forEach((el) => {
          const attrs = el.tagName.toLowerCase() === 'polyline' ? el.getAttribute('points') : `${el.getAttribute('x1')},${el.getAttribute('y1')} ${el.getAttribute('x2')},${el.getAttribute('y2')}`;
          if (attrs) out.push(attrs);
        });
        return out;
      })(),
      pose: Object.fromEntries(PART_IDS.map((id) => [id, {
        position: groups[id].position.toArray().map((v) => +v.toFixed(6)),
        rotation: groups[id].rotation.toArray().slice(0, 3).map((v) => +v.toFixed(5)),
        visible: groups[id].visible,
        ...(id === 'switch' ? { actuator: switchActuatorNode ? {
          position: switchActuatorNode.position.toArray().map((v) => +v.toFixed(6)),
          rotation: switchActuatorNode.rotation.toArray().slice(0, 3).map((v) => +v.toFixed(5)),
        } : null } : {}),
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
      return authoritativeSeatedPose();
    },
    parts: () => Object.keys(groups),
  };

  requestRender(true);
}

const section = document.querySelector('[data-assembly-sequence]');
if (section) init(section);

export default { init };
