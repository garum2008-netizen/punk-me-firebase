#!/usr/bin/env python3
"""
OWNER PREVIEW ONLY — localized A hybrid: immutable frozen f174622 WebP + hand/shoe patches
from contour 17fc69d only where semi-lock damage is verified (no full re-pipeline).
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
_OUT_ENV = os.environ.get("ANGELINA_A_HYBRID_PREVIEW_OUT")
TAG = os.environ.get("ANGELINA_HYBRID_TAG", "t186-iter3")
ITERATION = os.environ.get("ANGELINA_HYBRID_ITERATION", "iter3_hand_patch_shoe_src_rgb_badseed")
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
    "iteration": ITERATION,
    "postPass": "hand_contour_patch_only_shoe_badseed_src_nearest",
    "tag": TAG,
    "pipeline_git_sha": PIPELINE_SHA,
    "lock_thresh": LOCK_THRESH,
    "lock_inset_base": LOCK_INSET,
    "semi_lock_band_global": True,
    "semi_lock_exempt": "hand_shoe_semi_lock_hits_in_roi",
    "fringe_restore_source": "contour_17fc69d_semi_damage_pixels_only",
    "merge": "immutable_frozen_webp_plus_hand_shoe_contour_patch_only",
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


def _tight_hand_shoe_roi(h: int, w: int, kind: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    yy, xx = np.mgrid[0:h, 0:w]
    xn = xx.astype(np.float64) / w
    yn = yy.astype(np.float64) / h
    if kind == "portrait":
        hand = (xn > 0.53) & (yn > 0.11) & (yn < 0.42)
        shoe = (yn > 0.81) & (xn > 0.16) & (xn < 0.84)
    else:
        hand = (xn > 0.45) & (yn > 0.08) & (yn < 0.46)
        shoe = (yn > 0.73) & (xn > 0.12) & (xn < 0.88)
    jacket_guard = (xn > 0.32) & (xn < 0.68) & (yn > 0.44) & (yn < 0.78)
    return hand, shoe, jacket_guard


def _bad_pixel_native_seeds(kind: str, h: int, w: int) -> np.ndarray:
    key = "portrait" if kind == "portrait" else "world"
    path = STORE / f"bad-pixels/frozen_candidate_f174622-A_{key}.json"
    if not path.is_file():
        return np.zeros((h, w), dtype=bool)
    data = json.loads(path.read_text(encoding="utf-8"))
    mask = np.zeros((h, w), dtype=bool)
    for px in data.get("pixels", []):
        nx, ny = int(px["x"]) // 3, int(px["y"]) // 3
        if 0 <= nx < w and 0 <= ny < h:
            mask[ny, nx] = True
    if not np.any(mask):
        return mask
    struct = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
    return ndimage.binary_dilation(mask, structure=struct, iterations=2)


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


def _load_baseline_arrays(kind: str) -> tuple[np.ndarray, np.ndarray]:
    frozen_path = FROZEN / f"angelina-teen-A-{kind}.webp"
    contour_path = CONTOUR / f"angelina-teen-A-{kind}-contour-preview-17fc69d.webp"
    frozen = np.array(Image.open(frozen_path).convert("RGBA"), dtype=np.uint8)
    contour = np.array(Image.open(contour_path).convert("RGBA"), dtype=np.uint8)
    if frozen.shape != contour.shape:
        raise SystemExit(f"frozen/contour size mismatch {kind}")
    return frozen, contour


def _verified_patch_mask(
    frozen_arr: np.ndarray,
    contour_arr: np.ndarray,
    alpha_ref: np.ndarray,
    kind: str,
) -> tuple[np.ndarray, dict]:
    h, w = frozen_arr.shape[0], frozen_arr.shape[1]
    hand, shoe, jacket_guard = _tight_hand_shoe_roi(h, w, kind)
    roi = (hand | shoe) & (~jacket_guard)
    fd_a = frozen_arr[:, :, 3].astype(np.int16)
    ct_a = contour_arr[:, :, 3].astype(np.int16)
    fringe = (frozen_arr[:, :, 3] > 0) & (alpha_ref < 0.965)
    semi_damage = (
        roi
        & fringe
        & (fd_a == 255)
        & (ct_a < 222)
        & (fd_a - ct_a >= 10)
    )
    bad_near = _bad_pixel_native_seeds(kind, h, w)
    struct = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
    labeled, _ = ndimage.label(semi_damage, structure=struct)
    touch_ids = {int(c) for c in np.unique(labeled[bad_near & semi_damage]) if c}
    patch = np.zeros((h, w), dtype=bool)
    components: list[dict] = []
    for cid in set(int(c) for c in np.unique(labeled) if c):
        comp = labeled == cid
        area = int(np.sum(comp))
        if area < 1:
            continue
        ys, xs = np.where(comp)
        cy, cx = float(ys.mean()), float(xs.mean())
        xn, yn = cx / w, cy / h
        region_hand = hand[int(cy), int(cx)]
        region_shoe = shoe[int(cy), int(cx)]
        if jacket_guard[int(cy), int(cx)]:
            continue
        if region_shoe or not region_hand:
            continue
        if area > 1800 and cid not in touch_ids:
            continue
        if area > 1200 and cid not in touch_ids:
            continue
        patch |= comp
        components.append(
            {
                "componentId": cid,
                "region": "hand" if region_hand else "shoe",
                "areaPx": area,
                "centroidNorm": [round(xn, 4), round(yn, 4)],
                "touchesBadPixelBand": cid in touch_ids,
            }
        )
    patch &= roi
    return patch, {
        "components": components,
        "patchPx": int(np.sum(patch)),
        "semiDamagePx": int(np.sum(semi_damage)),
        "badPixelSeedPx": int(np.sum(bad_near)),
    }


def _finalize_hybrid(_prelock: tuple, kind: str) -> tuple[Image.Image, dict]:
    alpha_ref = _prelock[2]
    frozen_arr, contour_arr = _load_baseline_arrays(kind)
    h, w = frozen_arr.shape[0], frozen_arr.shape[1]
    patch, patch_meta = _verified_patch_mask(frozen_arr, contour_arr, alpha_ref, kind)
    out2 = frozen_arr.copy()
    hand, shoe, _jacket = _tight_hand_shoe_roi(h, w, kind)
    hand_patch = patch & hand
    if np.any(hand_patch):
        out2[hand_patch] = contour_arr[hand_patch]
    src_rgb = _prelock[1]
    bad_shoe = _bad_pixel_native_seeds(kind, h, w) & shoe
    if np.any(bad_shoe):
        out2[bad_shoe, 0:3] = src_rgb[bad_shoe]
    grey = b._grey_matt_halo_mask(out2)
    shoe_grey = grey & shoe & (~hand_patch)
    if np.any(shoe_grey):
        interior = ndimage.distance_transform_edt(alpha_ref >= 0.99) >= 3
        nearest = b._nearest_core_rgb(src_rgb, interior)
        out2[shoe_grey, 0:3] = nearest[shoe_grey]
        still = b._grey_matt_halo_mask(out2) & shoe_grey
        if np.any(still):
            out2[still, 0:3] = src_rgb[still]
    hand_grey = b._grey_matt_halo_mask(out2) & hand_patch
    if np.any(hand_grey):
        interior = ndimage.distance_transform_edt(alpha_ref >= 0.99) >= 3
        nearest = b._nearest_core_rgb(src_rgb, interior)
        out2[hand_grey, 0:3] = nearest[hand_grey]
    meta = {
        "patch": patch_meta,
        "patchPx": int(np.sum(patch)),
        "merge": "immutable_frozen_webp_plus_hand_shoe_contour_patch_only",
        "rootCausePriorIter": "re_pipeline_semi_lock_exempt drifted from frozen f174622 webp hashes",
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


def _out_dir() -> Path:
    if _OUT_ENV:
        return Path(_OUT_ENV)
    return STORE / f"preview-hybrid-a-{TAG}"


def build_one(kind: str) -> dict:
    _assert_baseline_files()
    out_dir = _out_dir()
    source_path = ROOT / "assets/ui/angelina-skins/source/angelina-teen-A.png"
    orig = Image.open(source_path).convert("RGBA")
    cut = b.build_cutout_from_source(orig, "A")
    slug = "angelina-teen-A"
    variant = b.portrait_variant if kind == "portrait" else b.world_variant
    pl = b._compose_6d21_prelock(orig, cut, variant, slug, kind)
    img, local_meta = _finalize_hybrid(pl[:3], kind)
    name = f"angelina-teen-A-{kind}-hybrid-preview-{TAG}.webp"
    dest = out_dir / name
    out_dir.mkdir(parents=True, exist_ok=True)
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
    out_dir = _out_dir()
    path = out_dir / "hybrid-preview-metrics.json"
    path.write_text(json.dumps(report, indent=2), encoding="utf8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
