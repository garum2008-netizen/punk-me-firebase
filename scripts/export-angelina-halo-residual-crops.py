#!/usr/bin/env python3
"""Highlight residual halo-band pixels (3x, same metric as test) for walkthrough."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/story/angelina-skin-manifest.json"
OUT = Path("/opt/cursor/artifacts/angelina-halo-residual-3x")


def is_greymatt(r, g, b) -> bool:
    lum = (r + g + b) / 3.0
    chroma = max(r, g, b) - min(r, g, b)
    dg = abs(r - lum) + abs(g - lum) + abs(b - lum)
    return dg < 10 and 55 < lum < 210 and chroma < 13


def alpha_distance_to_clear(alpha: np.ndarray) -> np.ndarray:
    h, w = alpha.shape
    dist = np.full((h, w), 10**9, dtype=np.int32)
    q: list[tuple[int, int]] = []
    for y in range(h):
        for x in range(w):
            if alpha[y, x] <= 0:
                dist[y, x] = 0
                q.append((x, y))
    qi = 0
    while qi < len(q):
        x, y = q[qi]
        qi += 1
        d = dist[y, x]
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            if dist[ny, nx] > d + 1:
                dist[ny, nx] = d + 1
                q.append((nx, ny))
    return dist


def composite_bg(rgba: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    base = Image.new("RGB", rgba.size, bg)
    base.paste(rgba, mask=rgba.split()[3])
    return base


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding="utf8"))
    summary = []
    for skin_id in ["A", "B", "C"]:
        for kind in ("portrait", "world"):
            rel = manifest["skins"][skin_id][kind]["path"]
            src = Image.open(ROOT / rel).convert("RGBA")
            w, h = src.size
            up = src.resize((w * 3, h * 3), Image.Resampling.LANCZOS)
            px = np.array(up)
            alpha = px[:, :, 3]
            dist = alpha_distance_to_clear(alpha)
            bad = np.zeros(alpha.shape, dtype=bool)
            count = 0
            for y in range(alpha.shape[0]):
                for x in range(alpha.shape[1]):
                    if alpha[y, x] != 255 or dist[y, x] > 15:
                        continue
                    r, g, b = px[y, x, 0], px[y, x, 1], px[y, x, 2]
                    if is_greymatt(r, g, b):
                        bad[y, x] = True
                        count += 1
            summary.append((skin_id, kind, count))
            if count == 0:
                continue
            mark = px.copy()
            mark[bad, 0] = 255
            mark[bad, 1] = 0
            mark[bad, 2] = 128
            marked = Image.fromarray(mark, mode="RGBA")
            ys, xs = np.where(bad)
            y0, y1 = max(0, ys.min() - 40), min(up.height, ys.max() + 40)
            x0, x1 = max(0, xs.min() - 40), min(up.width, xs.max() + 40)
            crop = marked.crop((x0, y0, x1, y1))
            for tag, bg in (("111", (17, 17, 17)), ("white", (255, 255, 255))):
                comp = composite_bg(crop, bg)
                path = OUT / f"residual-{skin_id}-{kind}-3x-{tag}.png"
                comp.save(path)
                print("wrote", path, "bad_px", count)
    print("RESIDUAL_SUMMARY", summary)


if __name__ == "__main__":
    main()
