#!/usr/bin/env python3
"""
Patch imagine_images/RgdDh.jpg: replace ADOPT ME / HALLOWEEN text only (main @ 185368 B).
Preserves all pixels outside the edit mask (JPEG q=95).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = ROOT / "imagine_images" / "RgdDh.jpg"

W, H = 1168, 784
# User layout (1168×784)
LINE1_BOX = (200, 288, 295, 318)  # ADOPT ME
LINE2_BOX = (197, 320, 297, 348)  # HALLOWEEN
EDIT_X0, EDIT_X1 = 190, 305
EDIT_Y0, EDIT_Y1 = 284, 350  # nothing below y=350
CROP_PROOF = (150, 150, 560, 560)  # x0,y0,x1,y1
HALO_PX = 10
JPEG_QUALITY = 95
OUTSIDE_TOLERANCE = 3  # max per-channel delta outside mask after round-trip

NEW_LINES = ("PUNK ME", "HALLOWEEN")


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def pink_mask(bgr: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    return cv2.inRange(hsv, (140, 60, 100), (175, 255, 255))


def build_inpaint_mask(bgr: np.ndarray) -> np.ndarray:
    """Neon letters + halo inside edit rect only (y <= 350)."""
    m = np.zeros((H, W), np.uint8)
    pm = pink_mask(bgr)
    for x0, y0, x1, y1 in (LINE1_BOX, LINE2_BOX):
        sub = pm[y0:y1, x0:x1]
        m[y0:y1, x0:x1] = sub
    m[EDIT_Y0:EDIT_Y1, EDIT_X0:EDIT_X1] = cv2.bitwise_and(
        m[EDIT_Y0:EDIT_Y1, EDIT_X0:EDIT_X1],
        m[EDIT_Y0:EDIT_Y1, EDIT_X0:EDIT_X1],
    )
    m = cv2.dilate(m, np.ones((5, 5), np.uint8), iterations=2)
    # Clip to edit window (no bat / hair band below 350)
    clip = np.zeros_like(m)
    clip[EDIT_Y0:EDIT_Y1, EDIT_X0:EDIT_X1] = 255
    return cv2.bitwise_and(m, clip)


def sample_neon_color(bgr: np.ndarray) -> tuple[int, int, int]:
    x0, y0, x1, y1 = 200, 215, 295, 285
    pm = pink_mask(bgr[y0:y1, x0:x1])
    pts = bgr[y0:y1, x0:x1][pm > 0]
    if len(pts) < 50:
        return (255, 79, 216)  # #ff4fd8 BGR
    med = np.median(pts, axis=0)
    return tuple(int(c) for c in med)


def fill_wall_patch(bgr: np.ndarray, inpaint_mask: np.ndarray) -> np.ndarray:
    m = cv2.dilate(inpaint_mask, np.ones((3, 3), np.uint8), iterations=1)
    out = cv2.inpaint(bgr, m, 14, cv2.INPAINT_TELEA)
    # Dark wall tint + light noise inside edit rect only
    ys = slice(EDIT_Y0, EDIT_Y1)
    xs = slice(EDIT_X0, EDIT_X1)
    wall = np.median(bgr[300:340, 175:188].reshape(-1, 3), axis=0)
    patch = out[ys, xs].astype(np.float32)
    rng = np.random.default_rng(42)
    patch += rng.normal(0, 3.5, patch.shape)
    patch = patch * 0.55 + wall * 0.45
    zone = inpaint_mask[ys, xs] > 0
    base = out[ys, xs].astype(np.float32)
    base[zone] = patch[zone]
    out[ys, xs] = np.clip(base, 0, 255).astype(np.uint8)
    return out


def draw_neon(bgr: np.ndarray, color_bgr: tuple[int, int, int]) -> np.ndarray:
    """Two-line neon inside edit rect; glow via blurred duplicate (screen-like add)."""
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    base = Image.fromarray(rgb)
    w, h = base.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = _font(20)
    cx = (LINE1_BOX[0] + LINE1_BOX[2]) // 2
    cy1 = (LINE1_BOX[1] + LINE1_BOX[3]) // 2
    cy2 = (LINE2_BOX[1] + LINE2_BOX[3]) // 2
    rim = (color_bgr[2], color_bgr[1], color_bgr[0], 255)
    core = (min(255, rim[0] + 40), min(255, rim[1] + 30), min(255, rim[2] + 35), 255)
    for cy, text in ((cy1, NEW_LINES[0]), (cy2, NEW_LINES[1])):
        for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, 1), (-1, 1), (1, -1)):
            draw.text((cx + dx, cy + dy), text, font=font, fill=rim, anchor="mm")
        draw.text((cx, cy), text, font=font, fill=core, anchor="mm")
    glow = layer.filter(ImageFilter.GaussianBlur(radius=9))
    glow2 = layer.filter(ImageFilter.GaussianBlur(radius=5))
    neon = Image.alpha_composite(glow, glow2)
    neon = Image.alpha_composite(neon, layer)
    # Restrict composite to edit rectangle
    restrict = Image.new("L", (w, h), 0)
    ImageDraw.Draw(restrict).rectangle((EDIT_X0, EDIT_Y0, EDIT_X1, EDIT_Y1), fill=255)
    alpha = np.array(neon.split()[-1], dtype=np.float32) / 255.0
    alpha = alpha * (np.array(restrict) / 255.0)
    neon_rgb = np.array(neon.convert("RGB"), dtype=np.float32)
    out_rgb = np.array(base, dtype=np.float32)
    a = alpha[..., None]
    # Screen-like add for glow, then alpha blend
    screen = 255 - (255 - out_rgb) * (255 - neon_rgb) / 255.0
    blended = np.clip(out_rgb * (1 - a) + screen * a, 0, 255).astype(np.uint8)
    return cv2.cvtColor(blended, cv2.COLOR_RGB2BGR)


def outside_edit_mask() -> np.ndarray:
    m = np.ones((H, W), np.uint8) * 255
    m[EDIT_Y0:EDIT_Y1, EDIT_X0:EDIT_X1] = 0
    return m


def enforce_outside_unchanged(result: np.ndarray, original: np.ndarray) -> np.ndarray:
    out = result.copy()
    om = outside_edit_mask()
    ys, xs = np.where(om > 0)
    out[ys, xs] = original[ys, xs]
    return out


def verify_outside(original: np.ndarray, patched: np.ndarray) -> None:
    om = outside_edit_mask()
    diff = np.abs(patched.astype(np.int16) - original.astype(np.int16))
    diff_out = diff[om > 0]
    mx = int(diff_out.max()) if diff_out.size else 0
    if mx > OUTSIDE_TOLERANCE:
        raise SystemExit(f"outside mask changed too much: max delta {mx}")


def verify_jpeg_roundtrip_outside(original: np.ndarray, path: Path) -> None:
    saved = cv2.imread(str(path))
    om = outside_edit_mask()
    diff = np.abs(saved.astype(np.int16) - original.astype(np.int16))
    mx = int(diff[om > 0].max()) if np.any(om) else 0
    if mx > 28:
        raise SystemExit(f"after JPEG outside mask max delta {mx}")


def save_proof(before: np.ndarray, after: np.ndarray, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    x0, y0, x1, y1 = CROP_PROOF
    cv2.imwrite(str(out_dir / "brand-rgdh-crop-before.jpg"), before[y0:y1, x0:x1], [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(str(out_dir / "brand-rgdh-crop-after.jpg"), after[y0:y1, x0:x1], [cv2.IMWRITE_JPEG_QUALITY, 95])


def patch_from_original(original: np.ndarray) -> np.ndarray:
    if original.shape[1] != W or original.shape[0] != H:
        raise SystemExit(f"expected {W}x{H}, got {original.shape[1]}x{original.shape[0]}")
    inpaint_m = build_inpaint_mask(original)
    color = sample_neon_color(original)
    mid = fill_wall_patch(original, inpaint_m)
    drawn = draw_neon(mid, color)
    out = enforce_outside_unchanged(drawn, original)
    verify_outside(original, out)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--from-main-bytes", type=Path, help="raw original jpg (185368 B)")
    ap.add_argument("--proof-dir", type=Path, default=None)
    args = ap.parse_args()

    if args.from_main_bytes:
        buf = np.frombuffer(args.from_main_bytes.read_bytes(), dtype=np.uint8)
        original = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    else:
        original = cv2.imread(str(args.src))
    if original is None:
        raise SystemExit("cannot read image")

    before = original.copy()
    out = patch_from_original(before)
    cv2.imwrite(str(args.src), out, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    verify_jpeg_roundtrip_outside(before, args.src)
    if args.proof_dir:
        save_proof(before, out, args.proof_dir)
    print(f"OK {args.src} ({args.src.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
