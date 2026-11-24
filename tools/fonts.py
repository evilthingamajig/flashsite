"""Download Google woff2s, instance + subset them into tools/fonts-src/.
Needs Python 3 + fontTools + brotli (see tools/requirements.txt).
Outputs are committed inputs to build.mjs, which hashes them into /fonts/."""
import os, re, urllib.request, glob, unicodedata
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.subset import Subsetter, Options

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'tools', 'font-raw')
OUT = os.path.join(ROOT, 'tools', 'fonts-src')
os.makedirs(RAW, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}
URL = (
    'https://fonts.googleapis.com/css2?'
    'family=Syne:wght@700;800&'
    'family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&'
    'family=Newsreader:ital,wght@1,500&display=swap'
)

req = urllib.request.Request(URL, headers=UA)
css = urllib.request.urlopen(req).read().decode()

blocks = re.findall(
    r'/\* (\S+) \*/\s*@font-face\s*{[^}]*font-family:\s*\'([^\']+)\'[^}]*font-style:\s*(\w+)[^}]*font-weight:\s*(\d+)[^}]*src:\s*url\(([^)]+)\)[^}]*unicode-range:\s*([^;}]+)',
    css,
)
raws = {}
for subset, fam, style, w, url, ur in blocks:
    if subset != 'latin':
        continue
    key = f'{fam}-{style}-{w}'
    if key in raws:
        continue
    fn = os.path.join(RAW, key + '.woff2')
    if not os.path.exists(fn):
        urllib.request.urlretrieve(url, fn)
    raws[key] = fn

# charset: printable ASCII + typographic punctuation + every non-ASCII char on the pages
chars = set(range(0x20, 0x7F))
chars.update(ord(c) for c in '–—‘’“”…·→•©×¹²≈')
for f in glob.glob(ROOT + '/**/index.html', recursive=True):
    if '/ref/' in f:
        continue
    text = re.sub(r'<(script|style)[\s\S]*?</\1>', ' ', open(f, encoding='utf-8').read())
    text = re.sub(r'<[^>]+>', ' ', text)
    for c in text:
        if ord(c) > 0x7E:
            chars.add(ord(c))
print('charset:', len(chars), 'codepoints')

def process(src, dst, pin=None):
    f = TTFont(src)
    opts = Options(flavor='woff2')
    opts.name_IDs = ['*']
    ss = Subsetter(opts)
    ss.populate(unicodes=chars)
    ss.subset(f)
    if 'fvar' in f and pin:
        f = instantiateVariableFont(f, pin)
    f.save(dst)
    print(os.path.basename(dst), os.path.getsize(dst), 'bytes')

# Clear old Merriweather / Source Sans outputs so build.mjs does not keep stale faces
for old in glob.glob(os.path.join(OUT, '*.woff2')):
    os.remove(old)

for w in (700, 800):
    src = raws.get(f'Syne-normal-{w}') or raws.get('Syne-normal-700')
    process(src, os.path.join(OUT, f'syne-{w}.woff2'), {'wght': w})

for w in (400, 500, 600, 700):
    process(raws['Figtree-normal-400'] if f'Figtree-normal-{w}' not in raws else raws[f'Figtree-normal-{w}'],
            os.path.join(OUT, f'figtree-{w}.woff2'), {'wght': w})

# Figtree italic 400
ital = raws.get('Figtree-italic-400')
if ital:
    process(ital, os.path.join(OUT, 'figtree-italic.woff2'), {'wght': 400})

# Newsreader italic 500 for pull quotes
nr = raws.get('Newsreader-italic-500') or raws.get('Newsreader-italic-400')
if nr:
    process(nr, os.path.join(OUT, 'newsreader-italic.woff2'), {'wght': 500})

for name in ('syne-800', 'figtree-400'):
    path = os.path.join(OUT, name + '.woff2')
    if os.path.exists(path):
        f = TTFont(path)
        print(f'{name}: upm={f["head"].unitsPerEm} asc={f["hhea"].ascent} desc={f["hhea"].descent} lg={f["hhea"].lineGap}')
