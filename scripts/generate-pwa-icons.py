#!/usr/bin/env python3
"""Generate PWA icons for PUNK ME (neon on dark)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent / "icons"
ROOT.mkdir(parents=True, exist_ok=True)


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    pad = int(size * 0.12) if maskable else int(size * 0.06)
    img = Image.new("RGBA", (size, size), (8, 4, 18, 255))
    d = ImageDraw.Draw(img)
    inner = size - 2 * pad
    d.rounded_rectangle(
        (pad, pad, pad + inner, pad + inner),
        radius=int(size * 0.18),
        fill=(20, 8, 40, 255),
        outline=(255, 0, 255, 220),
        width=max(2, size // 64),
    )
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size * 0.22))
    except OSError:
        font = ImageFont.load_default()
    text = "PUNK"
    tw, th = d.textbbox((0, 0), text, font=font)[2:]
    d.text(((size - tw) / 2, size * 0.32 - th / 2), text, fill=(0, 255, 255, 255), font=font)
    text2 = "ME"
    tw2, th2 = d.textbbox((0, 0), text2, font=font)[2:]
    d.text(((size - tw2) / 2, size * 0.52 - th2 / 2), text2, fill=(255, 110, 200, 255), font=font)
    return img


for name, sz, mask in [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-maskable-512.png", 512, True),
    ("apple-touch-icon.png", 180, False),
]:
    draw_icon(sz, mask).save(ROOT / name, "PNG")
    print("wrote", ROOT / name)
