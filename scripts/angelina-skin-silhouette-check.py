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
WEBP_SLACK = 35


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
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
