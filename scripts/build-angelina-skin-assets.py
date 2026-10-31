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


def apply_alpha_cutout(img: Image.Image, tolerance: int = 28) -> Image.Image:
    """Flood-remove background connected to corners (matches corner gray, not only pure white)."""
    from collections import deque

    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    corner_refs = [
        px[0, 0][:3],
        px[w - 1, 0][:3],
        px[0, h - 1][:3],
        px[w - 1, h - 1][:3],
    ]

    def bg(r: int, g: int, b: int) -> bool:
        for cr, cg, cb in corner_refs:
            if max(abs(r - cr), abs(g - cg), abs(b - cb)) <= tolerance:
                return True
        return False

    seen = bytearray(w * h)
    q = deque()

    def push(x: int, y: int) -> None:
        i = y * w + x
        if seen[i]:
            return
        r, g, b, _a = px[x, y]
        if not bg(r, g, b):
            return
        seen[i] = 1
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
        if x > 0:
            push(x - 1, y)
        if x + 1 < w:
            push(x + 1, y)
        if y > 0:
            push(x, y - 1)
        if y + 1 < h:
            push(x, y + 1)

    return rgba


def portrait_variant(img: Image.Image, max_w: int = 372) -> Image.Image:
    w, h = img.size
    if w <= max_w:
        return img
    ratio = max_w / w
    return img.resize((max_w, int(h * ratio)), Image.Resampling.LANCZOS)


def world_variant(img: Image.Image, out_w: int = 256) -> Image.Image:
    """Upper-body crop + downscale for in-world sprite (derivative of approved art only)."""
    w, h = img.size
    left = int(w * 0.08)
    right = int(w * 0.92)
    top = 0
    bottom = int(h * 0.62)
    cropped = img.crop((left, top, right, bottom))
    cw, ch = cropped.size
    ratio = out_w / cw
    return cropped.resize((out_w, max(1, int(ch * ratio))), Image.Resampling.LANCZOS)


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

        cut = apply_alpha_cutout(Image.open(source_path).convert("RGBA"))
        slug = source_name.replace(".png", "")

        port_path = SHIPPED_DIR / f"{slug}-portrait.webp"
        port_sha = save_webp(portrait_variant(cut), port_path)

        world_path = SHIPPED_DIR / f"{slug}-world.webp"
        world_sha = save_webp(world_variant(cut), world_path, quality=82)

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
