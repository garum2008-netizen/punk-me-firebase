# Avatar asset inventory (t204u audit)

## Shipped 3D heroes (Meshy, CC BY)

| Mesh id | Use in creator |
|---------|----------------|
| `vienna` | `body_vienna`, `body_compact` |
| `mohawk` | `body_mohawk`, `body_tall` |
| `cobalt` | `body_cobalt` |
| `razor` | `body_razor` |

GLB under `assets/models/meshy/`. Procedural colors via `character-rig` / `meshy-punk.mjs`.

## Companion Angelina (2D)

| Skin | Paths |
|------|--------|
| A, B, C-v2 | `data/story/angelina-skin-manifest.json` → `assets/ui/angelina-skins/shipped/` |

**t204u:** used for **companion** dialogs/guide/wardrobe — **not** player replacement.

## Catalog-only (no dedicated mesh yet)

- 15 hair style IDs → map to `mohawk` / `spikes` procedural only.
- Accessories `wings_01`, `backpack_01`, etc. → material/flag until attachment rig lands.
- 8 face presets → story/UI labels only.

## Missing for Roblox-level parity

- Unique hair meshes per style, UGC attachments, face morph targets, separate clothing meshes, dye regions, VFX auras (premium packs).
