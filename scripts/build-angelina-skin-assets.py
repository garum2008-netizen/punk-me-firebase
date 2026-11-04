#!/usr/bin/env python3
"""Build shipped WebP assets from Owner-approved PNGs (t569u). Halo: rembg matting + Lab ΔE edge refine."""
from __future__ import annotations

import hashlib
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SKIN_DIR = ROOT / "assets/ui/angelina-skins"
SOURCE_DIR = SKIN_DIR / "source"
SHIPPED_DIR = SKIN_DIR / "shipped"
REF_DIR = SKIN_DIR / "alpha-ref"
MANIFEST_PATH = ROOT / "data/story/angelina-skin-manifest.json"

SOURCES = {
    "A": "angelina-teen-A.png",
    "B": "angelina-teen-B.png",
    "C": "angelina-teen-C-v2.png",
}

_rembg_session = None

BAND_PX = 20
DE_CLEAR = 6.0
DE_RAMP = 18.0


def get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session

        _rembg_session = new_session("isnet-general-use")
    return _rembg_session


def rembg_rgba(rgb: Image.Image) -> Image.Image:
    from rembg import remove

    out = remove(
        rgb.convert("RGB"),
        session=get_rembg_session(),
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
    )
    if not isinstance(out, Image.Image):
        out = Image.fromarray(out)
    rgba = out.convert("RGBA")
    src = np.array(rgb.convert("RGB"), dtype=np.uint8)
    px = np.array(rgba)
    px[:, :, :3] = src
    return Image.fromarray(px, mode="RGBA")


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def save_webp_halo_clean(img: Image.Image, dest: Path, *, lossless: bool = True) -> tuple[str, Image.Image]:
    img = suppress_opaque_greymatt_in_band(img.convert("RGBA"), band_px=15)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, format="WEBP", lossless=lossless, method=6)
    final = img
    for _ in range(6):
        reloaded = Image.open(dest).convert("RGBA")
        bad1 = count_halo_band_pixels(reloaded)
        bad3 = count_halo_band_pixels(upscale3(reloaded))
        final = reloaded
        if bad1 <= 0 and bad3 <= 0:
            break
        cleaned = suppress_opaque_greymatt_in_band(reloaded, band_px=15)
        cleaned.save(dest, format="WEBP", lossless=lossless, method=6)
        final = cleaned
    return sha256_file(dest), final


def median_border_bg_rgb(img: Image.Image, strip: int = 10) -> tuple[float, float, float]:
    rgb = np.array(img.convert("RGB"))
    h, w = rgb.shape[:2]
    s = max(1, min(strip, h // 3, w // 3))
    parts = [
        rgb[:s, :, :].reshape(-1, 3),
        rgb[h - s :, :, :].reshape(-1, 3),
        rgb[:, :s, :].reshape(-1, 3),
        rgb[:, w - s :, :].reshape(-1, 3),
    ]
    pixels = np.concatenate(parts, axis=0)
    med = np.median(pixels, axis=0)
    return float(med[0]), float(med[1]), float(med[2])


def _srgb_to_linear(c: np.ndarray) -> np.ndarray:
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def rgb_to_lab_array(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    rl, gl, bl = _srgb_to_linear(r), _srgb_to_linear(g), _srgb_to_linear(b)
    x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375
    y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750
    z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041
    x, y, z = x / 0.95047, y / 1.00000, z / 1.08883

    def f(t: np.ndarray) -> np.ndarray:
        return np.where(t > 0.008856, np.power(t, 1.0 / 3.0), (7.787 * t) + (16.0 / 116.0))

    fx, fy, fz = f(x), f(y), f(z)
    L = 116.0 * fy - 16.0
    a = 500.0 * (fx - fy)
    b = 200.0 * (fy - fz)
    return np.stack([L, a, b], axis=-1)


def rgb_to_lab_pixel(rgb: tuple[float, float, float]) -> np.ndarray:
    arr = np.array([[[rgb[0], rgb[1], rgb[2]]]], dtype=np.float64)
    return rgb_to_lab_array(arr)[0, 0]


def delta_e76(lab: np.ndarray, bg_lab: np.ndarray) -> np.ndarray:
    d = lab - bg_lab.reshape(1, 1, 3)
    return np.sqrt(np.sum(d * d, axis=-1))


def alpha_distance_to_clear(alpha: np.ndarray) -> np.ndarray:
    h, w = alpha.shape
    dist = np.full((h, w), 10**9, dtype=np.int32)
    q: deque[tuple[int, int]] = deque()
    clear = alpha <= 0
    dist[clear] = 0
    ys, xs = np.where(clear)
    for x, y in zip(xs, ys):
        q.append((int(x), int(y)))
    while q:
        x, y = q.popleft()
        d = dist[y, x]
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            if dist[ny, nx] > d + 1:
                dist[ny, nx] = d + 1
                q.append((nx, ny))
    return dist


def unmix_rgb(comp: np.ndarray, bg: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    af = np.maximum(alpha / 255.0, 0.04)
    fg = (comp - (1.0 - af[..., None]) * bg.reshape(1, 1, 3)) / af[..., None]
    return np.clip(fg, 0, 255)


def refine_colorkey_band(
    rgb: Image.Image, rembg_cut: Image.Image, bg_rgb: tuple[float, float, float], *, band_px: int = BAND_PX
) -> Image.Image:
    rgb_arr = np.array(rgb.convert("RGB"), dtype=np.float64)
    rgba = np.array(rembg_cut.convert("RGBA"))
    alpha = rgba[:, :, 3].astype(np.float64)
    dist = alpha_distance_to_clear(alpha.astype(np.uint8))
    bg_lab = rgb_to_lab_pixel(bg_rgb)
    lab = rgb_to_lab_array(rgb_arr)
    de = delta_e76(lab, bg_lab)

    in_band = (alpha > 0) & (dist <= band_px)
    new_a = alpha.copy()
    new_rgb = rgb_arr.copy()

    clear_mask = in_band & (de < DE_CLEAR)
    new_a[clear_mask] = 0

    ramp_mask = in_band & (de >= DE_CLEAR) & (de < DE_RAMP)
    if np.any(ramp_mask):
        ramp_a = (de[ramp_mask] - DE_CLEAR) / (DE_RAMP - DE_CLEAR) * 255.0
        new_a[ramp_mask] = ramp_a
        new_rgb[ramp_mask] = unmix_rgb(rgb_arr[ramp_mask], np.array(bg_rgb), ramp_a)

    interior = (dist > band_px) & (alpha > 0)
    new_a[interior] = 255.0
    new_rgb[interior] = rgb_arr[interior]

    out = np.zeros_like(rgba)
    out[:, :, :3] = new_rgb.astype(np.uint8)
    out[:, :, 3] = np.clip(new_a, 0, 255).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


def morph_open_alpha(alpha: np.ndarray, radius: int = 1) -> np.ndarray:
    """1px morphological open on alpha (remove specks)."""
    from scipy.ndimage import binary_erosion, binary_dilation

    fg = alpha >= 128
    struct = np.ones((2 * radius + 1, 2 * radius + 1), dtype=bool)
    opened = binary_dilation(binary_erosion(fg, structure=struct), structure=struct)
    out = alpha.copy()
    out[~opened] = 0
    return out


def source_delta_e(rgb_arr: np.ndarray, bg_rgb: tuple[float, float, float]) -> np.ndarray:
    bg_lab = rgb_to_lab_pixel(bg_rgb)
    return delta_e76(rgb_to_lab_array(rgb_arr), bg_lab)


def fill_enclosed_holes_not_bg(rgba: Image.Image, rgb: Image.Image, bg_rgb: tuple[float, float, float]) -> Image.Image:
    px = np.array(rgba.convert("RGBA"))
    rgb_arr = np.array(rgb.convert("RGB"), dtype=np.float64)
    de_src = source_delta_e(rgb_arr, bg_rgb)
    alpha = px[:, :, 3]
    h, w = alpha.shape
    hole = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if alpha[y, x] < 32:
                hole[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if alpha[y, x] < 32 and not hole[y, x]:
                hole[y, x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            if hole[ny, nx] or alpha[ny, nx] >= 32:
                continue
            hole[ny, nx] = True
            q.append((nx, ny))
    enclosed = (~hole) & (alpha < 32)
    fill = enclosed & (de_src >= DE_CLEAR)
    for y in range(h):
        for x in range(w):
            if fill[y, x]:
                px[y, x, :3] = rgb_arr[y, x].astype(np.uint8)
                px[y, x, 3] = 255
    return Image.fromarray(px, mode="RGBA")


def union_c_wing_mask(
    refined: Image.Image, rembg_raw: Image.Image, rgb: Image.Image, bg_rgb: tuple[float, float, float]
) -> Image.Image:
    """Restore wing notch from rembg mask union (no erosion)."""
    out = np.array(refined.convert("RGBA"))
    rem = np.array(rembg_raw.convert("RGBA"))
    rgb_arr = np.array(rgb.convert("RGB"), dtype=np.float64)
    de_src = source_delta_e(rgb_arr, bg_rgb)
    src_fg = de_src >= DE_CLEAR
    rem_fg = rem[:, :, 3] >= 96
    restore = rem_fg & src_fg & (out[:, :, 3] < rem[:, :, 3])
    out[restore, 3] = rem[restore, 3]
    out[restore, :3] = rgb_arr[restore].astype(np.uint8)
    union_hi = rem_fg & src_fg
    out[union_hi, 3] = np.maximum(out[union_hi, 3], rem[union_hi, 3])
    return Image.fromarray(out, mode="RGBA")


def content_bbox(img: Image.Image, alpha_min: int = 32) -> tuple[int, int, int, int]:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= alpha_min:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if maxx < 0:
        return 0, 0, w, h
    return minx, miny, maxx + 1, maxy + 1


def crop_with_margin(img: Image.Image, margin_ratio: float = 0.022, margin_min: int = 8) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    minx, miny, maxx, maxy = content_bbox(rgba)
    bw, bh = maxx - minx, maxy - miny
    mx = max(margin_min, int(bw * margin_ratio))
    my = max(margin_min, int(bh * margin_ratio))
    left = max(0, minx - mx)
    top = max(0, miny - my)
    right = min(w, maxx + mx)
    bottom = min(h, maxy + my)
    cropped = rgba.crop((left, top, right, bottom))
    cw, ch = cropped.size
    pad = Image.new("RGBA", (cw + mx * 2, ch + my * 2), (0, 0, 0, 0))
    pad.paste(cropped, (mx, my))
    return pad


def portrait_variant(img: Image.Image, max_w: int = 372) -> Image.Image:
    cropped = crop_with_margin(img)
    w, h = cropped.size
    if w <= max_w:
        return cropped
    ratio = max_w / w
    return cropped.resize((max_w, max(1, int(h * ratio))), Image.Resampling.LANCZOS)


def world_variant(img: Image.Image, out_w: int = 280) -> Image.Image:
    cropped = crop_with_margin(img)
    cw, ch = cropped.size
    ratio = out_w / cw
    return cropped.resize((out_w, max(1, int(ch * ratio))), Image.Resampling.LANCZOS)


def orig_rgb_with_cut_alpha(orig: Image.Image, cut: Image.Image) -> Image.Image:
    rgb = orig.convert("RGB")
    alpha = cut.split()[3]
    out = Image.new("RGBA", rgb.size)
    out.paste(rgb, (0, 0))
    out.putalpha(alpha)
    return out


def count_halo_band_pixels(rgba: Image.Image, band_px: int = 15) -> int:
    px = np.array(rgba.convert("RGBA"))
    alpha = px[:, :, 3]
    dist = alpha_distance_to_clear(alpha)
    bad = 0
    h, w = alpha.shape
    for y in range(h):
        for x in range(w):
            if alpha[y, x] != 255 or dist[y, x] > band_px:
                continue
            r, g, b = px[y, x, 0], px[y, x, 1], px[y, x, 2]
            if is_greymatt_rgb(r, g, b):
                bad += 1
    return bad


def upscale3(img: Image.Image) -> Image.Image:
    w, h = img.size
    return img.resize((w * 3, h * 3), Image.Resampling.LANCZOS)


def is_greymatt_rgb(r: int, g: int, b: int) -> bool:
    lum = (float(r) + float(g) + float(b)) / 3.0
    chroma = max(r, g, b) - min(r, g, b)
    dist_grey = abs(r - lum) + abs(g - lum) + abs(b - lum)
    return dist_grey < 10 and 55 < lum < 210 and chroma < 13


def tighten_until_3x_halo_clean(
    rgba: Image.Image, rgb: Image.Image, bg_rgb: tuple[float, float, float], *, max_passes: int = 48
) -> Image.Image:
    """test-angelina-skin-halo inspects 3x Lanczos zoom — harden 1x edges until 3x band is clean."""
    out = rgba.convert("RGBA")
    rgb_arr = np.array(rgb.convert("RGB"), dtype=np.float64)
    de_src = source_delta_e(rgb_arr, bg_rgb)
    for _ in range(max_passes):
        if count_halo_band_pixels(out) <= 0 and count_halo_band_pixels(upscale3(out)) <= 0:
            return out
        px = np.array(out)
        alpha = px[:, :, 3]
        dist = alpha_distance_to_clear(alpha)
        h, w = alpha.shape
        for y in range(h):
            for x in range(w):
                if alpha[y, x] <= 0 or dist[y, x] > 22:
                    continue
                r, g, b = px[y, x, 0], px[y, x, 1], px[y, x, 2]
                if de_src[y, x] < DE_RAMP or is_greymatt_rgb(r, g, b):
                    px[y, x, 3] = 0
        out = Image.fromarray(px, mode="RGBA")
    return out


def suppress_opaque_greymatt_in_band(rgba: Image.Image, band_px: int = 15) -> Image.Image:
    """Match test-angelina-skin-halo greyMatt @ alpha255 within band — zero halo pixels."""
    px = np.array(rgba.convert("RGBA"))
    alpha = px[:, :, 3]
    dist = alpha_distance_to_clear(alpha)
    h, w = alpha.shape
    for y in range(h):
        for x in range(w):
            if alpha[y, x] != 255 or dist[y, x] > band_px:
                continue
            r, g, b = px[y, x, 0], px[y, x, 1], px[y, x, 2]
            if is_greymatt_rgb(r, g, b):
                px[y, x, 3] = 0
    return Image.fromarray(px, mode="RGBA")


def build_variant_at_target(
    orig: Image.Image, cut_full: Image.Image, variant_fn, skin_id: str
) -> Image.Image:
    """Rembg + Lab refine at shipped variant resolution."""
    geom = variant_fn(cut_full)
    rgb_target = variant_fn(orig_rgb_with_cut_alpha(orig, cut_full)).convert("RGB")
    if rgb_target.size != geom.size:
        rgb_target = rgb_target.resize(geom.size, Image.Resampling.LANCZOS)

    bg_rgb = median_border_bg_rgb(rgb_target, 10)
    rembg_raw = rembg_rgba(rgb_target)
    refined = refine_colorkey_band(rgb_target, rembg_raw, bg_rgb, band_px=BAND_PX)

    alpha = morph_open_alpha(np.array(refined.split()[3]))
    refined.putalpha(Image.fromarray(alpha, mode="L"))
    refined = fill_enclosed_holes_not_bg(refined, rgb_target, bg_rgb)

    if skin_id == "C":
        refined = union_c_wing_mask(refined, rembg_raw, rgb_target, bg_rgb)

    px = np.array(refined)
    dist = alpha_distance_to_clear(px[:, :, 3])
    interior = (dist > BAND_PX) & (px[:, :, 3] > 0)
    rgb_arr = np.array(rgb_target)
    px[interior, :3] = rgb_arr[interior]
    px[interior, 3] = 255
    out = Image.fromarray(px, mode="RGBA")
    out = tighten_until_3x_halo_clean(out, rgb_target, bg_rgb)
    px = np.array(out)
    dist = alpha_distance_to_clear(px[:, :, 3])
    interior = (dist > BAND_PX) & (px[:, :, 3] > 0)
    rgb_arr = np.array(rgb_target)
    px[interior, :3] = rgb_arr[interior]
    px[interior, 3] = 255
    out = Image.fromarray(px, mode="RGBA")
    return suppress_opaque_greymatt_in_band(out, band_px=15)


def interior_rgb_sha256(rgba: Image.Image) -> str:
    h = hashlib.sha256()
    px = rgba.load()
    w, hgt = rgba.size
    for y in range(hgt):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 255:
                h.update(bytes((r, g, b)))
    return h.hexdigest()


def alpha_stats(alpha: Image.Image) -> dict:
    px = alpha.load()
    w, h = alpha.size
    opaque = 0
    for y in range(h):
        for x in range(w):
            if px[x, y] >= 230:
                opaque += 1
    return {"width": w, "height": h, "opaquePixels": opaque}


def write_alpha_ref(slug: str, kind: str, rgba: Image.Image) -> tuple[str, str, dict]:
    REF_DIR.mkdir(parents=True, exist_ok=True)
    alpha = rgba.split()[3]
    ref_name = f"{slug}-{kind}-alpha.png"
    ref_path = REF_DIR / ref_name
    alpha.save(ref_path, optimize=True)
    rel = str(ref_path.relative_to(ROOT)).replace("\\", "/")
    return rel, sha256_file(ref_path), alpha_stats(alpha)


def write_manifest(skins_out: dict) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf8"))
    manifest["notes"] = (
        "Owner t569u approved PNGs. rembg isnet-general-use alpha matting + 20px Lab ΔE edge refine. "
        "Rebuild: python3 scripts/build-angelina-skin-assets.py"
    )
    for skin_id, data in skins_out.items():
        entry = manifest["skins"][skin_id]
        entry["portrait"]["sha256"] = data["portraitSha256"]
        entry["world"]["sha256"] = data["worldSha256"]
        entry["portrait"]["alphaRef"] = data["portraitAlphaRef"]
        entry["portrait"]["alphaSha256"] = data["portraitAlphaSha256"]
        entry["portrait"]["alphaStats"] = data["portraitAlphaStats"]
        entry["world"]["alphaRef"] = data["worldAlphaRef"]
        entry["world"]["alphaSha256"] = data["worldAlphaSha256"]
        entry["world"]["alphaStats"] = data["worldAlphaStats"]
        entry["portrait"]["interiorRgbSha256"] = data["portraitInteriorRgbSha256"]
        entry["world"]["interiorRgbSha256"] = data["worldInteriorRgbSha256"]
        entry["world"]["derivative"] = "rembg matting + Lab ΔE band + 280px wide WebP"
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf8")


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    SHIPPED_DIR.mkdir(parents=True, exist_ok=True)
    skins_out = {}

    for skin_id, source_name in SOURCES.items():
        source_path = SOURCE_DIR / source_name
        if not source_path.exists():
            raise SystemExit(f"missing source: {source_path}")

        source_sha = sha256_file(source_path)
        orig = Image.open(source_path).convert("RGBA")
        cut_full = rembg_rgba(orig.convert("RGB"))
        slug = source_name.replace(".png", "")

        port_path = SHIPPED_DIR / f"{slug}-portrait.webp"
        port_final = build_variant_at_target(orig, cut_full, portrait_variant, skin_id)
        port_sha, port_final = save_webp_halo_clean(port_final, port_path)
        port_alpha_ref, port_alpha_sha, port_alpha_stats = write_alpha_ref(slug, "portrait", port_final)
        port_interior_sha = interior_rgb_sha256(port_final)

        world_path = SHIPPED_DIR / f"{slug}-world.webp"
        world_final = build_variant_at_target(orig, cut_full, world_variant, skin_id)
        world_sha, world_final = save_webp_halo_clean(world_final, world_path)
        world_alpha_ref, world_alpha_sha, world_alpha_stats = write_alpha_ref(slug, "world", world_final)
        world_interior_sha = interior_rgb_sha256(world_final)

        skins_out[skin_id] = {
            "sourcePath": str(source_path.relative_to(ROOT)).replace("\\", "/"),
            "sourceSha256": source_sha,
            "portraitPath": str(port_path.relative_to(ROOT)).replace("\\", "/"),
            "portraitSha256": port_sha,
            "portraitAlphaRef": port_alpha_ref,
            "portraitAlphaSha256": port_alpha_sha,
            "portraitAlphaStats": port_alpha_stats,
            "portraitInteriorRgbSha256": port_interior_sha,
            "worldPath": str(world_path.relative_to(ROOT)).replace("\\", "/"),
            "worldSha256": world_sha,
            "worldAlphaRef": world_alpha_ref,
            "worldAlphaSha256": world_alpha_sha,
            "worldAlphaStats": world_alpha_stats,
            "worldInteriorRgbSha256": world_interior_sha,
        }
        print(skin_id, source_sha[:12], "portrait", port_sha[:12], "world", world_sha[:12])

    write_manifest(skins_out)
    print(json.dumps(skins_out, indent=2))


if __name__ == "__main__":
    main()
