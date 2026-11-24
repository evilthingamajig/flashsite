#!/usr/bin/env node
/**
 * Scrape a peer page into tools/scrapes/<slug>/ for stitch:
 *   page.html  — full rendered DOM HTML
 *   main.html  — <main> (or body) fragment
 *   styles.css — concatenated stylesheets + inline <style>
 *   meta.json  — source URL, title, cssUrls
 *
 * Usage: node tools/scrape-page.mjs <url> <slug>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const [url, slug] = process.argv.slice(2);
if (!url || !slug) {
  console.error('Usage: node tools/scrape-page.mjs <url> <slug>');
  process.exit(1);
}

const outDir = path.join(ROOT, 'tools', 'scrapes', slug);
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || process.env.CHROME || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  // Let late CSS/animations settle
  await new Promise((r) => setTimeout(r, 2500));

  const data = await page.evaluate(() => {
    const cssHrefs = [...document.querySelectorAll('link[rel~="stylesheet"]')]
      .map((l) => l.href)
      .filter(Boolean);
    const inlineStyles = [...document.querySelectorAll('style')]
      .map((s) => s.textContent || '')
      .filter((t) => t.trim().length > 20);
    const main = document.querySelector('main');
    const bodyClone = document.body.cloneNode(true);
    // strip scripts from clone for safer stitch base
    bodyClone.querySelectorAll('script').forEach((s) => s.remove());
    return {
      title: document.title,
      html: '<!doctype html>\n' + document.documentElement.outerHTML,
      mainHtml: main ? main.outerHTML : bodyClone.innerHTML,
      cssHrefs,
      inlineStyles,
      bodyClasses: document.body.className,
      htmlClasses: document.documentElement.className,
    };
  });

  const cssChunks = [];
  for (const href of data.cssHrefs) {
    try {
      const res = await fetch(href);
      if (!res.ok) {
        console.warn('CSS fetch failed', res.status, href);
        continue;
      }
      const text = await res.text();
      cssChunks.push(`/* source: ${href} */\n${text}`);
      const name = href.split('/').pop().split('?')[0] || 'sheet.css';
      fs.writeFileSync(path.join(outDir, `raw-${name}`), text);
    } catch (e) {
      console.warn('CSS fetch error', href, e.message);
    }
  }
  for (const [i, style] of data.inlineStyles.entries()) {
    cssChunks.push(`/* inline style ${i + 1} */\n${style}`);
  }

  fs.writeFileSync(path.join(outDir, 'page.html'), data.html);
  fs.writeFileSync(path.join(outDir, 'main.html'), data.mainHtml);
  fs.writeFileSync(path.join(outDir, 'styles.raw.css'), cssChunks.join('\n\n'));
  fs.writeFileSync(
    path.join(outDir, 'meta.json'),
    JSON.stringify(
      {
        url,
        slug,
        title: data.title,
        scrapedAt: new Date().toISOString(),
        cssHrefs: data.cssHrefs,
        bodyClasses: data.bodyClasses,
        htmlClasses: data.htmlClasses,
        inlineStyleCount: data.inlineStyles.length,
        cssBytes: cssChunks.join('').length,
        mainBytes: data.mainHtml.length,
      },
      null,
      2,
    ),
  );

  // Screenshot for QA
  await page.screenshot({
    path: path.join(outDir, 'screenshot.png'),
    fullPage: true,
  });

  console.log(JSON.stringify({
    ok: true,
    slug,
    outDir,
    title: data.title,
    cssFiles: data.cssHrefs.length,
    inlineStyles: data.inlineStyles.length,
    mainBytes: data.mainHtml.length,
    cssBytes: cssChunks.join('').length,
  }, null, 2));
} finally {
  await browser.close();
}
