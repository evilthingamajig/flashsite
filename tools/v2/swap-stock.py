#!/usr/bin/env python3
"""Swap dark phone build photos for free Unsplash photos (images/stock/). Run from repo root, then build."""
import re, glob
SWAP = {
  'assembling-screwing-lights': ('/images/stock/soldering.jpg', 'Hands soldering a circuit board'),
  'flashlight-units-group': ('/images/stock/solar-panel.jpg', 'Close-up of a solar panel'),
  'packagedlights': ('/images/stock/shipping-boxes.jpg', 'Cardboard boxes ready to ship'),
  'flashlight-internals-charging-board': ('/images/stock/electronic-components.jpg', 'Electronic components laid out on a table'),
  'flashlight-units': ('/images/stock/desk-lamp.jpg', 'A desk lamp on a study desk'),
}
key = lambda s: next((k for k in sorted(SWAP, key=len, reverse=True) if re.search(r'/' + k + r'(?:\.w\d+\.[0-9a-f]{8})?\.webp', s)), None)
def img(m):
    t = m.group(0); k = key(t)
    if not k: return t
    src, alt = SWAP[k]
    t = re.sub(r'\s(?:srcset|sizes|width|height)="[^"]*"', '', t)
    t = re.sub(r'\ssrc="[^"]*"', ' src="%s"' % src, t)
    t = re.sub(r'\salt="[^"]*"', ' alt="%s"' % alt, t) if ' alt="' in t else t.replace('<img', '<img alt="%s"' % alt, 1)
    return t
n = 0
for p in [f for f in glob.glob('**/index.html', recursive=True) if not f.startswith(('tools/', 'ref/'))]:
    s = open(p, encoding='utf8').read(); t = re.sub(r'<img\b[^>]*>', img, s)
    t = re.sub(r'<source\b[^>]*(?:assembling-screwing-lights|flashlight-units|packagedlights|flashlight-internals-charging-board)[^>]*>', '', t)
    if t != s: open(p, 'w', encoding='utf8').write(t); n += 1
g = 'tools/v1/get-involved.mjs'; s = open(g, encoding='utf8').read()
for k in sorted(SWAP, key=len, reverse=True):
    src, alt = SWAP[k]
    s = re.sub(r"'/images/build/%s\.webp',\s*'[^']*'" % re.escape(k), "'%s','%s'" % (src, alt.replace("'", "’")), s)
    s = re.sub(r"(image:)'/images/build/%s\.webp',(alt:)'[^']*'" % re.escape(k), r"\1'%s',\2'%s'" % (src, alt), s)
open(g, 'w', encoding='utf8').write(s)
print('pages', n, 'left in generator:', re.findall(r"/images/build/(?:assembling-screwing-lights|flashlight-units(?:-group)?|packagedlights|flashlight-internals-charging-board)\.webp", s))
