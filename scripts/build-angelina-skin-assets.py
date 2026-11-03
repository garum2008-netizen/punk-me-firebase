#!/usr/bin/env python3
"""Build shipped WebP assets from Owner-approved source PNGs (t569u). No AI — resize/crop/alpha only."""
from __future__ import annotations

import hashlib
import json
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SKIN_DIR = ROOT / "assets/ui/angelina-skins"
SOURCE_DIR = SKIN_DIR / "source"
SHIPPED_DIR = SKIN_DIR / "shipped"

SOURCES = {
    "A": "angelina-teen-A.png",
    "B": "angelina-teen-B.png",
    "C": "angelina-teen-C-v2.png",
}


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def save_webp(img: Image.Image, dest: Path, quality: int = 86) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
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
            elif 0 < a < 255 and max(r, g, b) - min(r, g, b) < 8 and (r + g + b) / 3 > 215:
                px[x, y] = (r, g, b, min(255, a + 40))
    return rgba


def postprocess_cutout(skin_id: str, cut: Image.Image) -> Image.Image:
    tol = 14 if skin_id == "C" else 16
    out = feather_alpha_edges(defringe_gray_halos(cut), radius=2)
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


def build_cutout_from_source(orig: Image.Image, skin_id: str) -> Image.Image:
    tol = 14 if skin_id == "C" else 16
    cut = apply_alpha_cutout(orig, tolerance=tol)
    return postprocess_cutout(skin_id, cut)


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    SHIPPED_DIR.mkdir(parents=True, exist_ok=True)
    skins_out = {}

    for skin_id, source_name in SOURCES.items():
        source_path = SOURCE_DIR / source_name
        if not source_path.exists():
            raise SystemExit(f"missing source: {source_path}")

        source_sha = sha256_file(source_path)
        orig = Image.open(source_path).convert("RGBA")
        cut = build_cutout_from_source(orig, skin_id)
        slug = source_name.replace(".png", "")

        port_path = SHIPPED_DIR / f"{slug}-portrait.webp"
        port_sha = save_webp(portrait_variant(cut), port_path)

        world_path = SHIPPED_DIR / f"{slug}-world.webp"
        world_sha = save_webp(world_variant(cut), world_path, quality=82)

        skins_out[skin_id] = {
            "sourcePath": str(source_path.relative_to(ROOT)).replace("\\", "/"),
            "sourceSha256": source_sha,
            "portraitPath": str(port_path.relative_to(ROOT)).replace("\\", "/"),
            "portraitSha256": port_sha,
            "worldPath": str(world_path.relative_to(ROOT)).replace("\\", "/"),
            "worldSha256": world_sha,
        }
        print(skin_id, source_sha[:12], "portrait", port_sha[:12], "world", world_sha[:12])

    print(json.dumps(skins_out, indent=2))


if __name__ == "__main__":
    main()
