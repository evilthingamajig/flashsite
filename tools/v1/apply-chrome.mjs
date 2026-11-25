#!/usr/bin/env node
/** Replace nav + footer on every index.html with tools/v1/chrome.mjs chrome. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { nav, footer } from './chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'tools' || ent.name === 'node_modules' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name === 'index.html') out.push(p);
  }
  return out;
}

function activeFor(rel) {
  if (rel.startsWith('our-model')) return 'model';
  if (rel.startsWith('impact-stories')) return 'stories';
  if (rel.startsWith('impact')) return 'impact';
  if (rel.startsWith('join') || rel.startsWith('internships')) return 'join';
  if (rel.startsWith('get-involved') || rel.startsWith('donate')) return 'involved';
  if (rel.startsWith('about') || rel.startsWith('faq') || rel.startsWith('news') || rel.startsWith('contact') || rel.startsWith('nonprofit')) return 'about';
  return '';
}

let n = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('class="ff-nav"') && !html.includes("class='ff-nav'")) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/^index\.html$/, '');
  const active = activeFor(rel === 'index.html' ? '' : rel + '/');
  const nextNav = nav(active);
  const nextFoot = footer();
  // Replace nav block
  html = html.replace(/<nav class="ff-nav"[\s\S]*?<\/nav>/i, nextNav.trim());
  // Replace footer through closing body scripts belonging to footer helper
  if (/<footer class="ff-footer"[\s\S]*?<\/footer>/i.test(html)) {
    html = html.replace(/<footer class="ff-footer"[\s\S]*?<\/footer>/i, () => {
      // footer() includes scripts + closing body/html — strip those when injecting into existing page
      return nextFoot
        .replace(/<script src="\/site\.js" defer><\/script>\s*<\/body>\s*<\/html>\s*$/i, '')
        .trim();
    });
  }
  // Ensure site.js once before </body>
  if (!html.includes('src="/site.js"')) {
    html = html.replace(/<\/body>/i, '<script src="/site.js" defer></script>\n</body>');
  }
  // Force ff.css marker
  html = html.replace(/<!--ff:css [^>]+-->/g, '<!--ff:css ff.css-->');
  fs.writeFileSync(file, html);
  n++;
}
console.log('chrome applied to', n, 'pages');
