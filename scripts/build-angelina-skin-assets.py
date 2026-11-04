#!/usr/bin/env python3
"""Build shipped WebP assets from Owner-approved source PNGs (t569u). Alpha via local rembg matte; RGB unchanged."""
from __future__ import annotations

import gc
import hashlib
import json
import subprocess
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
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

REMBG_CANDIDATE_MODELS = ["u2net_human_seg", "birefnet-portrait", "birefnet-general"]
HOLES_BASELINE_PATH = ROOT / "scripts/angelina-skin-holes-baseline.json"

_rembg_sessions: dict[str, object] = {}


def clear_rembg_sessions() -> None:
    _rembg_sessions.clear()
    gc.collect()


def get_rembg_session(model_name: str):
    if model_name not in _rembg_sessions:
        from rembg import new_session

        _rembg_sessions[model_name] = new_session(model_name)
    return _rembg_sessions[model_name]


def rembg_alpha_matte(orig: Image.Image, *, model_name: str) -> Image.Image:
    """Apply rembg alpha only at orig resolution; RGB pixels copied from approved source."""
    from rembg import remove

    rgb = orig.convert("RGB")
    rb = remove(rgb, session=get_rembg_session(model_name))
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


def _srgb_to_linear(c: float) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
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
    L = (116 * fy) - 16
    a = 500 * (fx - fy)
    b_ = 200 * (fy - fz)
    return L, a, b_


def _delta_e_lab(r1: int, g1: int, b1: int, r2: int, g2: int, b2: int) -> float:
    L1, a1, b1l = _rgb_to_lab(r1, g1, b1)
    L2, a2, b2l = _rgb_to_lab(r2, g2, b2)
    return ((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1l - b2l) ** 2) ** 0.5


def border_median_bg(rgb: Image.Image, band: int = 10) -> tuple[int, int, int]:
    """Median RGB along the outer band of the approved source (backdrop colour)."""
    px = rgb.convert("RGB").load()
    w, h = rgb.size
    rs: list[int] = []
    gs: list[int] = []
    bs: list[int] = []
    for y in range(h):
        for x in range(w):
            if x >= band and x < w - band and y >= band and y < h - band:
                continue
            r, g, b = px[x, y]
            rs.append(r)
            gs.append(g)
            bs.append(b)
    mid = len(rs) // 2

    def med(v: list[int]) -> int:
        s = sorted(v)
        return s[mid]

    return med(rs), med(gs), med(bs)


def _rembg_silhouette_edge_distance(rembg_alpha_px, w: int, h: int, thresh: int = 128) -> list[list[int]]:
    inf = 10**9
    dist = [[inf] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    for y in range(h):
        for x in range(w):
            if rembg_alpha_px[x, y] < thresh:
                continue
            edge = False
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h or rembg_alpha_px[nx, ny] < thresh:
                    edge = True
                    break
            if edge:
                dist[y][x] = 0
                q.append((x, y))
    while q:
        x, y = q.popleft()
        d = dist[y][x]
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h or rembg_alpha_px[nx, ny] < thresh:
                continue
            if dist[ny][nx] > d + 1:
                dist[ny][nx] = d + 1
                q.append((nx, ny))
    return dist


def _median_rgb(rs: list[int], gs: list[int], bs: list[int]) -> tuple[int, int, int] | None:
    if not rs:
        return None
    mid = len(rs) // 2

    def med(v: list[int]) -> int:
        s = sorted(v)
        return s[mid]

    return med(rs), med(gs), med(bs)


def _local_exterior_bg_rgb(
    rpx,
    apx,
    x: int,
    y: int,
    w: int,
    h: int,
    *,
    radius: int = 25,
    exterior_alpha_max: int = 32,
) -> tuple[int, int, int] | None:
    rs: list[int] = []
    gs: list[int] = []
    bs: list[int] = []
    r2 = radius * radius
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy > r2:
                continue
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            if apx[nx, ny] > exterior_alpha_max:
                continue
            r, g, b = rpx[nx, ny]
            rs.append(r)
            gs.append(g)
            bs.append(b)
    return _median_rgb(rs, gs, bs)


def _local_interior_rgb(
    rpx,
    apx,
    sil_dist: list[list[int]],
    x: int,
    y: int,
    w: int,
    h: int,
    *,
    radius: int = 25,
    interior_sil_min: int = 40,
    fg_alpha_min: int = 128,
) -> tuple[int, int, int] | None:
    rs: list[int] = []
    gs: list[int] = []
    bs: list[int] = []
    r2 = radius * radius
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy > r2:
                continue
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            if apx[nx, ny] < fg_alpha_min:
                continue
            if sil_dist[ny][nx] <= interior_sil_min:
                continue
            r, g, b = rpx[nx, ny]
            rs.append(r)
            gs.append(g)
            bs.append(b)
    return _median_rgb(rs, gs, bs)


def _pixel_is_exterior_background(
    rpx,
    apx,
    sil_dist: list[list[int]],
    x: int,
    y: int,
    w: int,
    h: int,
) -> bool:
    sr, sg, sb = rpx[x, y]
    loc_bg = _local_exterior_bg_rgb(rpx, apx, x, y, w, h)
    if loc_bg is None:
        return False
    br, bgc, bb = loc_bg
    de_bg = _delta_e_lab(sr, sg, sb, br, bgc, bb)
    loc_int = _local_interior_rgb(rpx, apx, sil_dist, x, y, w, h)
    if loc_int is None:
        return de_bg < 12.0
    ir, ig, ib = loc_int
    de_int = _delta_e_lab(sr, sg, sb, ir, ig, ib)
    return de_int > de_bg


def exterior_connected_bg_cleanup(
    rgba: Image.Image,
    source_rgb: Image.Image,
    rembg_alpha: Image.Image,
    *,
    edge_band_px: int = 40,
) -> Image.Image:
    """
    Exterior-connected flood only: clear backdrop-like pixels within edge_band_px of
    rembg silhouette edge when local interior ΔE > local exterior backdrop ΔE.
    """
    out = rgba.convert("RGBA")
    rgb = source_rgb.convert("RGB")
    alpha = rembg_alpha.convert("L")
    if out.size != rgb.size or out.size != alpha.size:
        raise ValueError("exterior_connected_bg_cleanup: size mismatch")
    px = out.load()
    rpx = rgb.load()
    apx = alpha.load()
    w, h = out.size
    sil_dist = _rembg_silhouette_edge_distance(apx, w, h)

    reachable = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 0:
                continue
            reachable[y * w + x] = 1
            q.append((x, y))

    while q:
        x, y = q.popleft()
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            ni = ny * w + nx
            if reachable[ni]:
                continue
            if sil_dist[ny][nx] > edge_band_px:
                continue
            if not _pixel_is_exterior_background(rpx, apx, sil_dist, nx, ny, w, h):
                continue
            reachable[ni] = 1
            q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            if not reachable[y * w + x]:
                continue
            r, g, b, _a = px[x, y]
            px[x, y] = (r, g, b, 0)

    dist_clear = _alpha_distance_to_clear(px, w, h)
    for y in range(h):
        for x in range(w):
            if dist_clear[y][x] == 0 or dist_clear[y][x] > edge_band_px:
                continue
            r, g, b, a = px[x, y]
            if a <= 0 or a >= 255:
                continue
            sr, sg, sb = rpx[x, y]
            if a >= 250:
                px[x, y] = (sr, sg, sb, 255)
                continue
            loc_bg = _local_exterior_bg_rgb(rpx, apx, x, y, w, h)
            bg = loc_bg if loc_bg else border_median_bg(rgb)
            dr, dg, db, _da = decontaminate_semi_edge_pixel(sr, sg, sb, a, bg)
            px[x, y] = (dr, dg, db, a)
    return out


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


def variant_locked(orig: Image.Image, cut: Image.Image, variant_fn) -> Image.Image:
    matte = orig_rgb_with_cut_alpha(orig, cut)
    out = variant_fn(cut)
    ref = variant_fn(matte)
    return finalize_alpha_matte(out, ref.convert("RGB"))


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


def restore_c_world_foreground_accents(cut: Image.Image, source_rgb: Image.Image) -> Image.Image:
    """u2net human mask drops C-v2 wings/guitar in lower outer columns — restore approved source fg."""
    out = cut.convert("RGBA")
    rgb = source_rgb.convert("RGB")
    px = out.load()
    rpx = rgb.load()
    w, h = out.size
    refs = corner_bg_refs(rgb)
    y0 = int(h * 0.5)
    left_max = int(w * 0.1)
    right_min = int(w * 0.9)
    for y in range(y0, h):
        for x in range(w):
            if left_max <= x < right_min:
                continue
            sr, sg, sb = rpx[x, y]
            if matches_bg(sr, sg, sb, refs, tolerance=18):
                continue
            chroma = max(sr, sg, sb) - min(sr, sg, sb)
            lum = (sr + sg + sb) / 3
            _r, _g, _b, a = px[x, y]
            if a >= 200:
                continue
            if a < 8 and chroma >= 18:
                px[x, y] = (sr, sg, sb, 255)
                continue
            if chroma < 28 and not (lum < 42 or lum > 242):
                continue
            if a >= 128 and chroma < 40:
                continue
            px[x, y] = (sr, sg, sb, 255)
    return out


def variant_canvas_rgba(orig_full: Image.Image, crop_matte: Image.Image, variant_fn) -> Image.Image:
    matte = orig_rgb_with_cut_alpha(orig_full, crop_matte)
    return variant_fn(matte)


def crop_reference_matte(orig_full: Image.Image) -> Image.Image:
    """Full-size matte for bbox/margins only (not necessarily the shipped rembg model)."""
    return rembg_alpha_matte(orig_full.convert("RGB"), model_name="u2net_human_seg")


def build_variant_final(
    orig_full: Image.Image,
    crop_matte: Image.Image,
    skin_id: str,
    model_name: str,
    variant_fn,
) -> Image.Image:
    """Rembg at target variant size, exterior cleanup, finish."""
    source_rgba = variant_canvas_rgba(orig_full, crop_matte, variant_fn)
    source_rgb = source_rgba.convert("RGB")
    cut = rembg_alpha_matte(source_rgb, model_name=model_name)
    if skin_id == "A":
        cut = boost_foreground_alpha(cut, source_rgb, min_a=192)
    cut = postprocess_cutout(skin_id, cut, source_rgb)
    rembg_a = cut.split()[3]
    cleaned = exterior_connected_bg_cleanup(cut, source_rgb, rembg_a, edge_band_px=40)
    return finish_shipped_variant(cleaned)


def _rembg_edge_dist_array(mask_px, w: int, h: int, thresh: int = 128) -> list[list[int]]:
    return _rembg_silhouette_edge_distance(mask_px, w, h, thresh)


def _holes_ok(final: Image.Image, baseline_kind: dict) -> bool:
    rgba = final.convert("RGBA")
    alpha = final.split()[3]
    rp = rgba.load()
    ap = alpha.load()
    w, h = rgba.size
    dist = _rembg_edge_dist_array(ap, w, h)
    soft = sum(
        1
        for y in range(h)
        for x in range(w)
        if ap[x, y] >= 128 and rp[x, y][3] < 255 and dist[y][x] > 15
    )
    if soft > 0:
        return False
    comps: list[int] = []
    seen = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if rp[x, y][3] > 0:
                continue
            if ap[x, y] < 128:
                continue
            if dist[y][x] <= 15:
                continue
            i = y * w + x
            if seen[i]:
                continue
            q: deque[tuple[int, int]] = deque([(x, y)])
            seen[i] = 1
            n = 0
            while q:
                cx, cy = q.popleft()
                n += 1
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    nx, ny = cx + dx, cy + dy
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    ni = ny * w + nx
                    if seen[ni]:
                        continue
                    if rp[nx, ny][3] > 0:
                        continue
                    if ap[nx, ny] < 128:
                        continue
                    if dist[ny][nx] <= 15:
                        continue
                    seen[ni] = 1
                    q.append((nx, ny))
            comps.append(n)
    comps.sort()
    expect = baseline_kind.get("transparentComponents") or []
    return comps == expect


def _silhouette_ok(final: Image.Image, kind: str) -> bool:
    SOLID = 230
    WEBP_SLACK = 52
    NEAR_WHITE = 245
    rgba = final.convert("RGBA")
    alpha = rgba.split()[3]
    w, h = alpha.size
    px = rgba.load()
    apx = alpha.load()
    limit = 30 if kind == "portrait" else 22
    bad = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < SOLID - WEBP_SLACK:
                continue
            if (r + g + b) / 3 < NEAR_WHITE:
                continue
            if max(r, g, b) - min(r, g, b) > 40:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h or px[nx, ny][3] < 32:
                    bad += 1
                    break
            if bad > limit:
                return False
    y0 = int(h * 0.84)
    minx, maxx = w, -1
    for y in range(y0, h):
        for x in range(w):
            if apx[x, y] >= SOLID - WEBP_SLACK:
                minx = min(minx, x)
                maxx = max(maxx, x)
    if maxx >= minx:
        span = maxx - minx + 1
        if span >= int(w * 0.28):
            opaque = sum(1 for y in range(y0, h) for x in range(minx, maxx + 1) if apx[x, y] >= SOLID - WEBP_SLACK)
            total = (maxx - minx + 1) * (h - y0)
            if total > 0 and opaque / total > 0.72:
                return False
    return True


def _measure_halo_webp(rel_path: str) -> dict:
    script = ROOT / "scripts/measure-angelina-halo-json.js"
    proc = subprocess.run(
        ["node", str(script), rel_path.replace("\\", "/")],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout or "halo measure failed")
    return json.loads(proc.stdout.strip())


def _eval_model_for_skin(skin_id: str, model_name: str, holes_baseline: dict) -> dict:
    """Build both variants for one model; return metrics and pass flags (same process)."""
    source_path = SOURCE_DIR / SOURCES[skin_id]
    orig = Image.open(source_path).convert("RGBA")
    crop_matte = crop_reference_matte(orig)
    clear_rembg_sessions()
    port = build_variant_final(orig, crop_matte, skin_id, model_name, portrait_variant)
    world = build_variant_final(orig, crop_matte, skin_id, model_name, world_variant)
    holes_port = _holes_ok(port, holes_baseline["portrait"])
    holes_world = _holes_ok(world, holes_baseline["world"])
    sil_ok = _silhouette_ok(port, "portrait") and _silhouette_ok(world, "world")
    eval_root = ROOT / "assets/ui/angelina-skins/.eval-halo"
    eval_root.mkdir(parents=True, exist_ok=True)
    port_path = eval_root / f"{skin_id}-{model_name}-port.webp"
    world_path = eval_root / f"{skin_id}-{model_name}-world.webp"
    save_webp(port, port_path, lossless=True)
    save_webp(world, world_path, lossless=True)
    port_m = _measure_halo_webp(str(port_path.relative_to(ROOT)))
    world_m = _measure_halo_webp(str(world_path.relative_to(ROOT)))
    browser_sum = port_m["browser"]["bgOpaqueBand"] + world_m["browser"]["bgOpaqueBand"]
    out = {
        "model": model_name,
        "browserSum": browser_sum,
        "portrait": port_m,
        "world": world_m,
        "holesOk": holes_port and holes_world,
        "silhouetteOk": sil_ok,
        "portraitPath": str(port_path.relative_to(ROOT)),
        "worldPath": str(world_path.relative_to(ROOT)),
    }
    clear_rembg_sessions()
    return out


def _pick_rembg_model(
    orig: Image.Image,
    skin_id: str,
    holes_baseline: dict,
) -> tuple[str, Image.Image, Image.Image, dict]:
    best: tuple[int, str, str, str, dict] | None = None
    fallback: tuple[int, str, str, str, dict] | None = None
    eval_root = ROOT / "assets/ui/angelina-skins/.eval-halo"
    eval_root.mkdir(parents=True, exist_ok=True)
    for model_name in REMBG_CANDIDATE_MODELS:
        print(f"  trying {model_name}...", flush=True)
        proc = subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts/build-angelina-skin-assets.py"),
                "--eval-model",
                skin_id,
                model_name,
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "").strip()
            if proc.returncode in (137, -9):
                err = "OOM (BiRefNet ~900MB ONNX; subprocess killed)"
            print(f"  model {model_name}: eval failed: {err[:400]}", flush=True)
            continue
        ev = json.loads(proc.stdout.strip().splitlines()[-1])
        browser_sum = ev["browserSum"]
        metrics = {"portrait": ev["portrait"], "world": ev["world"], "browserSum": browser_sum}
        print(
            f"  model {model_name}: browserSum={browser_sum} "
            f"(P browser {ev['portrait']['browser']['bgOpaqueBand']} lanczos {ev['portrait']['lanczos']['bgOpaqueBand']} "
            f"W browser {ev['world']['browser']['bgOpaqueBand']} lanczos {ev['world']['lanczos']['bgOpaqueBand']}) "
            f"holes={ev['holesOk']} silhouette={ev['silhouetteOk']}",
            flush=True,
        )
        port_path = ROOT / ev["portraitPath"]
        world_path = ROOT / ev["worldPath"]
        if ev["holesOk"] and ev["silhouetteOk"]:
            if best is None or browser_sum < best[0]:
                best = (browser_sum, model_name, str(port_path), str(world_path), metrics)
        if ev["holesOk"]:
            if fallback is None or browser_sum < fallback[0]:
                fallback = (browser_sum, model_name, str(port_path), str(world_path), metrics)
    chosen = best or fallback
    if not chosen:
        raise SystemExit(f"{skin_id}: no rembg candidate passed hole regression")
    if best is None and fallback is not None:
        print(f"WARN {skin_id}: no model passed silhouette; using {fallback[1]}", flush=True)
    _score, model_name, port_rel, world_rel, metrics = chosen
    port_final = Image.open(ROOT / port_rel).convert("RGBA")
    world_final = Image.open(ROOT / world_rel).convert("RGBA")
    for p in eval_root.glob(f"{skin_id}-*"):
        p.unlink(missing_ok=True)
    return model_name, port_final, world_final, metrics


def write_manifest(skins_out: dict) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf8"))
    manifest["notes"] = (
        "Owner t569u approved PNGs. Alpha via offline local rembg at variant size "
        "(model per skin in manifest); exterior-connected backdrop cleanup. "
        "Rebuild: python3 scripts/build-angelina-skin-assets.py"
    )
    for skin_id, data in skins_out.items():
        entry = manifest["skins"][skin_id]
        if data.get("rembgModel"):
            entry["rembgModel"] = data["rembgModel"]
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


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    SHIPPED_DIR.mkdir(parents=True, exist_ok=True)
    holes_baseline = json.loads(HOLES_BASELINE_PATH.read_text(encoding="utf8"))
    skins_out = {}
    model_report: dict = {}

    for skin_id, source_name in SOURCES.items():
        source_path = SOURCE_DIR / source_name
        if not source_path.exists():
            raise SystemExit(f"missing source: {source_path}")

        source_sha = sha256_file(source_path)
        orig = Image.open(source_path).convert("RGBA")
        slug = source_name.replace(".png", "")

        print(f"{skin_id} rembg model sweep:")
        model_name, port_final, world_final, metrics = _pick_rembg_model(
            orig, skin_id, holes_baseline[skin_id]
        )
        model_report[skin_id] = {"rembgModel": model_name, **metrics}
        print(f"{skin_id} chose {model_name} browserSum={metrics['browserSum']}")

        port_path = SHIPPED_DIR / f"{slug}-portrait.webp"
        port_alpha_ref, port_alpha_sha, port_alpha_stats = write_alpha_ref(slug, "portrait", port_final)
        port_interior_sha = interior_rgb_sha256(port_final)
        port_sha = save_webp(port_final, port_path, lossless=True)

        world_path = SHIPPED_DIR / f"{slug}-world.webp"
        world_alpha_ref, world_alpha_sha, world_alpha_stats = write_alpha_ref(slug, "world", world_final)
        world_interior_sha = interior_rgb_sha256(world_final)
        world_sha = save_webp(world_final, world_path, lossless=True)

        skins_out[skin_id] = {
            "sourcePath": str(source_path.relative_to(ROOT)).replace("\\", "/"),
            "sourceSha256": source_sha,
            "rembgModel": model_name,
            "portraitPath": str(port_path.relative_to(ROOT)).replace("\\", "/"),
            "portraitSha256": port_sha,
            "portraitAlphaRef": port_alpha_ref,
            "portraitAlphaSha256": port_alpha_sha,
            "portraitAlphaStats": port_alpha_stats,
            "portraitInteriorRgbSha256": port_interior_sha,
            "worldPath": str(world_path.relative_to(ROOT)).replace("\\", "/"),
            "worldSha256": world_sha,
            "worldAlphaRef": world_alpha_ref,
            "worldAlphaSha256": world_alpha_sha,
            "worldAlphaStats": world_alpha_stats,
            "worldInteriorRgbSha256": world_interior_sha,
        }
        print(skin_id, source_sha[:12], "portrait", port_sha[:12], "world", world_sha[:12])

    write_manifest(skins_out)
    print("MODEL_REPORT", json.dumps(model_report, indent=2))
    print(json.dumps(skins_out, indent=2))


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "--eval-model":
        skin_id = sys.argv[2]
        model_name = sys.argv[3]
        if skin_id not in SOURCES:
            raise SystemExit(f"unknown skin {skin_id}")
        holes_baseline = json.loads(HOLES_BASELINE_PATH.read_text(encoding="utf8"))
        result = _eval_model_for_skin(skin_id, model_name, holes_baseline[skin_id])
        print(json.dumps(result))
    else:
        main()
