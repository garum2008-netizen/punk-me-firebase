# t208u acceptance report (in progress)

**Owner directive:** 2026-11-14 CET — preview `a5c305c` technical stage only; **RELEASE HOLD**; Ch1 **PENDING** until proof below.

**Agent status:** defect closure work on branch tip (post-`a5c305c`); **no new interim preview tarball** until UNCUT video + matrix updated at owner GO.

## Deliverables checklist

| Item | Status |
|------|--------|
| Completable Ch1 (onboarding + Life slice + save/re-entry) | **In QA** — `adaptSpawnLocation` skip removed; capture drops post-Ch1 map hang |
| Angelina 3D companion + reactions | **Partial** — text reactions + `syncCompanionAngelina3D` follow billboard; owner verify |
| UNCUT CYBER PUNK BLUE video + SHA256/duration/commit | **Pending capture run** |
| Wing clip all interaction states | **Expanded** in `test-wing-clip-t207.js` (jump documented N/A on rig) |
| Real iPad Safari | **N/A in VM** — `docs/qa/IPAD_SAFARI_OWNER_CHECKLIST.md` |

## Evidence paths (when capture completes)

- Video: `/opt/cursor/artifacts/.../ice-ch1-ORDINARY-UNCUT-desktop-*-pass-t208-ch1-full.webm`
- Scenes log: bundled in `ice-ordinary-footage-metadata-*.json`
- Playthrough log: `docs/handover/CH1_PLAYTHROUGH_LOG.md` (generated from scenes)
- Wing JSON: `/opt/cursor/artifacts/avatar-qa-t207/wing-clip-samples-t207.json`
- Preview tarball: agent store `preview-<sha>/` when owner requests deploy

## QA matrix / defects

- Matrix: `docs/game-design/CHAPTER_01_QA_MATRIX.md`
- Defects: `docs/game-design/CHAPTER_01_DEFECTS.md`

## HOLD (unchanged)

Merge PR #52, `main`, production domain, Firebase rules/assets, Stripe — **no GO**.