#!/usr/bin/env node
/**
 * Prefix all selectors in a CSS file with `.R-{slug}` so peer scrapes don't leak.
 * Usage: node tools/namespace-css.mjs <slug>
 * Reads tools/scrapes/<slug>/styles.raw.css → css/<slug>.css
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node tools/namespace-css.mjs <slug>');
  process.exit(1);
}

const scope = `.R-${slug}`;
const rawPath = path.join(ROOT, 'tools', 'scrapes', slug, 'styles.raw.css');
const outPath = path.join(ROOT, 'css', `${slug}.css`);
let css = fs.readFileSync(rawPath, 'utf8');

// Drop @charset / @import fonts that fight FF fonts (keep urls we may need later)
css = css.replace(/@charset[^;]+;/gi, '');
css = css.replace(/@import\s+url\([^)]+\)\s*;/gi, '/* @import stripped */');
css = css.replace(/\/\*# sourceMappingURL=[\s\S]*?\*\//g, '');
css = css.replace(/\/\/# sourceMappingURL=.*/g, '');

function prefixSelectorList(selectors) {
  return selectors
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((sel) => {
      if (sel.startsWith('@')) return sel;
      if (sel === ':root' || sel === 'html' || sel === 'body') return scope;
      if (sel.startsWith(':root') || sel.startsWith('html') || sel.startsWith('body')) {
        return sel.replace(/^(html|body|:root)/, scope);
      }
      // already scoped?
      if (sel.includes(scope)) return sel;
      return `${scope} ${sel}`;
    })
    .join(', ');
}

// Walk CSS and prefix rule selectors. Handle nested @media / @supports / @layer.
function transform(input) {
  let out = '';
  let i = 0;
  while (i < input.length) {
    // comments
    if (input.startsWith('/*', i)) {
      const end = input.indexOf('*/', i + 2);
      out += input.slice(i, end === -1 ? input.length : end + 2);
      i = end === -1 ? input.length : end + 2;
      continue;
    }
    // at-rules
    if (input[i] === '@') {
      const brace = input.indexOf('{', i);
      const semi = input.indexOf(';', i);
      if (brace !== -1 && (semi === -1 || brace < semi)) {
        const header = input.slice(i, brace).trim();
        // find matching close
        let depth = 0;
        let j = brace;
        for (; j < input.length; j++) {
          if (input[j] === '{') depth++;
          else if (input[j] === '}') {
            depth--;
            if (depth === 0) {
              j++;
              break;
            }
          }
        }
        const inner = input.slice(brace + 1, j - 1);
        const name = header.split(/\s+/)[0].toLowerCase();
        if (['@media', '@supports', '@layer', '@container'].includes(name) || name.startsWith('@media') || name.startsWith('@supports') || name.startsWith('@layer') || name.startsWith('@container')) {
          out += `${header}{\n${transform(inner)}\n}\n`;
        } else if (name === '@keyframes' || name === '@-webkit-keyframes' || name === '@font-face' || name === '@property') {
          // leave untouched
          out += input.slice(i, j);
        } else {
          out += `${header}{\n${transform(inner)}\n}\n`;
        }
        i = j;
        continue;
      }
      // @import etc ending with ;
      if (semi !== -1) {
        out += input.slice(i, semi + 1);
        i = semi + 1;
        continue;
      }
    }
    // normal rule
    const brace = input.indexOf('{', i);
    if (brace === -1) {
      out += input.slice(i);
      break;
    }
    const selectors = input.slice(i, brace).trim();
    let depth = 0;
    let j = brace;
    for (; j < input.length; j++) {
      if (input[j] === '{') depth++;
      else if (input[j] === '}') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    const body = input.slice(brace, j);
    if (selectors && !selectors.startsWith('@')) {
      out += `${prefixSelectorList(selectors)}${body}\n`;
    } else {
      out += input.slice(i, j);
    }
    i = j;
  }
  return out;
}

const scoped = `/* Namespaced scrape: ${slug} — do not edit peer brand claims; swap content in HTML */\n${scope} { box-sizing: border-box; }\n${scope} *, ${scope} *::before, ${scope} *::after { box-sizing: inherit; }\n\n` + transform(css);

fs.writeFileSync(outPath, scoped);
console.log(JSON.stringify({
  ok: true,
  slug,
  scope,
  outPath,
  bytesIn: css.length,
  bytesOut: scoped.length,
}, null, 2));
