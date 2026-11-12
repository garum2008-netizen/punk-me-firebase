# CEO directive P0 — Chapter 1 acceptance progress

**Decision:** GO protected preview · HOLD merge/production  
**Target:** 20 Nov 2026  
**Last updated:** 2026-11-12 (agent run)

## Preview bundle (verified)

| Item | Value |
|------|--------|
| Git pin | `552740b782bf415cd788f996fd5e7005d9874bfe` |
| Tarball SHA-256 | `cf9239e66f4fc2b84d24986af51f447d808da9964c62a8f0ebfe3054ab803045` |
| Agent store | `/cursor/stores/self/preview-552740b/` |
| Deploy script | `scripts/deploy-verified-bundle-pages.sh` |

## Protected preview (Cloudflare)

| Item | Status |
|------|--------|
| Pages project | `punk-me-ch1-preview` |
| Default URL | `https://punk-me-ch1-preview.pages.dev` |
| Basic Auth env | `PREVIEW_USER` / `PREVIEW_PASS` set via API (values **only** in Cloudflare dashboard) |
| First deployment | **Pending** — needs `CLOUDFLARE_API_TOKEN` on runner with `scripts/deploy-verified-bundle-pages.sh` |
| Post-deploy checks | 401 without auth; 200 + `X-Robots-Tag` with auth; `robots.txt` Disallow |

## Product / evidence

| Gate | Status |
|------|--------|
| Onboarding step 7 (city build) | Capture fixes landed; desktop full run **in progress** |
| Angelina guide (onboarding + Life Ch1) | Banner + i18n for all onboarding steps + Ch1 step ids |
| Full Ch1 playthrough recording | **Pending** successful ordinary capture |
| Production / main merge | **HOLD** |

## Definition of Done (remaining)

1. Deploy tarball to `punk-me-ch1-preview` and verify auth/noindex.
2. Ordinary path: onboarding step 7 + Life Ch1 complete + chapter end on desktop video.
3. Owner playable URL + acceptance summary (no credentials in repo or reports).
