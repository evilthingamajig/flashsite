"""Generate WebP variants for content images used on pages.
Writes /images/opt/<subdir>/<stem>.w<width>.<hash8>.webp and tools/img-variants.json.
Also generates /images/og/<slug>.jpg (1200x630 cover) for pages with a page-specific og image.
Run: python3 tools/imgopt.py  (needs Python 3 + Pillow)"""
import os, re, io, json, hashlib, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIDTHS = (480, 800, 1200, 1600)
metrics = json.load(open(os.path.join(ROOT, 'tools', 'img-metrics.json')))

def base_source(src):
    """Map /images/.../name-800.webp and /images/opt/.../name.w800.<hash>.webp to their source."""
    if '/opt/' in src:
        ms = list(re.finditer(r'/(frames|images)/', src))
        if ms:
            tail = src[ms[-1].start():]
            tail = re.sub(r'\.w\d+\.[0-9a-f]{8}', '', tail)
            tail = tail.replace('/opt/', '/')
            for ext in ('.webp', '.jpg', '.jpeg', '.png'):
                cand = re.sub(r'\.\w+$', ext, tail) if re.search(r'\.(webp|jpe?g|png)$', tail) else tail + ext
                if os.path.exists(ROOT + cand):
                    return cand
    m = re.match(r'^(.*)-(?:480|800|1200|1600)\.(webp|jpe?g|png)$', src)
    if m:
        for ext in ('.webp', '.jpg', '.jpeg', '.png'):
            cand = m.group(1) + ext
            if os.path.exists(ROOT + cand):
                return cand
    return src

sources = {it['src'] for it in metrics if it.get('src')}
# video posters get variants too
for f in glob.glob(ROOT + '/**/index.html', recursive=True):
    if '/ref/' in f:
        continue
    for p in re.findall(r'poster="([^"]+)"', open(f).read()):
        sources.add(p)

variants = {}
for src0 in sorted(sources):
    src = src0
    if not (src.startswith('/images/') or src.startswith('/frames/')) or src.startswith('/images/brand/'):
        continue
    if src.lower().endswith('.svg'):
        continue
    src = base_source(src)
    if src in variants:
        continue
    path = ROOT + src
    if not os.path.exists(path):
        continue
    im = Image.open(path)
    if im.mode in ('RGBA', 'LA') or (im.mode in ('P', 'PA') and 'transparency' in im.info):
        im = im.convert('RGBA')
    else:
        im = im.convert('RGB')
    nw, nh = im.size
    outs = []
    stem, _ = os.path.splitext(os.path.basename(src))
    sub = os.path.dirname(src).replace('/images/', '/images/opt/', 1).replace('/frames/', '/images/opt/frames/', 1)
    ws = [w for w in WIDTHS if w < nw]
    top = min(nw, 1600)
    if top not in ws:
        ws.append(top)
    for w in ws:
        buf = io.BytesIO()
        im.resize((w, round(nh * w / nw)), Image.LANCZOS).save(buf, 'WEBP', quality=78)
        h8 = hashlib.sha1(buf.getvalue()).hexdigest()[:8]
        rel = f'{sub}/{stem}.w{w}.{h8}.webp'
        dst = ROOT + rel
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'wb').write(buf.getvalue())
        outs.append({'w': w, 'src': rel})
    variants[src] = {'nw': nw, 'nh': nh, 'v': outs}

json.dump(variants, open(os.path.join(ROOT, 'tools', 'img-variants.json'), 'w'), indent=1)
print('sources:', len(variants), 'variants:', sum(len(v['v']) for v in variants.values()))

# og images: 1200x630 cover JPG for every page-specific og candidate
og_map = {}
os.makedirs(ROOT + '/images/og', exist_ok=True)
for f in sorted(glob.glob(ROOT + '/**/index.html', recursive=True)):
    if '/ref/' in f:
        continue
    rel = '/' + os.path.relpath(f, ROOT).replace('/index.html', '').rstrip('/') + '/'
    rel = '/' if rel == '//' else rel
    if not rel.startswith('/news/') or rel == '/news/':
        continue
    h = open(f).read()
    m = re.search(r'ff-pagehead__media[\s\S]{0,400}?<img[^>]*src="([^"]+)"', h)
    if not m:
        continue
    b = base_source(m.group(1))
    v = variants.get(b)
    if not v or v['nw'] < 600:
        continue
    slug = rel.strip('/').replace('/', '-')
    dst = f'/images/og/{slug}.jpg'
    im = Image.open(ROOT + b).convert('RGB')
    nw, nh = im.size
    tr = 1200 / 630
    if nw / nh > tr:
        tw = int(nh * tr); x0 = (nw - tw) // 2; box = (x0, 0, x0 + tw, nh)
    else:
        th = int(nw / tr); y0 = int((nh - th) * 0.45); box = (0, y0, nw, y0 + th)
    im.crop(box).resize((1200, 630), Image.LANCZOS).save(ROOT + dst, 'JPEG', quality=82, optimize=True)
    og_map[rel] = dst
json.dump(og_map, open(os.path.join(ROOT, 'tools', 'og-map.json'), 'w'), indent=1)
print('og images:', len(og_map))
