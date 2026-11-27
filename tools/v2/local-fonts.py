#!/usr/bin/env python3
"""Point fonts that loaded from other organizations' accounts at our own free font files.
Mint Grotesk, Proxima Nova and Aktiv Grotesk -> Figtree; Futura PT -> Jost; Kazimir -> Merriweather.
Icon fonts from Squarespace are dropped. Run from the repo root, then `node tools/build.mjs`."""
import re, glob
REMOTE = re.compile(r'website-files\.com|typekit\.net|squarespace\.com|charitywater\.org|fonts\.gstatic\.com')
import os
NAMES = {os.path.basename(f).split('.')[0]: '/fonts/' + os.path.basename(f) for f in glob.glob('fonts/*.woff2')}
fig = lambda w: '/fonts/figtree-%d.%s.woff2' % ((400,'0942e874'),(500,'8366e802'),(600,'3d3403c5'),(700,'37372592'))[min(3,max(0,(w-400)//100))]
def target(family, w):
    f = family.lower()
    if 'squarespace' in f or 'social-icon' in f or 'webflow-icons' in f: return None
    if 'futura' in f: return NAMES['jost-%d' % (700 if w >= 600 else 500)]
    if 'kazimir' in f: return NAMES['merriweather-%d' % (700 if w >= 600 else 400)]
    if 'inconsolata' in f: return None
    return fig(w)
def fix(css):
    def face(m):
        b = m.group(1)
        if not REMOTE.search(b): return m.group(0)
        fam = re.search(r'font-family:\s*["\']?([^;"\']+)', b); wt = re.search(r'font-weight:\s*(\d+|bold|normal)', b)
        w = {'bold': 700, 'normal': 400}.get(wt.group(1), None) if wt else 400
        w = w if w is not None else int(wt.group(1))
        t = target(fam.group(1) if fam else '', w)
        if not t: return ''
        b = re.sub(r'src:[^;}]*', 'src:url(%s) format("woff2")' % t, b)
        return '@font-face{' + b + '}'
    return re.sub(r'@font-face\s*\{([^}]*)\}', face, css)
n = 0
for p in glob.glob('css/*.css') + [f for f in glob.glob('**/index.html', recursive=True) if not f.startswith(('tools/', 'ref/'))]:
    s = open(p, encoding='utf8').read()
    t = fix(s)
    t = re.sub(r'<script[^>]*use\.typekit\.net[^>]*>\s*</script>\s*', '', t)
    t = re.sub(r'<link[^>]*use\.typekit\.net[^>]*>\s*', '', t)
    t = re.sub(r'@import\s+url\([^)]*typekit\.net[^)]*\);?', '', t)
    if t != s: open(p, 'w', encoding='utf8').write(t); n += 1
print('files updated', n)
