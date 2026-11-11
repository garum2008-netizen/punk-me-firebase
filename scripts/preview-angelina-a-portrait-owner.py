#!/usr/bin/env python3
"""OWNER PREVIEW ONLY — A portrait extra inset lock. Never writes under shipped/."""
from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "scripts" / "build-angelina-skin-assets.py"
spec = importlib.util.spec_from_file_location("angelina_build", BUILD)
if spec is None or spec.loader is None:
    raise SystemExit("cannot load build-angelina-skin-assets.py")
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


def main() -> None:
    out_dir = Path(
        os.environ.get(
            "ANGELINA_A_PORTRAIT_PREVIEW_OUT",
            ROOT / "assets/ui/angelina-skins/.owner-preview-only",
        )
    )
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / "angelina-teen-A-portrait-edge-preview-f174622.webp"
    source_path = ROOT / "assets/ui/angelina-skins/source/angelina-teen-A.png"
    if not source_path.is_file():
        raise SystemExit(f"missing source: {source_path}")
    from PIL import Image

    orig = Image.open(source_path).convert("RGBA")
    cut = b.build_cutout_from_source(orig, "A")
    slug = "angelina-teen-A"
    pl = b._compose_6d21_prelock(orig, cut, b.portrait_variant, slug, "portrait")
    lock_thresh = float(os.environ.get("ANGELINA_LOCK_THRESH", "0.8"))
    lock_inset = int(os.environ.get("ANGELINA_LOCK_INSET", "1"))
    portrait_inset = lock_inset + 3
    rel = "assets/ui/angelina-skins/.owner-preview-only/angelina-teen-A-portrait-edge-preview-f174622.webp"
    img = b._finalize_prelock(
        pl[:3],
        lock_thresh,
        portrait_inset,
        component_halo_fix=True,
        skin_id="A",
        kind="portrait",
        measure_rel=rel,
        semi_lock_band=True,
    )
    b.save_webp(img, dest, lossless=True)
    meas = b._measure_halo(rel)
    sil = b._outline_near_white_halos_img(img)
    report = {
        "previewPath": str(dest),
        "params": {
            "lock_thresh": lock_thresh,
            "portrait_inset": portrait_inset,
            "semi_lock_band": True,
            "component_halo_fix": True,
            "label": "OWNER_PREVIEW_ONLY_not_shipped",
        },
        "halo": meas,
        "silhouetteNearWhite": sil,
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
