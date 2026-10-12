"""Measure LCP element per page at 390x844 and 1440x900 → tools/lcp.json
The entry keeps the 390 result; when the mobile LCP is not an image but the
desktop LCP is, the desktop image is used instead (preload is viewport-agnostic,
so an image that is LCP at any major viewport still earns fetchpriority/preload).
Run after build: python3 tools/lcp.py"""
import json, glob, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'http://localhost:8090'
pages = sorted('/' + os.path.relpath(f, ROOT).replace('index.html', '') for f in glob.glob(ROOT + '/**/index.html', recursive=True) if '/ref/' not in f)

JS = '''async()=>{
  return await new Promise(res=>{
    let last=null;
    const po=new PerformanceObserver(l=>{const e=l.getEntries();if(e.length)last=e[e.length-1]});
    po.observe({type:'largest-contentful-paint',buffered:true});
    setTimeout(()=>{if(!last)return res(null);
      const el=last.element;
      res({el: el?el.tagName+'.'+(el.className&&el.className.baseVal!==undefined?el.className.baseVal:el.className):last.tagName,
           img: el&&el.tagName==='IMG'?el.getAttribute('src'):null,
           text: el?el.textContent.trim().slice(0,40):'', size:last.size, t:last.startTime});
    },1200);
  });
}'''

meas = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in ((390, 844), (1440, 900)):
        pg = b.new_page(viewport={'width': w, 'height': h})
        for u in pages:
            pg.goto(BASE + u, wait_until='load')
            pg.wait_for_timeout(2500)
            r = pg.evaluate(JS)
            if r:
                r['vp'] = f'{w}x{h}'
            meas.setdefault(u, {})[w] = r
        pg.close()
    b.close()

out = {}
for u in pages:
    m = meas.get(u, {})
    r = m.get(390)
    if (not r or not r.get('img')) and m.get(1440) and m[1440].get('img'):
        r = m[1440]
    out[u] = r
    print(u, r)

json.dump(out, open(ROOT + '/tools/lcp.json', 'w'), indent=1)
