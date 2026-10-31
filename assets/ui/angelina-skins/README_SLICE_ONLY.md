# Angelina teen skins — vertical slice ONLY (t569u)

**Owner-approved art.** These files are for the **life-ch1 vertical slice** branch and local preview only.

## Forbidden without separate Owner GO

- Public marketing, Buffer, GitHub Pages, production Firebase hosting, or any **promo** use
- Referencing these paths from `index.html` landing copy, subscribe pages, or social posts

## Files

| Role | Location |
|------|----------|
| Source PNG (checksum = Owner upload) | `source/angelina-teen-A.png`, `-B.png`, `-C-v2.png` |
| Wardrobe + dialogue | `shipped/*-portrait.webp` |
| In-world billboard | `shipped/*-world.webp` (crop + downscale derivative only) |

**Never use:** `angelina-teen-C.png` (v1 guitar).

Manifest: `data/story/angelina-skin-manifest.json` (source + shipped sha256).

Rebuild shipped WebP after source change:

```bash
python3 scripts/build-angelina-skin-assets.py
```
