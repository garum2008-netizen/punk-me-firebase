#!/usr/bin/env python3
"""Verify shipped WebP interior RGB matches approved source (same pipeline as build)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "scripts" / "build-angelina-skin-assets.py"

import importlib.util

spec = importlib.util.spec_from_file_location("build_angelina_skin_assets", BUILD)
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

MANIFEST = ROOT / "data/story/angelina-skin-manifest.json"


def interior_mismatch_pct(expected: Image.Image, shipped_path: Path) -> float:
    exp = expected.convert("RGBA")
    got = Image.open(shipped_path).convert("RGBA")
    if exp.size != got.size:
        return 100.0
    epx = exp.load()
    gpx = got.load()
    w, h = exp.size
    checked = 0
    bad = 0
    for y in range(h):
        for x in range(w):
            er, eg, eb, ea = epx[x, y]
            gr, gg, gb, ga = gpx[x, y]
            if ga < 128:
                continue
            if b._pixel_is_alpha_edge(gpx, x, y, w, h):
                continue
            checked += 1
            if ga != 255 or (gr, gg, gb) != (er, eg, eb):
                bad += 1
    return (100.0 * bad / checked) if checked else 0.0


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    failed = 0
    for skin_id, src_name in b.SOURCES.items():
        source_path = b.SOURCE_DIR / src_name
        orig = Image.open(source_path).convert("RGBA")
        cut = b.build_cutout_from_source(orig, skin_id)
        for kind, variant_fn in (("portrait", b.portrait_variant), ("world", b.world_variant)):
            rel = manifest["skins"][skin_id][kind]["path"]
            shipped_path = ROOT / rel
            expected = b.finish_shipped_variant(b.variant_locked(orig, cut, variant_fn))
            pct = interior_mismatch_pct(expected, shipped_path)
            if pct > 0.1:
                print(f"FAIL: {skin_id} {kind} interior vs pipeline {pct:.2f}% mismatch")
                failed += 1
            else:
                print(f"OK: {skin_id} {kind} interior matches source pipeline")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
