# Cloudflare preview — Game Bot handoff (t201u)

**Production:** HOLD — do not deploy `main` or halloween.punk.contractbot.dk.

## Live protected preview @ 552740b (Game Bot, verified)

| Item | Value |
|------|--------|
| **URL** | https://punk-me-preview-552740b.pages.dev |
| **Pages project** | `punk-me-preview-552740b` |
| **Deployment** | `43370a7a-86c4-41f7-9812-af20636c2ca9` |
| **Git pin** | `552740b782bf415cd788f996fd5e7005d9874bfe` |
| **Tarball SHA-256** | `cf9239e66f4fc2b84d24986af51f447d808da9964c62a8f0ebfe3054ab803045` |
| **Serve model** | `_worker.js` + KV `punk-me-preview-552740b-assets` (JWT upload workaround) |
| **Checks** | 401 unauth · 200 auth · 140 files hash-identical · noindex · no prod Firebase · `/api` stub 503 |

Credentials: **only** in Cloudflare (never git/logs/reports).

**Cursor staging project:** `punk-me-ch1-preview` — empty, leave as-is (owner: delete nothing).

## Agent Store bundle (same SHA)

| Item | Path |
|------|------|
| **Game Bot bundle (site + `functions/`)** | `/cursor/stores/self/preview-552740b/punk-me-preview-552740b.tar.gz` |
| **SHA-256 manifest** | `/cursor/stores/self/preview-552740b/MANIFEST.json` |
| **Functions source (duplicate)** | `/cursor/stores/self/preview-552740b/functions/_middleware.js` |

Republish: `scripts/package-preview-game-bot-store.sh` after a new pinned SHA.

## Next preview (branch tip)

City build step 7 + Angelina guide land **after** `552740b` on branch `cursor/vertical-slice-ch1-d81d`. When ready for owner playtest:

1. Cursor builds verified tarball → Agent Store (new directory + SHA in `MANIFEST.json`).
2. Cursor announces path + hash.
3. Game Bot redeploys **same** project `punk-me-preview-552740b`.

## Optional CLI deploy (when JWT direct upload works)

`scripts/deploy-verified-bundle-pages.sh` — expects `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT`.
