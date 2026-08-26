import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Cdp } from './cdp.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PORT = 8140;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg', '.png': 'image/png',
};
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = join(ROOT, pathname === '/' ? 'candidate-preview.html' : pathname.slice(1));
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

const requiredCandidateFiles = [
  'candidate-preview.html',
  'css/candidate-preview.css',
  'js/candidate-preview.js',
  'fonts/667d8d81555e958a89e78dd3_TWKLausanne-400.woff2',
  'fonts/667d8d81555e958a89e78dd7_TWKLausanne-500.woff2',
  'assets/3d/flashlight-assembly-blender-candidate.glb',
  'assets/3d/references/solar-panel-tops.png',
  'assets/3d/references/flashlight-internals-charging-board.png',
];
const missingCandidateFiles = [];
for (const relativePath of requiredCandidateFiles) {
  try {
    await readFile(join(ROOT, relativePath));
  } catch {
    missingCandidateFiles.push(relativePath);
  }
}
check('candidate asset files present', missingCandidateFiles.length === 0, missingCandidateFiles.join(', '));

const cdp = await Cdp.launch();
const errors = [];
cdp.on('Runtime.consoleAPICalled', (event) => {
  if (event.type === 'error' || event.type === 'warning') errors.push(event.type);
});
cdp.on('Runtime.exceptionThrown', () => errors.push('exception'));
await cdp.send('Runtime.enable');
await cdp.send('Page.enable');
await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/candidate-preview.html` });
await new Promise((resolve) => setTimeout(resolve, 3200));

const info = () => cdp.evaluate('window.__ffCandidatePreview && window.__ffCandidatePreview.info()');
let state = await info();
check('candidate ready', state?.ready === true && state?.failed === false);
check('seven authored clips', state?.clips === 7, String(state?.clips));
check('authored duration', Math.abs((state?.duration || 0) - 5.0) < 0.01, String(state?.duration));
const motionManifest = JSON.parse(await readFile(join(ROOT, 'assets', '3d', 'blender-candidate-manifest.json'), 'utf8'));
const motionProfiles = motionManifest?.motionProfiles || {};
const motionParts = ['enclosure', 'solar_panel_placeholder', 'battery', 'charge_module', 'led_left', 'led_right', 'switch'];
const motionProfileShape = motionParts.every((part) => Array.isArray(motionProfiles[part]?.explode_rotation) && motionProfiles[part].explode_rotation.length === 3 && Array.isArray(motionProfiles[part]?.inspect_rotation) && motionProfiles[part].inspect_rotation.length === 3);
const mirroredLedSplay = motionProfiles.led_left?.inspect_rotation?.[2] === 26 && motionProfiles.led_right?.inspect_rotation?.[2] === -26;
const stableEnclosure = motionProfiles.enclosure?.explode_rotation?.every((value) => value === 0) && motionProfiles.enclosure?.inspect_rotation?.every((value) => value === 0);
check('motion profile manifest', motionProfileShape && mirroredLedSplay && stableEnclosure, JSON.stringify(motionProfiles));
const sourceDimensions = motionManifest?.sourceDimensionsMm || {};
const dimensionsMatch = JSON.stringify(sourceDimensions) === JSON.stringify({
  case: [105, 65, 15],
  charge_module: [29.3, 17.4, 4.14],
  battery: [53.1, 46.821, 6],
  led: [5.58, 6, 36.5],
  switch: [4.1, 7.82, 6],
});
const chargeSourceRecorded = motionManifest?.convertedCadSources?.charge_module === 'source-assets/external/user-supplied/tp4056-authoritative-freecad.stl';
const switchSourceRecorded = motionManifest?.convertedCadSources?.switch === 'source-assets/external/pass9/derived/switch-dip-slide.stl';
check('FreeCAD source dimensions recorded', dimensionsMatch && chargeSourceRecorded && switchSourceRecorded, JSON.stringify({ sourceDimensions, chargeSource: motionManifest?.convertedCadSources?.charge_module, switchSource: motionManifest?.convertedCadSources?.switch }));

await cdp.evaluate('window.__ffCandidatePreview.setProgress(0); undefined');
await new Promise((resolve) => setTimeout(resolve, 400));
const closed = await info();
check('closed pose label', /Closed/.test(await cdp.evaluate("document.getElementById('cpv-status').textContent")));
const closedCamera = closed?.cameraPosition;
const closedAnnotations = await cdp.evaluate(`({
  calloutsHidden: document.getElementById('cpv-callouts').style.display === 'none',
  leadersHidden: document.getElementById('cpv-leaders').style.display === 'none',
  activeAria: [...document.querySelectorAll('.cpv-callout')].filter((el) => el.getAttribute('aria-hidden') === 'false').length,
  label: document.getElementById('cpv-callouts').getAttribute('aria-label'),
  activeParts: document.querySelectorAll('#cpv-part-list li.is-active').length,
})`);
check('closed annotations hidden', closedAnnotations.calloutsHidden && closedAnnotations.leadersHidden && closedAnnotations.activeAria === 0 && closedAnnotations.label === 'Current candidate part annotation' && closedAnnotations.activeParts === 0, JSON.stringify(closedAnnotations));
const calloutAccessibility = await cdp.evaluate(`({
  live: document.getElementById('cpv-callouts').getAttribute('aria-live'),
  atomic: document.getElementById('cpv-callouts').getAttribute('aria-atomic'),
  ledNames: [...document.querySelectorAll('#cpv-part-list [data-cpv-part="led_pair"] .cpv-part-name')].map((el) => el.textContent.trim())
})`);
check('callout accessibility and LED copy', calloutAccessibility.live === 'polite' && calloutAccessibility.atomic === 'true' && calloutAccessibility.ledNames.length === 2 && calloutAccessibility.ledNames.every((name) => name === '5 mm LED'), JSON.stringify(calloutAccessibility));
const closedParts = closed?.partTransforms || {};
const leftLed = closedParts.led_left;
const rightLed = closedParts.led_right;
const seatedSwitch = closedParts.switch;
const ledGeometry = leftLed && rightLed
  && leftLed.x < -0.03 && rightLed.x < -0.03
  && Math.abs(leftLed.y - rightLed.y) < 0.01
  && Math.abs(leftLed.z - rightLed.z) > 0.015;
const switchGeometry = seatedSwitch
  && Math.abs(seatedSwitch.x) <= 0.025
  && Math.abs(seatedSwitch.y) <= 0.03
  && Math.abs(seatedSwitch.z) <= 0.03;
check('closed LEDs seated at short end', ledGeometry, JSON.stringify({ leftLed, rightLed }));
check('closed switch seated near case', switchGeometry, JSON.stringify({ seatedSwitch }));
await cdp.evaluate('window.__ffCandidatePreview.setProgress(0.67); undefined');
await new Promise((resolve) => setTimeout(resolve, 180));
const exploded = await info();
check('exploded pose label', /Exploded/.test(await cdp.evaluate("document.getElementById('cpv-status').textContent")));
const callouts = await cdp.evaluate(`({
  boxes: document.querySelectorAll('.cpv-callout').length,
  lines: document.querySelectorAll('#cpv-leaders line').length,
  visible: !document.getElementById('cpv-callouts').hidden,
  plainText: [...document.querySelectorAll('.cpv-callout')].every((el) => {
    const style = getComputedStyle(el);
    return style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.borderTopWidth === '0px' && style.borderRightWidth === '0px' && style.borderBottomWidth === '0px' && style.borderLeftWidth === '0px' && style.boxShadow === 'none';
  }),
  costLines: [...document.querySelectorAll('.cpv-callout-cost')].map((el) => el.textContent.trim()),
  shortCopy: [...document.querySelectorAll('.cpv-callout')].every((el) => el.textContent.trim().split(/\\s+/).length <= 5),
  activeBoxes: [...document.querySelectorAll('.cpv-callout')].filter((el) => el.classList.contains('is-active')).length,
  fadeMounted: [...document.querySelectorAll('.cpv-callout')].every((el) => getComputedStyle(el).display !== 'none'),
  activeLines: [...document.querySelectorAll('#cpv-leaders line')].filter((el) => el.style.opacity !== '0').length,
  activeAria: [...document.querySelectorAll('.cpv-callout')].filter((el) => el.getAttribute('aria-hidden') === 'false').length,
  label: document.getElementById('cpv-callouts').getAttribute('aria-label'),
  explodedPosePressed: document.querySelector('[data-cpv-pose="0.67"]')?.getAttribute('aria-pressed') === 'true',
})`);
const calloutCostsDataDriven = callouts.costLines.length === 6 && callouts.costLines.every((value) => /^Cost: \S/.test(value));
check('exploded editorial callout', callouts.boxes === 6 && callouts.lines === 6 && callouts.visible && callouts.plainText && calloutCostsDataDriven && callouts.shortCopy && callouts.activeBoxes === 1 && callouts.fadeMounted && callouts.activeLines === 1 && callouts.activeAria === 1 && callouts.label === 'Current part: 5 mm LEDs. Cost: TBD.' && callouts.explodedPosePressed && exploded?.activeCallout === 'led_pair', JSON.stringify({ ...callouts, calloutCostsDataDriven, activeCallout: exploded?.activeCallout }));
await cdp.evaluate('window.__ffCandidatePreview.setProgress(0.67); undefined');
await new Promise((resolve) => setTimeout(resolve, 200));
const calloutSpec = await cdp.evaluate(`(() => {
  const boxes = [...document.querySelectorAll('.cpv-callout')];
  const lines = [...document.querySelectorAll('#cpv-leaders line')];
  const activeBox = boxes.find((el) => el.classList.contains('is-active'));
  const activeName = activeBox?.querySelector('.cpv-callout-name');
  const activeCost = activeBox?.querySelector('.cpv-callout-cost');
  const activeLine = lines.find((el) => el.style.opacity !== '0');
  const boxStyle = activeBox ? getComputedStyle(activeBox) : null;
  const twoLines = !!activeBox && activeBox.children.length === 2
    && activeBox.children[0] === activeName && activeBox.children[1] === activeCost
    && getComputedStyle(activeName).display === 'block' && getComputedStyle(activeName).whiteSpace === 'nowrap'
    && getComputedStyle(activeCost).display === 'block' && getComputedStyle(activeCost).whiteSpace === 'nowrap';
  const plainText = !!boxStyle
    && boxStyle.backgroundColor === 'rgba(0, 0, 0, 0)'
    && boxStyle.borderTopWidth === '0px' && boxStyle.borderRightWidth === '0px'
    && boxStyle.borderBottomWidth === '0px' && boxStyle.borderLeftWidth === '0px'
    && boxStyle.boxShadow === 'none';
  const onlyActiveVisible = activeBox?.getAttribute('aria-hidden') === 'false'
    && boxes.filter((el) => el.getAttribute('aria-hidden') === 'false').length === 1
    && boxes.every((el) => el.classList.contains('is-active') || getComputedStyle(el).opacity === '0')
    && lines.filter((el) => el.style.opacity !== '0').length === 1
    && lines.every((el) => el.style.opacity === '0' || el === activeLine);
  const leaderDotted = !!activeLine && getComputedStyle(activeLine).strokeDasharray !== 'none';
  return { twoLines, plainText, onlyActiveVisible, leaderDotted };
})()`);
check('callout requirements: two-line plain active, others hidden, dotted leader',
  calloutSpec.twoLines && calloutSpec.plainText && calloutSpec.onlyActiveVisible && calloutSpec.leaderDotted,
  JSON.stringify(calloutSpec));

const editorialSamples = [];
for (const sample of [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]) {
  await cdp.evaluate(`window.__ffCandidatePreview.setProgress(${sample}); undefined`);
  await new Promise((resolve) => setTimeout(resolve, 400));
  editorialSamples.push(await cdp.evaluate(`({p:${sample}, active:[...document.querySelectorAll('.cpv-callout')].filter((el) => el.classList.contains('is-active')).length, lines:[...document.querySelectorAll('#cpv-leaders line')].filter((el) => el.style.opacity !== '0').length, partRows:[...document.querySelectorAll('#cpv-part-list li.is-active')].map((el) => el.dataset.cpvPart), partAria:[...document.querySelectorAll('#cpv-part-list [aria-current="step"]')].map((el) => el.dataset.cpvPart)})`));
}
const expectedPartRows = [['enclosure'], ['solar_panel_placeholder'], ['battery'], ['charge_module'], ['led_pair', 'led_pair'], ['switch']];
check('editorial callouts sequence', editorialSamples.every((sample, index) => sample.active === 1 && sample.lines === 1 && JSON.stringify(sample.partRows) === JSON.stringify(expectedPartRows[index]) && JSON.stringify(sample.partAria) === JSON.stringify(expectedPartRows[index])), JSON.stringify(editorialSamples));
for (const part of ['battery', 'charge_module']) {
  const a = closed?.partTransforms?.[part];
  const b = exploded?.partTransforms?.[part];
  const moved = a && b && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) >= 0.02;
  check(`${part} separates`, moved);
}

const controls = await cdp.evaluate(`({
  range: !!document.getElementById('cpv-range'),
  reset: !!document.getElementById('cpv-reset'),
  references: [...document.querySelectorAll('.cpv-reference')].map((el) => ({
    source: el.querySelector('img')?.getAttribute('src') || '',
    name: el.getAttribute('name') || '',
  })),
  poses: document.querySelectorAll('[data-cpv-pose]').length === 3,
  chapters: [...document.querySelectorAll('.cpv-chapter span')].map((el) => el.textContent.trim()),
  partsCollapsed: document.querySelector('.cpv-parts')?.open === false,
})`);
const referenceSources = controls.references.map((reference) => reference.source);
const referenceNames = controls.references.map((reference) => reference.name);
check('review controls and references', controls.range && controls.reset && controls.references.length === 2 && referenceSources.includes('assets/3d/references/solar-panel-tops.png') && referenceSources.includes('assets/3d/references/flashlight-internals-charging-board.png') && referenceNames.length === 2 && referenceNames.every((name) => name === 'candidate-reference') && controls.poses && controls.partsCollapsed && JSON.stringify(controls.chapters) === JSON.stringify(['Closed', 'Exploded review', 'Reassembled']), JSON.stringify(controls));
const candidateCss = await readFile(join(ROOT, 'css', 'candidate-preview.css'), 'utf8');
const focusStyles = {
  disclosureRing: /\.cpv-parts summary:focus-visible,\.cpv-reference summary:focus-visible\{[^}]*outline:1px solid var\(--cpv-accent\)/.test(candidateCss),
  controlRing: /\.cpv-copy-link:hover,\.cpv-copy-link:focus-visible,\.cpv-pose-buttons button:hover,\.cpv-pose-buttons button:focus-visible\{[^}]*box-shadow:0 0 0 2px/.test(candidateCss),
  rangeRing: /\.cpv-range-label input:focus-visible\{[^}]*outline:1px solid var\(--cpv-accent\)/.test(candidateCss),
  noLegacyGreenControls: !/rgba\(21,128,61|rgba\(11,127,71/.test(candidateCss),
};
check('keyboard focus visibility', focusStyles.disclosureRing && focusStyles.controlRing && focusStyles.rangeRing && focusStyles.noLegacyGreenControls, JSON.stringify(focusStyles));
const candidateJs = await readFile(join(ROOT, 'js', 'candidate-preview.js'), 'utf8');
const pagehideCleanupSafe = /addEventListener\('pagehide', \(event\) => \{\s*if \(event\.persisted\) return;[\s\S]*?renderer\.dispose\(\)/.test(candidateJs);
check('pagehide cleanup preserves bfcache', pagehideCleanupSafe);
const metadata = await cdp.evaluate(`({
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
  themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') || ''
})`);
check('Flash Forward metadata', metadata.title === 'Flash Forward — Inside the flashlight' && /Flash Forward/.test(metadata.description) && /assembly study/.test(metadata.description) && metadata.themeColor === '#151b17', JSON.stringify(metadata));

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await cdp.send('Page.reload');
await new Promise((resolve) => setTimeout(resolve, 1800));
const mobile = await cdp.evaluate(`(() => {
  const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect();
  const parts = rect('.cpv-parts'); const controls = rect('.cpv-controls');
  const head = rect('.cpv-head'); const reference = rect('.cpv-reference'); const status = rect('.cpv-status');
  const overlaps = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const refs = [...document.querySelectorAll('.cpv-reference')];
  const refsPresent = refs.length === 2;
  const refsCollapsed = refs.every((el) => el.open === false);
  const refsInside = refs.every((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; });
  return { overflow: document.documentElement.scrollWidth - innerWidth,
    parts: !!parts && parts.left >= 0 && parts.right <= innerWidth && parts.bottom <= innerHeight,
    partsCollapsed: document.querySelector('.cpv-parts')?.open === false,
    controls: !!controls && controls.left >= 0 && controls.right <= innerWidth,
    headerReferenceClear: !overlaps(head, reference),
    headerStatusClear: !overlaps(head, status),
    refsPresent, refsCollapsed, refsInside };
})()`);
check('390x844 layout', mobile.overflow <= 1 && mobile.parts && mobile.partsCollapsed && mobile.controls && mobile.headerReferenceClear && mobile.headerStatusClear && mobile.refsPresent && mobile.refsCollapsed && mobile.refsInside, JSON.stringify(mobile));
await cdp.evaluate('window.__ffCandidatePreview.setProgress(0.67); undefined');
await new Promise((resolve) => setTimeout(resolve, 450));
const mobileCallout = await cdp.evaluate(`(() => {
  const label = document.querySelector('.cpv-callout.is-active')?.getBoundingClientRect();
  const parts = document.querySelector('.cpv-parts')?.getBoundingClientRect();
  return {
    labelInside: !!label && label.left >= 0 && label.right <= innerWidth && label.top >= 0 && label.bottom <= innerHeight,
    aboveParts: !!label && !!parts && label.bottom < parts.top,
    text: document.querySelector('.cpv-callout.is-active')?.textContent.trim() || ''
  };
})()`);
check('390x844 active callout lane', mobileCallout.labelInside && mobileCallout.aboveParts && mobileCallout.text.split(/\\s+/).length <= 5, JSON.stringify(mobileCallout));
await cdp.send('Emulation.clearDeviceMetricsOverride');

state = await cdp.evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get(){return true}});document.dispatchEvent(new Event('visibilitychange'));window.__ffCandidatePreview.info()`);
check('hidden tab pauses', state?.renderPaused === true);
await cdp.evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get(){return false}});document.dispatchEvent(new Event('visibilitychange'));undefined`);
check('zero console errors', errors.length === 0, errors.join(', '));

await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/candidate-preview.html?p=1` });
await new Promise((resolve) => setTimeout(resolve, 1800));
const deepLink = await info();
const deepLinkQuery = await cdp.evaluate('window.location.search');
await cdp.evaluate('window.__ffCandidatePreview.setProgress(1); undefined');
await new Promise((resolve) => setTimeout(resolve, 120));
const deepLinkStatus = await cdp.evaluate("({status: document.getElementById('cpv-status').textContent, range: Number(document.getElementById('cpv-range').value), calloutsHidden: document.getElementById('cpv-callouts').style.display === 'none', leadersHidden: document.getElementById('cpv-leaders').style.display === 'none', activeParts: document.querySelectorAll('#cpv-part-list li.is-active').length})");
check('reassembled deep link', deepLinkQuery.includes('p=1') && deepLinkStatus.range >= 0.999 && /Reassembled/.test(deepLinkStatus.status) && !/GLB|ScrollSequence|candidate asset/i.test(deepLinkStatus.status) && deepLinkStatus.calloutsHidden && deepLinkStatus.leadersHidden && deepLinkStatus.activeParts === 0, JSON.stringify({ query: deepLinkQuery, ...deepLinkStatus }));
const reassembled = await info();
const finalCamera = reassembled?.cameraPosition;
const finalCameraDistinct = closedCamera && finalCamera
  && Math.hypot(closedCamera.x - finalCamera.x, closedCamera.y - finalCamera.y, closedCamera.z - finalCamera.z) > 0.005;
check('reassembled three-quarter camera', finalCameraDistinct, JSON.stringify({ closedCamera, finalCamera }));
await cdp.evaluate('window.__ffCandidatePreview.setProgress(0.84); undefined');
await new Promise((resolve) => setTimeout(resolve, 120));
const settledCamera = (await info())?.cameraPosition;
const cameraHoldDelta = settledCamera && finalCamera
  ? Math.hypot(settledCamera.x - finalCamera.x, settledCamera.y - finalCamera.y, settledCamera.z - finalCamera.z) : Infinity;
check('camera settles with reassembly', cameraHoldDelta < 0.001, JSON.stringify({ cameraHoldDelta, settledCamera, finalCamera }));
const reassembledParts = ['battery', 'charge_module', 'led_left', 'led_right', 'switch'];
const returnedToSeats = reassembledParts.every((part) => {
  const a = closed?.partTransforms?.[part];
  const b = reassembled?.partTransforms?.[part];
  return a && b && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.002;
});
check('reassembled parts return to seats', returnedToSeats, JSON.stringify({ closed: closed?.partTransforms, reassembled: reassembled?.partTransforms }));

await cdp.evaluate('window.__ffCandidatePreview.setProgress(0.67); undefined');
await new Promise((resolve) => setTimeout(resolve, 450));
const reverseExploded = await cdp.evaluate(`({
  activeCallout: document.querySelector('.cpv-callout.is-active')?.textContent.trim() || '',
  activeLeaders: [...document.querySelectorAll('#cpv-leaders line')].filter((el) => el.style.opacity !== '0').length,
  activeParts: document.querySelectorAll('#cpv-part-list li.is-active').length
})`);
await cdp.evaluate('window.__ffCandidatePreview.setProgress(0); undefined');
await new Promise((resolve) => setTimeout(resolve, 450));
const reverseClosed = await cdp.evaluate(`({
  calloutsHidden: document.getElementById('cpv-callouts').style.display === 'none',
  leadersHidden: document.getElementById('cpv-leaders').style.display === 'none',
  activeParts: document.querySelectorAll('#cpv-part-list li.is-active').length
})`);
check('reverse scrub restores annotations', /Cost: TBD/.test(reverseExploded.activeCallout) && reverseExploded.activeLeaders === 1 && reverseExploded.activeParts > 0 && reverseClosed.calloutsHidden && reverseClosed.leadersHidden && reverseClosed.activeParts === 0, JSON.stringify({ reverseExploded, reverseClosed }));

const contextLoss = await cdp.evaluate(`(() => {
  const event = new Event('webglcontextlost', { cancelable: true });
  const dispatched = document.getElementById('cpv-canvas')?.dispatchEvent(event);
  return {
    dispatched,
    defaultPrevented: event.defaultPrevented,
    fallbackVisible: document.getElementById('cpv-fallback')?.hidden === false,
    status: document.getElementById('cpv-status')?.textContent || ''
  };
})()`);
check('WebGL context-loss fallback', contextLoss.dispatched === false && contextLoss.defaultPrevented && contextLoss.fallbackVisible && /Preview unavailable/.test(contextLoss.status), JSON.stringify(contextLoss));

await cdp.close();
server.close();
if (checks.some((ok) => !ok)) process.exitCode = 1;
console.log(`\n${checks.filter(Boolean).length}/${checks.length} candidate checks passed`);
