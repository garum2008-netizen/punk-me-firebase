#!/usr/bin/env python3
"""Validate shipped WebP alpha vs rebuild-time alpha-ref PNGs (no rembg at test time)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/story/angelina-skin-manifest.json"
SOLID = 230
WEBP_SLACK = 52
NEAR_WHITE = 245


def content_bbox(alpha: Image.Image, alpha_min: int = 32) -> tuple[int, int, int, int]:
    w, h = alpha.size
    px = alpha.load()
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y] >= alpha_min:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if maxx < minx:
        return 0, 0, w - 1, h - 1
    return minx, miny, maxx, maxy


def outline_near_white_halos(rgba: Image.Image, limit: int = 800) -> int:
    img = rgba.convert("RGBA")
    w, h = img.size
    px = img.load()
    bad = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < SOLID - WEBP_SLACK:
                continue
            if (r + g + b) / 3 < NEAR_WHITE:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    bad += 1
                    break
                if px[nx, ny][3] < 32:
                    bad += 1
                    break
            if bad >= limit:
                return bad
    return bad


def feet_opaque_rectangle(alpha: Image.Image, band_ratio: float = 0.16) -> bool:
    w, h = alpha.size
    px = alpha.load()
    y0 = int(h * (1 - band_ratio))
    minx, maxx = w, -1
    for y in range(y0, h):
        for x in range(w):
            if px[x, y] >= SOLID - WEBP_SLACK:
                minx = min(minx, x)
                maxx = max(maxx, x)
    if maxx < minx:
        return False
    span = maxx - minx + 1
    if span < int(w * 0.28):
        return False
    opaque = 0
    total = 0
    for y in range(y0, h):
        for x in range(minx, maxx + 1):
            total += 1
            if px[x, y] >= SOLID - WEBP_SLACK:
                opaque += 1
    return total > 0 and opaque / total > 0.72


def bbox_margins(alpha) -> dict:
    w, h = alpha.size
    minx, miny, maxx, maxy = content_bbox(alpha)
    return {"left": minx, "top": miny, "right": w - maxx, "bottom": h - maxy}


def mask_dropouts(expected, actual) -> int:
    w, h = expected.size
    if expected.size != actual.size:
        return w * h
    ep = expected.load()
    ap = actual.load()
    bad = 0
    for y in range(h):
        for x in range(w):
            if ep[x, y] >= SOLID and ap[x, y] < SOLID - WEBP_SLACK:
                bad += 1
    return bad


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    failed = 0
    for skin_id in ["A", "B", "C"]:
        entry = manifest["skins"][skin_id]
        for kind in ("portrait", "world"):
            shipped = Image.open(ROOT / entry[kind]["path"]).convert("RGBA")
            act_a = shipped.split()[3]
            ref_rel = entry[kind].get("alphaRef")
            ref_sha = entry[kind].get("alphaSha256")
            if not ref_rel or not ref_sha:
                print(f"FAIL {skin_id} {kind}: missing alphaRef in manifest")
                failed += 1
                continue
            ref_path = ROOT / ref_rel
            if sha256_file(ref_path) != ref_sha:
                print(f"FAIL {skin_id} {kind}: alphaRef sha mismatch")
                failed += 1
                continue
            exp_a = Image.open(ref_path).convert("L")
            if exp_a.size != act_a.size:
                print(f"FAIL {skin_id} {kind}: alpha size {act_a.size} != ref {exp_a.size}")
                failed += 1
                continue
            drops = mask_dropouts(exp_a, act_a)
            if drops > 0:
                print(f"FAIL {skin_id} {kind}: silhouette dropouts vs alpha-ref {drops}")
                failed += 1
            else:
                print(f"OK {skin_id} {kind}: alpha matches rebuild ref")
            m = bbox_margins(exp_a)
            if m["top"] < 4 or m["bottom"] < 4:
                print(f"FAIL {skin_id} {kind}: vertical margin {m}")
                failed += 1
            else:
                print(f"OK {skin_id} {kind}: vertical margin {m}")
            halos = outline_near_white_halos(shipped)
            if halos > 0:
                print(f"FAIL {skin_id} {kind}: near-white outline halos {halos}")
                failed += 1
            else:
                print(f"OK {skin_id} {kind}: no near-white outline halos")
            if feet_opaque_rectangle(act_a):
                print(f"FAIL {skin_id} {kind}: opaque feet rectangle in lower band")
                failed += 1
            else:
                print(f"OK {skin_id} {kind}: no feet rectangle")
    return 1 if failed else 0


def sha256_file(p: Path) -> str:
    import hashlib

    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


if __name__ == "__main__":
    raise SystemExit(main())
