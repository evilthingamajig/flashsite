// Builds images/flashforward/world-dots.svg: a dot-matrix world map (no tiles, no attribution)
// from images/flashforward/world-interactive.svg (Web Mercator, x=(lon+180)/360*2000).
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync('images/flashforward/world-interactive.svg', 'utf8');
const countries = [...svg.matchAll(/<path id="([a-z]{2})" d="([^"]+)"/g)].map(([, id, d]) => {
  const polys = d.split(/Z/i).map(seg => (seg.match(/-?\d+(?:\.\d+)?/g) || []).map(Number))
    .filter(a => a.length >= 6).map(a => { const pts = []; for (let i = 0; i + 1 < a.length; i += 2) pts.push([a[i], a[i + 1]]); return pts; });
  const xs = polys.flat().map(p => p[0]), ys = polys.flat().map(p => p[1]);
  return { id, polys, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
});
const inPoly = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const countryAt = (x, y) => { for (const c of countries) { const [a, b, cx, d] = c.box; if (x < a || x > cx || y < b || y > d) continue; let inside = false; for (const p of c.polys) if (inPoly(x, y, p)) inside = !inside; if (inside) return c.id; } return null; };
const STEP = 12, TOP = 192, BOTTOM = 840, HI = ['ht', 'in', 'cd'];
const land = [], hi = [];
for (let y = TOP, row = 0; y <= BOTTOM; y += STEP, row++) {
  for (let x = row % 2 ? STEP / 2 : 0; x < 2000; x += STEP) {
    const id = countryAt(x, y); if (!id) continue;
    (HI.includes(id) ? hi : land).push(`M${x} ${y}h0`);
  }
}
// Haiti is smaller than one grid cell: add a few dots on its outline so it still reads.
const ht = countries.find(c => c.id === 'ht'); const [hx0, hy0, hx1, hy1] = ht.box;
for (let y = hy0 + 2; y <= hy1; y += 5) for (let x = hx0 + 2; x <= hx1; x += 5) if (countryAt(x, y) === 'ht') hi.push(`M${Math.round(x)} ${Math.round(y)}h0`);
const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${TOP - 12} 2000 ${BOTTOM - TOP + 24}" aria-hidden="true">` +
  `<path class="ffm-land" d="${land.join('')}"/><path class="ffm-hi" d="${hi.join('')}"/></svg>\n`;
writeFileSync('images/flashforward/world-dots.svg', out);
console.log('land', land.length, 'highlight', hi.length, 'bytes', out.length);
