#!/usr/bin/env node
/** Patch nav/footer + CSS marker on secondary pages; rewrite thin legacy hubs. */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nav, footer, page, pagehead } from './chrome.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function walk(d, acc = []) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) {
      if (f === 'ref' || f === 'tools' || f === 'node_modules' || f === '.git') continue;
      walk(p, acc);
    } else if (f === 'index.html') acc.push(p);
  }
  return acc;
}

const PRIORITY = new Set([
  '/', '/our-model/', '/our-model/study-unlock-pathway/', '/our-model/why-light/',
  '/our-model/the-study-light/', '/our-model/made-and-delivered/', '/our-model/for-students/',
  '/impact/', '/impact/outcomes/', '/impact/reports/',
  '/impact-stories/', '/impact-stories/malaika/', '/impact-stories/brighten-haiti/', '/impact-stories/loksadhana/',
  '/join/', '/join/internships/', '/join/open-roles/', '/join/apply/',
  '/join/open-roles/coo/', '/join/open-roles/cpo/', '/join/open-roles/cfo/',
  '/join/open-roles/director-partnerships/', '/join/open-roles/director-marketing/', '/join/open-roles/director-fundraising/',
  '/internships/marketing/', '/internships/partnerships-operations/', '/internships/fundraising/', '/internships/remote/',
  '/get-involved/', '/get-involved/ambassadors/', '/get-involved/partners/',
  '/get-involved/partners/assembly/', '/get-involved/partners/distribution/',
  '/get-involved/internship/', '/donate/', '/about/', '/about/team/',
  '/nonprofit-status/', '/faq/', '/contact/', '/privacy/', '/terms/', '/site-map/', '/guides/',
]);

const urlPath = (f) => f.replace(ROOT, '').replace(/\\/g, '/').replace(/\/index\.html$/, '/') || '/';

function activeFor(rel) {
  if (rel.startsWith('/our-model') || rel.startsWith('/our-work')) return 'model';
  if (rel.startsWith('/impact-stories')) return 'stories';
  if (rel.startsWith('/impact')) return 'impact';
  if (rel.startsWith('/join') || rel.startsWith('/internships')) return 'join';
  if (rel.startsWith('/get-involved') || rel.startsWith('/donate')) return 'involved';
  if (rel.startsWith('/about') || rel.startsWith('/faq') || rel.startsWith('/news') || rel.startsWith('/nonprofit') || rel.startsWith('/contact')) return 'about';
  return '';
}

function extractMain(html) {
  const m = html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i);
  return m ? m[1] : null;
}

function extractMeta(html, rel) {
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Flash Forward Foundation';
  const description = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const canonical = ((html.match(/rel="canonical" href="https:\/\/flashforwardfoundation\.org([^"]*)"/) || [])[1]) || rel;
  return { title, description, canonical };
}

// Legacy hub rewrites
const hubs = {
  '/our-work/': page({
    title: 'Our Model | Flash Forward Foundation',
    description: 'Our Work is now Our Model — Study Unlock Pathway.',
    canonical: '/our-model/',
    active: 'model',
    main: pagehead('Our Model', 'Our Work is now Our Model', 'Same mission, clearer name.')
      + `<section class="ff-section"><div class="ff-wrap"><div class="ff-btnrow"><a class="ff-btn ff-btn--primary" href="/our-model/">Go to Our Model</a></div></div></section>`,
  }),
  '/our-work/how-we-build/': page({
    title: 'How Lights Are Made & Delivered | Flash Forward',
    description: 'Assembly partners build Flash Forward lights.',
    canonical: '/our-model/made-and-delivered/',
    active: 'model',
    main: pagehead('Our Model', 'How lights are made', 'This page moved.')
      + `<section class="ff-section"><div class="ff-wrap"><a class="ff-btn ff-btn--primary" href="/our-model/made-and-delivered/">Made &amp; Delivered</a></div></section>`,
  }),
  '/our-work/the-light/': page({
    title: 'The Study Light | Flash Forward Foundation',
    description: 'The study light page moved under Our Model.',
    canonical: '/our-model/the-study-light/',
    active: 'model',
    main: pagehead('Our Model', 'The study light moved', '')
      + `<section class="ff-section"><div class="ff-wrap"><a class="ff-btn ff-btn--primary" href="/our-model/the-study-light/">The Study Light</a></div></section>`,
  }),
  '/our-work/where/': page({
    title: 'Impact Stories | Flash Forward Foundation',
    description: 'Partner destinations are now Impact Stories.',
    canonical: '/impact-stories/',
    active: 'stories',
    main: pagehead('Impact Stories', 'Where lights go', 'Partner pages are now Impact Stories.')
      + `<section class="ff-section"><div class="ff-wrap"><a class="ff-btn ff-btn--primary" href="/impact-stories/">Browse stories</a></div></section>`,
  }),
  '/our-work/partners/malaika/': page({
    title: 'Malaika | Impact Stories',
    description: 'Malaika story moved.',
    canonical: '/impact-stories/malaika/',
    active: 'stories',
    main: pagehead('Impact Stories', 'Malaika story', '')
      + `<section class="ff-section"><div class="ff-wrap"><a class="ff-btn ff-btn--primary" href="/impact-stories/malaika/">Open story</a></div></section>`,
  }),
  '/our-work/partners/brighten-haiti/': page({
    title: 'Brighten Haiti | Impact Stories',
    description: 'Brighten Haiti story moved.',
    canonical: '/impact-stories/brighten-haiti/',
    active: 'stories',
    main: pagehead('Impact Stories', 'Brighten Haiti story', '')
      + `<section class="ff-section"><div class="ff-wrap"><a class="ff-btn ff-btn--primary" href="/impact-stories/brighten-haiti/">Open story</a></div></section>`,
  }),
  '/our-work/partners/loksadhana/': page({
    title: 'Loksadhana | Impact Stories',
    description: 'Loksadhana story moved.',
    canonical: '/impact-stories/loksadhana/',
    active: 'stories',
    main: pagehead('Impact Stories', 'Loksadhana story', '')
      + `<section class="ff-section"><div class="ff-wrap"><a class="ff-btn ff-btn--primary" href="/impact-stories/loksadhana/">Open story</a></div></section>`,
  }),
  '/our-work/photos-and-videos/': page({
    title: 'Photos & Videos | Flash Forward Foundation',
    description: 'Media from Flash Forward field partners and operations — not Bellevue workshop builds.',
    canonical: '/our-work/photos-and-videos/',
    active: 'model',
    main: pagehead('Our Model', 'Photos &amp; videos', 'Field and ops media. Workshop-build framing is retired.')
      + `<section class="ff-section"><div class="ff-wrap"><p class="ff-lede">See <a href="/impact-stories/">Impact Stories</a> for partner context, or <a href="/news/">News</a> for program updates.</p></div></section>`,
  }),
};

for (const [rel, html] of Object.entries(hubs)) {
  const file = join(ROOT, rel.slice(1), 'index.html');
  writeFileSync(file, html);
  console.log('hub', rel);
}

// Patch secondary pages: replace chrome, force ff.css, scrub workshop claims in footer mission
for (const file of walk(ROOT)) {
  const rel = urlPath(file);
  if (PRIORITY.has(rel) || hubs[rel]) continue;
  if (rel.startsWith('/ref/')) continue;
  let html = readFileSync(file, 'utf8');
  const meta = extractMeta(html, rel);
  // Force CSS list to ff.css
  if (/<!--ff:css /.test(html)) {
    html = html.replace(/<!--ff:css [^>]*-->/, '<!--ff:css ff.css-->');
  } else {
    html = html.replace(/(<link rel="apple-touch-icon"[^>]*>)/, `$1\n<!--ff:css ff.css--><style></style><!--/ff:css-->`);
  }
  // Replace nav block
  if (/<nav class="ff-nav"/.test(html)) {
    html = html.replace(/<nav class="ff-nav"[\s\S]*?<\/nav>\s*/i, nav(activeFor(rel)));
  }
  // Replace dual-header + nav pattern from old shell
  if (/<header id="main_header"/.test(html)) {
    html = html.replace(/<div class="R-pih-home[\s\S]*?<\/nav>\s*/i, nav(activeFor(rel)));
  }
  // Footer
  if (/<footer class="ff-footer"/.test(html)) {
    html = html.replace(/<footer class="ff-footer"[\s\S]*?<\/footer>\s*(?:<script[\s\S]*?<\/script>\s*)*/i, footer().replace(/<\/body>\s*<\/html>\s*$/, ''));
    if (!/<\/body>/.test(html)) html += '\n</body>\n</html>\n';
  }
  // Scrub intern-builds / workshop claims in visible copy lightly
  html = html.replace(/Student interns build \$5\.17 solar study lights/g, 'Students lead design and ops for $5.17 solar study lights');
  html = html.replace(/Student interns build the lights for free/g, 'Assembly partners build the lights');
  html = html.replace(/student interns build/gi, 'assembly partners build');
  html = html.replace(/Interns \/ Bellevue students build every light/gi, 'Assembly partners build every light');
  html = html.replace(/built by students for free/gi, 'assembled by partners');
  // Body class cleanup for new chrome
  html = html.replace(/<body class="[^"]*"/, `<body class="ff"`);
  // Ensure site.js
  if (!/site\.js|site\.[0-9a-f]{8}\.js/.test(html)) {
    html = html.replace(/<\/body>/, `<script src="/site.js" defer></script>\n</body>`);
  }
  writeFileSync(file, html);
  console.log('patched', rel);
}

// Internship track + open-role detail pages are written by sree-pass.mjs (rich boilerplate).
console.log('secondary patch done');
