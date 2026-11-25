#!/usr/bin/env node
/** Replace nav + footer on every index.html with tools/v1/chrome.mjs (CW-structure chrome). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nav, footer, CSS } from './chrome.mjs';

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

function stripFooterScripts(html) {
  return html
    .replace(/<script src="\/site\.js" defer><\/script>\s*<\/body>\s*<\/html>\s*$/i, '')
    .trim();
}

let n = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/^index\.html$/, '');
  const active = activeFor(rel === 'index.html' ? '' : rel + '/');
  const nextNav = nav(active).trim();
  const nextFoot = stripFooterScripts(footer());

  // Replace existing chrome (old ff-nav OR new CW markers OR bare nav-bar)
  if (/<!--ff:chrome-nav-->[\s\S]*?<!--\/ff:chrome-nav-->/i.test(html)) {
    html = html.replace(/<!--ff:chrome-nav-->[\s\S]*?<!--\/ff:chrome-nav-->/i, nextNav);
  } else if (/<nav class="ff-nav"[\s\S]*?<\/nav>/i.test(html)) {
    html = html.replace(/<nav class="ff-nav"[\s\S]*?<\/nav>/i, nextNav);
  } else if (/<nav class="nav-bar"[\s\S]*?<\/nav>/i.test(html)) {
    // replace nav-bar + following offcanvas if present
    html = html.replace(
      /<nav class="nav-bar"[\s\S]*?<\/nav>\s*(?:<nav class="right-off-canvas-menu"[\s\S]*?<\/nav>)?/i,
      nextNav,
    );
  } else {
    continue;
  }

  if (/<!--ff:chrome-footer-->[\s\S]*?<!--\/ff:chrome-footer-->/i.test(html)) {
    html = html.replace(/<!--ff:chrome-footer-->[\s\S]*?<!--\/ff:chrome-footer-->/i, nextFoot);
  } else if (/<footer class="ff-footer"[\s\S]*?<\/footer>/i.test(html)) {
    html = html.replace(/<footer class="ff-footer"[\s\S]*?<\/footer>/i, nextFoot);
  } else if (/<footer class="cw-footer"[\s\S]*?<\/footer>/i.test(html)) {
    html = html.replace(/<footer class="cw-footer"[\s\S]*?<\/footer>/i, nextFoot);
  }

  // Ensure body has R-cw-chrome
  html = html.replace(/<body([^>]*)class="([^"]*)"/i, (m, pre, cls) => {
    const parts = new Set(cls.split(/\s+/).filter(Boolean));
    parts.add('ff');
    parts.add('R-cw-chrome');
    return `<body${pre}class="${[...parts].join(' ')}"`;
  });
  if (!/<body[^>]*class=/i.test(html)) {
    html = html.replace(/<body([^>]*)>/i, '<body$1 class="ff R-cw-chrome">');
  }

  // Keep page-specific stylesheets. Only make sure shared chrome CSS is listed.
  if (/<!--ff:css [^>]+-->/i.test(html)) {
    html = html.replace(/<!--ff:css ([^>]+)-->/g, (m, list) => {
      const parts = list.split(',').map((s) => s.trim()).filter(Boolean);
      if (!parts.includes('ff.css')) parts.unshift('ff.css');
      if (!parts.includes('cw-chrome.css')) parts.splice(Math.min(1, parts.length), 0, 'cw-chrome.css');
      return `<!--ff:css ${[...new Set(parts)].join(',')}-->`;
    });
  }

  // Ensure exactly one site.js before </body> (build rewrites to hashed path)
  html = html.replace(/\s*<script src="(?:\/js\/site\.[^"]+\.js|\/site\.js)" defer><\/script>/g, '');
  html = html.replace(/<\/body>/i, '<script src="/site.js" defer></script>\n</body>');

  fs.writeFileSync(file, html);
  n++;
}
console.log('chrome applied to', n, 'pages');
