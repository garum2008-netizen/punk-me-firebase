#!/usr/bin/env python3
"""Export 3x zoom composites of shipped skins on #111 and white (halo walkthrough)."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/story/angelina-skin-manifest.json"
ARTIFACTS = Path("/opt/cursor/artifacts/angelina-halo-3x")
BGS = {"111": (17, 17, 17), "white": (255, 255, 255)}


def composite_on_bg(rgba: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    base = Image.new("RGB", rgba.size, bg)
    base.paste(rgba, mask=rgba.split()[3])
    return base


def main() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    for skin_id in ["A", "B", "C"]:
        for kind in ("portrait", "world"):
            rel = manifest["skins"][skin_id][kind]["path"]
            shipped = Image.open(ROOT / rel).convert("RGBA")
            w, h = shipped.size
            zoom = shipped.resize((w * 3, h * 3), Image.Resampling.LANCZOS)
            for tag, bg in BGS.items():
                comp = composite_on_bg(zoom, bg)
                out = ARTIFACTS / f"angelina-{skin_id}-{kind}-3x-{tag}.png"
                comp.save(out, optimize=True)
                print("wrote", out)
    print("export-angelina-halo-zoom-artifacts: PASS", str(ARTIFACTS))


if __name__ == "__main__":
    main()
