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
check('authored duration', Math.abs((state?.duration || 0) - 4.167) < 0.01, String(state?.duration));

await cdp.evaluate('window.__ffCandidatePreview.setProgress(0); undefined');
await new Promise((resolve) => setTimeout(resolve, 180));
const closed = await info();
check('closed pose label', /Closed/.test(await cdp.evaluate("document.getElementById('cpv-status').textContent")));
await cdp.evaluate('window.__ffCandidatePreview.setProgress(1); undefined');
await new Promise((resolve) => setTimeout(resolve, 180));
const exploded = await info();
check('exploded pose label', /Exploded/.test(await cdp.evaluate("document.getElementById('cpv-status').textContent")));
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
})`);
check('review controls and reference', controls.range && controls.reset && controls.reference);

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobile = await cdp.evaluate(`(() => {
  const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect();
  const parts = rect('.cpv-parts'); const controls = rect('.cpv-controls');
  return { overflow: document.documentElement.scrollWidth - innerWidth,
    parts: !!parts && parts.left >= 0 && parts.right <= innerWidth && parts.bottom <= innerHeight,
    controls: !!controls && controls.left >= 0 && controls.right <= innerWidth };
})()`);
check('390x844 layout', mobile.overflow <= 1 && mobile.parts && mobile.controls, JSON.stringify(mobile));
await cdp.send('Emulation.clearDeviceMetricsOverride');

state = await cdp.evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get(){return true}});document.dispatchEvent(new Event('visibilitychange'));window.__ffCandidatePreview.info()`);
check('hidden tab pauses', state?.renderPaused === true);
await cdp.evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get(){return false}});document.dispatchEvent(new Event('visibilitychange'));undefined`);
check('zero console errors', errors.length === 0, errors.join(', '));

await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/candidate-preview.html?p=1` });
await new Promise((resolve) => setTimeout(resolve, 900));
const deepLink = await info();
check('exploded deep link', deepLink?.progress >= 0.999 && /Exploded/.test(await cdp.evaluate("document.getElementById('cpv-status').textContent")));

await cdp.close();
server.close();
if (checks.some((ok) => !ok)) process.exitCode = 1;
console.log(`\n${checks.filter(Boolean).length}/${checks.length} candidate checks passed`);
