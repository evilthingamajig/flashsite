// Flash Forward build: per-page CSS inline, fonts, icons, images, JS, SEO.
// Idempotent — re-runnable. Run: cd tools && node build.mjs
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PurgeCSS } from 'purgecss';
import * as lightningcss from 'lightningcss';
import * as esbuild from 'esbuild';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const H = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);
const pages = [];
function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (f !== 'ref') walk(p); }
    else if (f === 'index.html') pages.push(p);
  }
}
walk(ROOT);

const metrics = JSON.parse(readFileSync(join(ROOT, 'tools/img-metrics.json')));
const vmetrics = existsSync(join(ROOT, 'tools/video-metrics.json')) ? JSON.parse(readFileSync(join(ROOT, 'tools/video-metrics.json'))) : [];
const variants = JSON.parse(readFileSync(join(ROOT, 'tools/img-variants.json')));
const lcpMap = existsSync(join(ROOT, 'tools/lcp.json')) ? JSON.parse(readFileSync(join(ROOT, 'tools/lcp.json'))) : {};
const ogMap = existsSync(join(ROOT, 'tools/og-map.json')) ? JSON.parse(readFileSync(join(ROOT, 'tools/og-map.json'))) : {};

const urlPath = (f) => f.replace(ROOT, '').replace(/\/index\.html$/, '/') || '/';
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const FA = {
  'fa-bars': ['0 0 448 512', 'M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z'],
  'fa-magnifying-glass': ['0 0 512 512', 'M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z'],
  'fa-envelope': ['0 0 512 512', 'M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54.17 17.1-76.8 0L0 176z'],
  'fa-map-marker': ['0 0 384 512', 'M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 256a64 64 0 1 1 0 128 64 64 0 1 1 0-128z'],
  'fa-instagram': ['0 0 448 512', 'M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z'],
  'fa-discord': ['0 0 640 512', 'M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z'],
  'fa-toggle-on': ['0 0 576 512', 'M192 64C86 64 0 150 0 256S86 448 192 448H384c106 0 192-86 192-192s-86-192-192-192H192zm192 96a96 96 0 1 1 0 192 96 96 0 1 1 0-192z'],
};
function svgFor(key, classes) {
  const [vb, d] = FA[key];
  return `<i class="${classes}" aria-hidden="true"><svg viewBox="${vb}" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg></i>`;
}

import { copyFileSync, rmSync } from 'node:fs';
const FONT_SRC = join(ROOT, 'tools', 'fonts-src');
const fonts = {};
for (const f of readdirSync(FONT_SRC)) {
  if (!f.endsWith('.woff2')) continue;
  const stem = f.replace(/\.woff2$/, '');
  const h = H(readFileSync(join(FONT_SRC, f)));
  const hashed = `${stem}.${h}.woff2`;
  copyFileSync(join(FONT_SRC, f), join(ROOT, 'fonts', hashed));
  fonts[stem] = `/fonts/${hashed}`;
}
for (const f of readdirSync(join(ROOT, 'fonts'))) {
  if (!Object.values(fonts).includes(`/fonts/${f}`)) rmSync(join(ROOT, 'fonts', f));
}
const FONT_CSS = [
  `@font-face{font-family:"Merriweather";src:url("${fonts['merriweather-900']}") format("woff2");font-weight:900;font-style:normal;font-display:swap}`,
  `@font-face{font-family:"Merriweather";src:url("${fonts['merriweather-700']}") format("woff2");font-weight:700;font-style:normal;font-display:swap}`,
  `@font-face{font-family:"Merriweather";src:url("${fonts['merriweather-400']}") format("woff2");font-weight:400;font-style:normal;font-display:swap}`,
  `@font-face{font-family:"Source Sans 3";src:url("${fonts['sourcesans3-400']}") format("woff2");font-weight:400;font-style:normal;font-display:swap}`,
  `@font-face{font-family:"Source Sans 3";src:url("${fonts['sourcesans3-600']}") format("woff2");font-weight:600;font-style:normal;font-display:swap}`,
  `@font-face{font-family:"Source Sans 3";src:url("${fonts['sourcesans3-700']}") format("woff2");font-weight:700;font-style:normal;font-display:swap}`,
  `@font-face{font-family:"Source Sans 3";src:url("${fonts['sourcesans3-italic']}") format("woff2");font-weight:400;font-style:italic;font-display:swap}`,
  `@font-face{font-family:"Merriweather Fallback";src:local("Liberation Serif"),local("Georgia");font-display:swap;font-weight:400;font-style:normal;size-adjust:115.9%;ascent-override:84.9%;descent-override:23.55%;line-gap-override:0%}`,
  `@font-face{font-family:"Merriweather Fallback";src:local("Liberation Serif Bold"),local("Georgia Bold");font-display:swap;font-weight:700;font-style:normal;size-adjust:116.3%;ascent-override:84.61%;descent-override:23.47%;line-gap-override:0%}`,
  `@font-face{font-family:"Merriweather Fallback";src:local("Liberation Serif Bold"),local("Georgia Bold");font-display:swap;font-weight:900;font-style:normal;size-adjust:119.2%;ascent-override:82.55%;descent-override:22.9%;line-gap-override:0%}`,
  `@font-face{font-family:"Source Sans 3 Fallback";src:local("Liberation Sans"),local(Arial);font-display:swap;font-weight:400;font-style:normal;size-adjust:95.7%;ascent-override:107.0%;descent-override:41.8%;line-gap-override:0%}`,
  `@font-face{font-family:"Source Sans 3 Fallback";src:local("Liberation Sans Bold"),local("Arial Bold");font-display:swap;font-weight:600;font-style:normal;size-adjust:86.8%;ascent-override:117.97%;descent-override:46.08%;line-gap-override:0%}`,
  `@font-face{font-family:"Source Sans 3 Fallback";src:local("Liberation Sans Bold"),local("Arial Bold");font-display:swap;font-weight:700;font-style:normal;size-adjust:93.1%;ascent-override:109.99%;descent-override:42.96%;line-gap-override:0%}`,
  `@font-face{font-family:"Source Sans 3 Fallback";src:local("Liberation Sans Italic"),local("Arial Italic");font-display:swap;font-weight:400;font-style:italic;size-adjust:95.7%;ascent-override:107.0%;descent-override:41.8%;line-gap-override:0%}`,

].join('');

async function minjs(src, outStem) {
  const r = await esbuild.transform(readFileSync(join(ROOT, src), 'utf8'), { minify: true });
  const name = `${outStem}.${H(r.code)}.js`;
  writeFileSync(join(ROOT, 'js', name), r.code);
  return `/js/${name}`;
}
const jsSite = await minjs('site.js', 'site');
const jsScript = await minjs('js/script.js', 'script');
const jsMap = await minjs('js/ff-map.js', 'ff-map');
for (const f of readdirSync(join(ROOT, 'js'))) {
  if (/(site|script|ff-map)\.[0-9a-f]{8}\.js$/.test(f) && ![jsSite, jsScript, jsMap].includes(`/js/${f}`)) rmSync(join(ROOT, 'js', f));
}

const GATAG = `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-38F7LJZ8ST');</script>
<script>(function(){var u='https://www.googletagmanager.com/gtag/js?id=G-38F7LJZ8ST';var done=false;function load(){if(done)return;done=true;var s=document.createElement('script');s.async=true;s.src=u;document.head.appendChild(s)}if('requestIdleCallback' in window)requestIdleCallback(load,{timeout:3500});else window.setTimeout(load,3500);['pointerdown','keydown','scroll'].forEach(function(e){window.addEventListener(e,load,{once:true,passive:true,capture:true})})})();</script>`;

const FONT_PRELOAD = `<link rel="preload" as="font" type="font/woff2" href="${fonts['sourcesans3-400']}" crossorigin><link rel="preload" as="font" type="font/woff2" href="${fonts['merriweather-900']}" crossorigin><link rel="preload" as="font" type="font/woff2" href="${fonts['merriweather-700']}" crossorigin>`;

function rewriteFamilies(css) {
  return css
    .replace(/(["']?)Merriweather\1\s*,\s*Georgia\s*,\s*serif/g, '"Merriweather","Merriweather Fallback",Georgia,serif')
    .replace(/(["']?)Source Sans 3\1\s*,\s*sans-serif/g, '"Source Sans 3","Source Sans 3 Fallback",sans-serif');
}

const baseSrc = (src) => {
  const m = src.match(/^(.*)-(?:480|800|1200|1600)\.(webp|jpe?g|png)$/);
  if (m) for (const e of ['.webp', '.jpg', '.jpeg', '.png'])
    if (existsSync(ROOT + m[1] + e)) return m[1] + e;
  return src;
};
const unopt = (src) => {
  if (!src.includes('/opt/')) return src;
  const ms = [...src.matchAll(/\/(frames|images)\//g)];
  if (!ms.length) return src;
  let tail = src.slice(ms[ms.length - 1].index);
  tail = tail.replace(/\.w\d+\.[0-9a-f]{8}/g, '').replace(/\/opt\//g, '/');
  for (const e of ['.webp', '.jpg', '.jpeg', '.png']) {
    const cand = /\.(webp|jpe?g|png)$/.test(tail) ? tail.replace(/\.\w+$/, e) : tail + e;
    if (existsSync(ROOT + cand)) return cand;
  }
  return src;
};

const report = [];
const ldData = JSON.parse(readFileSync(join(ROOT, 'tools/ld.json')));

const BASE = 'https://flashforwardfoundation.org';
const LD_ORG = {"@type":"NGO","@id":BASE+"/#org","name":"Flash Forward Foundation","alternateName":"Flash Forward","url":BASE+"/","logo":{"@type":"ImageObject","url":BASE+"/images/brand/mark-green.png"},"description":"Student-run 501(c)(3) nonprofit in Bellevue, Washington that builds $5.17 solar study lights for students without electricity.","foundingDate":"2024","foundingLocation":{"@type":"Place","name":"Bellevue, Washington"},"nonprofitStatus":"https://schema.org/Nonprofit501c3","taxID":"39-3605570","email":"about@flashforwardfoundation.org","address":{"@type":"PostalAddress","streetAddress":"1402 153rd Pl SE","addressLocality":"Bellevue","addressRegion":"WA","postalCode":"98007","addressCountry":"US"},"areaServed":["Haiti","India","Democratic Republic of the Congo"],"sameAs":["https://www.instagram.com/flashforwardfoundation/"]};
const LD_SITE = {"@type":"WebSite","@id":BASE+"/#website","name":"Flash Forward Foundation","url":BASE+"/","publisher":{"@id":BASE+"/#org"},"inLanguage":"en","potentialAction":{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":BASE+"/search/?q={search_term_string}"},"query-input":"required name=search_term_string"}};
const CRUMB_LABELS = {'/our-work/':'Our Work','/get-involved/':'Get Involved','/about/':'Our Story','/news/':'News & Notes'};
const FAQ_PAGES = new Set(['/faq/','/donate/','/get-involved/','/get-involved/internship/','/news/why-study-lights/']);
const unent = (t) => t.replace(/&amp;/g,'&').replace(/&rsquo;/g,'\u2019').replace(/&lsquo;/g,'\u2018').replace(/&ldquo;/g,'\u201c').replace(/&rdquo;/g,'\u201d').replace(/&ndash;/g,'\u2013').replace(/&mdash;/g,'\u2014').replace(/&nbsp;/g,'\xa0').replace(/&#039;/g,"'").replace(/<[^>]+>/g,'').trim();

for (const file of pages.sort()) {
  const rel = urlPath(file);
  let html = readFileSync(file, 'utf8');
  html = html.replace(/<!--ff:ld-->[\s\S]*?<!--\/ff:ld-->|<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');

  let list;
  const marker = html.match(/<!--ff:css ([^>]*)-->/);
  if (marker) list = marker[1].split(',');
  else list = [...html.matchAll(/<link rel="stylesheet" href="(\/css\/[^"]+)">/g)].map(m => m[1].replace('/css/', ''));

  html = html.replace(/<link rel="preload" as="style" href="https:\/\/cdnjs\.cloudflare\.com[^>]*>\s*(<noscript><link[^>]*><\/noscript>)?\s*/g, '');
  html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, '');
  html = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '');
  html = html.replace(/<link rel="stylesheet" href="\/css\/[^"]+">\s*/g, '');
  html = html.replace(/<!--ff:css [^>]*--><style>[\s\S]*?<\/style><!--\/ff:css-->\s*/g, '');
  html = html.replace(/<link rel="preload" as="(?:font|image)"[^>]*>\s*/g, '');

  const raw = list.map(c => readFileSync(join(ROOT, 'css', c), 'utf8')).join('\n');
  const content = [{ raw: html, extension: 'html' }, join(ROOT, 'site.js'), join(ROOT, 'js/ff-map.js'), join(ROOT, 'js/script.js')];
  if (list.includes('ff-map.css')) content.push(join(ROOT, 'images/flashforward/world-interactive.svg'));
  const pc = await new PurgeCSS().purge({
    content,
    css: [{ raw }],
    fontFace: true,
    safelist: { standard: [/^is-/, /^has-/, /^mobile-map/], greedy: [/^src$/] },
  });
  const merged = FONT_CSS + rewriteFamilies(pc[0].css);
  let min = lightningcss.transform({ filename: 'inline.css', code: Buffer.from(merged), minify: true, errorRecovery: true }).code.toString();
  min = min.replace(/"[^"]*[\uE000-\uF8FF][^"]*"/g, '""').replace(/content:"\\[uU]\{?[fF][0-9a-fA-F]{3}\}?"|content:"\\[fF][0-9a-fA-F]{3}"/g, 'content:""');
  const cssBlock = `<!--ff:css ${list.join(',')}--><style>${min}</style><!--/ff:css-->`;

  const ICONS = [
    ['fa-bars', 'fa-solid fa-bars'],
    ['fa-magnifying-glass', 'fa-solid fa-magnifying-glass'],
    ['fa-envelope', 'fa fa-envelope'],
    ['fa-map-marker', 'fa fa-map-marker'],
    ['fa-instagram', 'fa-brands fa-instagram'],
    ['fa-discord', 'fa-brands fa-discord'],
    ['fa-toggle-on', 'fa-solid fa-toggle-on ff-part__icon'],
  ];
  for (const [key, cls] of ICONS) {
    const [vb, d] = FA[key];
    const inner = `<svg style="display:block" viewBox="${vb}" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
    const wrapped = `<i class="${cls}" style="display:inline-block;line-height:1" aria-hidden="true">${inner}</i>`;
    const vbRe = vb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const clsRe = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefix = d.slice(0, 14).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`(?:<i class="${clsRe}"[^>]*>\\s*)+(?:<svg[^>]*>.*?</svg>)?\\s*(?:</i>\\s*)+`, 'g'), wrapped);
    html = html.replace(new RegExp(`(?<!<i class="${clsRe}"[^>]*>)<svg[^>]*viewBox="${vbRe}"[^>]*><path d="${prefix}[^"]*"/></svg>`, 'g'), wrapped);
  }

  const pageMetrics = metrics.filter(m => m.page === rel);
  const pageVids = vmetrics.filter(m => m.page === rel).sort((a, b) => a.idx - b.idx);
  const sizeSegs = (met) => {
    if (!met) return '100vw';
    const segs = [
      ['(max-width: 767px)', met.w['390x844'], 390],
      ['(max-width: 1023px)', met.w['768x1024'], 768],
      ['(max-width: 1439px)', met.w['1024x768'], 1024],
      [null, met.w['1440x900'], 1440],
    ].filter(([, meas]) => meas != null && meas > 0);
    if (!segs.length) return '100vw';
    const vals = segs.map(([, meas, vw]) => `max(${meas}px, ${Math.ceil(meas / vw * 100) + 4}vw)`);
    const out = [];
    let prev = null;
    segs.forEach(([cond], i) => {
      if (vals[i] !== prev) out.push({ cond, val: vals[i] });
      else out[out.length - 1].cond = cond;
      prev = vals[i];
    });
    const last = out[out.length - 1];
    last.cond = null;
    return out.map(({ cond, val }) => (cond ? `${cond} ${val}` : val)).join(', ');
  };
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const src = (tag.match(/src="([^"]+)"/) || [])[1];
    if (!src || !(src.startsWith('/images/') || src.startsWith('/frames/')) || src.startsWith('/images/brand/') || src.endsWith('.svg')) return tag;
    const base = baseSrc(unopt(src));
    const v = variants[base];
    if (!v) return tag;
    const lookup = base;
    const met = pageMetrics.find(m => unopt(baseSrc(m.orig || '')) === lookup || unopt(baseSrc(m.src)) === lookup) || pageMetrics.find(m => m.src === src);
    const srcVar = v.v.find(x => x.w === 800) || v.v[v.v.length - 1];
    const srcset = v.v.map(x => `${x.src} ${x.w}w`).join(', ');
    const sizes = ` sizes="${sizeSegs(met)}"`;
    let t = tag
      .replace(/\ssrc="[^"]*"/, ` src="${srcVar.src}"`)
      .replace(/\ssrcset="[^"]*"/, '')
      .replace(/\ssizes="[^"]*"/, '')
      .replace(/\swidth="\d+"/, ` width="${v.nw}"`)
      .replace(/\sheight="\d+"/, ` height="${v.nh}"`)
      .replace(/\sdecoding="[^"]*"/, '')
      .replace(/\sloading="[^"]*"/, '')
      .replace(/\sfetchpriority="[^"]*"/, '');
    if (!/\swidth="/.test(t)) t = t.replace(/<img/, `<img width="${v.nw}"`);
    if (!/\sheight="/.test(t)) t = t.replace(/<img/, `<img height="${v.nh}"`);
    t = t.replace(/<img/, `<img srcset="${srcset}"${sizes}`);
    t = t.replace(/<img/, '<img decoding="async"');
    const top390 = met && met.t['390x844'], top1440 = met && met.t['1440x900'];
    const eager = (top390 != null && top390 < 844) || (top1440 != null && top1440 < 900);
    if (process.env.DBG) console.log(rel, src, 'eager=', eager);
    if (!eager) t = t.replace(/<img/, '<img loading="lazy"');
    return t;
  });

  let vidIdx = 0;
  html = html.replace(/<video\b[^>]*>/g, (tag) => {
    const psrc = (tag.match(/\sdata-poster="([^"]+)"/) || tag.match(/\sposter="([^"]+)"/) || [])[1];
    const vm = pageVids[vidIdx];
    vidIdx++;
    if (!psrc) return tag;
    const base = baseSrc(unopt(psrc));
    const v = variants[base];
    if (!v) return tag;
    const renderW = vm ? Math.max(...Object.values(vm.w).filter(Boolean)) : 800;
    const pv = v.v.find(x => x.w >= renderW) || v.v[v.v.length - 1];
    const top390 = vm && vm.t['390x844'], top1440 = vm && vm.t['1440x900'];
    const eager = (top390 != null && top390 < 844) || (top1440 != null && top1440 < 900) || vidIdx === 1;
    let t = tag.replace(/\sdata-poster="[^"]*"/, '').replace(/\sposter="[^"]*"/, '');
    if (eager) t = t.replace(/<video/, `<video poster="${pv.src}"`);
    else t = t.replace(/<video/, `<video data-poster="${pv.src}"`);
    return t;
  });

  const lcp = lcpMap[rel];
  if (lcp && lcp.img) {
    const base = baseSrc(unopt(lcp.img));
    const v = variants[base];
    if (v) {
      const stem = basename(base).replace(/\.[^.]+$/, '');
      html = html.replace(new RegExp(`<img(?![^>]*fetchpriority)[^>]*srcset="[^"]*${escRe(stem)}\\.`, 'm'),
        (m) => m.replace('<img', '<img fetchpriority="high"').replace('decoding="async"', 'decoding="sync"'));
      const srcset = v.v.map(x => `${x.src} ${x.w}w`).join(', ');
      const met = pageMetrics.find(m => unopt(baseSrc(m.src)) === base) || pageMetrics.find(m => m.src === lcp.img);
      const sizes = sizeSegs(met);
      const pre = `<link rel="preload" as="image" imagesrcset="${srcset}" imagesizes="${sizes}" fetchpriority="high">`;
      html = html.replace(/<link rel="icon" href="\/images\/brand\/favicon-32\.png"[^>]*>/, (m) => m + '\n' + pre);
    }
  }

  html = html.replace(/<script>window\.addEventListener\('load',function\(\)\{var s=document\.createElement\('script'\);s\.async=true;s\.src='https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-38F7LJZ8ST';document\.head\.appendChild\(s\)\}\);<\/script>\s*<script>window\.dataLayer[\s\S]*?<\/script>/, GATAG);

  html = html.replace(/<script src="\/site\.js" defer><\/script>|<script defer src="\/site\.js"><\/script>/g, `<script src="${jsSite}" defer></script>`);
  html = html.replace(/<script defer data-domain="([^"]+)" src="\/js\/script\.js"><\/script>/g, `<script defer data-domain="$1" src="${jsScript}"></script>`);
  html = html.replace(/<script defer src="\/js\/ff-map\.js"><\/script>/g, `<script defer src="${jsMap}"></script>`);
  html = html.replace(/src="\/js\/site\.[0-9a-f]{8}\.js"/g, `src="${jsSite}"`).replace(/src="\/js\/script\.[0-9a-f]{8}\.js"/g, `src="${jsScript}"`).replace(/src="\/js\/ff-map\.[0-9a-f]{8}\.js"/g, `src="${jsMap}"`);

  const canon = (html.match(/rel="canonical" href="([^"]+)"/) || [])[1];
  html = html.replace(/<h3>([^<]*)<\/h2>/g, '<h3>$1</h3>');
  html = html.replace(/<meta property="og:[^"]+"[^>]*>\s*/g, '').replace(/<meta name="twitter:[^"]+"[^>]*>\s*/g, '');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Flash Forward Foundation';
  const desc = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
  const isArticle = rel.startsWith('/news/') && rel !== '/news/';
  const ogTitle = title.replace(/ \| Flash Forward.*$/, '');
  let ogImg = 'https://flashforwardfoundation.org/images/brand/og-image.jpg', ogW = 1200, ogH = 630, ogAlt = 'Flash Forward Foundation';
  if (ogMap[rel]) {
    ogImg = 'https://flashforwardfoundation.org' + ogMap[rel];
    const m2 = html.match(/ff-pagehead__media[\s\S]{0,400}?<img[^>]*alt="([^"]*)"/);
    ogAlt = (m2 && m2[1]) || ogTitle;
  }
  const og = [
    `<meta property="og:type" content="${isArticle ? 'article' : 'website'}">`,
    `<meta property="og:title" content="${ogTitle}">`,
    `<meta property="og:description" content="${desc}">`,
    `<meta property="og:url" content="${canon || 'https://flashforwardfoundation.org' + rel}">`,
    `<meta property="og:site_name" content="Flash Forward Foundation">`,
    `<meta property="og:image" content="${ogImg}">`,
    `<meta property="og:image:width" content="${ogW}">`,
    `<meta property="og:image:height" content="${ogH}">`,
    `<meta property="og:image:alt" content="${ogAlt}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${ogTitle}">`,
    `<meta name="twitter:description" content="${desc}">`,
    `<meta name="twitter:image" content="${ogImg}">`,
  ].join('\n');
  html = html.replace(/(<link rel="icon")/, og + '\n$1');

  html = html.replace(/(<link rel="apple-touch-icon"[^>]*>)/, `$1\n${FONT_PRELOAD}\n${cssBlock}`);

  html = rewriteFamilies(html);

  const h1text = unent((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || title);
  const canonUrl = canon || (BASE + rel);
  const graph = [JSON.parse(JSON.stringify(LD_ORG)), JSON.parse(JSON.stringify(LD_SITE))];
  if (rel === '/donate/') graph[0].potentialAction = {"@type":"DonateAction","target":BASE+"/donate/","recipient":{"@id":BASE+"/#org"}};
  if (rel !== '/') {
    const parts = rel.split('/').filter(Boolean);
    const items = [{"@type":"ListItem","position":1,"name":"Home","item":BASE+"/"}];
    let pos = 2;
    for (let i = 1; i < parts.length; i++) {
      const p = '/' + parts.slice(0, i).join('/') + '/';
      const f = join(ROOT, p, 'index.html');
      if (!existsSync(f)) continue;
      const ah1 = CRUMB_LABELS[p] || unent(((readFileSync(f, 'utf8').match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || p));
      items.push({"@type":"ListItem","position":pos++,"name":ah1,"item":BASE+p});
    }
    items.push({"@type":"ListItem","position":pos,"name":h1text,"item":canonUrl});
    graph.push({"@type":"BreadcrumbList","itemListElement":items});
  }
  if (isArticle) {
    const dp = (ldData[rel] || {}).datePublished;
    if (dp) graph.push({"@type":"NewsArticle","@id":canonUrl+'#article',"headline":h1text,"description":desc,"image":[ogImg],"datePublished":dp,"dateModified":"2026-10-11","author":{"@type":"Organization","@id":BASE+"/#org","name":"Flash Forward Foundation","url":BASE+"/about/team/"},"publisher":{"@id":BASE+"/#org"},"mainEntityOfPage":canonUrl,"inLanguage":"en"});
  }
  if (rel === '/about/team/') {
    for (const m of html.matchAll(/<div class="ff-card" id="([\w-]+)">[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?ff-card__title">([^<]+)<[\s\S]*?ff-card__meta">([^<]+)</g))
      graph.push({"@type":"Person","@id":BASE+"/about/team/#"+m[1],"name":unent(m[3]),"jobTitle":unent(m[4]),"image":BASE+m[2],"worksFor":{"@id":BASE+"/#org"}});
  }
  if (FAQ_PAGES.has(rel)) {
    const qa = [];
    for (const m of html.matchAll(/<(?:details|div) class="ff-faq"[\s\S]*?(?:<summary>([\s\S]*?)<\/summary>|<h3>([\s\S]*?)<\/h3>)[\s\S]*?<p>([\s\S]*?)<\/p>/g))
      qa.push({"@type":"Question","name":unent(m[1]||m[2]),"acceptedAnswer":{"@type":"Answer","text":unent(m[3])}});
    if (qa.length) graph.push({"@type":"FAQPage","mainEntity":qa});
  }
  if (rel === '/') graph.push({"@type":"WebPage","@id":BASE+"/#webpage","url":BASE+"/","name":title,"about":{"@id":BASE+"/#org"},"isPartOf":{"@id":BASE+"/#website"}});
  const ldDoc = {"@context":"https://schema.org","@graph":graph};
  html = html.replace('</head>', `<!--ff:ld--><script type="application/ld+json">${JSON.stringify(ldDoc)}</script><!--/ff:ld-->\n</head>`);
  writeFileSync(file, html);
  report.push({ page: rel, cssBytes: Buffer.byteLength(min) });
}

for (const r of report) console.log(r.page, r.cssBytes);
console.log('done', report.length);
