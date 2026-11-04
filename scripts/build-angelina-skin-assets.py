#!/usr/bin/env python3
"""Build shipped WebP assets from Owner-approved source PNGs (t569u). Alpha via local rembg matte; RGB unchanged."""
from __future__ import annotations

import hashlib
import io
import json
import subprocess
import sys
import time
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
AB6FA_HALO_BASELINE = ROOT / "scripts/angelina-skin-ab6fa-halo-baseline.json"
ALPHA_SHAPE_REV = "6d214651"
AB6FA_REV = "ab6fa30"
SKIN_DIR = ROOT / "assets/ui/angelina-skins"
SOURCE_DIR = SKIN_DIR / "source"
SHIPPED_DIR = SKIN_DIR / "shipped"
REF_DIR = SKIN_DIR / "alpha-ref"
MANIFEST_PATH = ROOT / "data/story/angelina-skin-manifest.json"

SOURCES = {
    "A": "angelina-teen-A.png",
    "B": "angelina-teen-B.png",
    "C": "angelina-teen-C-v2.png",
}

_rembg_session = None


def get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session

        _rembg_session = new_session("isnet-general-use")
    return _rembg_session


def rembg_alpha_matte(orig: Image.Image) -> Image.Image:
    """Apply rembg alpha only; RGB pixels copied from approved source."""
    from rembg import remove

    rgb = orig.convert("RGB")
    rb = remove(rgb, session=get_rembg_session())
    alpha = rb.split()[3]
    out = Image.new("RGBA", orig.size)
    opx = out.load()
    rpx = rgb.load()
    apx = alpha.load()
    w, h = orig.size
    for y in range(h):
        for x in range(w):
            r, g, b = rpx[x, y]
            opx[x, y] = (r, g, b, apx[x, y])
    return out


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def save_webp(img: Image.Image, dest: Path, quality: int = 90, *, lossless: bool = False) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    if lossless:
        img.save(dest, format="WEBP", lossless=True, method=6)
    else:
        img.save(dest, format="WEBP", quality=quality, method=6)
    return sha256_file(dest)


def corner_bg_refs(img: Image.Image, radius: int = 4) -> list[tuple[int, int, int]]:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    refs: list[tuple[int, int, int]] = []
    for cx, cy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        rs: list[int] = []
        gs: list[int] = []
        bs: list[int] = []
        for y in range(max(0, cy - radius), min(h, cy + radius + 1)):
            for x in range(max(0, cx - radius), min(w, cx + radius + 1)):
                r, g, b, _a = px[x, y]
                rs.append(r)
                gs.append(g)
                bs.append(b)
        refs.append((sum(rs) // len(rs), sum(gs) // len(gs), sum(bs) // len(bs)))
    return refs


def matches_bg(
    r: int,
    g: int,
    b: int,
    refs: list[tuple[int, int, int]],
    tolerance: int,
    *,
    strict: bool = False,
) -> bool:
    tol = max(4, tolerance // 2 if strict else tolerance)
    chroma = max(r, g, b) - min(r, g, b)
    lum = (r + g + b) / 3
    if chroma >= 22 and lum < 248:
        return False
    for cr, cg, cb in refs:
        if max(abs(r - cr), abs(g - cg), abs(b - cb)) <= tol:
            return True
    return False


def restore_feet_columns(rgba: Image.Image, orig: Image.Image, band_ratio: float = 0.14) -> Image.Image:
    """Re-opaque bg-colored shoe pixels under the lowest solid column in the lower band."""
    w, h = rgba.size
    px = rgba.load()
    opx = orig.convert("RGBA").load()
    y_band = int(h * (1 - band_ratio))
    for x in range(w):
        anchor = None
        for y in range(y_band - 1, int(h * 0.45), -1):
            if px[x, y][3] >= 200:
                anchor = y
                break
        if anchor is None:
            continue
        for y in range(anchor + 1, h):
            if px[x, y][3] >= 200:
                continue
            r, g, b, _a = opx[x, y]
            px[x, y] = (r, g, b, 255)
    return rgba


def apply_alpha_cutout(img: Image.Image, tolerance: int = 16) -> Image.Image:
    """Remove only backdrop connected to the image border (4-neighbour flood). RGB unchanged."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    refs = corner_bg_refs(rgba)

    bg = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def try_push(x: int, y: int, strict: bool) -> None:
        i = y * w + x
        if bg[i]:
            return
        r, g, b, _a = px[x, y]
        if not matches_bg(r, g, b, refs, tolerance, strict=strict):
            return
        bg[i] = 1
        q.append((x, y))

    for x in range(w):
        try_push(x, 0, strict=True)
    for y in range(h):
        try_push(0, y, strict=True)
        try_push(w - 1, y, strict=True)
    corner_w = max(8, w // 16)
    for x in range(corner_w):
        try_push(x, h - 1, strict=True)
        try_push(w - 1 - x, h - 1, strict=True)

    while q:
        x, y = q.popleft()
        if x > 0:
            try_push(x - 1, y, strict=False)
        if x + 1 < w:
            try_push(x + 1, y, strict=False)
        if y > 0:
            try_push(x, y - 1, strict=False)
        if y + 1 < h:
            try_push(x, y + 1, strict=False)

    for y in range(h):
        for x in range(w):
            if bg[y * w + x]:
                r, g, b, _a = px[x, y]
                px[x, y] = (r, g, b, 0)

    cut = keep_largest_foreground(rgba)
    cut = fill_internal_holes(cut)
    return restore_feet_columns(cut, img)


def keep_largest_foreground(rgba: Image.Image, min_alpha: int = 48) -> Image.Image:
    w, h = rgba.size
    px = rgba.load()
    seen = bytearray(w * h)
    best: list[tuple[int, int]] = []
    best_len = 0

    for sy in range(h):
        for sx in range(w):
            si = sy * w + sx
            if seen[si] or px[sx, sy][3] < min_alpha:
                continue
            comp: list[tuple[int, int]] = []
            q: deque[tuple[int, int]] = deque([(sx, sy)])
            seen[si] = 1
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    ni = ny * w + nx
                    if seen[ni] or px[nx, ny][3] < min_alpha:
                        continue
                    seen[ni] = 1
                    q.append((nx, ny))
            if len(comp) > best_len:
                best_len = len(comp)
                best = comp

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opx = out.load()
    for x, y in best:
        opx[x, y] = px[x, y]
    return out


def fill_internal_holes(rgba: Image.Image, min_alpha: int = 48) -> Image.Image:
    w, h = rgba.size
    px = rgba.load()
    hole = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def push_hole(x: int, y: int) -> None:
        i = y * w + x
        if hole[i] or px[x, y][3] >= min_alpha:
            return
        hole[i] = 1
        q.append((x, y))

    for x in range(w):
        push_hole(x, 0)
        push_hole(x, h - 1)
    for y in range(h):
        push_hole(0, y)
        push_hole(w - 1, y)
    while q:
        x, y = q.popleft()
        if x > 0:
            push_hole(x - 1, y)
        if x + 1 < w:
            push_hole(x + 1, y)
        if y > 0:
            push_hole(x, y - 1)
        if y + 1 < h:
            push_hole(x, y + 1)

    for y in range(h):
        for x in range(w):
            if hole[y * w + x]:
                continue
            if px[x, y][3] < min_alpha:
                r, g, b, _a = px[x, y]
                px[x, y] = (r, g, b, 255)
    return rgba


def feather_alpha_edges(img: Image.Image, radius: int = 2) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            touches_clear = False
            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        touches_clear = True
                        break
                    if px[nx, ny][3] < 16:
                        touches_clear = True
                        break
                if touches_clear:
                    break
            if touches_clear and a < 255:
                px[x, y] = (r, g, b, max(a, min(255, a + 30)))
    return rgba


NEAR_WHITE_LUM = 244


def strip_outline_near_white(rgba: Image.Image) -> Image.Image:
    img = rgba.convert("RGBA")
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 48:
                continue
            if (r + g + b) / 3 < NEAR_WHITE_LUM:
                continue
            edge = False
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    edge = True
                    break
                if px[nx, ny][3] < 32:
                    edge = True
                    break
            if edge:
                px[x, y] = (r, g, b, 0)
    return img


def defringe_gray_halos(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 0:
                continue
            if a < 64 and max(r, g, b) - min(r, g, b) < 12 and (r + g + b) / 3 > 200:
                px[x, y] = (r, g, b, 0)
            elif 0 < a < 96 and max(r, g, b) - min(r, g, b) < 10 and (r + g + b) / 3 > 210:
                px[x, y] = (r, g, b, 0)
            elif 96 <= a < 200 and max(r, g, b) - min(r, g, b) < 8 and (r + g + b) / 3 > 218:
                px[x, y] = (r, g, b, min(255, a + 28))
    return rgba


def defringe_alpha_edge_only(img: Image.Image) -> Image.Image:
    """Reduce dark-background halos by trimming semi-transparent edge alpha only."""
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 0 or a >= 250:
                continue
            edge = False
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h or px[nx, ny][3] < 24:
                    edge = True
                    break
            if not edge:
                continue
            if a < 72:
                px[x, y] = (r, g, b, 0)
            elif a < 140:
                px[x, y] = (r, g, b, int(a * 0.55))
    return rgba


def _pixel_is_alpha_edge(px, x: int, y: int, w: int, h: int, clear: int = 20) -> bool:
    _r, _g, _b, a = px[x, y]
    if a <= 0:
        return False
    if a < 255:
        return True
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        nx, ny = x + dx, y + dy
        if nx < 0 or ny < 0 or nx >= w or ny >= h:
            return True
        if px[nx, ny][3] < clear:
            return True
    return False


def _nearest_opaque_source_rgb(px, x: int, y: int, w: int, h: int, rpx, max_r: int = 6) -> tuple[int, int, int] | None:
    for rad in range(1, max_r + 1):
        rs: list[int] = []
        gs: list[int] = []
        bs: list[int] = []
        for dy in range(-rad, rad + 1):
            for dx in range(-rad, rad + 1):
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    continue
                if px[nx, ny][3] >= 250:
                    sr, sg, sb = rpx[nx, ny]
                    rs.append(sr)
                    gs.append(sg)
                    bs.append(sb)
        if rs:
            return (sum(rs) // len(rs), sum(gs) // len(gs), sum(bs) // len(bs))
    return None


def decontaminate_semi_edge_pixel(
    r: int, g: int, b: int, a: int, bg: tuple[int, int, int]
) -> tuple[int, int, int, int]:
    """Un-premultiply grey matte on semi-transparent edge pixels only."""
    br, bgc, bb = bg
    af = a / 255.0
    fr = int((r - br * (1.0 - af)) / max(af, 0.04))
    fg = int((g - bgc * (1.0 - af)) / max(af, 0.04))
    fb = int((b - bb * (1.0 - af)) / max(af, 0.04))
    return (
        max(0, min(255, fr)),
        max(0, min(255, fg)),
        max(0, min(255, fb)),
        a,
    )


def _alpha_distance_to_clear(px, w: int, h: int) -> list[list[int]]:
    dist = [[10**9] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] <= 0:
                dist[y][x] = 0
                q.append((x, y))
    while q:
        x, y = q.popleft()
        d = dist[y][x]
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            if dist[ny][nx] > d + 1:
                dist[ny][nx] = d + 1
                q.append((nx, ny))
    return dist



def finalize_alpha_matte(cut: Image.Image, orig: Image.Image, *, edge_band_px: int = 3) -> Image.Image:
    """
    Interior (> edge_band_px from clear): alpha 255, RGB byte-identical to approved source.
    Edge band only: keep soft rembg alpha with colour decontamination.
    """
    rgb = orig.convert("RGB")
    out = cut.convert("RGBA")
    px = out.load()
    rpx = rgb.load()
    w, h = out.size
    dist = _alpha_distance_to_clear(px, w, h)

    for y in range(h):
        for x in range(w):
            sr, sg, sb = rpx[x, y]
            r, g, b, a = px[x, y]
            if a <= 0:
                continue
            if dist[y][x] > edge_band_px:
                px[x, y] = (sr, sg, sb, 255)
                continue
            if a >= 250:
                px[x, y] = (sr, sg, sb, 255)

    for y in range(h):
        for x in range(w):
            if dist[y][x] == 0 or dist[y][x] > edge_band_px:
                continue
            r, g, b, a = px[x, y]
            if a <= 0:
                continue
            sr, sg, sb = rpx[x, y]
            if a >= 255:
                px[x, y] = (sr, sg, sb, 255)
                continue
            near = _nearest_opaque_source_rgb(px, x, y, w, h, rpx)
            if near:
                dr, dg, db, _da = decontaminate_semi_edge_pixel(near[0], near[1], near[2], a, (17, 17, 17))
            else:
                dr, dg, db, _da = decontaminate_semi_edge_pixel(sr, sg, sb, a, (17, 17, 17))
            px[x, y] = (dr, dg, db, a)
    return out


def strip_grey_matte_outline(rgba: Image.Image) -> Image.Image:
    img = rgba.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 240:
                continue
            if max(r, g, b) - min(r, g, b) > 22:
                continue
            if (r + g + b) / 3 < 210:
                continue
            edge = False
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    edge = True
                    break
                if px[nx, ny][3] < 32:
                    edge = True
                    break
            if edge:
                px[x, y] = (r, g, b, 0)
    return img


def postprocess_cutout(skin_id: str, cut: Image.Image, orig: Image.Image) -> Image.Image:
    if skin_id == "C":
        cut = fill_internal_holes(cut, min_alpha=32)
    return finalize_alpha_matte(cut, orig)


def finish_shipped_variant(rgba: Image.Image) -> Image.Image:
    out = fill_internal_holes(rgba.convert("RGBA"))
    out = strip_grey_matte_outline(out)
    for _ in range(2):
        out = strip_outline_near_white(out)
    return out


def content_bbox(img: Image.Image, alpha_min: int = 32) -> tuple[int, int, int, int]:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= alpha_min:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if maxx < 0:
        return 0, 0, w, h
    return minx, miny, maxx + 1, maxy + 1


def crop_with_margin(img: Image.Image, margin_ratio: float = 0.022, margin_min: int = 8) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    minx, miny, maxx, maxy = content_bbox(rgba)
    bw, bh = maxx - minx, maxy - miny
    mx = max(margin_min, int(bw * margin_ratio))
    my = max(margin_min, int(bh * margin_ratio))
    left = max(0, minx - mx)
    top = max(0, miny - my)
    right = min(w, maxx + mx)
    bottom = min(h, maxy + my)
    cropped = rgba.crop((left, top, right, bottom))
    cw, ch = cropped.size
    pad = Image.new("RGBA", (cw + mx * 2, ch + my * 2), (0, 0, 0, 0))
    pad.paste(cropped, (mx, my))
    return pad


def portrait_variant(img: Image.Image, max_w: int = 372) -> Image.Image:
    cropped = crop_with_margin(img)
    w, h = cropped.size
    if w <= max_w:
        return cropped
    ratio = max_w / w
    return cropped.resize((max_w, max(1, int(h * ratio))), Image.Resampling.LANCZOS)


def world_variant(img: Image.Image, out_w: int = 280) -> Image.Image:
    cropped = crop_with_margin(img)
    cw, ch = cropped.size
    ratio = out_w / cw
    return cropped.resize((out_w, max(1, int(ch * ratio))), Image.Resampling.LANCZOS)


def interior_rgb_sha256(rgba: Image.Image) -> str:
    h = hashlib.sha256()
    px = rgba.load()
    w, hgt = rgba.size
    for y in range(hgt):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 255:
                h.update(bytes((r, g, b)))
    return h.hexdigest()


def alpha_stats(alpha: Image.Image) -> dict:
    px = alpha.load()
    w, h = alpha.size
    opaque = 0
    for y in range(h):
        for x in range(w):
            if px[x, y] >= 230:
                opaque += 1
    return {"width": w, "height": h, "opaquePixels": opaque}


def write_alpha_ref(slug: str, kind: str, rgba: Image.Image) -> tuple[str, str, dict]:
    REF_DIR.mkdir(parents=True, exist_ok=True)
    alpha = rgba.split()[3]
    ref_name = f"{slug}-{kind}-alpha.png"
    ref_path = REF_DIR / ref_name
    alpha.save(ref_path, optimize=True)
    rel = str(ref_path.relative_to(ROOT)).replace("\\", "/")
    return rel, sha256_file(ref_path), alpha_stats(alpha)


def orig_rgb_with_cut_alpha(orig: Image.Image, cut: Image.Image) -> Image.Image:
    rgb = orig.convert("RGB")
    alpha = cut.split()[3]
    out = Image.new("RGBA", rgb.size)
    out.paste(rgb, (0, 0))
    out.putalpha(alpha)
    return out


def _srgb_to_linear(c: float) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _delta_e_lab(r1: int, g1: int, b1: int, r2: int, g2: int, b2: int) -> float:
    def rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
        rl = _srgb_to_linear(r)
        gl = _srgb_to_linear(g)
        bl = _srgb_to_linear(b)
        x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl
        y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl
        z = 0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl

        def f(t: float) -> float:
            return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)

        xn, yn, zn = 0.95047, 1.0, 1.08883
        fx, fy, fz = f(x / xn), f(y / yn), f(z / zn)
        return (116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)

    L1, a1, b1l = rgb_to_lab(r1, g1, b1)
    L2, a2, b2l = rgb_to_lab(r2, g2, b2)
    return ((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1l - b2l) ** 2) ** 0.5


def _local_exterior_median_rgb(
    src: np.ndarray, exterior: np.ndarray, y: int, x: int, radius: int = 25
) -> tuple[int, int, int] | None:
    h, w, _ = src.shape
    rs: list[int] = []
    gs: list[int] = []
    bs: list[int] = []
    r2 = radius * radius
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy > r2:
                continue
            ny, nx = y + dy, x + dx
            if ny < 0 or nx < 0 or ny >= h or nx >= w:
                continue
            if not exterior[ny, nx]:
                continue
            rs.append(int(src[ny, nx, 0]))
            gs.append(int(src[ny, nx, 1]))
            bs.append(int(src[ny, nx, 2]))
    if not rs:
        return None
    mid = len(rs) // 2
    return sorted(rs)[mid], sorted(gs)[mid], sorted(bs)[mid]


def _box_filter(arr: np.ndarray, radius: int) -> np.ndarray:
    k = radius * 2 + 1
    return ndimage.uniform_filter(arr.astype(np.float64), size=k, mode="nearest")


def guided_filter_alpha(p: np.ndarray, guide: np.ndarray, radius: int, eps: float) -> np.ndarray:
    """Guided filter (He et al.); p and guide same shape, float."""
    mean_i = _box_filter(guide, radius)
    mean_p = _box_filter(p, radius)
    mean_ip = _box_filter(guide * p, radius)
    mean_ii = _box_filter(guide * guide, radius)
    var_i = mean_ii - mean_i * mean_i
    cov_ip = mean_ip - mean_i * mean_p
    a = cov_ip / (var_i + eps)
    b = mean_p - a * mean_i
    return _box_filter(a, radius) * guide + _box_filter(b, radius)


def _git_show_shipped_alpha(rev: str, rel_path: str) -> Image.Image:
    data = subprocess.check_output(
        ["git", "show", f"{rev}:{rel_path.replace(chr(92), '/')}"],
        cwd=ROOT,
    )
    return Image.open(io.BytesIO(data)).convert("RGBA").split()[3]


def _alpha255_share(rgba: np.ndarray) -> float:
    a = rgba[:, :, 3]
    fg = a >= 128
    n_fg = int(np.sum(fg))
    if n_fg == 0:
        return 0.0
    return float(np.sum((a == 255) & fg)) / n_fg


def _outline_near_white_halos_img(rgba: Image.Image) -> int:
    img = rgba.convert("RGBA")
    w, h = img.size
    px = img.load()
    bad = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 178:
                continue
            if (r + g + b) / 3 < 245:
                continue
            if max(r, g, b) - min(r, g, b) > 40:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    bad += 1
                    break
                if px[nx, ny][3] < 32:
                    bad += 1
                    break
    return bad


def _nearest_core_rgb(src_rgb: np.ndarray, core: np.ndarray) -> np.ndarray:
    _, indices = ndimage.distance_transform_edt(~core, return_distances=True, return_indices=True)
    return src_rgb[indices[0], indices[1]]


def _apply_candidate_alpha255_lock(
    out: np.ndarray,
    src_rgb: np.ndarray,
    alpha_ref: np.ndarray,
    thresh: float,
    inset_px: int,
) -> None:
    fg = alpha_ref >= (128 / 255.0)
    dist_in = ndimage.distance_transform_edt(fg)
    interior_core = ndimage.distance_transform_edt(alpha_ref >= 0.99) >= 3
    nearest = _nearest_core_rgb(src_rgb, interior_core)
    solid = fg & (alpha_ref >= thresh) & (dist_in >= inset_px)
    solid |= fg & (alpha_ref >= 0.965) & (dist_in >= 1)
    out[solid, 0:3] = src_rgb[solid]
    r, g, b = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    lum = (r.astype(np.int32) + g.astype(np.int32) + b.astype(np.int32)) / 3.0
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    bright_solid = solid & (lum >= 245) & (chroma <= 40)
    out[bright_solid, 0:3] = nearest[bright_solid]
    out[solid, 3] = 255


def _grey_matt_halo_mask(out: np.ndarray) -> np.ndarray:
    """Match scripts/dump-angelina-halo-bad-px.js greyMatt gate (a=255, within 15px of clear)."""
    a = out[:, :, 3]
    dist_clear = ndimage.distance_transform_edt(a <= 0)
    band = (a == 255) & (dist_clear <= 15)
    r, g, b = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    lum = (r.astype(np.float32) + g.astype(np.float32) + b.astype(np.float32)) / 3.0
    comp_chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    dist_grey = (
        np.abs(r.astype(np.int32) - lum.astype(np.int32))
        + np.abs(g.astype(np.int32) - lum.astype(np.int32))
        + np.abs(b.astype(np.int32) - lum.astype(np.int32))
    )
    return band & (dist_grey < 10) & (lum > 55) & (lum < 210) & (comp_chroma < 13)


def _decontaminate_opaque_grey_halo_components(out: np.ndarray, src_rgb: np.ndarray, alpha_ref: np.ndarray) -> None:
    """Recolor band greyMatt pixels so halo gate greyMatt test passes (α stays 255)."""
    interior_core = ndimage.distance_transform_edt(alpha_ref >= 0.99) >= 3
    nearest = _nearest_core_rgb(src_rgb, interior_core)
    for _ in range(5):
        grey_matt = _grey_matt_halo_mask(out)
        if not np.any(grey_matt):
            return
        out[grey_matt, 0:3] = nearest[grey_matt]


def _decontaminate_grey_exterior_band(out: np.ndarray, alpha_ref: np.ndarray) -> None:
    fg = alpha_ref >= (128 / 255.0)
    dist_in = ndimage.distance_transform_edt(fg)
    near_contour = fg & (dist_in <= 3)
    a = out[:, :, 3]
    r, g, b = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    lum = (r.astype(np.float32) + g.astype(np.float32) + b.astype(np.float32)) / 3.0
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    grey = (lum >= 90) & (lum <= 170) & (chroma < 18)
    candidate = near_contour & (a > 0) & (a < 255) & grey

    exterior = (~fg) | (a == 0)
    reachable = exterior.copy()
    struct = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
    for _ in range(max(out.shape[0], out.shape[1]) + 2):
        grow = ndimage.binary_dilation(reachable, structure=struct) & candidate
        new = grow & ~reachable
        if not np.any(new):
            break
        reachable |= new
    out[reachable & candidate, 3] = 0


def _compose_6d21_prelock(
    orig: Image.Image,
    cut: Image.Image,
    variant_fn,
    slug: str,
    kind: str,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    from pymatting import estimate_foreground_ml

    t0 = time.perf_counter()
    matte = orig_rgb_with_cut_alpha(orig, cut)
    source_rgba = variant_fn(matte)
    w, h = source_rgba.size
    src_rgb = np.array(source_rgba.convert("RGB"), dtype=np.uint8)

    rel = f"assets/ui/angelina-skins/shipped/{slug}-{kind}.webp"
    alpha_im = _git_show_shipped_alpha(ALPHA_SHAPE_REV, rel)
    if alpha_im.size != (w, h):
        alpha_im = alpha_im.resize((w, h), Image.Resampling.LANCZOS)

    alpha_f = np.array(alpha_im, dtype=np.float64) / 255.0
    guide = (
        0.299 * src_rgb[:, :, 0] + 0.587 * src_rgb[:, :, 1] + 0.114 * src_rgb[:, :, 2]
    ) / 255.0
    alpha_ref = guided_filter_alpha(alpha_f, guide, radius=6, eps=1e-3)
    alpha_ref = np.clip(alpha_ref, 0.0, 1.0)

    interior = alpha_ref >= 0.99
    interior_core = ndimage.distance_transform_edt(interior) >= 3

    image = src_rgb.astype(np.float64) / 255.0
    alpha_ml = alpha_ref.copy()
    alpha_ml[interior_core] = 1.0
    fg = estimate_foreground_ml(image, alpha_ml)

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[interior_core, 0:3] = src_rgb[interior_core]
    out[interior_core, 3] = 255
    edge = (~interior_core) & (alpha_ref > 1.0 / 255.0)
    out[edge, 0:3] = (np.clip(fg[edge], 0.0, 1.0) * 255.0).astype(np.uint8)
    out[edge, 3] = np.clip(alpha_ref[edge] * 255.0, 0, 255).astype(np.uint8)

    nearest = _nearest_core_rgb(src_rgb, interior_core)
    r, g, b = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    lum = (r.astype(np.int32) + g.astype(np.int32) + b.astype(np.int32)) / 3.0
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    bright_edge = edge & (out[:, :, 3] < 255) & (lum >= 245) & (chroma <= 40)
    out[bright_edge, 0:3] = nearest[bright_edge]

    elapsed = time.perf_counter() - t0
    return out, src_rgb, alpha_ref, elapsed


def _finalize_prelock(
    prelock: tuple[np.ndarray, np.ndarray, np.ndarray],
    thresh: float,
    inset_px: int,
    *,
    decontam: bool = False,
) -> Image.Image:
    out = prelock[0].copy()
    src_rgb, alpha_ref = prelock[1], prelock[2]
    if decontam:
        _decontaminate_grey_exterior_band(out, alpha_ref)
    img = finish_shipped_variant(Image.fromarray(out, "RGBA"))
    out2 = np.array(img, dtype=np.uint8)
    _apply_candidate_alpha255_lock(out2, src_rgb, alpha_ref, thresh, inset_px)
    _decontaminate_opaque_grey_halo_components(out2, src_rgb, alpha_ref)
    return Image.fromarray(out2, "RGBA")


def variant_combined_6d21_alpha(
    orig: Image.Image,
    cut: Image.Image,
    variant_fn,
    slug: str,
    kind: str,
    *,
    lock_thresh: float = 0.85,
    lock_inset: int = 2,
) -> tuple[Image.Image, float]:
    prelock = _compose_6d21_prelock(orig, cut, variant_fn, slug, kind)
    img = _finalize_prelock(prelock[:3], lock_thresh, lock_inset)
    return img, prelock[3]


def _dump_halo_bad_px(rel_path: str, mode: str) -> dict:
    proc = subprocess.run(
        [
            "node",
            str(ROOT / "scripts/dump-angelina-halo-bad-px.js"),
            rel_path.replace("\\", "/"),
            mode,
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return {"error": proc.stderr or proc.stdout}
    return json.loads(proc.stdout.strip())


def _silhouette_limits_ok(final_images: dict[tuple[str, str], Image.Image]) -> tuple[bool, dict]:
    limits = {"portrait": 30, "world": 22}
    counts: dict[str, int] = {}
    ok = True
    for (skin_id, kind), img in final_images.items():
        n = _outline_near_white_halos_img(img)
        key = f"{skin_id}_{kind}"
        counts[key] = n
        if n > limits[kind]:
            ok = False
    return ok, counts


def _sweep_alpha255_lock(
    prelocks: dict[str, dict[str, tuple]],
    slug_map: dict[str, str],
) -> tuple[float | None, int | None, list[dict]]:
    """Return (best_thresh, best_inset, sweep_log) or None."""
    sweep_log: list[dict] = []
    best_choice: tuple[float, int] | None = None
    best_min_a255 = -1.0

    for thresh in (0.80, 0.85, 0.90):
        for inset in (1, 2, 3):
            final_images: dict[tuple[str, str], Image.Image] = {}
            shares: dict[str, float] = {}
            halo_report: dict = {"skins": {}}
            paths: dict[str, str] = {}

            for skin_id in ["A", "B", "C"]:
                slug = slug_map[skin_id]
                for kind in ("portrait", "world"):
                    pl = prelocks[skin_id][kind]
                    final = _finalize_prelock(pl, thresh, inset)
                    final_images[(skin_id, kind)] = final
                    arr = np.array(final.convert("RGBA"))
                    shares[f"{skin_id}_{kind}"] = _alpha255_share(arr)
                    rel = f"assets/ui/angelina-skins/shipped/{slug}-{kind}.webp"
                    save_webp(final, ROOT / rel, lossless=True)
                    paths[f"{skin_id}_{kind}"] = rel
                    halo_report["skins"].setdefault(skin_id, {})[kind] = _measure_halo(rel)

            min_a255 = min(shares.values())
            halo_ok = _halo_counts_pass(halo_report)
            sil_ok, sil_counts = _silhouette_limits_ok(final_images)
            entry = {
                "thresh": thresh,
                "inset": inset,
                "minAlpha255Share": round(min_a255, 4),
                "alpha255Share": shares,
                "haloZeroBadPx": halo_ok,
                "haloSkins": halo_report["skins"],
                "silhouetteNearWhiteOk": sil_ok,
                "silhouetteNearWhite": sil_counts,
                "passesAll": halo_ok and sil_ok and min_a255 >= 0.9,
            }
            sweep_log.append(entry)
            print(
                f"SWEEP thresh={thresh} inset={inset} minA255={min_a255:.4f} "
                f"haloZero={halo_ok} silOk={sil_ok} sil={sil_counts}",
                flush=True,
            )
            if entry["passesAll"]:
                return thresh, inset, sweep_log
            if sil_ok and halo_ok and min_a255 > best_min_a255:
                best_min_a255 = min_a255
                best_choice = (thresh, inset)

    if best_choice and best_min_a255 >= 0.9:
        return best_choice[0], best_choice[1], sweep_log
    return None, None, sweep_log


def _measure_halo(rel_path: str) -> dict:
    proc = subprocess.run(
        ["node", str(ROOT / "scripts/measure-angelina-halo-json.js"), rel_path.replace("\\", "/")],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout or "halo measure failed")
    return json.loads(proc.stdout.strip())


def _restore_ab6fa_assets() -> None:
    proc = subprocess.run(
        [
            "git",
            "checkout",
            "ab6fa30",
            "--",
            "assets/ui/angelina-skins/shipped",
            "assets/ui/angelina-skins/alpha-ref",
            "data/story/angelina-skin-manifest.json",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise SystemExit(f"failed to restore ab6fa302 assets: {proc.stderr}")


def boost_foreground_alpha(cut: Image.Image, orig: Image.Image, min_a: int = 176) -> Image.Image:
    rgb = orig.convert("RGB")
    out = cut.convert("RGBA")
    px = out.load()
    rpx = rgb.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            sr, sg, sb = rpx[x, y]
            _r, _g, _b, a = px[x, y]
            if a >= min_a:
                px[x, y] = (sr, sg, sb, 255)
    return out


def build_cutout_from_source(orig: Image.Image, skin_id: str) -> Image.Image:
    cut = rembg_alpha_matte(orig)
    if skin_id == "A":
        cut = boost_foreground_alpha(cut, orig, min_a=192)
    return postprocess_cutout(skin_id, cut, orig)


def write_manifest(skins_out: dict) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf8"))
    manifest["notes"] = (
        "Owner t569u approved PNGs. Alpha from 6d214651 shape + guided filter; "
        "core α=255 lock (6d21∩ab6f); edge RGB nearest-core. "
        "Rebuild: python3 scripts/build-angelina-skin-assets.py"
    )
    for skin_id, data in skins_out.items():
        entry = manifest["skins"][skin_id]
        entry.pop("rembgModel", None)
        entry["portrait"]["sha256"] = data["portraitSha256"]
        entry["world"]["sha256"] = data["worldSha256"]
        if data.get("portraitAlphaRef"):
            entry["portrait"]["alphaRef"] = data["portraitAlphaRef"]
            entry["portrait"]["alphaSha256"] = data["portraitAlphaSha256"]
            entry["portrait"]["alphaStats"] = data["portraitAlphaStats"]
        if data.get("worldAlphaRef"):
            entry["world"]["alphaRef"] = data["worldAlphaRef"]
            entry["world"]["alphaSha256"] = data["worldAlphaSha256"]
            entry["world"]["alphaStats"] = data["worldAlphaStats"]
        if data.get("portraitInteriorRgbSha256"):
            entry["portrait"]["interiorRgbSha256"] = data["portraitInteriorRgbSha256"]
        if data.get("worldInteriorRgbSha256"):
            entry["world"]["interiorRgbSha256"] = data["worldInteriorRgbSha256"]
        entry["world"]["derivative"] = "rembg alpha matte + padded bbox crop + 280px wide WebP"
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf8")


def _sync_manifest_candidate(skins_out: dict) -> None:
    write_manifest(skins_out)


def _ab6f_shipped_rgba(rel: str) -> np.ndarray:
    data = subprocess.check_output(
        ["git", "show", f"{AB6FA_REV}:{rel.replace(chr(92), '/')}"],
        cwd=ROOT,
    )
    return np.array(Image.open(io.BytesIO(data)).convert("RGBA"))


def _ab6f_alpha255_baseline() -> dict[str, float]:
    out: dict[str, float] = {}
    for skin_id, source_name in SOURCES.items():
        slug = source_name.replace(".png", "")
        for kind in ("portrait", "world"):
            rel = f"assets/ui/angelina-skins/shipped/{slug}-{kind}.webp"
            out[f"{skin_id}_{kind}"] = _alpha255_share(_ab6f_shipped_rgba(rel))
    return out


def _candidate_alpha255_shares(skins_out: dict) -> dict[str, float]:
    shares: dict[str, float] = {}
    for skin_id in ["A", "B", "C"]:
        for kind in ("portrait", "world"):
            rel = skins_out[skin_id]["portraitPath" if kind == "portrait" else "worldPath"]
            arr = np.array(Image.open(ROOT / rel).convert("RGBA"))
            shares[f"{skin_id}_{kind}"] = _alpha255_share(arr)
    return shares


def _halo_counts_pass(build_report: dict) -> bool:
    for skin_id in ["A", "B", "C"]:
        for kind in ("portrait", "world"):
            slot = build_report["skins"][skin_id][kind]
            if slot["browser"]["bgOpaqueBand"] > 0 or slot["lanczos"]["bgOpaqueBand"] > 0:
                return False
    return True


def _run_node_test(script: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", str(ROOT / "scripts" / script)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )


def _save_browser_composites() -> None:
    proc = _run_node_test("save-angelina-browser-composites.js")
    print(proc.stdout or "", end="")
    if proc.returncode != 0:
        print(proc.stderr or "", end="")


def _restore_with_composites(skins_out: dict, build_report: dict, reason: str) -> None:
    if skins_out:
        _sync_manifest_candidate(skins_out)
    sil = subprocess.run(
        ["python3", str(ROOT / "scripts/angelina-skin-silhouette-check.py")],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    print(sil.stdout or "", end="")
    build_report["silhouetteDiagnostic"] = {"ok": sil.returncode == 0}
    _save_browser_composites()
    print("BUILD_REPORT", json.dumps(build_report, indent=2))
    print(reason, flush=True)
    _restore_ab6fa_assets()


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    SHIPPED_DIR.mkdir(parents=True, exist_ok=True)
    ab6fa_baseline = json.loads(AB6FA_HALO_BASELINE.read_text(encoding="utf8"))
    skins_out: dict = {}
    build_report: dict = {"skins": {}, "matting": {}}
    prelocks: dict[str, dict[str, tuple]] = {}
    slug_map: dict[str, str] = {}

    for skin_id, source_name in SOURCES.items():
        source_path = SOURCE_DIR / source_name
        if not source_path.exists():
            raise SystemExit(f"missing source: {source_path}")

        source_sha = sha256_file(source_path)
        orig = Image.open(source_path).convert("RGBA")
        cut = build_cutout_from_source(orig, skin_id)
        slug = source_name.replace(".png", "")
        slug_map[skin_id] = slug

        pl_p = _compose_6d21_prelock(orig, cut, portrait_variant, slug, "portrait")
        pl_w = _compose_6d21_prelock(orig, cut, world_variant, slug, "world")
        prelocks[skin_id] = {"portrait": pl_p[:3], "world": pl_w[:3]}
        build_report["matting"][skin_id] = {
            "portraitSec": round(pl_p[3], 2),
            "worldSec": round(pl_w[3], 2),
            "portraitMethod": "6d21-alpha+guided+core-nearest",
            "worldMethod": "6d21-alpha+guided+core-nearest",
        }
        print(
            f"{skin_id} prelock port={pl_p[3]:.1f}s world={pl_w[3]:.1f}s",
            flush=True,
        )

    lock_thresh, lock_inset, sweep_log = _sweep_alpha255_lock(prelocks, slug_map)
    build_report["alpha255Sweep"] = sweep_log
    build_report["alpha255Lock"] = {"thresh": lock_thresh, "inset": lock_inset}

    if lock_thresh is None:
        build_report["shipDecision"] = "restore_ab6fa302"
        best = max(sweep_log, key=lambda e: e["minAlpha255Share"])
        build_report["alpha255SweepBest"] = best
        bt, bi = best["thresh"], best["inset"]
        slug_a = slug_map["A"]
        aw_rel = f"assets/ui/angelina-skins/shipped/{slug_a}-world.webp"
        aw_no = _finalize_prelock(prelocks["A"]["world"], bt, bi, decontam=False)
        save_webp(aw_no, ROOT / aw_rel, lossless=True)
        before_dump = {
            "browser3": _dump_halo_bad_px(aw_rel, "browser3"),
            "lanczos3": _dump_halo_bad_px(aw_rel, "lanczos3"),
        }
        sil_before = _outline_near_white_halos_img(aw_no)
        aw_de = _finalize_prelock(prelocks["A"]["world"], bt, bi, decontam=True)
        save_webp(aw_de, ROOT / aw_rel, lossless=True)
        after_dump = {
            "browser3": _dump_halo_bad_px(aw_rel, "browser3"),
            "lanczos3": _dump_halo_bad_px(aw_rel, "lanczos3"),
        }
        sil_after = _outline_near_white_halos_img(aw_de)
        build_report["aWorldHaloBadPx"] = {
            "beforeDecontam": before_dump,
            "afterDecontam": after_dump,
            "silhouetteNearWhiteBefore": sil_before,
            "silhouetteNearWhiteAfter": sil_after,
        }
        print("A_WORLD_HALO_DUMP", json.dumps(build_report["aWorldHaloBadPx"], indent=2))
        _restore_with_composites(
            skins_out,
            build_report,
            "RESTORE ab6fa302: no α=255 lock sweep passed all gates",
        )
        return

    # A world halo bad-pixel dump + decontam before/after (at chosen lock params)
    slug_a = slug_map["A"]
    aw_rel = f"assets/ui/angelina-skins/shipped/{slug_a}-world.webp"
    aw_no = _finalize_prelock(prelocks["A"]["world"], lock_thresh, lock_inset, decontam=False)
    save_webp(aw_no, ROOT / aw_rel, lossless=True)
    before_dump = {
        "browser3": _dump_halo_bad_px(aw_rel, "browser3"),
        "lanczos3": _dump_halo_bad_px(aw_rel, "lanczos3"),
    }
    sil_before = _outline_near_white_halos_img(aw_no)
    aw_de = _finalize_prelock(prelocks["A"]["world"], lock_thresh, lock_inset, decontam=True)
    save_webp(aw_de, ROOT / aw_rel, lossless=True)
    after_dump = {
        "browser3": _dump_halo_bad_px(aw_rel, "browser3"),
        "lanczos3": _dump_halo_bad_px(aw_rel, "lanczos3"),
    }
    sil_after = _outline_near_white_halos_img(aw_de)
    build_report["aWorldHaloBadPx"] = {
        "beforeDecontam": before_dump,
        "afterDecontam": after_dump,
        "silhouetteNearWhiteBefore": sil_before,
        "silhouetteNearWhiteAfter": sil_after,
    }
    print("A_WORLD_HALO_DUMP", json.dumps(build_report["aWorldHaloBadPx"], indent=2))

    port_method = f"6d21+lock{lock_thresh:.2f}/inset{lock_inset}"
    for skin_id, source_name in SOURCES.items():
        source_path = SOURCE_DIR / source_name
        source_sha = sha256_file(source_path)
        slug = slug_map[skin_id]

        port_path = SHIPPED_DIR / f"{slug}-portrait.webp"
        port_final = _finalize_prelock(prelocks[skin_id]["portrait"], lock_thresh, lock_inset)
        port_alpha_ref, port_alpha_sha, port_alpha_stats = write_alpha_ref(slug, "portrait", port_final)
        port_interior_sha = interior_rgb_sha256(port_final)
        port_sha = save_webp(port_final, port_path, lossless=True)
        port_rel = str(port_path.relative_to(ROOT)).replace("\\", "/")

        world_path = SHIPPED_DIR / f"{slug}-world.webp"
        world_final = _finalize_prelock(prelocks[skin_id]["world"], lock_thresh, lock_inset)
        world_alpha_ref, world_alpha_sha, world_alpha_stats = write_alpha_ref(slug, "world", world_final)
        world_interior_sha = interior_rgb_sha256(world_final)
        world_sha = save_webp(world_final, world_path, lossless=True)
        world_rel = str(world_path.relative_to(ROOT)).replace("\\", "/")

        skins_out[skin_id] = {
            "sourcePath": str(source_path.relative_to(ROOT)).replace("\\", "/"),
            "sourceSha256": source_sha,
            "portraitPath": port_rel,
            "portraitSha256": port_sha,
            "portraitAlphaRef": port_alpha_ref,
            "portraitAlphaSha256": port_alpha_sha,
            "portraitAlphaStats": port_alpha_stats,
            "portraitInteriorRgbSha256": port_interior_sha,
            "worldPath": world_rel,
            "worldSha256": world_sha,
            "worldAlphaRef": world_alpha_ref,
            "worldAlphaSha256": world_alpha_sha,
            "worldAlphaStats": world_alpha_stats,
            "worldInteriorRgbSha256": world_interior_sha,
        }

    for skin_id in ["A", "B", "C"]:
        entry = skins_out[skin_id]
        port_halo = _measure_halo(entry["portraitPath"])
        world_halo = _measure_halo(entry["worldPath"])
        browser_sum = port_halo["browser"]["bgOpaqueBand"] + world_halo["browser"]["bgOpaqueBand"]
        build_report["skins"][skin_id] = {
            "portrait": port_halo,
            "world": world_halo,
            "browserSum": browser_sum,
            "ab6faBrowserSum": ab6fa_baseline[skin_id]["browserSum"],
            "beatsAb6fa": browser_sum < ab6fa_baseline[skin_id]["browserSum"],
        }
        print(
            f"HALO {skin_id} browserSum={browser_sum} ab6fa={ab6fa_baseline[skin_id]['browserSum']} "
            f"P browser {port_halo['browser']['bgOpaqueBand']} lanczos {port_halo['lanczos']['bgOpaqueBand']} "
            f"W browser {world_halo['browser']['bgOpaqueBand']} lanczos {world_halo['lanczos']['bgOpaqueBand']}",
            flush=True,
        )

    ab6f_a255 = _ab6f_alpha255_baseline()
    cand_a255 = _candidate_alpha255_shares(skins_out)
    build_report["alpha255Share"] = {"ab6f": ab6f_a255, "candidate": cand_a255}
    for key in sorted(ab6f_a255.keys()):
        print(
            f"ALPHA255 {key}: candidate={cand_a255[key]:.4f} ab6f={ab6f_a255[key]:.4f}",
            flush=True,
        )

    all_beat = all(build_report["skins"][s]["beatsAb6fa"] for s in ["A", "B", "C"])
    halo_ok = _halo_counts_pass(build_report)
    build_report["haloZeroBadPx"] = halo_ok
    if not all_beat or not halo_ok:
        _restore_with_composites(
            skins_out,
            build_report,
            "RESTORE ab6fa302: halo counts did not beat ab6fa and/or non-zero browser/lanczos bad px",
        )
        return

    _sync_manifest_candidate(skins_out)

    sil = subprocess.run(
        ["python3", str(ROOT / "scripts/angelina-skin-silhouette-check.py")],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    print(sil.stdout or "", end="")
    build_report["silhouetteCheck"] = {"ok": sil.returncode == 0}
    for line in (sil.stdout or "").splitlines():
        if "near-white outline halos" in line:
            print(line, flush=True)
    if sil.returncode != 0:
        _restore_with_composites(skins_out, build_report, "RESTORE ab6fa302: failed silhouette gate")
        return

    alpha_t = _run_node_test("test-angelina-skin-alpha.js")
    print(alpha_t.stdout or "", end="")
    if alpha_t.returncode != 0:
        print(alpha_t.stderr or "", end="")
        _restore_with_composites(skins_out, build_report, "RESTORE ab6fa302: failed alpha gate")
        return

    holes_t = _run_node_test("test-angelina-skin-holes.js")
    print(holes_t.stdout or "", end="")
    if holes_t.returncode != 0:
        print(holes_t.stderr or "", end="")
        _restore_with_composites(skins_out, build_report, "RESTORE ab6fa302: failed holes gate")
        return

    halo_t = _run_node_test("test-angelina-skin-halo.js")
    print(halo_t.stdout or "", end="")
    if halo_t.returncode != 0:
        print(halo_t.stderr or "", end="")
        _restore_with_composites(skins_out, build_report, "RESTORE ab6fa302: failed halo gate")
        return

    build_report["shipDecision"] = "shipped_combine"
    print("BUILD_REPORT", json.dumps(build_report, indent=2))
    _save_browser_composites()
    print(json.dumps(skins_out, indent=2))


if __name__ == "__main__":
    main()
