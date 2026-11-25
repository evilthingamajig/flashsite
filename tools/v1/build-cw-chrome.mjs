#!/usr/bin/env node
/**
 * Build Flash Forward chrome from live-scraped charity:water nav/footer DOM+CSS.
 * - Assembles CSS chunks (NavBar, OffCanvas, footer, icons, tokens, utilities)
 * - Namespaces under .R-cw-chrome
 * - Remaps yellow accent tokens → FF forest green
 * - Writes css/cw-chrome.css
 *
 * HTML chrome itself lives in tools/v1/chrome.mjs (FF labels, CW structure).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SCRAPE = path.join(ROOT, 'tools/scrapes/cw-chrome');
const TMP = path.join(SCRAPE, '_chunks');

function read(name) {
  return fs.readFileSync(path.join(SCRAPE, name), 'utf8');
}

function remapColors(s) {
  return s
    .replace(/#ffca0a/gi, '#2f8f5b')
    .replace(/#ffd53b/gi, '#3d9a68')
    .replace(/#f8eed3/gi, '#e3f0e8')
    .replace(/(--cw-yellow-500:\s*)#[0-9a-fA-F]+/g, '$1#2f8f5b')
    .replace(/(--cw-yellow-450:\s*)#[0-9a-fA-F]+/g, '$1#3d9a68')
    .replace(/(--cw-yellow-300:\s*)#[0-9a-fA-F]+/g, '$1#e3f0e8')
    .replace(/(--ds-v1-button-primary-bg:\s*)#[0-9a-fA-F]+/g, '$1#1e6b45')
    .replace(/(--ds-v1-button-primary-bg-hover:\s*)#[0-9a-fA-F]+/g, '$1#0f3d2a')
    .replace(/(--ds-v1-link-primary-underline:\s*)#[0-9a-fA-F]+/g, '$1#2f8f5b')
    .replace(/(--ds-v1-link-primary-underline-hover:\s*)#[0-9a-fA-F]+/g, '$1#1e6b45')
    .replace(/url\(\/vite\/assets\//g, 'url(https://www.charitywater.org/vite/assets/');
}

/** Walk top-level CSS rules (handles @media nesting one level). */
function walkRules(css) {
  const rules = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (css[i] === '@') {
      const brace = css.indexOf('{', i);
      const semi = css.indexOf(';', i);
      if (brace !== -1 && (semi === -1 || brace < semi)) {
        let depth = 0;
        let j = brace;
        for (; j < n; j++) {
          if (css[j] === '{') depth++;
          else if (css[j] === '}') {
            depth--;
            if (depth === 0) {
              j++;
              break;
            }
          }
        }
        const header = css.slice(i, brace).trim();
        if (/^@(media|supports|container)/i.test(header)) {
          rules.push({ type: 'media', header, inner: css.slice(brace + 1, j - 1) });
        } else if (/^@(keyframes|-webkit-keyframes|font-face|property)/i.test(header)) {
          rules.push({ type: 'raw', text: css.slice(i, j) });
        } else {
          rules.push({ type: 'media', header, inner: css.slice(brace + 1, j - 1) });
        }
        i = j;
        continue;
      }
      if (semi !== -1) {
        rules.push({ type: 'raw', text: css.slice(i, semi + 1) });
        i = semi + 1;
        continue;
      }
    }
    const brace = css.indexOf('{', i);
    if (brace === -1) break;
    const sel = css.slice(i, brace).trim();
    let depth = 0;
    let j = brace;
    for (; j < n; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    if (sel && !sel.startsWith('@')) {
      rules.push({ type: 'rule', sel, body: css.slice(brace, j) });
    }
    i = j;
  }
  return rules;
}

function extractMatching(css, pred) {
  const out = [];
  for (const r of walkRules(css)) {
    if (r.type === 'raw') {
      if (/@font-face/i.test(r.text) && /cw-icons|icomoon/i.test(r.text)) out.push(r.text);
      continue;
    }
    if (r.type === 'media') {
      const kept = [];
      for (const inner of walkRules(r.inner)) {
        if (inner.type === 'rule' && pred(inner.sel)) kept.push(inner.sel + inner.body);
        else if (inner.type === 'raw') kept.push(inner.text);
      }
      if (kept.length) out.push(`${r.header}{${kept.join('')}}`);
      continue;
    }
    if (r.type === 'rule' && pred(r.sel)) out.push(r.sel + r.body);
  }
  return out.join('\n');
}

const original = fs.existsSync(path.join(SCRAPE, 'styles.original.css'))
  ? read('styles.original.css')
  : read('chrome.assembled.css');

const headerHtml = read('header.html') + read('footer.html') + read('offcanvas.html');
const tokens = new Set();
for (const m of headerHtml.matchAll(/class="([^"]*)"/g)) {
  for (const t of m[1].split(/\s+/)) if (t && t !== 'true' && t !== 'false') tokens.add(t);
}

const footerKeys = [
  'cw-footer', 'mailing-list', 'trust-banner', 'disclaimer-text', 'lead-form',
  'country-footer', 'country-f', 'footer-country', 'footer-email', 'h70', 'h80',
  'p40', 'theme-maji', 'bg-grey-5', 'text-cw-black', 'text-grey-50', 'button--expand',
  'mailing-input', 'for-screen-readers', 'cw-footer-header', 'cw-footer-emph',
  'cw-footer-top-row', 'cw-footer-secondary', 'cw-footer-social',
];
const brandKeys = [
  'bg-cw-brand-yellow', 'text-cw-brand-grey', 'bg-cw-white', 'border-cw-brand',
  'border-grey-50', 'border-grey-30', 'text-cw-black', 'theme-design-system',
  'heading-xs', 'heading-s', 'heading-m', 'body-s', 'body-m', 'cw-button',
  'cw-link--primary', 'donate-link', 'bg-cw-brand-yellow-100', 'bg-cw-brand-yellow-300',
];

const varBlocks = [];
for (const m of original.matchAll(/(?::root|\[css--display-mode[^\]]*\])[^{]*\{[^}]+\}/g)) {
  if (/--cw-|--ds-v1-|--global-|--spacing-/.test(m[0])) varBlocks.push(m[0]);
}

const footerCss = extractMatching(original, (sel) => footerKeys.some((k) => sel.includes(k)));
const brandCss = extractMatching(original, (sel) => brandKeys.some((k) => sel.includes(k)));
const utilCss = extractMatching(original, (sel) => {
  if (sel.length > 120) return false;
  if (/\.nav-bar|\.cw-footer|\.right-off-canvas|\.dropdown/.test(sel)) return false;
  const parts = [...sel.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)].map((x) => x[1]);
  return parts.length > 0 && parts.every((p) => tokens.has(p));
});

// Icon rules from application file
let iconCss = '';
try {
  const appFile = fs.readdirSync(SCRAPE).find((f) => f.startsWith('raw-application'));
  if (appFile) iconCss = read(appFile);
} catch { /* ignore */ }

const navFile = fs.readdirSync(SCRAPE).find((f) => f.startsWith('raw-NavBar'));
const offFile = fs.readdirSync(SCRAPE).find((f) => f.startsWith('raw-OffCanvas'));
const navCss = navFile ? read(navFile) : '';
const offCss = offFile ? read(offFile) : '';

fs.mkdirSync(TMP, { recursive: true });
const chunks = {
  '01-vars': varBlocks.join('\n'),
  '02-icons': iconCss,
  '03-nav': navCss,
  '04-offcanvas': offCss,
  '05-footer': footerCss,
  '06-brand': brandCss,
  '07-utils': utilCss,
};

const namespacedParts = [];
for (const [name, css] of Object.entries(chunks)) {
  if (!css.trim()) continue;
  const slug = `_cw_${name}`;
  const dir = path.join(ROOT, 'tools/scrapes', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'styles.raw.css'), remapColors(css));
  const r = spawnSync('node', [path.join(ROOT, 'tools/namespace-css.mjs'), slug], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  let scoped = fs.readFileSync(path.join(ROOT, 'css', `${slug}.css`), 'utf8');
  // Drop the per-chunk banner after the first
  if (namespacedParts.length) {
    scoped = scoped.replace(/^\/\* Namespaced scrape:[\s\S]*?\*\/\n\.R-[^\n]+\n\.R-[^\n]+\n\n/, '');
    // fix scope class name to cw-chrome
    scoped = scoped.replaceAll(`.R-${slug}`, '.R-cw-chrome');
  } else {
    scoped = scoped.replaceAll(`.R-${slug}`, '.R-cw-chrome');
    scoped = scoped.replace(`Namespaced scrape: ${slug}`, 'Namespaced scrape: cw-chrome');
  }
  namespacedParts.push(scoped);
  // cleanup temp slug artifacts
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, 'css', `${slug}.css`), { force: true });
}

// Body-level off-canvas state: class lands on <body class="R-cw-chrome off-canvas-open">
let joined = namespacedParts.join('\n\n');
joined = joined
  .replaceAll('.R-cw-chrome .off-canvas-open ', '.R-cw-chrome.off-canvas-open ')
  .replaceAll('.R-cw-chrome .off-canvas-animate-then-close ', '.R-cw-chrome.off-canvas-animate-then-close ')
  .replace(
    /\.R-cw-chrome \.off-canvas-open\{/g,
    '.R-cw-chrome.off-canvas-open{',
  )
  .replace(
    /\.R-cw-chrome \.off-canvas-animate-then-close\{/g,
    '.R-cw-chrome.off-canvas-animate-then-close{',
  );

// Critical fixes: vars on scope, responsive utilities, underline, donate, logo, off-canvas
joined += fs.readFileSync(path.join(__dirname, 'cw-chrome-overrides.css'), 'utf8');

fs.writeFileSync(path.join(ROOT, 'css/cw-chrome.css'), joined);
fs.writeFileSync(path.join(SCRAPE, 'chrome.assembled.css'), remapColors([
  chunks['01-vars'], chunks['02-icons'], chunks['03-nav'], chunks['04-offcanvas'],
  chunks['05-footer'], chunks['06-brand'], chunks['07-utils'],
].join('\n\n')));

console.log(JSON.stringify({
  ok: true,
  out: 'css/cw-chrome.css',
  bytes: joined.length,
  chunks: Object.fromEntries(Object.entries(chunks).map(([k, v]) => [k, v.length])),
}, null, 2));
