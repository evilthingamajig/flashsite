from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).parent
SOURCES = ROOT / "production-candidates"
OUT = ROOT / "cleaned-alpha"


JOBS = {
    "enclosure-reverse-rejected-rgb.png": ("enclosure-reverse-v1.png", 185, 48),
    "battery-edge-rejected-rgb.png": ("battery-edge-v1.png", 222, 28),
    "module-edge-rejected-rgb.png": ("module-edge-v1.png", 185, 48),
}


def boundary_background(rgb: np.ndarray, minimum_luma: int, maximum_chroma: int) -> np.ndarray:
    height, width, _ = rgb.shape
    luma = rgb.astype(np.uint16).sum(axis=2) // 3
    chroma = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    candidate = (luma >= minimum_luma) & (chroma <= maximum_chroma)
    background = np.zeros((height, width), dtype=bool)
    queue = deque()

    def seed(x: int, y: int) -> None:
        if candidate[y, x] and not background[y, x]:
            background[y, x] = True
            queue.append((x, y))

    for x in range(width):
        seed(x, 0)
        seed(x, height - 1)
    for y in range(height):
        seed(0, y)
        seed(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for ny in range(max(0, y - 1), min(height, y + 2)):
            for nx in range(max(0, x - 1), min(width, x + 2)):
                if candidate[ny, nx] and not background[ny, nx]:
                    background[ny, nx] = True
                    queue.append((nx, ny))
    return background


def largest_foreground_component(background: np.ndarray) -> np.ndarray:
    foreground = ~background
    height, width = foreground.shape
    seen = np.zeros_like(foreground)
    best = []

    for y in range(height):
        for x in range(width):
            if not foreground[y, x] or seen[y, x]:
                continue
            component = []
            queue = deque([(x, y)])
            seen[y, x] = True
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))
                for ny in range(max(0, cy - 1), min(height, cy + 2)):
                    for nx in range(max(0, cx - 1), min(width, cx + 2)):
                        if foreground[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            queue.append((nx, ny))
            if len(component) > len(best):
                best = component

    result = np.zeros_like(foreground)
    for x, y in best:
        result[y, x] = True
    return result


def decontaminated_rgba(rgb: np.ndarray, hard_mask: np.ndarray) -> Image.Image:
    mask_image = Image.fromarray((hard_mask * 255).astype(np.uint8), "L")
    # A restrained feather gives smooth edges without carrying checkerboard RGB.
    alpha = mask_image.filter(ImageFilter.GaussianBlur(0.65))
    alpha_array = np.asarray(alpha)

    clean_rgb = rgb.copy()
    known = hard_mask.copy()
    # Extend real foreground color two pixels beyond the hard silhouette. This
    # replaces baked checker colors wherever the feather is partially visible.
    for _ in range(3):
        accum = np.zeros_like(clean_rgb, dtype=np.uint32)
        count = np.zeros(hard_mask.shape, dtype=np.uint16)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)):
            shifted_known = np.roll(known, (dy, dx), axis=(0, 1))
            shifted_rgb = np.roll(clean_rgb, (dy, dx), axis=(0, 1))
            if dy < 0:
                shifted_known[dy:, :] = False
            elif dy > 0:
                shifted_known[:dy, :] = False
            if dx < 0:
                shifted_known[:, dx:] = False
            elif dx > 0:
                shifted_known[:, :dx] = False
            accum += shifted_rgb.astype(np.uint32) * shifted_known[..., None]
            count += shifted_known.astype(np.uint16)
        fill = (~known) & (count > 0) & (alpha_array > 0)
        clean_rgb[fill] = (accum[fill] // count[fill, None]).astype(np.uint8)
        known |= fill

    rgba = np.dstack((clean_rgb, alpha_array)).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def clean(source_name: str, output_name: str, minimum_luma: int, maximum_chroma: int) -> Path:
    source = Image.open(SOURCES / source_name).convert("RGB")
    rgb = np.asarray(source)
    background = boundary_background(rgb, minimum_luma, maximum_chroma)
    hard_mask = largest_foreground_component(background)
    output = decontaminated_rgba(rgb, hard_mask)
    destination = OUT / output_name
    output.save(destination)
    return destination


def production_assets() -> list[Path]:
    return [
        OUT / "closed-anchor-v2.png",
        SOURCES / "enclosure-front-v1.png",
        OUT / "enclosure-reverse-v1.png",
        SOURCES / "solar-lid-front-v2.png",
        OUT / "module-front-v3.png",
        OUT / "module-edge-v1.png",
        OUT / "battery-front-v3.png",
        OUT / "battery-edge-v1.png",
        OUT / "led-pair-front-v3.png",
    ]


def make_contact_sheet(background: tuple[int, int, int], destination: Path) -> None:
    assets = production_assets()
    cell_width, cell_height = 520, 430
    columns = 3
    rows = (len(assets) + columns - 1) // columns
    canvas = Image.new("RGB", (columns * cell_width, rows * cell_height), background)
    draw = ImageDraw.Draw(canvas)
    label_fill = (245, 245, 245) if sum(background) < 350 else (24, 24, 24)
    for index, path in enumerate(assets):
        image = Image.open(path).convert("RGBA")
        image.thumbnail((470, 350), Image.Resampling.LANCZOS)
        x = (index % columns) * cell_width + (cell_width - image.width) // 2
        y = (index // columns) * cell_height + 20 + (350 - image.height) // 2
        tile = Image.new("RGBA", image.size, background + (255,))
        tile.alpha_composite(image)
        canvas.paste(tile.convert("RGB"), (x, y))
        draw.text(((index % columns) * cell_width + 18, (index // columns) * cell_height + 382), path.name, fill=label_fill)
    canvas.save(destination, quality=94, subsampling=0)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for source_name, (output_name, minimum_luma, maximum_chroma) in JOBS.items():
        clean(source_name, output_name, minimum_luma, maximum_chroma)
    make_contact_sheet((225, 224, 218), OUT / "contact-sheet-neutral.jpg")
    make_contact_sheet((11, 127, 71), OUT / "contact-sheet-green.jpg")
    make_contact_sheet((255, 255, 255), OUT / "qa-contact-sheet-white.jpg")
    make_contact_sheet((0, 0, 0), OUT / "qa-contact-sheet-black.jpg")
