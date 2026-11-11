#!/usr/bin/env python3
"""Dark-background zoom crops of feet + shoulders for A/B/C shipped world sprites."""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SHIPPED = ROOT / "assets/ui/angelina-skins/shipped"
SKINS = {
    "A": "angelina-teen-A-world.webp",
    "B": "angelina-teen-B-world.webp",
    "C": "angelina-teen-C-v2-world.webp",
}


def crop_band(img: Image.Image, top_ratio: float, height_ratio: float) -> Image.Image:
    w, h = img.size
    y0 = int(h * top_ratio)
    y1 = min(h, int(h * (top_ratio + height_ratio)))
    return img.crop((0, y0, w, y1))


def on_dark_canvas(crop: Image.Image, pad: int = 24) -> Image.Image:
    cw, ch = crop.size
    canvas = Image.new("RGBA", (cw + pad * 2, ch + pad * 2), (12, 8, 20, 255))
    canvas.paste(crop, (pad, pad), crop)
    return canvas


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for skin, fname in SKINS.items():
        path = SHIPPED / fname
        img = Image.open(path).convert("RGBA")
        feet = on_dark_canvas(crop_band(img, 0.72, 0.26))
        shoulders = on_dark_canvas(crop_band(img, 0.08, 0.22))
        feet.save(args.out / f"alpha-zoom-{skin}-feet-dark.png")
        shoulders.save(args.out / f"alpha-zoom-{skin}-shoulders-dark.png")
        print("wrote", skin, "feet+shoulders")


if __name__ == "__main__":
    main()
