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
const switchSourceRecorded = motionManifest?.convertedCadSources?.switch === 'source-assets/external/pass9/derived/switch-dip-slide.stl';
check('FreeCAD source dimensions recorded', dimensionsMatch && switchSourceRecorded, JSON.stringify({ sourceDimensions, switchSource: motionManifest?.convertedCadSources?.switch }));

await cdp.evaluate('window.__ffCandidatePreview.setProgress(0); undefined');
await new Promise((resolve) => setTimeout(resolve, 180));
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
  shortCopy: [...document.querySelectorAll('.cpv-callout')].every((el) => el.textContent.trim().split(/\\s+/).length <= 5),
  activeBoxes: [...document.querySelectorAll('.cpv-callout')].filter((el) => getComputedStyle(el).display !== 'none').length,
  activeLines: [...document.querySelectorAll('#cpv-leaders line')].filter((el) => getComputedStyle(el).opacity !== '0').length,
  activeAria: [...document.querySelectorAll('.cpv-callout')].filter((el) => el.getAttribute('aria-hidden') === 'false').length,
  label: document.getElementById('cpv-callouts').getAttribute('aria-label'),
  explodedPosePressed: document.querySelector('[data-cpv-pose="0.67"]')?.getAttribute('aria-pressed') === 'true',
})`);
check('exploded editorial callout', callouts.boxes === 6 && callouts.lines === 6 && callouts.visible && callouts.shortCopy && callouts.activeBoxes === 1 && callouts.activeLines === 1 && callouts.activeAria === 1 && callouts.label === 'Current part: LED pair. Cost TBD.' && callouts.explodedPosePressed && exploded?.activeCallout === 'led_pair', JSON.stringify({ ...callouts, activeCallout: exploded?.activeCallout }));
const editorialSamples = [];
for (const sample of [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]) {
  await cdp.evaluate(`window.__ffCandidatePreview.setProgress(${sample}); undefined`);
  await new Promise((resolve) => setTimeout(resolve, 55));
  editorialSamples.push(await cdp.evaluate(`({p:${sample}, active:[...document.querySelectorAll('.cpv-callout')].filter((el) => getComputedStyle(el).display !== 'none').length, lines:[...document.querySelectorAll('#cpv-leaders line')].filter((el) => getComputedStyle(el).opacity !== '0').length, partRows:[...document.querySelectorAll('#cpv-part-list li.is-active')].map((el) => el.dataset.cpvPart), partAria:[...document.querySelectorAll('#cpv-part-list [aria-current="step"]')].map((el) => el.dataset.cpvPart)})`));
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
  reference: !!document.querySelector('.cpv-reference img'),
  poses: document.querySelectorAll('[data-cpv-pose]').length === 3,
  chapters: [...document.querySelectorAll('.cpv-chapter span')].map((el) => el.textContent.trim()),
})`);
check('review controls and reference', controls.range && controls.reset && controls.reference && controls.poses && JSON.stringify(controls.chapters) === JSON.stringify(['Closed', 'Exploded review', 'Reassembled']), JSON.stringify(controls));

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobile = await cdp.evaluate(`(() => {
  const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect();
  const parts = rect('.cpv-parts'); const controls = rect('.cpv-controls');
  const head = rect('.cpv-head'); const reference = rect('.cpv-reference'); const status = rect('.cpv-status');
  const overlaps = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  return { overflow: document.documentElement.scrollWidth - innerWidth,
    parts: !!parts && parts.left >= 0 && parts.right <= innerWidth && parts.bottom <= innerHeight,
    controls: !!controls && controls.left >= 0 && controls.right <= innerWidth,
    headerReferenceClear: !overlaps(head, reference),
    headerStatusClear: !overlaps(head, status) };
})()`);
check('390x844 layout', mobile.overflow <= 1 && mobile.parts && mobile.controls && mobile.headerReferenceClear && mobile.headerStatusClear, JSON.stringify(mobile));
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
check('reassembled deep link', deepLinkQuery.includes('p=1') && deepLinkStatus.range >= 0.999 && /Reassembled/.test(deepLinkStatus.status) && deepLinkStatus.calloutsHidden && deepLinkStatus.leadersHidden && deepLinkStatus.activeParts === 0, JSON.stringify({ query: deepLinkQuery, ...deepLinkStatus }));
const reassembled = await info();
const finalCamera = reassembled?.cameraPosition;
const finalCameraDistinct = closedCamera && finalCamera
  && Math.hypot(closedCamera.x - finalCamera.x, closedCamera.y - finalCamera.y, closedCamera.z - finalCamera.z) > 0.005;
check('reassembled three-quarter camera', finalCameraDistinct, JSON.stringify({ closedCamera, finalCamera }));
const reassembledParts = ['battery', 'charge_module', 'led_left', 'led_right', 'switch'];
const returnedToSeats = reassembledParts.every((part) => {
  const a = closed?.partTransforms?.[part];
  const b = reassembled?.partTransforms?.[part];
  return a && b && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.002;
});
check('reassembled parts return to seats', returnedToSeats, JSON.stringify({ closed: closed?.partTransforms, reassembled: reassembled?.partTransforms }));

await cdp.close();
server.close();
if (checks.some((ok) => !ok)) process.exitCode = 1;
console.log(`\n${checks.filter(Boolean).length}/${checks.length} candidate checks passed`);
