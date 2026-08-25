from pathlib import Path
from PIL import Image, ImageDraw
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
    im = noise(128, (105, 115, 112), 7)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((12, 12, 116, 116), radius=12, outline=(185, 190, 188), width=2)
    d.line((20, 82, 108, 82), fill=(150, 158, 154), width=2)
    d.text((28, 53), "Li-ion", fill=(62, 68, 66))
    im.save(ROOT / "battery_basecolor.png", optimize=True)

def save_rough():
    im = noise(64, (105, 105, 105), 12)
    im.save(ROOT / "battery_roughness.png", optimize=True)

def save_normal():
    im = Image.new("RGB", (64, 64), (128, 128, 255))
    d = ImageDraw.Draw(im)
    for p in range(8, 64, 16):
        d.line((p, 0, p, 64), fill=(136, 124, 247), width=1)
    im.save(ROOT / "electronics_normal.png", optimize=True)

def save_board():
    im = Image.new("RGB", (256, 256), (22, 107, 75))
    d = ImageDraw.Draw(im)
    for x in range(12, 246, 22):
        d.line((x, 8, x, 248), fill=(31, 142, 92), width=2)
    for y in (32, 90, 142, 206):
        d.line((8, y, 248, y), fill=(198, 143, 58), width=2)
    d.rectangle((86, 78, 176, 172), fill=(17, 25, 22), outline=(3, 8, 6), width=3)
    d.text((20, 218), "TP4056", fill=(224, 228, 180))
    im.save(ROOT / "tp4056_basecolor.png", optimize=True)

def save_ao():
    im = Image.new("L", (64, 64), 255)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((3, 3, 60, 60), radius=8, outline=205, width=4)
    im.save(ROOT / "electronics_ao.png", optimize=True)

save_base(); save_rough(); save_normal(); save_board(); save_ao()
print(f"wrote {len(list(ROOT.glob('*.png')))} PBR textures to {ROOT}")
