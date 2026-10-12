"""Measure rendered <img>/<video> boxes on each page at 1440x900, 1024x768, 900x900, 768x1024 and 390x844.
Writes tools/img-metrics.json consumed by build.mjs."""
import json, re, sys, glob, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'http://localhost:8090'

pages = []
for f in sorted(glob.glob(ROOT + '/**/index.html', recursive=True)):
    if '/ref/' in f:
        continue
    rel = os.path.relpath(f, ROOT).replace('/index.html', '')
    pages.append('/' + ('' if rel == 'index.html' else rel + '/'))

JS = '''() => [...document.images].map((im, i) => {
  const r = im.getBoundingClientRect();
  return {i, src: new URL(im.src).pathname, orig: im.getAttribute('src'),
          box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
          nw: im.naturalWidth, nh: im.naturalHeight,
          cls: im.className, par: im.parentElement ? im.parentElement.className.toString().slice(0,60) : ''};
})'''
JSV = '''() => [...document.querySelectorAll('video')].map((v, i) => {
  const r = v.getBoundingClientRect();
  return {i, poster: v.getAttribute('poster') || v.getAttribute('data-poster') || '',
          box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]};
})'''

out = {}
vids = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in ((1440, 900), (1024, 768), (900, 900), (768, 1024), (390, 844)):
        key = f'{w}x{h}'
        pg = b.new_page(viewport={'width': w, 'height': h})
        for u in pages:
            try:
                pg.goto(BASE + u, wait_until='load')
                pg.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,30))};window.scrollTo(0,0)}")
                pg.wait_for_timeout(300)
                for it in pg.evaluate(JS):
                    slot = out.setdefault((u, it['i'], it['src']), {'page': u, 'idx': it['i'], 'src': it['src'],
                                                                  'orig': it['orig'], 'nw': it['nw'], 'nh': it['nh'],
                                                                  'par': it['par'], 'cls': it['cls'], 'w': {}, 't': {}})
                    slot['w'][key] = it['box'][2]
                    slot['t'][key] = it['box'][1]
                for it in pg.evaluate(JSV):
                    slot = vids.setdefault((u, it['i'], it['poster']), {'page': u, 'idx': it['i'], 'poster': it['poster'],
                                                                      'w': {}, 't': {}})
                    slot['w'][key] = it['box'][2]
                    slot['t'][key] = it['box'][1]
            except Exception as e:
                print('ERR', u, w, e)
        pg.close()
    b.close()

json.dump(list(out.values()), open(os.path.join(ROOT, 'tools', 'img-metrics.json'), 'w'), indent=1)
json.dump(list(vids.values()), open(os.path.join(ROOT, 'tools', 'video-metrics.json'), 'w'), indent=1)
print('pages:', len(pages), 'imgs:', len(out), 'videos:', len(vids))
