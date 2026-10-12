"""Measure LCP element per page at 390x844 → tools/lcp.json
Run after build: python3 tools/lcp.py"""
import json, glob, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'http://localhost:8090'
pages = sorted('/' + os.path.relpath(f, ROOT).replace('index.html', '') for f in glob.glob(ROOT + '/**/index.html', recursive=True) if '/ref/' not in f)

out = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    for u in pages:
        pg.goto(BASE + u, wait_until='load')
        pg.wait_for_timeout(2500)
        r = pg.evaluate('''async()=>{
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
        }''')
        out[u] = r
        print(u, r)
    pg.close()
    b.close()
json.dump(out, open(ROOT + '/tools/lcp.json', 'w'), indent=1)
