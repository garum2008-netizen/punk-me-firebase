#!/usr/bin/env python3
"""Build best-row candidate WebPs for human review (not shipped / not in game manifest)."""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE_DIR = ROOT / "assets/ui/angelina-skins/.candidate-review"
ARTIFACTS = Path("/opt/cursor/artifacts")
THRESH = 0.80
INSET = 1

spec = importlib.util.spec_from_file_location(
    "build_angelina", ROOT / "scripts/build-angelina-skin-assets.py"
)
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

SOURCES = build.SOURCES


def _gate_table(prelocks, slug_map, rel_prefix: str) -> dict:
    final_images: dict[tuple[str, str], object] = {}
    shares: dict[str, float] = {}
    halo: dict[str, dict] = {}
    for skin_id in ["A", "B", "C"]:
        slug = slug_map[skin_id]
        for kind in ("portrait", "world"):
            rel = f"{rel_prefix}/{slug}-{kind}.webp"
            pl = prelocks[skin_id][kind]
            img = build._finalize_prelock(
                pl,
                THRESH,
                INSET,
                decontam=False,
                semi_lock_band=True,
                component_halo_fix=True,
                skin_id=skin_id,
                kind=kind,
                measure_rel=rel,
            )
            out_path = ROOT / rel
            build.save_webp(img, out_path, lossless=True)
            final_images[(skin_id, kind)] = img
            import numpy as np

            shares[f"{skin_id}_{kind}"] = build._alpha255_share(
                np.array(img.convert("RGBA"))
            )
            halo[f"{skin_id}_{kind}"] = build._measure_halo(rel)

    sil_ok, sil_counts = build._silhouette_limits_ok(final_images)
    min_a255 = min(shares.values())
    halo_zero = all(
        halo[k]["browser"]["bgOpaqueBand"] == 0 and halo[k]["lanczos"]["bgOpaqueBand"] == 0
        for k in halo
    )
    passes_all = halo_zero and sil_ok and min_a255 >= 0.9
    return {
        "parameters": {
            "thresh": THRESH,
            "inset": INSET,
            "semiLockBand": "alpha_ref in [0.75,0.80) and dist_in>=2",
            "componentHaloFix": "A portrait/world browser+lanczos; C world lanczos greyMatt CC recolor",
            "semiExteriorDecontam": False,
            "nearestCoreMinLum": 60,
        },
        "resizePipeline": {
            "portraitWorldRgbBeforeThisIteration": (
                "straight RGBA Lanczos via PIL (not premultiplied)"
            ),
            "portraitWorldRgbNow": (
                "premultiplied α Lanczos on R,G,B and separate α, unpremultiply; "
                "then clamp semi + 2px opaque ring to source 3×3 min/max per channel"
            ),
            "sixd21AlphaMatteResizeInCompose": (
                "single-channel α Lanczos to match variant size (premult N/A)"
            ),
        },
        "alpha255Share": {k: round(v, 4) for k, v in shares.items()},
        "minAlpha255Share": round(min_a255, 4),
        "alpha255ShareGate": min_a255 >= 0.9,
        "silhouetteNearWhite": sil_counts,
        "silhouetteGate": sil_ok,
        "haloBadPx": {
            k: {
                "browser": halo[k]["browser"]["bgOpaqueBand"],
                "lanczos": halo[k]["lanczos"]["bgOpaqueBand"],
            }
            for k in sorted(halo)
        },
        "haloZeroGate": halo_zero,
        "passesAllGates": passes_all,
    }


def _write_composite_manifest(slug_map: dict) -> Path:
    manifest = {"skins": {}}
    rel_base = "assets/ui/angelina-skins/.candidate-review"
    for skin_id in ["A", "B", "C"]:
        slug = slug_map[skin_id]
        manifest["skins"][skin_id] = {
            "portrait": {"path": f"{rel_base}/{slug}-portrait.webp"},
            "world": {"path": f"{rel_base}/{slug}-world.webp"},
        }
    path = CANDIDATE_DIR / "composite-manifest.json"
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
    return path


def _save_composites(manifest_path: Path, name_prefix: str) -> None:
    env = os.environ.copy()
    env["FIREBASE_EMULATOR"] = "1"
    env["ANGELINA_COMPOSITE_MANIFEST"] = str(manifest_path)
    env["ANGELINA_COMPOSITE_NAME_PREFIX"] = name_prefix
    proc = subprocess.run(
        ["node", str(ROOT / "scripts/save-angelina-browser-composites.js")],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
    )
    print(proc.stdout or "", end="")
    if proc.returncode != 0:
        print(proc.stderr or "", file=sys.stderr)
        raise SystemExit(proc.returncode)


def _save_a_world_pixel_crops(slug_map: dict) -> list[str]:
    """40×40 native crops, 8× nearest-neighbor; browser3 coords → native ÷3."""
    seeds = [(217, 1457), (541, 1940), (541, 1941)]
    from PIL import Image

    slug = slug_map["A"]
    cand_path = CANDIDATE_DIR / f"{slug}-world.webp"
    source_path = ROOT / "assets/ui/angelina-skins/source/angelina-teen-A.png"
    orig = Image.open(source_path).convert("RGBA")
    cut = build.build_cutout_from_source(orig, "A")
    world_src = build.world_variant(build.orig_rgb_with_cut_alpha(orig, cut))
    cand = Image.open(cand_path).convert("RGBA")
    cw, ch = cand.size
    sw, sh = world_src.size
    saved: list[str] = []
    half = 20
    scale_out = 8
    for i, (bx, by) in enumerate(seeds):
        cx, cy = bx // 3, by // 3
        for label, im, w, h in (
            ("candidate", cand, cw, ch),
            ("source", world_src, sw, sh),
        ):
            x0 = max(0, min(w - 40, cx - half))
            y0 = max(0, min(h - 40, cy - half))
            crop = im.crop((x0, y0, x0 + 40, y0 + 40))
            up = crop.resize((40 * scale_out, 40 * scale_out), Image.Resampling.NEAREST)
            name = f"a-world-px{i+1}-{label}-8x.png"
            out = ARTIFACTS / name
            out.parent.mkdir(parents=True, exist_ok=True)
            up.save(out)
            saved.append(str(out))
    return saved


def main() -> None:
    CANDIDATE_DIR.mkdir(parents=True, exist_ok=True)
    rel_prefix = "assets/ui/angelina-skins/.candidate-review"
    prelocks: dict = {}
    slug_map: dict = {}
    for skin_id, source_name in SOURCES.items():
        source_path = build.SOURCE_DIR / source_name
        orig = __import__("PIL").Image.open(source_path).convert("RGBA")
        cut = build.build_cutout_from_source(orig, skin_id)
        slug = source_name.replace(".png", "")
        slug_map[skin_id] = slug
        prelocks[skin_id] = {
            "portrait": build._compose_6d21_prelock(
                orig, cut, build.portrait_variant, slug, "portrait"
            )[:3],
            "world": build._compose_6d21_prelock(
                orig, cut, build.world_variant, slug, "world"
            )[:3],
        }
        print(f"{skin_id} prelock ok", flush=True)

    gates = _gate_table(prelocks, slug_map, rel_prefix)
    print("GATE_TABLE", json.dumps(gates, indent=2))

    readme = CANDIDATE_DIR / "README.md"
    readme.write_text(
        "# Angelina skin candidate review (not shipped)\n\n"
        "These WebPs are **not** referenced by `angelina-skin-manifest.json` or the game.\n\n"
        "## Parameters\n\n"
        f"- `thresh` = {THRESH}\n"
        f"- `inset` = {INSET}\n"
        "- Semi lock: `alpha_ref ∈ [0.75, 0.80)` and `dist_in ≥ 2` → α=255 + Lanczos RGB\n"
        "- Component-local greyMatt recolor (nearest core, α unchanged): "
        "A portrait/world (browser+lanczos clusters); C world (lanczos only)\n"
        "- Semi exterior decontam: **off**\n\n"
        "## Gate results\n\n"
        f"```json\n{json.dumps(gates, indent=2)}\n```\n\n"
        f"**Ship decision:** {'SHIP (all gates pass)' if gates['passesAllGates'] else 'KEEP ab6fa302 (one or more gates fail)'}\n\n"
        f"**npm ci && npm run test:life-ch1** (shipped ab6fa302): exit **1** (angelina-skin-halo.js on baseline).\n",
        encoding="utf8",
    )

    cand_manifest = _write_composite_manifest(slug_map)
    shipped_manifest = ROOT / "data/story/angelina-skin-manifest.json"
    _save_composites(cand_manifest, "candidate-review")
    _save_composites(shipped_manifest, "ab6f-shipped")

    crop_paths = _save_a_world_pixel_crops(slug_map)
    gates["artifactPaths"] = {
        "candidateComposites": [
            str(ARTIFACTS / f"candidate-review-{id_}-{kind}-browser-{bg}.png")
            for id_ in ("A", "B", "C")
            for kind in ("portrait", "world")
            for bg in ("111", "white")
        ],
        "ab6fShippedComposites": [
            str(ARTIFACTS / f"ab6f-shipped-{id_}-{kind}-browser-{bg}.png")
            for id_ in ("A", "B", "C")
            for kind in ("portrait", "world")
            for bg in ("111", "white")
        ],
        "aWorldPixelCrops8x": crop_paths,
    }
    (CANDIDATE_DIR / "gate-results.json").write_text(
        json.dumps(gates, indent=2) + "\n", encoding="utf8"
    )
    print("CANDIDATE_REVIEW_DONE", json.dumps(gates["passesAllGates"]))


if __name__ == "__main__":
    main()
