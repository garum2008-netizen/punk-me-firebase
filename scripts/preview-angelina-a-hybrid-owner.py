#!/usr/bin/env python3
"""
OWNER PREVIEW ONLY — localized A hybrid: frozen f174622 pipeline with semi_lock
disabled on verified hand/shoe fringe CCs; fringe RGBA restored from contour 17fc69d path.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import subprocess
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
OUT = Path(os.environ.get("ANGELINA_A_HYBRID_PREVIEW_OUT", STORE / "preview-hybrid-a-t186"))
TAG = os.environ.get("ANGELINA_HYBRID_TAG", "t186")
FROZEN = STORE / "frozen-candidate-f174622-webp"
CONTOUR = STORE / "preview-contour-a-17fc69d"
LOCK_THRESH = float(os.environ.get("ANGELINA_LOCK_THRESH", "0.8"))
LOCK_INSET = int(os.environ.get("ANGELINA_LOCK_INSET", "1"))
PIPELINE_SHA = (
    subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
)

BASELINE_FROZEN = {
    "A_portrait_sha256": "0d77752411383a92ee7126a9f69dc3f2b0d79614e971523a18af609026f11ab3",
    "A_world_sha256": "dd9b92cfeac121e2c8cf861d7c41649537169fa3df9c5e68edc349dfef3218b7",
}
BASELINE_CONTOUR = {
    "A_portrait_sha256": "2536ff6dd469a847bc77a7d78298b1e573ac5d693858d76768177abaafbb1f5c",
    "A_world_sha256": "9d3ec6e0e2801b5abdf7edfab517acee019ff97843d6d2eb4aef7cb8d6216eea",
}

PARAMS = {
    "mode": "localized_hybrid_preview_A_only",
    "tag": TAG,
    "pipeline_git_sha": PIPELINE_SHA,
    "lock_thresh": LOCK_THRESH,
    "lock_inset_base": LOCK_INSET,
    "semi_lock_band_global": True,
    "semi_lock_exempt": "hand_shoe_semi_lock_hits_in_roi",
    "fringe_restore_source": "contour_17fc69d_semi_damage_pixels_only",
    "merge": "frozen_pipeline_plus_localized_contour_patch",
    "decontam": True,
    "component_halo_fix": False,
    "label": "OWNER_PREVIEW_NOT_SHIPPED",
}


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()


def _assert_baseline_files() -> None:
    for kind, name in [("portrait", "A_portrait"), ("world", "A_world")]:
        p = FROZEN / f"angelina-teen-A-{kind}.webp"
        want = BASELINE_FROZEN[f"{name}_sha256"]
        got = sha256_file(p)
        if got != want:
            raise SystemExit(f"frozen baseline hash mismatch {kind}: got {got} want {want}")
        cp = CONTOUR / f"angelina-teen-A-{kind}-contour-preview-17fc69d.webp"
        cw = BASELINE_CONTOUR[f"{name}_sha256"]
        if sha256_file(cp) != cw:
            raise SystemExit(f"contour baseline hash mismatch {kind}")


def _contour_finalize_array(prelock: tuple, kind: str) -> np.ndarray:
    out = prelock[0].copy()
    src_rgb, alpha_ref = prelock[1], prelock[2]
    img = Image.fromarray(out, "RGBA")
    img = b.defringe_alpha_edge_only(img)
    out2 = np.array(img, dtype=np.uint8)
    inset = LOCK_INSET + (1 if kind == "world" else 0) + 2
    b._apply_candidate_alpha255_lock(
        out2, src_rgb, alpha_ref, LOCK_THRESH, inset, semi_lock_band=False
    )
    dist_in = ndimage.distance_transform_edt(alpha_ref >= (64 / 255.0))
    grey = b._grey_matt_halo_mask(out2) & (dist_in >= 5)
    if np.any(grey):
        out2[grey, 0:3] = src_rgb[grey]
    return out2


def _hand_shoe_fringe_exempt_mask(alpha_ref: np.ndarray, kind: str) -> tuple[np.ndarray, dict]:
    """Semi-lock exemption + fringe restore limited to verified hand/shoe damage bands."""
    h, w = alpha_ref.shape
    fg = alpha_ref >= (128 / 255.0)
    dist_in = ndimage.distance_transform_edt(fg)
    fringe = fg & (alpha_ref < 0.965) & (alpha_ref > (4 / 255.0))
    semi_hit = fg & (alpha_ref >= 0.75) & (alpha_ref < 0.80) & (dist_in >= 2)
    yy, xx = np.mgrid[0:h, 0:w]
    xn = xx.astype(np.float64) / w
    yn = yy.astype(np.float64) / h
    if kind == "portrait":
        hand_roi = (xn > 0.44) & (yn > 0.1) & (yn < 0.5)
        shoe_roi = (yn > 0.78) & (xn > 0.14) & (xn < 0.86)
    else:
        hand_roi = (xn > 0.38) & (yn > 0.06) & (yn < 0.52)
        shoe_roi = (yn > 0.72) & (xn > 0.1) & (xn < 0.9)
    struct = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
    roi = hand_roi | shoe_roi
    core = semi_hit & roi
    if not np.any(core):
        return np.zeros_like(fg), {"components": [], "exemptPx": 0, "note": "no semi-lock hits in hand/shoe ROI"}
    labeled, n = ndimage.label(fringe, structure=struct)
    touch = {int(c) for c in np.unique(labeled[core]) if c}
    picked: list[dict] = []
    comp_union = np.zeros_like(fg)
    for cid in touch:
        comp = labeled == cid
        semi_px = int(np.sum(comp & semi_hit))
        if semi_px < 1:
            continue
        ys, xs = np.where(comp)
        cy, cx = float(ys.mean()), float(xs.mean())
        region = "hand" if hand_roi[int(cy), int(cx)] else "shoe"
        picked.append(
            {
                "componentId": cid,
                "region": region,
                "areaPx": int(np.sum(comp)),
                "semiLockHitPx": semi_px,
                "meanAlphaRef": float(alpha_ref[comp].mean()),
                "centroidNorm": [round(cx / w, 4), round(cy / h, 4)],
            }
        )
        comp_union |= comp & roi
    semi_band = (alpha_ref >= 0.72) & (alpha_ref < 0.84) & fringe & roi
    exempt = (core | ndimage.binary_dilation(core, structure=struct, iterations=2)) & semi_band
    exempt |= comp_union & semi_band
    exempt &= fringe
    return exempt, {"components": picked, "exemptPx": int(np.sum(exempt))}


def _effective_inset(kind: str) -> int:
    inset = LOCK_INSET + (1 if kind == "world" else 0) + 1
    if kind == "portrait":
        inset = max(inset, LOCK_INSET + 2)
    return inset


def _roi_masks(alpha_ref: np.ndarray, kind: str) -> tuple[np.ndarray, np.ndarray]:
    h, w = alpha_ref.shape
    yy, xx = np.mgrid[0:h, 0:w]
    xn = xx.astype(np.float64) / w
    yn = yy.astype(np.float64) / h
    if kind == "portrait":
        hand = (xn > 0.44) & (yn > 0.1) & (yn < 0.5)
        shoe = (yn > 0.78) & (xn > 0.14) & (xn < 0.86)
    else:
        hand = (xn > 0.38) & (yn > 0.06) & (yn < 0.52)
        shoe = (yn > 0.72) & (xn > 0.1) & (xn < 0.9)
    return hand, shoe


def _finalize_frozen_array(prelock: tuple, kind: str) -> np.ndarray:
    src_rgb, alpha_ref = prelock[1], prelock[2]
    out = prelock[0].copy()
    b._decontaminate_grey_exterior_band(out, alpha_ref)
    img = b.finish_shipped_variant(Image.fromarray(out, "RGBA"))
    out2 = np.array(img, dtype=np.uint8)
    inset = _effective_inset(kind)
    b._apply_candidate_alpha255_lock(
        out2, src_rgb, alpha_ref, LOCK_THRESH, inset, semi_lock_band=True
    )
    b._decontaminate_opaque_grey_halo_components(out2, src_rgb, alpha_ref)
    return out2


def _finalize_hybrid(prelock: tuple, kind: str) -> tuple[Image.Image, dict]:
    src_rgb, alpha_ref = prelock[1], prelock[2]
    contour_arr = _contour_finalize_array(prelock, kind)
    exempt_mask, exempt_meta = _hand_shoe_fringe_exempt_mask(alpha_ref, kind)
    out = prelock[0].copy()
    b._decontaminate_grey_exterior_band(out, alpha_ref)
    img = b.finish_shipped_variant(Image.fromarray(out, "RGBA"))
    out2 = np.array(img, dtype=np.uint8)
    inset = _effective_inset(kind)
    b._apply_candidate_alpha255_lock(
        out2,
        src_rgb,
        alpha_ref,
        LOCK_THRESH,
        inset,
        semi_lock_band=True,
        semi_lock_exempt=exempt_mask,
    )
    b._decontaminate_opaque_grey_halo_components(out2, src_rgb, alpha_ref)
    frozen_arr = out2.copy()
    hand_roi, shoe_roi = _roi_masks(alpha_ref, kind)
    roi = hand_roi | shoe_roi
    fringe = (alpha_ref < 0.965) & (alpha_ref > (4 / 255.0))
    fd_a = frozen_arr[:, :, 3].astype(np.int16)
    ct_a = contour_arr[:, :, 3].astype(np.int16)
    semi_damage = roi & fringe & (fd_a == 255) & (ct_a < 220)
    restore = semi_damage
    out2 = frozen_arr.copy()
    out2[restore] = contour_arr[restore]
    dist_in = ndimage.distance_transform_edt(alpha_ref >= (64 / 255.0))
    grey = b._grey_matt_halo_mask(out2) & (dist_in >= 5) & (~restore)
    if np.any(grey):
        out2[grey, 0:3] = src_rgb[grey]
        grey = b._grey_matt_halo_mask(out2) & (dist_in >= 5) & (~restore)
        if np.any(grey):
            interior_core = ndimage.distance_transform_edt(alpha_ref >= 0.99) >= 3
            nearest = b._nearest_core_rgb(src_rgb, interior_core)
            out2[grey, 0:3] = nearest[grey]
    meta = {
        "exempt": exempt_meta,
        "fringeRestorePx": int(np.sum(restore)),
        "restoreBreakdown": {
            "semiDamagePx": int(np.sum(semi_damage, dtype=np.int64)),
            "alphaGapPx": 0,
            "highAlphaStripPx": 0,
        },
        "effectiveInset": _effective_inset(kind),
        "merge": "frozen_base_contour_patch_verified_roi",
    }
    return Image.fromarray(out2, "RGBA"), meta


def alpha255_share(img: Image.Image) -> float:
    arr = np.array(img)
    a = arr[:, :, 3]
    fg = a >= 128
    if not np.any(fg):
        return 0.0
    return float(np.sum(a[fg] == 255) / np.sum(fg))


def diff_vs_ref(proposed: Image.Image, ref: Image.Image) -> dict:
    p = np.array(proposed.convert("RGBA"))
    r = np.array(ref.convert("RGBA"))
    if p.shape != r.shape:
        ref = ref.resize(proposed.size, Image.Resampling.LANCZOS)
        r = np.array(ref.convert("RGBA"))
    da = np.abs(p[:, :, 3].astype(np.int16) - r[:, :, 3].astype(np.int16))
    edge = (p[:, :, 3] > 0) & (r[:, :, 3] > 0)
    fr = edge & (da > 0)
    drgb = np.abs(p[:, :, :3].astype(np.int16) - r[:, :, :3].astype(np.int16)).max(axis=2)
    return {
        "pixelsAlphaChanged": int(np.sum(fr)),
        "meanAbsAlphaDelta": float(da[edge].mean()) if np.any(edge) else 0.0,
        "pixelsRgbChanged": int(np.sum((p[:, :, 3] > 0) & (drgb > 0))),
        "maxAbsAlphaDelta": int(da.max()) if da.size else 0,
    }


def build_one(kind: str) -> dict:
    _assert_baseline_files()
    source_path = ROOT / "assets/ui/angelina-skins/source/angelina-teen-A.png"
    orig = Image.open(source_path).convert("RGBA")
    cut = b.build_cutout_from_source(orig, "A")
    slug = "angelina-teen-A"
    variant = b.portrait_variant if kind == "portrait" else b.world_variant
    pl = b._compose_6d21_prelock(orig, cut, variant, slug, kind)
    img, local_meta = _finalize_hybrid(pl[:3], kind)
    name = f"angelina-teen-A-{kind}-hybrid-preview-{TAG}.webp"
    dest = OUT / name
    OUT.mkdir(parents=True, exist_ok=True)
    b.save_webp(img, dest, lossless=True)
    serve_rel = f"assets/ui/angelina-skins/.owner-preview-only/{name}"
    serve = ROOT / serve_rel
    serve.parent.mkdir(parents=True, exist_ok=True)
    b.save_webp(img, serve, lossless=True)
    meas = b._measure_halo(serve_rel)
    sil = b._outline_near_white_halos_img(img)
    frozen_path = FROZEN / f"angelina-teen-A-{kind}.webp"
    contour_path = CONTOUR / f"angelina-teen-A-{kind}-contour-preview-17fc69d.webp"
    return {
        "kind": kind,
        "previewPath": str(dest),
        "serveRel": serve_rel,
        "sha256": sha256_file(dest),
        "sourceSha256": b.sha256_file(source_path),
        "frozenSha256": sha256_file(frozen_path),
        "contourSha256": sha256_file(contour_path),
        "halo": meas,
        "silhouetteNearWhite": sil,
        "alpha255Share": alpha255_share(img),
        "localHybridMeta": local_meta,
        "diffVsFrozen": diff_vs_ref(img, Image.open(frozen_path)),
        "diffVsContour": diff_vs_ref(img, Image.open(contour_path)),
    }


def main() -> None:
    report = {"params": PARAMS, "variants": [build_one("portrait"), build_one("world")]}
    path = OUT / "hybrid-preview-metrics.json"
    path.write_text(json.dumps(report, indent=2), encoding="utf8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
