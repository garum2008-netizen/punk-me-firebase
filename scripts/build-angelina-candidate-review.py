#!/usr/bin/env python3
"""Ablation + best-row candidate review bundle (not shipped)."""
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
VariantResizeSettings = build.VariantResizeSettings

ABLATION_ROWS: list[tuple[str, build.VariantResizeSettings, bool, str]] = [
    (
        "R1",
        VariantResizeSettings(premultiplied=False, clamp="none"),
        False,
        "Reference: straight RGBA Lanczos; no clamp; no lum≥60 nearest-core",
    ),
    (
        "R2",
        VariantResizeSettings(premultiplied=True, clamp="none"),
        False,
        "Premultiplied Lanczos only",
    ),
    (
        "R3",
        VariantResizeSettings(premultiplied=True, clamp="none"),
        True,
        "R2 + nearest-core ignores core lum<60 when source lum≥60",
    ),
    (
        "R4",
        VariantResizeSettings(premultiplied=True, clamp="semi"),
        False,
        "R2 + clamp semi pixels only (no α=255 ring)",
    ),
]


def _build_prelocks() -> tuple[dict, dict[str, str]]:
    prelocks: dict = {}
    slug_map: dict[str, str] = {}
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
        print(f"  {skin_id} prelock ok", flush=True)
    return prelocks, slug_map


def _gate_table(
    prelocks: dict,
    slug_map: dict[str, str],
    rel_prefix: str,
    row_id: str,
    row_desc: str,
    resize: build.VariantResizeSettings,
    lum60: bool,
) -> dict:
    final_images: dict[tuple[str, str], object] = {}
    shares: dict[str, float] = {}
    halo: dict[str, dict] = {}
    import numpy as np

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
            build.save_webp(img, ROOT / rel, lossless=True)
            final_images[(skin_id, kind)] = img
            shares[f"{skin_id}_{kind}"] = build._alpha255_share(
                np.array(img.convert("RGBA"))
            )
            halo[f"{skin_id}_{kind}"] = build._measure_halo(rel)

    sil_ok, sil_counts = build._silhouette_limits_ok(final_images)
    min_a255 = min(shares.values())
    halo_bad = {
        k: {
            "browser": halo[k]["browser"]["bgOpaqueBand"],
            "lanczos": halo[k]["lanczos"]["bgOpaqueBand"],
        }
        for k in sorted(halo)
    }
    halo_zero = all(v["browser"] == 0 and v["lanczos"] == 0 for v in halo_bad.values())
    passes_all = halo_zero and sil_ok and min_a255 >= 0.9
    halo_total = sum(v["browser"] + v["lanczos"] for v in halo_bad.values())
    return {
        "row": row_id,
        "description": row_desc,
        "reviewConfig": {
            "thresh": THRESH,
            "inset": INSET,
            "semiLockBand": True,
            "componentHaloFix": True,
            "semiExteriorDecontam": False,
        },
        "resize": {
            "premultipliedLanczos": resize.premultiplied,
            "clamp": resize.clamp,
        },
        "nearestCoreFilterLum60": lum60,
        "alpha255Share": {k: round(v, 4) for k, v in shares.items()},
        "minAlpha255Share": round(min_a255, 4),
        "alpha255ShareGate": min_a255 >= 0.9,
        "silhouetteNearWhite": sil_counts,
        "silhouetteGate": sil_ok,
        "haloBadPx": halo_bad,
        "haloTotalBadPx": halo_total,
        "haloZeroGate": halo_zero,
        "passesAllGates": passes_all,
    }


def _score_row(row: dict) -> tuple:
    if row["passesAllGates"]:
        return (0, 0, 0)
    return (1, row["haloTotalBadPx"], -row["minAlpha255Share"])


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
    for i, (bx, by) in enumerate(seeds):
        cx, cy = bx // 3, by // 3
        for label, im, w, h in (
            ("candidate", cand, cw, ch),
            ("source", world_src, sw, sh),
        ):
            x0 = max(0, min(w - 40, cx - half))
            y0 = max(0, min(h - 40, cy - half))
            crop = im.crop((x0, y0, x0 + 40, y0 + 40))
            up = crop.resize((320, 320), Image.Resampling.NEAREST)
            name = f"a-world-px{i + 1}-{label}-8x.png"
            out = ARTIFACTS / name
            out.parent.mkdir(parents=True, exist_ok=True)
            up.save(out)
            saved.append(str(out))
    return saved


def _format_table(row: dict) -> str:
    lines = [
        f"### {row['row']} — {row['description']}",
        "",
        "| Variant | α=255 share | Sil NW | Halo browser | Halo lanczos |",
        "|---------|-------------|--------|--------------|--------------|",
    ]
    for key in sorted(row["alpha255Share"]):
        sh = row["alpha255Share"][key]
        sil = row["silhouetteNearWhite"][key]
        hb = row["haloBadPx"][key]["browser"]
        hl = row["haloBadPx"][key]["lanczos"]
        lines.append(f"| {key} | {sh:.2%} | {sil} | {hb} | {hl} |")
    lines.append("")
    min_a = row["minAlpha255Share"]
    a255_ok = row.get("alpha255ShareGate", min_a >= 0.9)
    sil_ok = row.get("silhouetteGate", True)
    halo_ok = row.get("haloZeroGate", False)
    all_ok = row.get("passesAllGates", False)
    total = row.get("haloTotalBadPx", "?")
    lines.append(
        f"Gates: minα={min_a:.4f} ({'PASS' if a255_ok else 'FAIL'}), "
        f"silhouette ({'PASS' if sil_ok else 'FAIL'}), "
        f"haloZero ({'PASS' if halo_ok else 'FAIL'}), "
        f"**all ({'PASS' if all_ok else 'FAIL'})** (haloTotal={total})"
    )
    return "\n".join(lines)


def main() -> None:
    CANDIDATE_DIR.mkdir(parents=True, exist_ok=True)
    rel_prefix = "assets/ui/angelina-skins/.candidate-review"
    ablation_path = CANDIDATE_DIR / "ablation-results.json"

    if os.environ.get("ANGELINA_FINALIZE_BEST") == "1" and ablation_path.exists():
        data = json.loads(ablation_path.read_text(encoding="utf8"))
        ablation = data["rows"]
        best = next(r for r in ablation if r["row"] == data["bestRow"])
    else:
        ablation = _run_ablation(rel_prefix)
        best = min(ablation, key=_score_row)
        (CANDIDATE_DIR / "ablation-results.json").write_text(
            json.dumps({"rows": ablation, "bestRow": best["row"]}, indent=2) + "\n",
            encoding="utf8",
        )

    print(f"BEST_ROW {best['row']}", flush=True)
    _finalize_best_row(best, ablation, rel_prefix)


def _run_ablation(rel_prefix: str) -> list[dict]:
    ablation: list[dict] = []
    for row_id, resize, lum60, desc in ABLATION_ROWS:
        print(f"=== {row_id} {desc} ===", flush=True)
        build.VARIANT_RESIZE = resize
        build.NEAREST_CORE_FILTER_LUM60 = lum60
        prelocks, slug_map = _build_prelocks()
        row = _gate_table(prelocks, slug_map, rel_prefix, row_id, desc, resize, lum60)
        ablation.append(row)
        print(f"{row_id}_GATES", json.dumps(row, indent=2))
        print(_format_table(row), flush=True)
    return ablation


def _finalize_best_row(best: dict, ablation: list[dict], rel_prefix: str) -> None:
    build.VARIANT_RESIZE = VariantResizeSettings(
        premultiplied=best["resize"]["premultipliedLanczos"],
        clamp=best["resize"]["clamp"],
    )
    build.NEAREST_CORE_FILTER_LUM60 = best["nearestCoreFilterLum60"]
    print(f"=== Rebuild .candidate-review as {best['row']} ===", flush=True)
    prelocks, slug_map = _build_prelocks()
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
            build.save_webp(img, ROOT / rel, lossless=True)

    final_gates = dict(best)
    final_gates["ablationBestRow"] = best["row"]
    final_gates["ablationRows"] = [r["row"] for r in ablation]
    ship = final_gates.get("passesAllGates", False)
    readme = CANDIDATE_DIR / "README.md"
    md_parts = [
        "# Angelina skin candidate review (not shipped)\n",
        "WebPs are **not** in `angelina-skin-manifest.json` or the game.\n",
        "## Ablation (review config: thresh 0.80, inset 1, semi band, CC fix)\n",
    ]
    for row in ablation:
        md_parts.append(_format_table(row))
        md_parts.append("")
    md_parts.extend(
        [
            f"## Selected for `.candidate-review/` bundle: **{best['row']}**\n",
            f"```json\n{json.dumps(final_gates, indent=2)}\n```\n",
            f"**Ship decision:** {'SHIP (all gates pass)' if ship else 'KEEP ab6fa302'}\n",
        ]
    )
    readme.write_text("\n".join(md_parts), encoding="utf8")

    cand_manifest = _write_composite_manifest(slug_map)
    _save_composites(cand_manifest, "candidate-review")
    _save_composites(ROOT / "data/story/angelina-skin-manifest.json", "ab6f-shipped")
    crop_paths = _save_a_world_pixel_crops(slug_map)
    final_gates["artifactPaths"] = {
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
        json.dumps(final_gates, indent=2) + "\n", encoding="utf8",
    )
    print("CANDIDATE_REVIEW_DONE", json.dumps({"ship": ship, "best": best["row"]}))


if __name__ == "__main__":
    main()
