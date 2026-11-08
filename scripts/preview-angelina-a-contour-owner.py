#!/usr/bin/env python3
"""
OWNER PREVIEW ONLY — A contour / edge matte correction (no ship, no B/C changes).
Preserves prelock fringe alpha; fixes greyMatt only on pixels >=5px inside alpha_ref.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "scripts" / "build-angelina-skin-assets.py"
spec = importlib.util.spec_from_file_location("angelina_build", BUILD)
assert spec and spec.loader
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

STORE = Path(
    os.environ.get(
        "HALO_OWNER_REVIEW_STORE",
        "/cursor/stores/self/t179-halo-owner-review-f174622",
    )
)
OUT = Path(
    os.environ.get(
        "ANGELINA_A_CONTOUR_PREVIEW_OUT",
        STORE / "preview-contour-a-17fc69d",
    )
)
FROZEN = STORE / "frozen-candidate-f174622-webp"
LOCK_THRESH = float(os.environ.get("ANGELINA_LOCK_THRESH", "0.8"))
LOCK_INSET = int(os.environ.get("ANGELINA_LOCK_INSET", "1"))
FROZEN_BUILD_PARAMS = {
    "buildScriptSha": "f174622190b5e0dc5fc314df1227b56e66baf4cc",
    "ANGELINA_SKIP_SWEEP": "1",
    "ANGELINA_LOCK_THRESH": "0.8",
    "ANGELINA_LOCK_INSET": "1",
    "ANGELINA_HALO_REPAIR_MAX_ROUNDS": "0",
    "note": "frozen-candidate-f174622-webp bundle (not contour preview)",
}

PARAMS = {
    "mode": "contour_bounded_preview_A_only",
    "lock_thresh": LOCK_THRESH,
    "lock_inset_base": LOCK_INSET,
    "interior_lock_inset_add": 2,
    "grey_matt_min_dist_in_px": 5,
    "semi_lock_band": False,
    "component_halo_fix": False,
    "finish": "defringe_alpha_edge_only_no_strip_near_white",
    "label": "OWNER_PREVIEW_NOT_SHIPPED",
    "frozen_candidate_bundle": "frozen-candidate-f174622-webp",
    "build_script_note": "Does not mix v4 log metrics; compare only to frozen webp files in that folder",
}


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()


def _finalize_a_contour_preview(prelock: tuple, kind: str) -> Image.Image:
    out = prelock[0].copy()
    src_rgb, alpha_ref = prelock[1], prelock[2]
    img = Image.fromarray(out, "RGBA")
    img = b.defringe_alpha_edge_only(img)
    out2 = np.array(img, dtype=np.uint8)
    inset = LOCK_INSET + (1 if kind == "world" else 0) + PARAMS["interior_lock_inset_add"]
    b._apply_candidate_alpha255_lock(
        out2, src_rgb, alpha_ref, LOCK_THRESH, inset, semi_lock_band=False
    )
    dist_in = ndimage.distance_transform_edt(alpha_ref >= (64 / 255.0))
    grey = b._grey_matt_halo_mask(out2) & (dist_in >= PARAMS["grey_matt_min_dist_in_px"])
    if np.any(grey):
        out2[grey, 0:3] = src_rgb[grey]
    return Image.fromarray(out2, "RGBA")


def alpha255_share(img: Image.Image) -> float:
    arr = np.array(img)
    a = arr[:, :, 3]
    fg = a >= 128
    if not np.any(fg):
        return 0.0
    return float(np.sum(a[fg] == 255) / np.sum(fg))


def edge_band_stats(img: Image.Image) -> dict:
    arr = np.array(img.convert("RGBA"))
    a = arr[:, :, 3]
    edge = np.zeros(a.shape, dtype=bool)
    h, w = a.shape
    for y in range(h):
        for x in range(w):
            if a[y, x] < 8:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx >= w or ny >= h or a[ny, nx] < 8:
                    edge[y, x] = True
                    break
    semi = edge & (a > 0) & (a < 255)
    return {
        "edgePixels": int(np.sum(edge)),
        "semiTransparentEdge": int(np.sum(semi)),
        "meanAlphaEdge": float(a[edge].mean()) if np.any(edge) else None,
        "meanAlphaSemi": float(a[semi].mean()) if np.any(semi) else None,
    }


def diff_vs_ref(proposed: Image.Image, ref: Image.Image) -> dict:
    p = np.array(proposed.convert("RGBA"))
    r = np.array(ref.convert("RGBA"))
    if p.shape != r.shape:
        ref = ref.resize(proposed.size, Image.Resampling.LANCZOS)
        r = np.array(ref.convert("RGBA"))
    da = np.abs(p[:, :, 3].astype(np.int16) - r[:, :, 3].astype(np.int16))
    edge = (p[:, :, 3] > 0) & (r[:, :, 3] > 0)
    fr = edge & (da > 0)
    return {
        "meanAbsAlphaDelta": float(da[edge].mean()) if np.any(edge) else 0.0,
        "pixelsAlphaChanged": int(np.sum(fr)),
        "maxAbsAlphaDelta": int(da.max()) if da.size else 0,
    }


def build_one(kind: str) -> dict:
    source_path = ROOT / "assets/ui/angelina-skins/source/angelina-teen-A.png"
    orig = Image.open(source_path).convert("RGBA")
    cut = b.build_cutout_from_source(orig, "A")
    slug = "angelina-teen-A"
    variant = b.portrait_variant if kind == "portrait" else b.world_variant
    pl = b._compose_6d21_prelock(orig, cut, variant, slug, kind)
    img = _finalize_a_contour_preview(pl[:3], kind)
    name = f"angelina-teen-A-{kind}-contour-preview-17fc69d.webp"
    dest = OUT / name
    OUT.mkdir(parents=True, exist_ok=True)
    b.save_webp(img, dest, lossless=True)
    rel = str(dest.relative_to(ROOT)).replace("\\", "/") if dest.is_relative_to(ROOT) else str(dest)
    serve_rel = f"assets/ui/angelina-skins/.owner-preview-only/{name}"
    serve = ROOT / serve_rel
    serve.parent.mkdir(parents=True, exist_ok=True)
    b.save_webp(img, serve, lossless=True)
    meas = b._measure_halo(serve_rel)
    sil = b._outline_near_white_halos_img(img)
    frozen_name = f"angelina-teen-A-{kind}.webp"
    frozen_path = FROZEN / frozen_name
    frozen_sha = sha256_file(frozen_path) if frozen_path.is_file() else None
    frozen_diff = None
    if frozen_path.is_file():
        frozen_diff = diff_vs_ref(img, Image.open(frozen_path))
    return {
        "kind": kind,
        "previewPath": str(dest),
        "serveRel": serve_rel,
        "sha256": sha256_file(dest),
        "sourceSha256": b.sha256_file(source_path),
        "frozenCandidateRef": {
            "path": str(frozen_path),
            "sha256": frozen_sha,
            "params": FROZEN_BUILD_PARAMS,
        },
        "halo": meas,
        "silhouetteNearWhite": sil,
        "alpha255Share": alpha255_share(img),
        "edgeBand": edge_band_stats(img),
        "edgeDiffVsFrozenCandidate": frozen_diff,
    }


def main() -> None:
    report = {
        "params": PARAMS,
        "variants": [build_one("portrait"), build_one("world")],
    }
    report_path = OUT / "contour-preview-metrics.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf8")
    (STORE / "preview-contour-a-17fc69d").mkdir(parents=True, exist_ok=True)
    (STORE / "preview-contour-a-17fc69d" / "contour-preview-metrics.json").write_text(
        json.dumps(report, indent=2), encoding="utf8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
