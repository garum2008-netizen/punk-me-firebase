# Public serving audit (Life Ch1 slice branch)

Firebase Hosting (`firebase.json`) serves the repo root `.` except ignored paths. **This PR adds `firebase.json` ignore rules** so these are no longer publicly reachable on the next static deploy (preview uses `dist-preview/` separately):

| Pattern | Reason |
|---------|--------|
| `functions/**` | Worker source (`checkout-logic.mjs`, `_middleware.js`) — not for static hosting |
| `scripts/**` | Build/test tooling |
| `docs/**`, `qa/**` | Internal docs |
| `**/angelina-skins/source/**` | Owner-approved full PNGs (not for public download) |
| `database.rules.json` | RTDB rules belong in Firebase console/CI only |

## New or slice-related paths still served (game data — no secrets)

These are **public game content** (no API keys, no owner emails). Reviewed for secrets:

| Path | Contents |
|------|----------|
| `data/story/life-ch1-slice.json` | Quest copy (RU/EN/DA) |
| `data/story/angelina-skin-manifest.json` | Skin ids, public asset paths, sha256 checksums |
| `data/story/preview-iap-catalog.json` | Test IAP labels/prices (€1.99 / €2.99) for preview shop only |
| `assets/ui/angelina-skins/shipped/*.webp` | Derived WebP cutouts (A, B, C-v2) |
| `js/story/life-ch1-slice.mjs` | Slice client logic (gated by preview/query on prod host) |

**Not served after ignore update:** `assets/ui/angelina-skins/source/*.png`.

**Preview bundle (`dist-preview/`):** excludes source PNGs, `functions/`, `docs/`, rules; includes shipped WebP + slice JSON + JS.

## RTDB `lifeCh1` rules

**Not in PR #52.** `database.rules.json` matches `main` (no `players/$uid/lifeCh1`). Proposed rules live on branch `cursor/life-ch1-database-rules-1430` (separate Draft PR) pending owner GO before `deploy-database-rules.yml` runs.
