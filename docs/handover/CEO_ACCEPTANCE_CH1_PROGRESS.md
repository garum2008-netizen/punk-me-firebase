# CEO directive P0 — Chapter 1 acceptance progress

**Decision:** GO protected preview · HOLD merge/production  
**Target:** 20 Nov 2026  
**Last updated:** 2026-11-12 18:15 CET (Game Bot preview live)

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
| **Live URL** | **https://punk-me-preview-552740b.pages.dev** |
| Pages project | `punk-me-preview-552740b` |
| Deployment | `43370a7a-86c4-41f7-9812-af20636c2ca9` |
| Tarball | SHA `cf9239e66f4fc2b84d24986af51f447d808da9964c62a8f0ebfe3054ab803045` — verified by Game Bot |
| Cursor empty project | `punk-me-ch1-preview` — **do not deploy; do not delete** |
| Next preview | New tarball in Agent Store when branch tip ready → Game Bot redeploys same project |

## Product / evidence

| Gate | Status |
|------|--------|
| Onboarding step 7 (city build) | **PASS** (`ceo-desktop-full-v2` session @ `52a91c9`) |
| Angelina guide (onboarding + Life Ch1) | Banner + RU/EN/DA for all onboarding + Life Ch1 step ids |
| Full Ch1 playthrough (logic) | **PASS** (`ch1_complete`, onboarding → Life Ch1 end) |
| Desktop UNCUT video (`ceo-desktop-full-v3`) | **In progress** (`a37c200` video save fix); v2 logic PASS, metadata on disk |
| Production / main merge | **HOLD** |

## Definition of Done (remaining)

1. ~~Deploy preview @ 552740b~~ **Done** (Game Bot).
2. Desktop UNCUT `ceo-desktop-full-v3` with step 7 + Ch1 end.
3. When branch tip ready: new Agent Store tarball for Game Bot (city + Angelina on live preview).
