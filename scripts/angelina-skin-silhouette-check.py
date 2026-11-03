#!/usr/bin/env python3
"""Validate shipped cutouts vs source-derived masks (no interior holes, vertical margin)."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/story/angelina-skin-manifest.json"
SOLID = 230
WEBP_SLACK = 52
NEAR_WHITE = 245


def outline_near_white_halos(rgba: Image.Image, limit: int = 800) -> int:
    """Opaque near-white RGB pixels touching transparent background (matte fringing)."""
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
    """Detect a wide opaque bar under the feet (contact shadow rectangle)."""
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
    # full-width low band with high opacity density
    opaque = 0
    total = 0
    for y in range(y0, h):
        for x in range(minx, maxx + 1):
            total += 1
            if px[x, y] >= SOLID - WEBP_SLACK:
                opaque += 1
    return total > 0 and opaque / total > 0.72


def load_builder():
    spec = importlib.util.spec_from_file_location(
        "build_angelina_skin_assets",
        ROOT / "scripts" / "build-angelina-skin-assets.py",
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def bbox_margins(mod, alpha) -> dict:
    w, h = alpha.size
    merged = Image.merge("RGBA", [alpha, alpha, alpha, alpha])
    minx, miny, maxx, maxy = mod.content_bbox(merged)
    return {"left": minx, "top": miny, "right": w - maxx, "bottom": h - maxy}


def mask_dropouts(expected, actual) -> int:
    w, h = expected.size
    ep = expected.load()
    ap = actual.load()
    bad = 0
    for y in range(h):
        for x in range(w):
            if ep[x, y] >= SOLID and ap[x, y] < SOLID - WEBP_SLACK:
                bad += 1
    return bad


def main() -> int:
    mod = load_builder()
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    failed = 0
    for skin_id in ["A", "B", "C"]:
        entry = manifest["skins"][skin_id]
        orig = Image.open(ROOT / entry["source"]["path"]).convert("RGBA")
        cut = mod.build_cutout_from_source(orig, skin_id)
        for kind, variant_fn in [("portrait", mod.portrait_variant), ("world", mod.world_variant)]:
            expected = variant_fn(cut)
            shipped = Image.open(ROOT / entry[kind]["path"]).convert("RGBA")
            exp_a = expected.split()[3]
            act_a = shipped.split()[3]
            if exp_a.size != act_a.size:
                print(f"FAIL {skin_id} {kind}: size {act_a.size} != {exp_a.size}")
                failed += 1
                continue
            drops = mask_dropouts(exp_a, act_a)
            if drops > 0:
                print(f"FAIL {skin_id} {kind}: silhouette dropouts vs source mask {drops}")
                failed += 1
            else:
                print(f"OK {skin_id} {kind}: silhouette matches source mask")
            m = bbox_margins(mod, exp_a)
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


if __name__ == "__main__":
    raise SystemExit(main())
