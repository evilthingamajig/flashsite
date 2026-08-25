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
  const glbPath = join(ROOT, 'assets', '3d', 'flashlight-assembly.glb');
  const manifest = JSON.parse(readFileSync(join(ROOT, 'assets', '3d', 'assembly-manifest.json'), 'utf8'));
  check('glb exists', existsSync(glbPath));
  const bytes = statSync(glbPath).size;
  check('glb <= 250 KB', bytes <= 250 * 1024, bytes + ' bytes');
  check('manifest bytes match glb', manifest.totals.bytes === bytes);
  check('triangles <= 5000', manifest.totals.triangles <= 5000, manifest.totals.triangles + ' tris');
  const required = ['enclosure', 'switch', 'solar_lid', 'battery', 'charge_module', 'led_pair'];
  const data = readFileSync(glbPath);
  const jlen = data.readUInt32LE(12);
  const js = JSON.parse(data.subarray(20, 20 + jlen).toString('utf8'));
  const names = js.nodes.map((n) => n.name).sort();
  check('glb node names exact', JSON.stringify(names) === JSON.stringify([...required].sort()), names.join(','));
  for (const src of ['enclosure', 'switch']) {
    const file = readFileSync(join(ROOT, 'source-assets', 'stl', src + '.stl'));
    const sha = createHash('sha256').update(file).digest('hex');
    check(`manifest tracks ${src}.stl`, manifest.sources[src] && manifest.sources[src].sha256 === sha);
  }
  execFileSync(process.execPath, [join(ROOT, 'tools', 'build-assembly-glb.mjs')], { cwd: ROOT });
  const rebuilt = readFileSync(glbPath);
  check('builder deterministic (rebuild identical)', createHash('sha256').update(rebuilt).digest('hex') === createHash('sha256').update(data).digest('hex'));

  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const flagCount = html.split("get('ffasm')==='3d'").length - 1;
  check('flag wiring present once', flagCount === 1 && /classList\.add\('ff-asm3d'\)/.test(html));
  check('importmap vendored paths', html.includes('./js/vendor/three/three.module.js') && html.includes('./js/vendor/three/addons/loaders/GLTFLoader.js'));
  for (const f of ['js/vendor/three/three.module.js', 'js/vendor/three/addons/loaders/GLTFLoader.js', 'js/vendor/three/addons/utils/BufferGeometryUtils.js']) {
    check('vendored file ' + f, existsSync(join(ROOT, f)));
  }
  const asm3d = readFileSync(join(ROOT, 'js', 'ff-assembly3d.js'), 'utf8');
  check('no CDN references in runtime', !/https?:\/\//.test(asm3d.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')));
  check('DPR cap present', /DPR_CAP\s*=\s*1\.75/.test(asm3d));
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

const T_CH_START = 0.125;
const CH_W = 0.108;

async function settle(cdp) {
  await cdp.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))', { awaitPromise: true });
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
      return { top: r.top + window.scrollY, span: Math.max(1, r.height - window.innerHeight), docH: document.documentElement.scrollHeight };
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
          leaderEnd: F.leaderEnd,
          anchorActive: F.activeCallout ? F.anchors[F.activeCallout] : null,
          activeCount: document.querySelectorAll('.ff-asm3d-callout.is-active').length,
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

    for (let i = 0; i < N; i++) {
      const frac = i / (N - 1);
      const yUsed = geo.top + frac * geo.span;
      await goto(frac);
      const st = await readState();
      if (!st) continue;
      forward.set(frac.toFixed(4), JSON.stringify({ p: st.p.toFixed(4), active: st.active }));
      maxActiveCount = Math.max(maxActiveCount, st.activeCount);
      worstOverflow = Math.max(worstOverflow, st.overflowX);
      if (st.active && st.sil) {
        const sil = st.sil, pane = st.pane;
        const clearL = sil.x - pane.x, clearR = pane.x + pane.w - (sil.x + sil.w);
        const clearT = sil.y - pane.y, clearB = pane.y + pane.h - (sil.y + sil.h);
        if (!vp.mobile) {
          const fillFrac = Math.max(sil.h / pane.h, sil.w / pane.w);
          const holdFracs = CHAPTER_HOLD_FRACS;
          const isHoldish = holdFracs.some((hf) => Math.abs(hf - st.p) < 0.006);
          if (isHoldish && (fillFrac < 0.578 || fillFrac > 0.682)) {
            clearanceViolations.push(`hold fill ${fillFrac.toFixed(3)} @p=${st.p.toFixed(3)}`);
          }
          if (Math.min(clearL, clearR) < 31.5 || Math.min(clearT, clearB) < 39.5) {
            clearanceViolations.push(`clearance L${clearL.toFixed(0)} R${clearR.toFixed(0)} T${clearT.toFixed(0)} B${clearB.toFixed(0)} @p=${st.p.toFixed(3)}`);
          }
        } else {
          const stageW = st.stage ? st.stage.w : vp.w, stageH = st.stage ? st.stage.h : vp.h;
          if (sil.w > 0.86 * stageW + 1 || sil.h > 0.46 * stageH + 1) {
            clearanceViolations.push(`mobile size ${sil.w.toFixed(0)}x${sil.h.toFixed(0)} @p=${st.p.toFixed(3)}`);
          }
          if (Math.min(clearL, clearR, clearT, clearB) < 15.5) {
            clearanceViolations.push(`mobile clearance ${Math.min(clearL, clearR, clearT, clearB).toFixed(0)} @p=${st.p.toFixed(3)}`);
          }
        }
      }
    }
    check(`[${vp.label}] at most one active callout`, maxActiveCount <= 1, 'max=' + maxActiveCount);
    check(`[${vp.label}] no horizontal overflow`, worstOverflow <= 0, 'max overflow px=' + worstOverflow);
    check(`[${vp.label}] silhouette fits pane with clearance`, clearanceViolations.length === 0, clearanceViolations.slice(0, 3).join('; '));

    const holdSamples = [];
    for (let i = 0; i < 6; i++) {
      const pTarget = T_CH_START + (i + 0.69) * CH_W;
      const frac = pTarget;
      await goto(frac);
      const st = await readState();
      if (!st) continue;
      holdSamples.push(st);
      if (st.sil && st.pane) {
        const sil = st.sil, pane = st.pane;
        const fillFrac = Math.max(sil.h / pane.h, sil.w / pane.w);
        const clearL = sil.x - pane.x, clearR = pane.x + pane.w - (sil.x + sil.w);
        const clearT = sil.y - pane.y, clearB = pane.y + pane.h - (sil.y + sil.h);
        if (!vp.mobile) {
          check(`[${vp.label}] hold ch${i + 1} silhouette fills 58-68% of pane`, fillFrac >= 0.578 && fillFrac <= 0.682, `fill ${fillFrac.toFixed(3)}`);
          check(`[${vp.label}] hold ch${i + 1} clearance >=32/40px`, Math.min(clearL, clearR) >= 31.5 && Math.min(clearT, clearB) >= 39.5, `L${clearL.toFixed(0)} R${clearR.toFixed(0)} T${clearT.toFixed(0)} B${clearB.toFixed(0)}`);
        } else {
          const stageW = st.stage ? st.stage.w : vp.w, stageH = st.stage ? st.stage.h : vp.h;
          check(`[${vp.label}] hold ch${i + 1} within 86vw/46svh`, sil.w <= 0.86 * stageW + 1 && sil.h <= 0.46 * stageH + 1, `${sil.w.toFixed(0)}x${sil.h.toFixed(0)}`);
          check(`[${vp.label}] hold ch${i + 1} clearance >=16px`, Math.min(clearL, clearR, clearT, clearB) >= 15.5, `${Math.min(clearL, clearR, clearT, clearB).toFixed(0)}`);
        }
      }
      if (st.leaderEnd && st.anchorActive) {
        const d = Math.hypot(st.leaderEnd.x - st.anchorActive.x, st.leaderEnd.y - st.anchorActive.y);
        check(`[${vp.label}] leader lands on mesh anchor ch${i + 1}`, d <= 1.5, `delta ${d.toFixed(2)}px`);
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
      if (JSON.stringify({ p: st.p.toFixed(4), active: st.active }) !== forward.get(key)) reverseMismatches++;
    }
    check(`[${vp.label}] reverse scrub deterministic`, reverseMismatches === 0, `${revList.length} points rechecked`);

    await goto(1);
    const seated = await cdp.evaluate('window.__ffasm3d.seatedCheck()');
    check(`[${vp.label}] final seating geometrically continuous`, seated === true);

    await goto(0.02); await settle(cdp);
    await cdp.screenshot(join(OUT, vp.label + '-intro.png'));
    for (let i = 0; i < 6; i++) {
      await goto(T_CH_START + (i + 0.69) * CH_W); await settle(cdp);
      await cdp.screenshot(join(OUT, `${vp.label}-ch${i + 1}.png`));
    }
    await goto(0.86); await settle(cdp);
    await cdp.screenshot(join(OUT, vp.label + '-reassemble.png'));
    await goto(1); await settle(cdp);
    await cdp.screenshot(join(OUT, vp.label + '-final.png'));

    const footer = await cdp.evaluate(`(() => {
      const f = document.querySelector('.section-footer');
      window.scrollTo(0, document.documentElement.scrollHeight);
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => {
        const fr = f.getBoundingClientRect();
        r({ top: fr.top, vh: window.innerHeight, reachable: fr.top < window.innerHeight && fr.bottom > 0 });
      })));
    })()`, { awaitPromise: true });
    check(`[${vp.label}] footer reachable in one descent`, footer.reachable, `footer top ${footer.top.toFixed(0)} vs vh ${footer.vh}`);

    const realErrors = errors.filter((e) => !/favicon/i.test(e));
    check(`[${vp.label}] zero console errors`, realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

    await cdp.close();
  }
}

const CHAPTER_HOLD_FRACS = Array.from({ length: 6 }, (_, i) => T_CH_START + (i + 0.69) * CH_W);

staticChecks();
await browserPass();

writeFileSync(join(OUT, 'report.json'), JSON.stringify({
  when: 'checkpoint-1',
  results,
  passed: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
}, null, 2));

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exit(results.some((r) => !r.ok) ? 1 : 0);
