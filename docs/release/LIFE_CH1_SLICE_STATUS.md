# Life Chapter 1 vertical slice — implementation status (automated checkpoint)

**Branch:** `cursor/vertical-slice-ch1-d81d` · **Draft PR #52**

## Works (verified)

| Feature | Status |
|---------|--------|
| `me.lifeCh1` namespace + `ensureLifeCh1` normalization (`flags`, `claimedSteps`) | Unit + E2E reload |
| Slice **OFF** on main; `?lifeCh1Slice=1` / E2E / **preview build only** | Implemented |
| Idempotent step coins (`claimedSteps`); owner accounts skip coin grant | Unit |
| Player A/B/C cutout in world (not Angelina billboard) | Implemented |
| Preview build `npm run build:preview` → `dist-preview/` | `test:preview-build` |
| Preview: no Firebase, localStorage `punkme_preview_*`, banner, chat off | `test:preview-build` |
| Emulator-default life-ch1 E2E + 0 prod Firebase attempts | E2E (when run) |
| Mobile quest panel (`390px`) | CSS + E2E viewport |
| RTDB rules shape limits for `lifeCh1` | In PR rules file |
| `npm ci` via committed `package-lock.json` | Added |

## Preview deploy (Owner GO — Inna deploys)

See `docs/release/PREVIEW_BUILD.md`. Basic Auth: `PREVIEW_USER` / `PREVIEW_PASS`. Not production.

## Not yet / out of scope

| Item | Notes |
|------|--------|
| Production deploy / live slice auto-start | Forbidden without GO |
| Full honest E2E walk (no nav aid) | `faceWorldTargetForE2e` for tests only |
| Owner coin grant in preview | `isOwner` false in preview |
