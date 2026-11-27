// Refresh only the shared marked blocks; preserve each page's content and scripts.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nav, footer } from './chrome.mjs';

const nextFooter = footer().match(/<!--ff:chrome-footer-->[\s\S]*?<!--\/ff:chrome-footer-->/)[0];
let count = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['.git','node_modules','tools','work'].includes(entry.name)) continue;
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(file);
    else if (entry.name === 'index.html') {
      let html = readFileSync(file, 'utf8');
      if (!html.includes('<!--ff:chrome-nav-->')) continue;
      html = html.replace(/<!--ff:chrome-nav-->[\s\S]*?<!--\/ff:chrome-nav-->/, nav().trim());
      html = html.replace(/<!--ff:chrome-footer-->[\s\S]*?<!--\/ff:chrome-footer-->/, nextFooter);
      html = html.replace(/href="\/(?:builders\/?|get-involved\/partners\/assembly\/)"/g, 'href="/get-involved/builders/"');
      html = html.replace(/href="\/(?:partnerships\/?|get-involved\/partners\/distribution\/)"/g, 'href="/get-involved/partners/"');
      html = html.replace(/<!--ff:css ([^>]+)-->/g, (_, list) => `<!--ff:css ${[...new Set(list.split(',').filter(s => s !== 'ff-site-chrome.css')),'ff-site-chrome.css'].join(',')}-->`);
      // The homepage now uses the same site.js controller as every other page.
      html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/g, (tag, code) => code.includes('nav.dataset.ffClickNav') && code.includes('is-revealed') ? '' : tag);
      writeFileSync(file, html);
      count++;
    }
  }
}
walk(resolve(dirname(fileURLToPath(import.meta.url)), '../..'));
console.log(`Updated shared navbar and footer on ${count} pages.`);
