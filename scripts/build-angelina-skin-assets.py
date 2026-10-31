#!/usr/bin/env python3
"""Build shipped WebP assets from Owner-approved source PNGs (t569u). No AI — resize/crop only."""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
UPLOADS = Path("/home/ubuntu/.cursor/projects/workspace/uploads")
SKIN_DIR = ROOT / "assets/ui/angelina-skins"
SOURCE_DIR = SKIN_DIR / "source"
SHIPPED_DIR = SKIN_DIR / "shipped"

SOURCES = {
    "A": ("angelina-teen-A_f95c.png", "angelina-teen-A.png"),
    "B": ("angelina-teen-B_f631.png", "angelina-teen-B.png"),
    "C": ("angelina-teen-C-v2_b69c.png", "angelina-teen-C-v2.png"),
}


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def save_webp(img: Image.Image, dest: Path, quality: int = 86) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    img.save(dest, format="WEBP", quality=quality, method=6)
    return sha256_file(dest)


def apply_white_key(img: Image.Image, threshold: int = 248) -> Image.Image:
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
    return rgba


def portrait_variant(img: Image.Image, max_w: int = 372) -> Image.Image:
    w, h = img.size
    if w <= max_w:
        return apply_white_key(img)
    ratio = max_w / w
    return apply_white_key(img.resize((max_w, int(h * ratio)), Image.Resampling.LANCZOS))


def world_variant(img: Image.Image, out_w: int = 256) -> Image.Image:
    """Upper-body crop + downscale for in-world sprite (derivative of approved art only)."""
    w, h = img.size
    left = int(w * 0.12)
    right = int(w * 0.88)
    top = int(h * 0.02)
    bottom = int(h * 0.58)
    cropped = img.crop((left, top, right, bottom))
    cw, ch = cropped.size
    ratio = out_w / cw
    return apply_white_key(cropped.resize((out_w, max(1, int(ch * ratio))), Image.Resampling.LANCZOS))


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    SHIPPED_DIR.mkdir(parents=True, exist_ok=True)
    skins_out = {}

    for skin_id, (upload_name, source_name) in SOURCES.items():
        src_upload = UPLOADS / upload_name
        if not src_upload.exists():
            src_upload = UPLOADS / source_name
        source_path = SOURCE_DIR / source_name
        if not source_path.exists():
            if not src_upload.exists():
                raise SystemExit(f"missing source: {source_name}")
            shutil.copy2(src_upload, source_path)
        source_sha = sha256_file(source_path)

        img = Image.open(source_path).convert("RGB")
        slug = source_name.replace(".png", "")

        port_path = SHIPPED_DIR / f"{slug}-portrait.webp"
        port_sha = save_webp(portrait_variant(img), port_path)

        world_path = SHIPPED_DIR / f"{slug}-world.webp"
        world_sha = save_webp(world_variant(img), world_path, quality=82)

        skins_out[skin_id] = {
            "sourcePath": str(source_path.relative_to(ROOT)).replace("\\", "/"),
            "sourceSha256": source_sha,
            "portraitPath": str(port_path.relative_to(ROOT)).replace("\\", "/"),
            "portraitSha256": port_sha,
            "worldPath": str(world_path.relative_to(ROOT)).replace("\\", "/"),
            "worldSha256": world_sha,
        }
        print(skin_id, source_sha[:12], "portrait", port_sha[:12], "world", world_sha[:12])

    print(json.dumps(skins_out, indent=2))


if __name__ == "__main__":
    main()
