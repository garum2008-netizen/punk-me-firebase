# Playability fixes — QA report

**Branch:** `cursor/playability-fixes-d81d`  
**Version label:** `living3d-v22r5-playability-r1`  
**Date:** 2026-10-24

## Automated tests

| Test | Result |
|------|--------|
| `npm run test:loading` | PASS |
| `npm run test:loading-early-save` | PASS |
| `npm run test:playthrough` | PASS — regression smoke + UI initiation (`playthrough-report.json`; optional `RUN_MOBILE=1`, `RUN_WEBKIT=1`) |

## Fixes covered (audit top-10)

1. Street **E**: nearest NPC before arcade; arcade daily cap from `balance.arcadeDailyCap`.
2. **talk_razor**: Gang / story Razor paths call `Onboarding.onTalkRazor`.
3. **questBump** / duel win: `me.quests.progress ||= {}`; onboarding credited before legacy quest bump.
4. Quest panel expanded by default; toggle visible on desktop and mobile.
5. **onboarding** persisted in Firebase via `sanitizePlayer`; no repeat reward on reload (`adaptSpawnLocation` advances without `completeStep`).
6. Chapter 2: Bolt hardware stall, foreman side quest hint, `story.materials` + shop brick sync, construction job grants brick/nails, hangout HUD subtext.
7. Post-initiation: initiation quests completed, Razor rank lines, no repeat Razor duel reward when joined.
8. Mobile: joystick `touch-action: none` + pointer capture; E uses portal + interact; coins badge pinned; Fight button ordered first in dock scroll.
9. Shop/Lavka copy; W/S corrected in `controls-3d`; Cobalt → Vintik on roof for `cobalt_item`.
10. City **Build** hidden in 3D mode.

## Screenshots

PNG captures from the playthrough script live under `qa/playability/` (`desk-chromium-*.png`, `mob-chromium-*.png` when mobile run is enabled).

## Honest limits

- Headless **3D duels** are timing-sensitive; the playthrough script retries duel input and only falls back to `Onboarding.onWinFight` if the step did not advance (validates the `questBump` fix, not full duel UX).
- Full Authority stages 2–3 in one automated run remain slow; initiation UI is exercised after scripted job shortcuts in the test harness only.
