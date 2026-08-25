from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import random

ROOT = Path(__file__).resolve().parents[1] / "assets" / "3d" / "textures"
ROOT.mkdir(parents=True, exist_ok=True)
rng = random.Random(40508)

def noise(size, base, spread):
    im = Image.new("RGB", (size, size))
    px = im.load()
    for y in range(size):
        for x in range(size):
            n = rng.randint(-spread, spread)
            px[x, y] = tuple(max(0, min(255, c + n)) for c in base)
    return im

def save_base():
    im = noise(128, (190, 197, 194), 1)
    d = ImageDraw.Draw(im)
    font = ImageFont.load_default(size=6)
    # Broad anodized-foil reflection bands, then a crisp heat-seal perimeter.
    d.polygon([(0, 8), (128, 0), (128, 18), (0, 30)], fill=(216, 221, 219))
    d.polygon([(0, 92), (128, 78), (128, 104), (0, 116)], fill=(171, 181, 178))
    d.rounded_rectangle((8, 8, 120, 120), radius=15, outline=(118, 128, 125), width=2)
    d.rounded_rectangle((11, 11, 117, 117), radius=13, outline=(226, 230, 228), width=1)
    d.text((42, 47), "Li-ion", font=font, fill=(38, 47, 44))
    d.text((31, 68), "3.7V 600mAh", font=font, fill=(42, 50, 47))
    im.save(ROOT / "battery_basecolor.png", optimize=True)

def save_rough():
    im = noise(64, (132, 132, 132), 3)
    im.save(ROOT / "battery_roughness.png", optimize=True)

def save_normal():
    im = Image.new("RGB", (64, 64), (128, 128, 255))
    d = ImageDraw.Draw(im)
    for p in range(8, 64, 16):
        d.line((p, 0, p, 64), fill=(132, 127, 250), width=1)
    im.save(ROOT / "electronics_normal.png", optimize=True)

def save_board():
    im = Image.new("RGB", (256, 256), (22, 107, 75))
    d = ImageDraw.Draw(im)
    for x in range(12, 246, 22):
        d.line((x, 8, x, 248), fill=(29, 103, 72), width=1)
    for y in (32, 90, 142, 206):
        d.line((8, y, 248, y), fill=(67, 117, 86), width=1)
    # Keep the texture as a board-bed cue; the imported CAD supplies the
    # actual package silhouettes. A small IC shadow avoids the PASS9 generic
    # planar-UV mapping turning the whole board face black.
    d.rounded_rectangle((118, 112, 132, 128), radius=2, fill=(35, 48, 41), outline=(20, 33, 27), width=1)
    d.text((20, 218), "TP4056", fill=(224, 228, 180))
    im.save(ROOT / "tp4056_basecolor.png", optimize=True)

def save_ao():
    im = Image.new("L", (64, 64), 255)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((3, 3, 60, 60), radius=8, outline=205, width=4)
    im.save(ROOT / "electronics_ao.png", optimize=True)

save_base(); save_rough(); save_normal(); save_board(); save_ao()
print(f"wrote {len(list(ROOT.glob('*.png')))} PBR textures to {ROOT}")
