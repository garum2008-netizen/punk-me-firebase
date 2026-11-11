# Chapter 1 release evidence @ `552740b782bf415cd788f996fd5e7005d9874bfe`

**Date:** 2026-11-11 UTC  
**Branch:** `cursor/vertical-slice-ch1-d81d` (PR #52)  
**Emulator:** `FIREBASE_EMULATOR=1`, `127.0.0.1:9000` / `9099`, project `demo-punk-life-ch1`  
**Prod:** `punk-me-40605` not contacted during captures (`prodFirebaseBlocks: 0`).

## Automated gates (PASS)

| Test | Result |
|------|--------|
| `test-life-ch1-slice-unit.js` | PASS |
| `test-firebase-emulator-guard.js` | PASS |
| `test-dev-coins-gate.js` | PASS |
| `npm run test:preview-build` | PASS (`prodAttempts: 0`, reload persistence) |
| `npm run test:preview-wrangler` | PASS (401/200 Basic Auth bundle) |
| Full ordinary probe (portrait + desktop) | PASS |
| `run-ordinary-three-pass.js` (no `ORDINARY_PORTRAIT_ONLY`) | **3/3 success** |
| `ORDINARY_INPUT=touch` portrait capture | PASS, `chapter1CompletedInSession: true` |

## Three-pass immutable recordings

Summary: `/opt/cursor/artifacts/ice-ch1-footage/ice-ordinary-three-pass-552740b782bf.json`

Each pass: **portrait + desktop**, both `chapter1CompletedInSession: true`.

- Pass 01–03 metadata: `ice-ordinary-footage-metadata-552740b782bf-pass{01,02,03}-immutable.json`
- Uncut WebMs: `ice-ch1-ORDINARY-UNCUT-portrait-552740b782bf-mobile390x844-pass{NN}.webm`, `ice-ch1-ORDINARY-UNCUT-desktop-552740b782bf-desktop1280x720-pass{NN}.webm`

## Shipped Angelina A (unchanged)

`32c087bab481062de9be824a30265b321ab65a118d7271ccd1cab26cf1ad3cb7` — `assets/ui/angelina-skins/shipped/angelina-teen-A-portrait.webp`

`test-angelina-skin-halo.js` still reports non-zero halo on shipped assets (ab6fa baseline policy; no ship-path writes).

## Touch / smoothness (limitation)

Playwright `#touchJoystick` drag + 2s headless rAF sample (`approxFps` logged in metadata). **Not physical touchscreen certification.**

## Merge safety

`database.rules.json` **unchanged** vs `origin/main` → merge should **not** trigger `.github/workflows/deploy-database-rules.yml`.

## Not green (blocks production merge)

1. **Owner visual acceptance** (Roblox bar) — not automated.  
2. **Physical mobile touch + device FPS** — requires owner/device session.  
3. **Live closed Cloudflare preview URL** — `dist-preview` + `test:preview-wrangler` PASS locally; no deploy credentials in agent env. Owner: set `PREVIEW_USER`/`PREVIEW_PASS` on Pages and deploy `dist-preview`.  
4. Halo numeric **0/0** gate — not met; shipped files unchanged per policy.

## Owner action to unblock merge

1. Sign off visual on staging after preview deploy.  
2. One physical-device playthrough (touch) or accept Playwright touch evidence.  
3. Explicit GO to merge after reviewing this pack.
