# PR #43 — automated emulator playthrough (NOT live manual QA)

**URL:** `?solo=1&firebaseEmulator=1` (no `?dev=1`)  
**Runner:** Playwright `scripts/honest-emulator-scenario-run.js` — `automatedPlaywright: true` in log  
**Command:** `SCENARIO_CACHE=honest-full-v12 FIREBASE_EMULATOR=1 PUNK_BASE=http://127.0.0.1:3456 node scripts/honest-emulator-scenario-run.js`  
**Artifacts:** `/opt/cursor/artifacts/scenario-ch01/v12-*.png` (not in git)  
**Last green run:** commits `cfa7a88` + `08ea12f` — `honest-emulator-scenario-run: ALL PASS` (3 endings)

## Acceptance fixes (post v12 review)

| ID | Fix |
|----|-----|
| D-FINALE-01 | Briefing → choice → multi-panel ending → `#endingRewards` → free play |
| D-FINALE-02 | Subtitles: body only, `resolveSpeakerName` |
| D-UI-03 | `mainlineChapter` ch.4, no side quests after ch3 |
| D-UI-04 | Empty story-goal progress hidden |
| D-I18N-01 | Castle neon sign uses `door_castle` |
| D-CH4-03 | Castle courtyard decor |
| D-TEST-02 | All 3 endings: F5 + free play + no duplicate reward |

## `v12-break_curse-99-error.png` (prior run)

Not a runtime crash: error screenshot captured while `#concertPrep` was under the 3D canvas (D-CH4-02) with stale HUD (Chapter 2 / Grave flowers). Fixed before this acceptance re-run.

## Checkpoints (each ending)

| Step | Screens |
|------|---------|
| Onboarding + authority + hangout 4 | `00` … `11` |
| Ch.3 rim / Ch.4 castle | `12` … `17` |
| Briefing + choice | `18-ending-choice` |
| Ending scene + rewards | `19-ending-scene-*`, `19b-ending-rewards-*`, `19-ending-*` |
| F5 persistence | `20-after-f5` |
| Free play | `21-free-play` |

All three endings: `ending_break_curse`, `ending_zombie_style`, `ending_count_deal` — separate browser sessions, same runner. Log: `honest-run-log.json`.
