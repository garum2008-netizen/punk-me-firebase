#!/usr/bin/env python3
"""Remove «ADOPT ME HALLOWEEN» from imagine_images/RgdDh.jpg — text-only inpaint + neon replacement."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = ROOT / "imagine_images" / "RgdDh.jpg"
BACKUP_NAME = "RgdDh.jpg.bak-pre-brand-fix"

TEXT_Y0, TEXT_Y1 = 315, 402
TEXT_X0, TEXT_X1 = 212, 302
SKULL_Y_MAX = 322
BAT_Y_MIN = 448
CROP_PAD = 12
NEON_LINES = ("PUNK ME", "HALLOWEEN")


def pink_mask_bgr(bgr: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    return cv2.inRange(hsv, (140, 70, 110), (175, 255, 255))


def build_text_inpaint_mask(bgr: np.ndarray) -> np.ndarray:
    pink = pink_mask_bgr(bgr)
    roi = pink[TEXT_Y0:TEXT_Y1, TEXT_X0:TEXT_X1]
    mask_roi = np.zeros_like(roi)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(roi, connectivity=8)
    for i in range(1, n):
        _x, y, _w, h, area = stats[i]
        if area < 28:
            continue
        cy = y + h / 2 + TEXT_Y0
        if cy <= SKULL_Y_MAX or cy >= BAT_Y_MIN:
            continue
        mask_roi[labels == i] = 255
    band = np.zeros_like(pink)
    band[TEXT_Y0:TEXT_Y1, TEXT_X0:TEXT_X1] = mask_roi
    band = cv2.morphologyEx(band, cv2.MORPH_CLOSE, np.ones((5, 3), np.uint8))
    return cv2.dilate(band, np.ones((7, 5), np.uint8), iterations=2)


def inpaint_sign_background(bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    m = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=1)
    return cv2.inpaint(bgr, m, 6, cv2.INPAINT_NS)


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_neon_lines(bgr: np.ndarray) -> np.ndarray:
    h, w = bgr.shape[:2]
    x0, y0 = TEXT_X0 - 8, TEXT_Y0 - 6
    x1, y1 = TEXT_X1 + 8, TEXT_Y1 + 8
    crop_bgr = bgr[y0:y1, x0:x1].copy()
    ch, cw = crop_bgr.shape[:2]
    layer = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = _load_font(16)
    cx = (TEXT_X0 + TEXT_X1) // 2 - x0
    for y, line in ((332 - y0, NEON_LINES[0]), (362 - y0, NEON_LINES[1])):
        draw.text((cx, y), line, font=font, fill=(255, 118, 228, 255), anchor="mm")
        draw.text((cx, y), line, font=font, fill=(255, 200, 245, 220), anchor="mm")
    glow = layer.filter(ImageFilter.GaussianBlur(radius=3.2))
    glow2 = layer.filter(ImageFilter.GaussianBlur(radius=6.5))
    neon = Image.alpha_composite(Image.alpha_composite(glow2, glow), layer)
    alpha = np.array(neon.split()[-1], dtype=np.float32) / 255.0
    neon_rgb = np.array(neon.convert("RGB"), dtype=np.float32)
    base_rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    blended = base_rgb * (1 - alpha[..., None]) + neon_rgb * alpha[..., None]
    out = bgr.copy()
    out[y0:y1, x0:x1] = cv2.cvtColor(blended.astype(np.uint8), cv2.COLOR_RGB2BGR)
    return out


def save_proof_crops(before: np.ndarray, after: np.ndarray, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    y0, y1 = TEXT_Y0 - CROP_PAD - 40, TEXT_Y1 + CROP_PAD + 55
    x0, x1 = TEXT_X0 - CROP_PAD - 25, TEXT_X1 + CROP_PAD + 35
    y0, x0 = max(0, y0), max(0, x0)
    cv2.imwrite(str(out_dir / "brand-rgdh-crop-before.jpg"), before[y0:y1, x0:x1])
    cv2.imwrite(str(out_dir / "brand-rgdh-crop-after.jpg"), after[y0:y1, x0:x1])


def ocr_contains_adopt(path: Path) -> bool:
    try:
        text = subprocess.check_output(
            ["tesseract", str(path), "stdout", "-l", "eng"],
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False
    return "adopt" in text.lower()


def patch_image(src: Path) -> tuple[np.ndarray, np.ndarray]:
    before = cv2.imread(str(src))
    if before is None or before.shape[1] != 1168 or before.shape[0] != 784:
        raise SystemExit("bad image or size")
    mask = build_text_inpaint_mask(before)
    mid = inpaint_sign_background(before, mask)
    after = draw_neon_lines(mid)
    cv2.imwrite(str(src), after, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    return before, after


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--proof-dir", type=Path, default=None)
    ap.add_argument("--restore-backup", action="store_true")
    args = ap.parse_args()
    src = args.src
    backup = src.parent / BACKUP_NAME
    if args.restore_backup and backup.exists():
        src.write_bytes(backup.read_bytes())
    elif not backup.exists() and src.exists():
        backup.write_bytes(src.read_bytes())
    before, after = patch_image(src)
    if args.proof_dir:
        save_proof_crops(before, after, args.proof_dir)
    if ocr_contains_adopt(src):
        sys.exit(2)
    crop = src.parent / "_ocr_crop.jpg"
    cv2.imwrite(str(crop), after[TEXT_Y0 - 20 : TEXT_Y1 + 30, TEXT_X0 - 15 : TEXT_X1 + 15])
    if ocr_contains_adopt(crop):
        sys.exit(2)
    crop.unlink(missing_ok=True)
    print(f"OK patched {src}")


if __name__ == "__main__":
    main()
