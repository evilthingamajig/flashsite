#!/usr/bin/env node
/**
 * Stitch a scraped peer main into an FF page shell.
 *
 * Usage:
 *   node tools/stitch-page.mjs \
 *     --slug oaf-impact \
 *     --target impact/index.html \
 *     --shell about/index.html \
 *     --title "Impact — Flash Forward" \
 *     --css-list "pih-home.css,oaf-impact.css,base.css,theme.css,ff-template.css,contrast.css" \
 *     [--trim-watts] \
 *     [--body-class ff-page-impact]
 *
 * Expects tools/scrapes/<slug>/main.html (+ styles.raw.css or trimmed).
 * Writes namespaced css/<slug>.css and rewrites target HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}
function has(name) {
  return process.argv.includes(`--${name}`);
}

const slug = arg('slug');
const targetRel = arg('target');
const shellRel = arg('shell', 'about/index.html');
const title = arg('title');
const cssList = arg(
  'css-list',
  `pih-home.css,${slug}.css,base.css,theme.css,ff-template.css,contrast.css`,
);
const bodyClass = arg('body-class', `ff ff-page-${slug}`);
const canonical = arg('canonical', '');

if (!slug || !targetRel || !title) {
  console.error('Need --slug --target --title');
  process.exit(1);
}

const scrapeDir = path.join(ROOT, 'tools', 'scrapes', slug);
const mainPath = path.join(scrapeDir, 'main.html');
if (!fs.existsSync(mainPath)) {
  console.error('Missing', mainPath);
  process.exit(1);
}

// Optional Watts trim: keep site + static + custom + a few component sheets
if (has('trim-watts')) {
  const keep = [
    'raw-site.css',
    'raw-static.css',
    'raw-custom.css',
    'raw-5b8f4cabb3fb1481-min.en-US.css',
    'raw-d92bd0f161fc0505-min.en-US.css',
    'raw-website.components.imageFluid.styles.css',
    'raw-website.components.imageLayout.styles.css',
    'raw-website.components.button.styles.css',
    'raw-website.components.html.styles.css',
    'raw-website.components.shape.styles.css',
    'raw-website.components.spacer.styles.css',
  ];
  const chunks = [];
  for (const f of keep) {
    const p = path.join(scrapeDir, f);
    if (fs.existsSync(p)) chunks.push(`/* ${f} */\n` + fs.readFileSync(p, 'utf8'));
  }
  // also keep inline styles from styles.raw.css
  const raw = fs.readFileSync(path.join(scrapeDir, 'styles.raw.css'), 'utf8');
  const inline = raw.split(/\/\* inline style \d+ \*\//).slice(1);
  for (const [i, block] of inline.entries()) {
    chunks.push(`/* inline style ${i + 1} */\n${block}`);
  }
  fs.writeFileSync(path.join(scrapeDir, 'styles.raw.css'), chunks.join('\n\n'));
  console.log('trimmed watts css →', chunks.join('').length, 'bytes');
}

// Namespace CSS
const ns = spawnSync('node', [path.join(__dirname, 'namespace-css.mjs'), slug], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (ns.status !== 0) {
  console.error(ns.stderr || ns.stdout);
  process.exit(ns.status || 1);
}
console.log(ns.stdout.trim());

let mainHtml = fs.readFileSync(mainPath, 'utf8');
// If scrape returned a <main>, unwrap to inner; we'll wrap ourselves
const mainMatch = mainHtml.match(/^<main[^>]*>([\s\S]*)<\/main>\s*$/i);
if (mainMatch) mainHtml = mainMatch[1];

// Strip peer chrome that duplicates FF header/footer when present inside fragment
mainHtml = mainHtml
  .replace(/<header[\s\S]*?<\/header>/gi, (m) =>
    /sqs-header|w-nav|navbar|site-header|Header/i.test(m) ? '<!-- peer header stripped -->' : m,
  )
  .replace(/<footer[\s\S]*?<\/footer>/gi, '<!-- peer footer stripped -->');

// Generic peer → FF text replacements (safe-ish brand swaps)
const repls = [
  [/Watts of Love/gi, 'Flash Forward'],
  [/WattsofLove/gi, 'FlashForward'],
  [/Lighthouse Model/gi, 'Study Unlock Pathway'],
  [/One Acre Fund/gi, 'Flash Forward'],
  [/New Story/gi, 'Flash Forward'],
  [/GiveDirectly/gi, 'Flash Forward'],
  [/charity:\s*water/gi, 'Flash Forward'],
  [/CodePath/gi, 'Flash Forward'],
  [/Claude Corps/gi, 'Internship tracks'],
  [/The Spring/gi, 'Study Circle'],
  [/100%\s*Model/gi, 'Trust Model'],
];
for (const [re, to] of repls) mainHtml = mainHtml.replace(re, to);

const hidePeerChrome = `
<style>
.R-${slug} .header-announcement-bar-wrapper,
.R-${slug} .header-inner,
.R-${slug} .sqs-cookie-banner-v2-wrapper,
.R-${slug} [data-header-fixed],
.R-${slug} .w-nav,
.R-${slug} .navbar,
.R-${slug} footer.footer,
.R-${slug} .footer-wrapper,
.R-${slug} #footer,
.R-${slug} .site-footer { display:none!important }
.R-${slug} .w-slide, .R-${slug} [style*="opacity: 0"] { opacity:1!important; visibility:visible!important }
</style>`;

const stitchedMain = `<main id="main" class="R-${slug} ff-main" data-ref="${slug}"><div class="content-body">
${hidePeerChrome}
${mainHtml}
</div></main>`;

// Load shell
const shellPath = path.join(ROOT, shellRel);
let shell = fs.readFileSync(shellPath, 'utf8');

// Extract head-before-body through nav end from shell; keep footer after </main>
const mainStart = shell.search(/<main\b/i);
const mainEnd = shell.search(/<\/main>/i);
if (mainStart < 0 || mainEnd < 0) {
  console.error('Shell missing <main>');
  process.exit(1);
}
const before = shell.slice(0, mainStart);
const after = shell.slice(mainEnd + '</main>'.length);

let page = before + stitchedMain + after;

// Update title
page = page.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
page = page.replace(/property="og:title" content="[^"]*"/i, `property="og:title" content="${title}"`);

// Update body class
page = page.replace(/<body[^>]*>/i, `<body class="${bodyClass}">`);

// Update ff:css markers (both open style block and empty twin)
page = page.replace(
  /<!--ff:css [^>]+-->/g,
  `<!--ff:css ${cssList}-->`,
);

if (canonical) {
  page = page.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${canonical}">`,
  );
  page = page.replace(
    /property="og:url" content="[^"]*"/,
    `property="og:url" content="${canonical}"`,
  );
}

const targetPath = path.join(ROOT, targetRel);
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, page);
console.log(JSON.stringify({ ok: true, slug, target: targetRel, bytes: page.length }, null, 2));
