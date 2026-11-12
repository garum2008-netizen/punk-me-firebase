# Cloudflare preview — Game Bot handoff (t201u)

**Production:** HOLD — do not deploy `main` or halloween.punk.contractbot.dk.

## Pinned gameplay artifact (no new product code)

SHA: `552740b782bf415cd788f996fd5e7005d9874bfe`

| Item | Path |
|------|------|
| **Game Bot bundle (site + `functions/`)** | `/cursor/stores/self/preview-552740b/punk-me-preview-552740b.tar.gz` |
| **SHA-256** | `/cursor/stores/self/preview-552740b/MANIFEST.json` (`cf9239e66f4fc2b84d24986af51f447d808da9964c62a8f0ebfe3054ab803045`) |
| **Deploy doc** | `/cursor/stores/self/preview-552740b/PREVIEW_DEPLOY_FOR_GAME_BOT.md` |
| **Functions source (duplicate)** | `/cursor/stores/self/preview-552740b/functions/_middleware.js` |
| **Build recipe** | `git worktree` at `552740b` → `npm ci` → `npm run build:preview` → tar `dist-preview/` |

## Required Cloudflare setup (owner / Game Bot)

1. **New** Cloudflare Pages project (name suggestion: `punk-me-ch1-preview` — must **not** be production site).
2. Repo secrets (GitHub) or connector env (never committed):
   - `CLOUDFLARE_API_TOKEN` (Pages edit, single account)
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_PAGES_PROJECT` = new project name
3. On the Pages project (dashboard): `PREVIEW_USER`, `PREVIEW_PASS` (Basic Auth via `functions/_middleware.js`).
4. Deploy: upload tarball **or** run `node scripts/deploy-preview-cloudflare.js` from branch that contains workflow (after secrets exist).
5. Verify: HTTP **401** without auth, **200** with auth; `robots` / `X-Robots-Tag` noindex; `test:preview-build` proved `prodAttempts: 0`.

## Cursor agent cannot complete alone

No `CLOUDFLARE_*` credentials in Cloud Agent VM. **Game Bot** with owner connector (`garum2008@gmail.com`) may deploy the prepared tarball to a **new** Pages project on request.

## Ongoing development on PR #52

City build step + Angelina guide land **after** `552740b` on branch tip — not in pinned preview tarball unless owner requests a newer preview SHA.
