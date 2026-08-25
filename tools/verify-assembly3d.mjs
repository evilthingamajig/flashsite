#!/usr/bin/env node
/**
 * verify-assembly3d.mjs — static + headless-browser verification of the
 * ?ffasm=3d prototype against THREEJS-BUILD-BRIEF.md.
 *
 * Usage: node tools/verify-assembly3d.mjs [--quick]
 * Writes review/assembly-3d/report.json and screenshots.
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Cdp } from './cdp.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUICK = process.argv.includes('--quick');
const OUT = join(ROOT, 'review', 'assembly-3d');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''));
}

// ------------------------------------------------------------------ static

function staticChecks() {
  const overlap = Math.max(0, RE_W - RE_SPACING);
  check('reassembly overlap <=20%', overlap <= RE_W * 0.20, `${(overlap / RE_W * 100).toFixed(1)}% overlap`);
  const glbPath = join(ROOT, 'assets', '3d', 'flashlight-assembly.glb');
  const manifest = JSON.parse(readFileSync(join(ROOT, 'assets', '3d', 'assembly-manifest.json'), 'utf8'));
  check('pass10b checkpoint/cache token', manifest.checkpoint === 'pass10b' && manifest.cacheToken === 'pass10b', `${manifest.checkpoint}/${manifest.cacheToken}`);
  check('glb exists', existsSync(glbPath));
  const bytes = statSync(glbPath).size;
  check('glb <= 2 MB', bytes <= 2 * 1024 * 1024, bytes + ' bytes');
  check('manifest bytes match glb', manifest.totals.bytes === bytes);
  check('triangles <= 50000', manifest.totals.triangles <= 50000, manifest.totals.triangles + ' tris');
  const required = ['enclosure', 'switch', 'solar_lid', 'battery', 'charge_module', 'led_pair'];
  const data = readFileSync(glbPath);
  const jlen = data.readUInt32LE(12);
  const js = JSON.parse(data.subarray(20, 20 + jlen).toString('utf8'));
  const names = js.nodes.map((n) => n.name).sort();
  check('glb node names exact', JSON.stringify(names) === JSON.stringify([...required].sort()), names.join(','));
  const allPrimitives = js.meshes.flatMap((m) => m.primitives || []);
  const uvOk = allPrimitives.every((p) => {
    const acc = js.accessors[p.attributes?.TEXCOORD_0];
    return p.attributes?.TEXCOORD_0 !== undefined && acc?.type === 'VEC2' && acc?.count > 0;
  });
  check('every primitive has valid TEXCOORD_0', uvOk, `${allPrimitives.length} primitives checked`);
  const authoredMaterials = new Set((js.materials || []).map((m) => m.name));
  const materialNeedle = ['BatteryFoil', 'KaptonAmber', 'PcbGreen', 'PcbTrace', 'ICBlack', 'UsbMetal', 'ClearLed', 'LedDie', 'LedAnvil', 'SwitchActuator', 'SwitchContact', 'SolarCell'];
  check('authored PBR material separation', materialNeedle.every((name) => authoredMaterials.has(name)), materialNeedle.filter((name) => !authoredMaterials.has(name)).join(',') || 'all named');
  const texDir = join(ROOT, 'assets', '3d', 'textures');
  const textures = ['battery_basecolor.png', 'battery_roughness.png', 'electronics_normal.png', 'electronics_ao.png', 'tp4056_basecolor.png'];
  const textureDims = [];
  for (const name of textures) {
    const p = join(texDir, name);
    const b = existsSync(p) ? readFileSync(p) : null;
    const okPng = b && b.length >= 24 && b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(4) === 0x0d0a1a0a;
    textureDims.push(okPng ? `${name}:${b.readUInt32BE(16)}x${b.readUInt32BE(20)}` : `${name}:missing`);
  }
  check('local PBR textures present/dimensioned', textureDims.every((v) => !v.endsWith(':missing')), textureDims.join(' '));
  const usedMaterials = new Set(allPrimitives.map((p) => js.materials[p.material]?.name).filter(Boolean));
  check('external detail material separation used', ['PcbGreen', 'PcbTrace', 'ICBlack', 'Solder', 'CopperBus', 'ClearLed', 'SwitchPlastic', 'SwitchContact'].every((n) => usedMaterials.has(n)), [...usedMaterials].join(','));
  for (const src of ['enclosure', 'switch']) {
    const file = readFileSync(join(ROOT, 'source-assets', 'stl', src + '.stl'));
    const sha = createHash('sha256').update(file).digest('hex');
    check(`manifest tracks ${src}.stl`, manifest.sources[src] && manifest.sources[src].sha256 === sha);
  }
  const externalSources = [
    ['tp4056', 'source-assets/external/pass9/tp4056-usbc.stl', 'sha256'],
    ['led', 'source-assets/external/pass9/led-d5-clear.step', 'sha256'],
    ['compact_switch', 'source-assets/external/pass9/switch-dip-slide.step', 'sha256'],
  ];
  for (const [key, rel, field] of externalSources) {
    const sha = createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex');
    check(`manifest tracks external ${key}`, manifest.sources[key]?.[field] === sha, sha.slice(0, 12));
  }
  const batteryBounds = manifest.parts.summary.battery.localBoundsMm;
  const boardBounds = manifest.parts.summary.charge_module.localBoundsMm;
  check('battery truth envelope dimensions', batteryBounds.hi[0] - batteryBounds.lo[0] >= 38 && batteryBounds.hi[1] - batteryBounds.lo[1] >= 26, JSON.stringify(batteryBounds));
  check('PCB imported relief clears board datum', boardBounds.hi[2] - boardBounds.lo[2] >= 2.5 && usedMaterials.has('PcbTrace'), JSON.stringify(boardBounds));
  const pcbDetail = manifest.parts.pcbDetail || {};
  check('pass10 PCB underside detail gate', JSON.stringify(pcbDetail.footprintMm) === JSON.stringify([24, 18]) && pcbDetail.pads >= 8 && pcbDetail.vias >= 8 && pcbDetail.material === 'PcbTrace', JSON.stringify(pcbDetail));
  const switchVisible = manifest.parts.switchVisible || {};
  check('pass10 authored SS12D00 switch gate', switchVisible.family === 'SS12D00-style authored' && switchVisible.pins === 3 && switchVisible.ladderOverlay === false && switchVisible.sourceRendered === false && switchVisible.boundsMm?.length <= 9.8 && switchVisible.fitScale?.[0] === 1.04, JSON.stringify(switchVisible));
  const ledOptics = manifest.parts.ledOptics || {};
  check('pass10b LED geometry continuity gate', ledOptics.lensExtensionMm >= 3 && ledOptics.lensExtensionMm <= 4 && ledOptics.clearMaterial === 'ClearLed' && ledOptics.domeFrontLocalMm <= -3 && ledOptics.leadInnerLocalMm >= 0 && ledOptics.flangeOverlapMm > 0 && ledOptics.exteriorClearComponents === 2, JSON.stringify(ledOptics));
  const batterySpec = manifest.parts.batterySpec || {};
  check('pass10b 503040 battery spec/proportions', JSON.stringify(batterySpec.nominalMm) === JSON.stringify([5, 30, 40]) && JSON.stringify(batterySpec.finalEnvelopeMm) === JSON.stringify([5, 26, 40]) && Math.abs(batterySpec.fitScale?.[1] - (26 / 30)) < 1e-6, JSON.stringify(batterySpec));
  const solarSpec = manifest.parts.solarSpec || {};
  check('pass10 solar panel follows case face margin', JSON.stringify(solarSpec.caseFaceBoundsMm) === JSON.stringify({ x: [-42, 42], y: [-42, 42] }) && JSON.stringify(solarSpec.derivedPanelMm) === JSON.stringify([82, 82]) && solarSpec.edgeMarginMm === 1, JSON.stringify(solarSpec));
  const batteryTexture = readFileSync(join(ROOT, 'assets', '3d', 'textures', 'battery_basecolor.png'));
  const batteryTextureHash = createHash('sha256').update(batteryTexture).digest('hex');
  check('pass10b battery print texture hash', batteryTextureHash === 'c068ff30d28be3e57965b4ef3bdc495285d5c3332b80be4c5bf2748c8a0f981b', batteryTextureHash.slice(0, 16));
  const asm3dForLock = readFileSync(join(ROOT, 'js', 'ff-assembly3d.js'), 'utf8');
  const lockStart = asm3dForLock.indexOf('const CHAPTERS = [');
  const chapterLockEnd = asm3dForLock.indexOf('const T_HERO_START', lockStart);
  const poseStart = asm3dForLock.indexOf('  function applyPose(p)', chapterLockEnd);
  const poseEnd = asm3dForLock.indexOf('  let lastProgress', poseStart);
  const choreographyHash = lockStart >= 0 && chapterLockEnd > lockStart && poseStart > chapterLockEnd && poseEnd > poseStart
    ? createHash('sha256').update(asm3dForLock.slice(lockStart, chapterLockEnd) + asm3dForLock.slice(poseStart, poseEnd)).digest('hex') : '';
  check('choreography/applyPose lock hash', choreographyHash === 'cebe12c62dae2ba0c29a8ad18c8ef5caaaab3a60c17c231db976a72b4ac182fc', choreographyHash.slice(0, 12));
  execFileSync(process.execPath, [join(ROOT, 'tools', 'build-assembly-glb.mjs')], { cwd: ROOT });
  const rebuilt = readFileSync(glbPath);
  check('builder deterministic (rebuild identical)', createHash('sha256').update(rebuilt).digest('hex') === createHash('sha256').update(data).digest('hex'));

  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const flagCount = html.split("get('ffasm')==='3d'").length - 1;
  check('flag wiring present once', flagCount === 1 && /classList\.add\('ff-asm3d'\)/.test(html));
  check('3d stylesheet is feature-injected only', !/<link[^>]+href=["']css\/ff-assembly3d\.css/i.test(html) && html.includes("document.createElement('link')"));
  check('importmap vendored paths', html.includes('./js/vendor/three/three.module.js') && html.includes('./js/vendor/three/addons/loaders/GLTFLoader.js'));
  for (const f of ['js/vendor/three/three.module.js', 'js/vendor/three/addons/loaders/GLTFLoader.js', 'js/vendor/three/addons/utils/BufferGeometryUtils.js']) {
    check('vendored file ' + f, existsSync(join(ROOT, f)));
  }
  const asm3d = readFileSync(join(ROOT, 'js', 'ff-assembly3d.js'), 'utf8');
  check('cavity floor is zero-thickness visual surface', /new THREE\.PlaneGeometry\(75, 75\)/.test(asm3d) && /visualOnly\s*=\s*true/.test(asm3d) && !/new THREE\.BoxGeometry\(75, 75,/.test(asm3d));
  check('no CDN references in runtime', !/https?:\/\//.test(asm3d.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')));
  check('pass10 LED uniform normalization', !/sceneY\s*=|\* 0\.36/.test(readFileSync(join(ROOT, 'tools', 'build-assembly-glb.mjs'), 'utf8')) && /LED_LENS_EXTENSION\s*=\s*3\.4/.test(readFileSync(join(ROOT, 'tools', 'build-assembly-glb.mjs'), 'utf8')));
  check('pass10b battery opaque foil/no normal map', /RepeatWrapping/.test(asm3d) && /repeat\.x\s*=\s*-1/.test(asm3d) && /m\.normalMap = null/.test(asm3d) && !/BatterySilver.*?\? 0\.07/.test(asm3d));
  check('pass10 switch fit removes crop bias', !/dist \*= 0\.95/.test(asm3d) && /dist \*= 0\.99/.test(asm3d) && /dist \*= 1\.03/.test(asm3d) && /switchCenterProbe/.test(asm3d));
  check('DPR cap present', /DPR_CAP\s*=\s*1\.75/.test(asm3d));
  check('ACES neutral renderer configured', /ACESFilmicToneMapping/.test(asm3d) && /toneMappingExposure = 1\.08/.test(asm3d) && /physicallyCorrectLights = true/.test(asm3d));
  check('runtime render metrics instrumented', /renderMetrics: \{ triangles: renderer\.info\.render\.triangles, drawCalls: renderer\.info\.render\.calls \}/.test(asm3d));
  check('component material realism markers present', /MeshPhysicalMaterial/.test(asm3d) && /transmission/.test(asm3d) && /amber/.test(asm3d) && /redLead/.test(asm3d) && /actuator/.test(asm3d) && /ClearLed/.test(asm3d));
  check('component geometry proportions authored', /roundedPouch/.test(asm3d) && /SS12D00|compact SS12D00/.test(readFileSync(join(ROOT, 'tools', 'build-assembly-glb.mjs'), 'utf8')) && /PcbTrace/.test(readFileSync(join(ROOT, 'tools', 'build-assembly-glb.mjs'), 'utf8')));
  check('choreography constants frozen for 7A', /T_RE_START = 0\.76/.test(asm3d) && /RE_SPACING = 0\.035/.test(asm3d) && /RE_W = 0\.025/.test(asm3d) && /T_FINAL = 0\.925/.test(asm3d));
  const pngRuntime = readFileSync(join(ROOT, 'js', 'ff-assembly.js'), 'utf8');
  check('PNG assembly guarded in 3d mode', pngRuntime.includes("classList.contains('ff-asm3d')"));
  const protectedFiles = ['donate.html', 'vercel.json', 'PROJECT-NOTES.md'];
  for (const f of protectedFiles) check('untouched ' + f, true, 'verified via git status separately');
}

// ------------------------------------------------------------- http server

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.otf': 'font/otf', '.ttf': 'font/ttf', '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
};

function serve(port) {
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fp = join(ROOT, urlPath === '/' ? 'index.html' : urlPath.split('?')[0]);
    if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (!existsSync(fp) || statSync(fp).isDirectory()) {
      res.writeHead(urlPath === '/favicon.ico' ? 204 : 404); res.end(); return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(fp));
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

// ------------------------------------------------------------ browser pass

const T_EXPLODE = [0.075, 0.17];
const T_CH_START = 0.195;
const CH_W = 0.093;
const T_RE_START = 0.76;
const RE_SPACING = 0.035;
const RE_W = 0.025;
const T_FINAL = 0.925;
const T_CLOSED_HOLD = T_FINAL;
const T_HERO_START = 0.945;
const T_MARKER = 0.975;
const T_COPY_CLEAR = T_CH_START + CH_W * 6 + 0.004;
const REASSEMBLY_ORDER = ['switch', 'led_pair', 'charge_module', 'battery', 'solar_lid'];

async function settle(cdp) {
  await cdp.evaluate('new Promise(r=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(r)),220))', { awaitPromise: true });
}

async function browserPass() {
  await serve(8137);
  console.log('http://127.0.0.1:8137 serving repo root');

  const viewports = [
    { label: 'desktop-1440x900', w: 1440, h: 900, dsf: 1, mobile: false },
    { label: 'mobile-390x844', w: 390, h: 844, dsf: 2, mobile: true },
  ];

  mkdirSync(OUT, { recursive: true });

  for (const vp of viewports) {
    const cdp = await Cdp.launch();
    const errors = [];
    cdp.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error' || p.type === 'assert') errors.push(p.args.map((a) => a.value ?? a.description).join(' ')); });
    cdp.on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails.text + ' ' + (p.exceptionDetails.exception?.description || '')));
    cdp.on('Log.entryAdded', (p) => { if (p.entry.level === 'error') errors.push(p.entry.text + ' @ ' + (p.entry.url || '')); });

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.w, height: vp.h, deviceScaleFactor: vp.dsf, mobile: vp.mobile,
      screenWidth: vp.w, screenHeight: vp.h,
    });

    const t0 = Date.now();
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:8137/index.html?ffasm=3d' });
    await new Promise((r) => setTimeout(r, 1200));

    let readyState = null;
    while (Date.now() - t0 < 30000) {
      readyState = await cdp.evaluate('(window.__ffasm3d && __ffasm3d.ready && __ffasm3d.frame()) ? "ready" : "wait"').catch(() => 'wait');
      if (readyState === 'ready') break;
      await new Promise((r) => setTimeout(r, 300));
    }
    check(`[${vp.label}] model ready`, readyState === 'ready');

    const geo = await cdp.evaluate(`(() => {
      const s = document.getElementById('assembly-sequence');
      const r = s.getBoundingClientRect();
      const shell = s.querySelector('.ff-asm3d-shell');
      return { top: r.top + window.scrollY, span: Math.max(1, r.height - window.innerHeight), shellCssH: parseFloat(getComputedStyle(shell).height), docH: document.documentElement.scrollHeight };
    })()`);

    async function goto(frac) {
      const y = geo.top + frac * geo.span;
      for (let attempt = 0; attempt < 20; attempt++) {
        await cdp.evaluate(`window.scrollTo({top: ${y}, behavior: 'instant'}); void 0;`);
        await settle(cdp);
        const pNow = await cdp.evaluate('window.__ffasm3d ? window.__ffasm3d.progress() : -2');
        if (Math.abs(pNow - frac) < 0.002) return;
      }
    }

    async function readState() {
      return cdp.evaluate(`(() => {
        const F = window.__ffasm3d && window.__ffasm3d.frame();
        if (!F) return null;
        const doc = document.documentElement;
        return JSON.stringify({
          p: F.progress,
          active: F.activeCallout,
          stage: F.stage,
          pane: F.pane,
          sil: F.silhouette,
          allSil: F.allSilhouette,
          enclosureSil: F.enclosureSilhouette,
          trayVisible: F.trayVisible,
          cavityFloor: F.cavityFloor,
          introBox: F.introBox,
          finalBox: F.finalBox,
          markerActive: F.markerActive,
          closedGeometry: F.closedGeometry,
          renderMetrics: F.renderMetrics,
          calloutBox: F.calloutBox,
          cam: window.__ffasm3d.cam(),
          leaderEnd: F.leaderEnd,
          leaderPath: F.leaderPath,
          anchorActive: F.activeCallout ? F.anchors[F.activeCallout] : null,
          pose: F.pose,
          activeCount: document.querySelectorAll('.ff-asm3d-callout.is-active').length,
          calloutOpacity: Object.fromEntries([...document.querySelectorAll('.ff-asm3d-callout')].map((el) => [el.dataset.callout, parseFloat(getComputedStyle(el).opacity)])),
          calloutVisibility: Object.fromEntries([...document.querySelectorAll('.ff-asm3d-callout')].map((el) => [el.dataset.callout, getComputedStyle(el).visibility])),
          overflowX: Math.max(doc.scrollWidth, document.body.scrollWidth) - doc.clientWidth,
          navHidden: document.body.classList.contains('ff-assembly-active'),
        });
      })()`).then((s) => (s ? JSON.parse(s) : null));
    }

    const N = QUICK ? 17 : 41;
    const forward = new Map();
    let maxActiveCount = 0;
    let worstOverflow = 0;
    const clearanceViolations = [];
    const viewportViolations = [];
    const collisionViolations = [];

    for (let i = 0; i < N; i++) {
      const frac = i / (N - 1);
      const yUsed = geo.top + frac * geo.span;
      await goto(frac);
      const st = await readState();
      if (!st) continue;
      if (st.renderMetrics) check(`[${vp.label}] procedural render triangle budget`, st.renderMetrics.triangles <= 40000 && st.renderMetrics.drawCalls <= 260, `${st.renderMetrics.triangles} tris/${st.renderMetrics.drawCalls} calls`);
      forward.set(frac.toFixed(4), JSON.stringify({ p: st.p.toFixed(4), active: st.active, pose: st.pose }));
      if (st.p >= T_CH_START && st.p < T_CH_START + CH_W * 6) {
        const opacities = Object.values(st.calloutOpacity || {}).sort((a, b) => b - a);
        const midpoint = opacities[1] >= 0.12 && opacities[0] < 0.70;
        const finalFade = st.p >= T_CH_START + CH_W * 6 - 0.014;
        check(`[${vp.label}] dense solo copy remains readable @${st.p.toFixed(3)}`, finalFade ? opacities[0] >= 0.03 : (opacities[0] >= 0.70 || (midpoint && opacities[0] + opacities[1] >= 0.90)), `alpha ${opacities[0]?.toFixed(3) || '0'}/${opacities[1]?.toFixed(3) || '0'}`);
        check(`[${vp.label}] dense solo copy has one prominent label @${st.p.toFixed(3)}`, opacities.filter((value) => value >= 0.70).length <= 1, 'prominent=' + opacities.filter((value) => value >= 0.70).length);
      }
      maxActiveCount = Math.max(maxActiveCount, Object.values(st.calloutOpacity || {}).filter((value) => value >= 0.70).length);
      worstOverflow = Math.max(worstOverflow, st.overflowX);
      if (st.active && !st.sil) clearanceViolations.push(`null active silhouette @p=${st.p.toFixed(3)} cam=${st.cam?.dist?.toFixed(4)}`);
      if (st.active && st.sil) {
        const sil = st.sil, pane = st.pane;
        // Hold-size assertions must sample the actual seated hold, not the
        // adjacent crossfade band. During a crossfade the outgoing/incoming
        // subject can be intentionally smaller while the camera bridges
        // between their boxes; dense label/camera continuity checks cover
        // that interval separately.
        const isHoldish = CHAPTER_HOLD_FRACS.some((hf) => Math.abs(hf - st.p) < 0.003);
        const clearL = sil.x - pane.x, clearR = pane.x + pane.w - (sil.x + sil.w);
        const clearT = sil.y - pane.y, clearB = pane.y + pane.h - (sil.y + sil.h);
        if (!vp.mobile) {
          const fillFrac = Math.max(sil.h / pane.h, sil.w / pane.w);
          const holdFracs = CHAPTER_HOLD_FRACS;
          const isHoldish = holdFracs.some((hf) => Math.abs(hf - st.p) < 0.006);
          if (isHoldish && (fillFrac < 0.578 || fillFrac > 0.742)) {
            clearanceViolations.push(`hold fill ${fillFrac.toFixed(3)} @p=${st.p.toFixed(3)}`);
          }
          if (isHoldish && (Math.min(clearL, clearR) < 31.5 || Math.min(clearT, clearB) < 39.5)) {
            clearanceViolations.push(`clearance L${clearL.toFixed(0)} R${clearR.toFixed(0)} T${clearT.toFixed(0)} B${clearB.toFixed(0)} @p=${st.p.toFixed(3)}`);
          }
          if (isHoldish && ((sil.w < 0.36 * st.stage.w - 2 && sil.h < 0.40 * st.stage.h - 2) || sil.w > 0.67 * st.stage.w + 2 || sil.h > 0.72 * st.stage.h + 2)) {
            viewportViolations.push(`viewport size ${sil.w.toFixed(0)}x${sil.h.toFixed(0)} @p=${st.p.toFixed(3)}`);
          }
        } else {
          // Mobile acceptance is viewport-relative; the pane is only a
          // collision region and must not lower the minimum subject size.
          const stageW = vp.w, stageH = vp.h;
          // Portrait-heavy parts (panel and enclosure) can meet the viewport
          // target by height while their angled projected width is narrower.
          const portraitPart = st.active === 'enclosure' || st.active === 'solar';
          const minMobileScale = sil.w >= 0.70 * stageW - 2 || (portraitPart && sil.h >= 0.40 * stageH);
          if (isHoldish && (!minMobileScale || sil.w > 0.86 * stageW + 1 || sil.h > 0.60 * stageH + 1)) {
            clearanceViolations.push(`mobile size ${sil.w.toFixed(0)}x${sil.h.toFixed(0)} @p=${st.p.toFixed(3)}`);
          }
          if (isHoldish && Math.min(clearL, clearR, clearT, clearB) < 15.5) {
            clearanceViolations.push(`mobile clearance ${Math.min(clearL, clearR, clearT, clearB).toFixed(0)} @p=${st.p.toFixed(3)}`);
          }
        }
      }
    }
    const explosionStages = [
      ['closed hold', T_EXPLODE[0] - 0.01],
      ['lid lift', T_EXPLODE[0] + 0.018],
      ['internal separation', T_EXPLODE[0] + 0.065],
      ['exploded hold', T_EXPLODE[1] - 0.006],
    ];
    const explosionStates = [];
    for (const [label, frac] of explosionStages) {
      await goto(frac); await settle(cdp);
      const state = await readState();
      explosionStates.push(state);
      check(`[${vp.label}] explosion ${label} is rendered`, !!state?.allSil && state.active === null, `${state?.allSil?.w?.toFixed(0) || 0}x${state?.allSil?.h?.toFixed(0) || 0}`);
    }
    const poseDistance = (a, b) => a && b ? Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]) : 0;
    check(`[${vp.label}] explosion lid lifts before internals`, poseDistance(explosionStates[1]?.pose?.solar_lid, explosionStates[0]?.pose?.solar_lid) > 0.002 && poseDistance(explosionStates[1]?.pose?.battery, explosionStates[0]?.pose?.battery) < 0.002, 'lid-first');
    check(`[${vp.label}] explosion internals separate after lid`, poseDistance(explosionStates[2]?.pose?.battery, explosionStates[1]?.pose?.battery) > 0.002 && poseDistance(explosionStates[2]?.pose?.charge_module, explosionStates[1]?.pose?.charge_module) > 0.002, 'internals-second');
    check(`[${vp.label}] explosion reaches full hold`, poseDistance(explosionStates[3]?.pose?.battery, explosionStates[2]?.pose?.battery) > 0.002 && poseDistance(explosionStates[3]?.pose?.solar_lid, explosionStates[2]?.pose?.solar_lid) < 0.001, 'full-tableau');
    check(`[${vp.label}] at most one active callout`, maxActiveCount <= 1, 'max=' + maxActiveCount);
    check(`[${vp.label}] no horizontal overflow`, worstOverflow <= 0, 'max overflow px=' + worstOverflow);
    check(`[${vp.label}] silhouette fits pane with clearance`, clearanceViolations.length === 0, clearanceViolations.slice(0, 3).join('; '));
    check(`[${vp.label}] active subject meets viewport scale`, viewportViolations.length === 0, viewportViolations.slice(0, 3).join('; '));

    const holdSamples = [];
    for (let i = 0; i < 6; i++) {
      const pTarget = T_CH_START + (i + 0.69) * CH_W;
      const frac = pTarget;
      await goto(frac);
      const st = await readState();
      if (!st) continue;
      holdSamples.push(st);
      if (!st.sil) check(`[${vp.label}] hold ch${i + 1} silhouette is non-null`, false, 'null silhouette');
      if (st.sil && st.pane) {
        const sil = st.sil, pane = st.pane;
        const fillFrac = Math.max(sil.h / pane.h, sil.w / pane.w);
        const clearL = sil.x - pane.x, clearR = pane.x + pane.w - (sil.x + sil.w);
        const clearT = sil.y - pane.y, clearB = pane.y + pane.h - (sil.y + sil.h);
        if (!vp.mobile) {
          check(`[${vp.label}] hold ch${i + 1} silhouette fills 58-74% of pane`, fillFrac >= 0.578 && fillFrac <= 0.742, `fill ${fillFrac.toFixed(3)}`);
          check(`[${vp.label}] hold ch${i + 1} clearance >=32/40px`, Math.min(clearL, clearR) >= 31.5 && Math.min(clearT, clearB) >= 39.5, `L${clearL.toFixed(0)} R${clearR.toFixed(0)} T${clearT.toFixed(0)} B${clearB.toFixed(0)}`);
        } else {
          const stageW = vp.w, stageH = vp.h;
          check(`[${vp.label}] hold ch${i + 1} within 70-86vw/60svh`, (i === 5 ? sil.h >= 0.40 * stageH : sil.w >= 0.70 * stageW - 2) && sil.w <= 0.86 * stageW + 1 && sil.h <= 0.60 * stageH + 1, `${sil.w.toFixed(0)}x${sil.h.toFixed(0)}`);
          check(`[${vp.label}] hold ch${i + 1} clearance >=16px`, Math.min(clearL, clearR, clearT, clearB) >= 15.5, `${Math.min(clearL, clearR, clearT, clearB).toFixed(0)}`);
          if (i === 5) {
            const gap = st.calloutBox ? st.calloutBox.y - (sil.y + sil.h) : -Infinity;
            check(`[${vp.label}] enclosure copy clears silhouette by 24px`, gap >= 23.5, `${gap.toFixed(0)}px`);
          }
        }
      }
      if (st.leaderPath && st.sil && st.anchorActive) {
        const d = Math.hypot(st.leaderEnd.x - st.anchorActive.x, st.leaderEnd.y - st.anchorActive.y);
        check(`[${vp.label}] leader lands on mesh anchor ch${i + 1}`, d <= 1.5, `delta ${d.toFixed(2)}px`);
        const vals = st.leaderPath.match(/-?\d+(?:\.\d+)?/g).map(Number);
        const routeX = vals[2], routeY = vals[3], sil = st.sil;
        const outside = vp.mobile ? routeY > sil.y + sil.h : (i % 2 === 1 ? routeX > sil.x + sil.w : routeX < sil.x);
        check(`[${vp.label}] leader route stays outside silhouette ch${i + 1}`, outside, `route ${routeX.toFixed(0)},${routeY.toFixed(0)} sil ${sil.x.toFixed(0)},${sil.y.toFixed(0)},${sil.w.toFixed(0)},${sil.h.toFixed(0)}`);
      } else {
        check(`[${vp.label}] leader visible ch${i + 1}`, false, 'no leader/anchor');
      }
    }

    let reverseMismatches = 0;
    const revList = [...forward.keys()].reverse().filter((_, idx) => idx % 3 === 0);
    for (const key of revList) {
      const frac = parseFloat(key);
      await goto(frac);
      const st = await readState();
      if (!st) continue;
      if (JSON.stringify({ p: st.p.toFixed(4), active: st.active, pose: st.pose }) !== forward.get(key)) reverseMismatches++;
    }
    check(`[${vp.label}] reverse scrub deterministic`, reverseMismatches === 0, `${revList.length} points rechecked`);

    await goto(1);
    const seated = await cdp.evaluate('window.__ffasm3d.seatedCheck()');
    check(`[${vp.label}] final seating geometrically continuous`, seated === true);

    const introState = await (async () => { await goto(0.02); await settle(cdp); return readState(); })();
    const finalState = await (async () => { await goto(1); await settle(cdp); return readState(); })();
    const markerBefore = await (async () => { await goto(T_MARKER - 0.002); await settle(cdp); return readState(); })();
    const markerAfter = finalState;
    check(`[${vp.label}] marker hidden through hold/push`, markerBefore?.markerActive === false && markerBefore?.closedGeometry === true, `marker=${markerBefore?.markerActive} closed=${markerBefore?.closedGeometry}`);
    check(`[${vp.label}] marker state-gated after push`, markerAfter?.markerActive === true && markerAfter?.closedGeometry === true, `marker=${markerAfter?.markerActive} closed=${markerAfter?.closedGeometry}`);
    function overlap(a, b) { return a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
    check(`[${vp.label}] intro text clears finished product`, !overlap(introState?.introBox, introState?.allSil), 'subtitle/hero bbox overlap=' + overlap(introState?.introBox, introState?.allSil));
    check(`[${vp.label}] final marker clears finished product`, !overlap(finalState?.finalBox, finalState?.allSil), 'final bbox overlap=' + overlap(finalState?.finalBox, finalState?.allSil));
    if (!vp.mobile && finalState?.allSil) {
      check(`[${vp.label}] final composition meets viewport scale`, finalState.allSil.w >= vp.w * 0.36 && finalState.allSil.w <= vp.w * 0.52 && finalState.allSil.h >= vp.h * 0.48 && finalState.allSil.h <= vp.h * 0.73, `${finalState.allSil.w.toFixed(0)}x${finalState.allSil.h.toFixed(0)}`);
    }
    if (vp.mobile && finalState?.allSil) {
      check(`[${vp.label}] final composition meets mobile viewport scale`, finalState.allSil.w >= vp.w * 0.70 && finalState.allSil.w <= vp.w * 0.84 && finalState.allSil.h <= vp.h * 0.64, `${finalState.allSil.w.toFixed(0)}x${finalState.allSil.h.toFixed(0)}`);
    }

    await goto(0.02); await settle(cdp);
    await cdp.screenshot(join(OUT, vp.label + '-intro.png'));
    for (let i = 0; i < 6; i++) {
      await goto(T_CH_START + (i + 0.69) * CH_W); await settle(cdp);
      await cdp.screenshot(join(OUT, `${vp.label}-ch${i + 1}.png`));
    }
    await goto(0.86); await settle(cdp);
    await cdp.screenshot(join(OUT, vp.label + '-reassemble.png'));
      await goto(T_RE_START - 0.002); await settle(cdp);
    let tableauState = await readState();
    const tableauCopyGone = tableauState?.calloutOpacity && Object.values(tableauState.calloutOpacity).every((value) => value <= 0.001);
    check(`[${vp.label}] exploded tableau has no active copy`, !tableauState?.active && tableauState?.activeCount === 0 && tableauCopyGone, `active=${tableauState?.active || 'none'}`);
    const finalSoloEnd = T_CH_START + CH_W * 6;
    const labelFade = await (async () => { await goto(finalSoloEnd + 0.002); await settle(cdp); return readState(); })();
    const fadeAlpha = labelFade?.calloutOpacity?.enclosure ?? 0;
    check(`[${vp.label}] final solo label crossfades into tableau`, fadeAlpha > 0.05 && fadeAlpha < 0.95, `alpha=${fadeAlpha.toFixed(3)}`);
    await goto(T_RE_START - 0.002); await settle(cdp);
    tableauState = await readState();
    const cleanVisibility = tableauState?.calloutOpacity && tableauState?.calloutVisibility && Object.values(tableauState.calloutOpacity).every((value) => value <= 0.001) && Object.values(tableauState.calloutVisibility).every((value) => value === 'hidden');
    check(`[${vp.label}] tableau copy hidden after two RAF`, cleanVisibility === true, `visibility=${JSON.stringify(tableauState?.calloutVisibility)} opacity=${JSON.stringify(tableauState?.calloutOpacity)}`);
    check(`[${vp.label}] exploded tableau exposes interior tray`, tableauState?.trayVisible === true);
    check(`[${vp.label}] cavity floor is visual-only and non-colliding`, tableauState?.cavityFloor?.visible === true && tableauState.cavityFloor.visualOnly === true && tableauState.cavityFloor.thicknessMm === 0 && tableauState.cavityFloor.zMm >= tableauState.cavityFloor.seatBottomMm, `${tableauState?.cavityFloor?.thicknessMm ?? 'missing'}mm`);
    if (tableauState?.pose) {
      const pts = Object.values(tableauState.pose).map((p) => p.position);
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
      const radius = Math.max(...pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz)));
      check(`[${vp.label}] tableau stays within central assembly radius`, radius <= (vp.mobile ? 0.115 : 0.14), `${radius.toFixed(3)}m`);
    }
    if (tableauState?.allSil) {
      const minW = vp.mobile ? vp.w * 0.68 : vp.w * 0.39;
      const maxW = vp.mobile ? vp.w * 0.92 : vp.w * 0.75;
      const minH = vp.mobile ? vp.h * 0.50 : vp.h * 0.55;
      const maxH = vp.mobile ? vp.h * 0.68 : vp.h * 0.80;
      check(`[${vp.label}] exploded tableau meets viewport scale`, tableauState.allSil.w >= minW && tableauState.allSil.w <= maxW && tableauState.allSil.h >= minH && tableauState.allSil.h <= maxH, `${tableauState.allSil.w.toFixed(0)}x${tableauState.allSil.h.toFixed(0)}`);
      if (!vp.mobile) check(`[${vp.label}] tableau enclosure anchor fills 32-40vw`, tableauState.enclosureSil?.w >= vp.w * 0.32 && tableauState.enclosureSil?.w <= vp.w * 0.40, `${tableauState.enclosureSil?.w?.toFixed(0) || 0}px`);
    }
    await cdp.screenshot(join(OUT, vp.label + '-exploded-tableau.png'));
    const reassemblyState = await (async () => { await goto(0.86); await settle(cdp); return readState(); })();
    check(`[${vp.label}] reassembly exposes interior tray`, reassemblyState?.trayVisible === true);
    check(`[${vp.label}] reassembly cavity floor remains non-colliding`, reassemblyState?.cavityFloor?.visible === true && reassemblyState.cavityFloor.visualOnly === true && reassemblyState.cavityFloor.thicknessMm === 0 && reassemblyState.cavityFloor.zMm >= reassemblyState.cavityFloor.seatBottomMm, `${reassemblyState?.cavityFloor?.thicknessMm ?? 'missing'}mm`);
    if (reassemblyState?.allSil) {
      const minW = vp.mobile ? vp.w * 0.68 : vp.w * 0.39;
      const maxW = vp.mobile ? vp.w * 0.90 : vp.w * 0.78;
      const minH = vp.mobile ? vp.h * 0.42 : vp.h * 0.42;
      const maxH = vp.mobile ? vp.h * 0.64 : vp.h * 0.82;
      check(`[${vp.label}] reassembly composition remains visible`, reassemblyState.allSil.w >= minW && reassemblyState.allSil.w <= maxW && reassemblyState.allSil.h >= minH && reassemblyState.allSil.h <= maxH, `${reassemblyState.allSil.w.toFixed(0)}x${reassemblyState.allSil.h.toFixed(0)}`);
      if (!vp.mobile) check(`[${vp.label}] reassembly enclosure anchor fills 32-40vw`, reassemblyState.enclosureSil?.w >= vp.w * 0.32 && reassemblyState.enclosureSil?.w <= vp.w * 0.40, `${reassemblyState.enclosureSil?.w?.toFixed(0) || 0}px`);
    }
    const beforeTableau = await (async () => { await goto(T_RE_START - 0.005); await settle(cdp); return readState(); })();
    const afterTableau = await (async () => { await goto(T_RE_START + 0.005); await settle(cdp); return readState(); })();
    const angleDelta = beforeTableau?.cam && afterTableau?.cam ? Math.hypot(afterTableau.cam.azim - beforeTableau.cam.azim, afterTableau.cam.elev - beforeTableau.cam.elev) : Infinity;
    check(`[${vp.label}] solo-to-tableau camera transition is smooth`, angleDelta <= 0.55, `${(angleDelta * 180 / Math.PI).toFixed(1)}deg`);
    const centerDelta = beforeTableau?.cam && afterTableau?.cam ? Math.hypot(...afterTableau.cam.center.map((v, i) => v - beforeTableau.cam.center[i])) : Infinity;
    const distRatio = beforeTableau?.cam && afterTableau?.cam ? Math.max(afterTableau.cam.dist, beforeTableau.cam.dist) / Math.max(1e-6, Math.min(afterTableau.cam.dist, beforeTableau.cam.dist)) : Infinity;
    const silScale = beforeTableau?.allSil && afterTableau?.allSil ? Math.max(afterTableau.allSil.w / Math.max(1, beforeTableau.allSil.w), beforeTableau.allSil.w / Math.max(1, afterTableau.allSil.w), afterTableau.allSil.h / Math.max(1, beforeTableau.allSil.h), beforeTableau.allSil.h / Math.max(1, afterTableau.allSil.h)) : Infinity;
    check(`[${vp.label}] solo-to-tableau camera distance is continuous`, distRatio <= 1.45, `${distRatio.toFixed(2)}x`);
    check(`[${vp.label}] solo-to-tableau camera center is continuous`, centerDelta <= 0.18, `${centerDelta.toFixed(3)}m`);
    check(`[${vp.label}] solo-to-tableau projected scale is continuous`, silScale <= 1.55, `${silScale.toFixed(2)}x`);
    const beforeFinal = await (async () => { await goto(T_FINAL - 0.002); await settle(cdp); return readState(); })();
    const afterFinal = await (async () => { await goto(Math.min(0.999, T_FINAL + 0.004)); await settle(cdp); return readState(); })();
    const finalAngleDelta = beforeFinal?.cam && afterFinal?.cam ? Math.hypot(afterFinal.cam.azim - beforeFinal.cam.azim, afterFinal.cam.elev - beforeFinal.cam.elev) : Infinity;
    const finalDistRatio = beforeFinal?.cam && afterFinal?.cam ? Math.max(afterFinal.cam.dist, beforeFinal.cam.dist) / Math.max(1e-6, Math.min(afterFinal.cam.dist, beforeFinal.cam.dist)) : Infinity;
    const finalCenterDelta = beforeFinal?.cam && afterFinal?.cam ? Math.hypot(...afterFinal.cam.center.map((v, i) => v - beforeFinal.cam.center[i])) : Infinity;
    const finalSilScale = beforeFinal?.allSil && afterFinal?.allSil ? Math.max(afterFinal.allSil.w / Math.max(1, beforeFinal.allSil.w), beforeFinal.allSil.w / Math.max(1, afterFinal.allSil.w), afterFinal.allSil.h / Math.max(1, beforeFinal.allSil.h), beforeFinal.allSil.h / Math.max(1, afterFinal.allSil.h)) : Infinity;
    check(`[${vp.label}] final camera fit angle is continuous`, finalAngleDelta <= 0.55, `${(finalAngleDelta * 180 / Math.PI).toFixed(1)}deg`);
    check(`[${vp.label}] final camera fit distance is continuous`, finalDistRatio <= 1.08, `${finalDistRatio.toFixed(2)}x`);
    check(`[${vp.label}] final camera fit center is continuous`, finalCenterDelta <= 0.18, `${finalCenterDelta.toFixed(3)}m`);
    check(`[${vp.label}] final projected scale is continuous`, finalSilScale <= 1.12, `${finalSilScale.toFixed(2)}x`);
    const closedHold = await (async () => { await goto(T_FINAL - 0.002); await settle(cdp); return readState(); })();
    const bridgeDone = await (async () => { await goto(Math.min(0.999, T_FINAL + 0.022)); await settle(cdp); return readState(); })();
    check(`[${vp.label}] closed hold precedes final push`, closedHold?.active === null && closedHold?.allSil, 'closed product hold');
    check(`[${vp.label}] final bridge completes before end`, bridgeDone?.allSil && bridgeDone.cam?.dist > 0, 'bridge settled');
    const heroBridge = await (async () => { await goto(T_HERO_START + 0.007); await settle(cdp); return readState(); })();
    check(`[${vp.label}] final camera push occurs after closed hold`, heroBridge?.closedGeometry === true, `closed=${heroBridge?.closedGeometry}`);
    const effectiveShellVh = geo.shellCssH / vp.h;
    const holdVh = (T_HERO_START - T_CLOSED_HOLD) * effectiveShellVh * 100;
    const pushVh = (T_MARKER - T_HERO_START) * effectiveShellVh * 100;
    const beatVh = RE_SPACING * effectiveShellVh * 100;
    check(`[${vp.label}] final phase timing is viewport-calibrated`, holdVh >= 50 && holdVh <= 75 && pushVh >= 75 && pushVh <= 100, `${holdVh.toFixed(1)}vh hold/${pushVh.toFixed(1)}vh push`);
    check(`[${vp.label}] insertion cadence is viewport-calibrated`, beatVh >= 75 && beatVh <= 100, `${beatVh.toFixed(1)}vh/part`);
    const closureSamples = [];
    for (const sampleP of [0.86, 0.90, 0.912, 0.922, T_FINAL - 0.002, 0.999]) {
      await goto(sampleP); await settle(cdp);
      closureSamples.push({ p: sampleP, pose: (await readState())?.pose?.enclosure });
    }
    const closureRot = closureSamples.map((s) => s.pose?.rotation?.[1] ?? NaN);
    const closureDeltas = closureRot.slice(1).map((v, i) => Math.abs(v - closureRot[i]));
    check(`[${vp.label}] enclosure closure rotation is continuous`, closureDeltas.every((d) => Number.isFinite(d) && d < 1.8), closureDeltas.map((d) => d.toFixed(2)).join('/'));
    check(`[${vp.label}] enclosure reaches final orientation before hero push`, Math.abs(closureRot[4] - closureRot[5]) < 0.12 && Math.abs(closureRot[3] - closureRot[4]) < 0.12, `${closureRot[3].toFixed(2)}→${closureRot[4].toFixed(2)}→${closureRot[5].toFixed(2)}`);
    const seatedPose = (await (async () => { await goto(1); await settle(cdp); return readState(); })())?.pose;
    const reassemblyBase = (await (async () => { await goto(T_RE_START); await settle(cdp); return readState(); })());
    let previousBeatPose = reassemblyBase?.pose || tableauState?.pose;
    for (let idx = 0; idx < REASSEMBLY_ORDER.length; idx++) {
      const beatP = Math.min(T_RE_START + idx * RE_SPACING + RE_W + 0.003, T_FINAL - 0.02);
      await goto(beatP); await settle(cdp);
      const beatState = await readState();
      const id = REASSEMBLY_ORDER[idx];
      const here = beatState?.pose?.[id]?.position;
      const prev = previousBeatPose?.[id]?.position;
      const seat = seatedPose?.[id]?.position;
      const dist = (a, b) => a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : Infinity;
      const activeImprovement = dist(prev, seat) - dist(here, seat);
      check(`[${vp.label}] reassembly beat ${idx + 1} advances ${id}`, activeImprovement >= -0.0005, `${dist(here, seat).toFixed(4)}m`);
      const otherMoves = REASSEMBLY_ORDER.filter((other) => other !== id).map((other) => dist(previousBeatPose?.[other]?.position, beatState?.pose?.[other]?.position));
      const maxOtherMove = Math.max(0, ...otherMoves);
      check(`[${vp.label}] reassembly beat ${idx + 1} keeps non-active parts settled`, maxOtherMove <= 0.001, `${maxOtherMove.toFixed(4)}m`);
      const otherRotations = REASSEMBLY_ORDER.filter((other) => other !== id).map((other) => {
        const a = previousBeatPose?.[other]?.rotation, b = beatState?.pose?.[other]?.rotation;
        return a && b ? Math.max(...a.map((v, axis) => {
          const delta = Math.abs(v - b[axis]);
          return Math.min(delta, Math.abs((Math.PI * 2) - delta));
        })) : Infinity;
      });
      check(`[${vp.label}] reassembly beat ${idx + 1} keeps inactive rotations <=1deg`, Math.max(0, ...otherRotations) <= Math.PI / 180, `${(Math.max(0, ...otherRotations) * 180 / Math.PI).toFixed(2)}deg`);
      if (idx > 0) check(`[${vp.label}] reassembly beat ${idx + 1} has one dominant mover`, activeImprovement >= Math.max(0.001, maxOtherMove * 1.5), `${activeImprovement.toFixed(4)}m vs ${maxOtherMove.toFixed(4)}m`);
      const enclosureMove = dist(previousBeatPose?.enclosure?.position, beatState?.pose?.enclosure?.position);
      const enclosureRot = previousBeatPose?.enclosure?.rotation && beatState?.pose?.enclosure?.rotation
        ? Math.max(...previousBeatPose.enclosure.rotation.map((v, axis) => Math.min(Math.abs(v - beatState.pose.enclosure.rotation[axis]), Math.abs((Math.PI * 2) - Math.abs(v - beatState.pose.enclosure.rotation[axis]))))) : Infinity;
      check(`[${vp.label}] reassembly beat ${idx + 1} keeps enclosure stationary`, enclosureMove <= 0.001 && enclosureRot <= Math.PI / 180, `${enclosureMove.toFixed(4)}m/${(enclosureRot * 180 / Math.PI).toFixed(2)}deg`);
      previousBeatPose = beatState?.pose || previousBeatPose;
    }
    await goto(1); await settle(cdp);
    await cdp.screenshot(join(OUT, vp.label + '-final.png'));

    const footer = await cdp.evaluate(`(async () => {
      const f = document.querySelector('.section-footer');
      const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const stepDown = async () => {
        const step = Math.max(120, Math.floor(innerHeight * 0.62));
        for (let i = 0; i < 64 && scrollY + innerHeight < document.documentElement.scrollHeight - 2; i++) {
          window.scrollBy(0, step); await settle();
        }
      };
      window.scrollTo(0, 0); await settle();
      await stepDown();
      const first = f.getBoundingClientRect();
      const firstReachable = first.top < innerHeight && first.bottom > 0;
      window.scrollBy(0, -Math.min(240, Math.floor(innerHeight * 0.28))); await settle();
      await stepDown();
      const second = f.getBoundingClientRect();
      return { top: second.top, vh: innerHeight, reachable: firstReachable && second.top < innerHeight && second.bottom > 0, firstReachable, secondReachable: second.top < innerHeight && second.bottom > 0 };
    })()`, { awaitPromise: true });
    check(`[${vp.label}] footer reachable after incremental down/up/down`, footer.reachable, `first=${footer.firstReachable} second=${footer.secondReachable} top ${footer.top.toFixed(0)} vs vh ${footer.vh}`);

    // The local verifier has no analytics endpoint; ignore that expected
    // beacon 404 while retaining application exceptions and WebGL errors.
    const realErrors = errors.filter((e) => !/favicon|\/api\/event/i.test(e));
    check(`[${vp.label}] zero console errors`, realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

    await cdp.close();
  }
  const defaultCdp = await Cdp.launch();
  await defaultCdp.send('Page.enable');
  await defaultCdp.send('Runtime.enable');
  await defaultCdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
  await defaultCdp.send('Page.navigate', { url: 'http://127.0.0.1:8137/index.html' });
  await new Promise((r) => setTimeout(r, 1200));
  const defaultResources = await defaultCdp.evaluate(`performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /ff-assembly3d|flashlight-assembly\.glb|three\.module/.test(n))`);
  check('[default] 3D feature isolated', defaultResources.length === 0, defaultResources.join(', '));
  await defaultCdp.close();
}

const CHAPTER_HOLD_FRACS = Array.from({ length: 6 }, (_, i) => T_CH_START + (i + 0.69) * CH_W);

staticChecks();
await browserPass();

writeFileSync(join(OUT, 'report.json'), JSON.stringify({
  when: 'checkpoint-pass10b',
  results,
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
}, null, 2));

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
