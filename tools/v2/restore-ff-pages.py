#!/usr/bin/env python3
"""Replace peer scrape-stitched pages with the Flash Forward-written versions from
commit 78142ec, keeping today's nav and footer. Run from repo root, then `node tools/build.mjs`."""
import re, subprocess
SRC = '78142ec'
PAGES = """about faq contact donate/study-circle get-involved get-involved/ambassadors get-involved/partners
get-involved/partners/assembly get-involved/partners/distribution impact impact/outcomes impact/reports
impact-stories impact-stories/sponsor news join join/internships join/open-roles nonprofit-status
nonprofit-status/trust privacy terms our-model our-model/study-unlock-pathway our-model/the-study-light
our-model/made-and-delivered our-model/why-light""".split()
NAV = re.compile(r'<!--ff:chrome-nav-->.*?<!--/ff:chrome-nav-->', re.S)
FOOT = re.compile(r'<!--ff:chrome-footer-->.*?<!--/ff:chrome-footer-->', re.S)
ref = open('about/team/index.html', encoding='utf8').read()
nav, foot = NAV.search(ref).group(0), FOOT.search(ref).group(0)
for p in PAGES:
    f = f'{p}/index.html'
    old = subprocess.run(['git', 'show', f'{SRC}:{f}'], capture_output=True, text=True, check=True).stdout
    if 'http-equiv="refresh"' in old:
        kind = 'redirect'
    else:
        old, a = NAV.subn(lambda m: nav, old); old, b = FOOT.subn(lambda m: foot, old)
        assert a == 1 and b == 1, (f, a, b)
        kind = 'page'
    open(f, 'w', encoding='utf8').write(old)
    print(kind, f)
