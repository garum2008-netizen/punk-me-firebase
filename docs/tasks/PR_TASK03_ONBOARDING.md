# TASK 03 — Onboarding & quest progression

## Goal
MASTER TZ §5.1 / TASK 03: new player completes «Новенький в доме 13» with visible goals, contextual NPC talk, saved steps, one-time rewards, path to gang initiation.

## Changed files (primary)
- `js/onboarding.js`, `js/reward-grants.mjs`, `js/interaction-hud.mjs`, `js/context-hints.mjs`
- `js/game.js`, `js/play-features-v21.mjs`, `js/world3d.mjs`, `js/controls-3d.mjs`
- `js/story/story-engine.mjs`, `js/story/authority.mjs`
- `js/i18n.js`, `index.html`, `css/game.css` (quest HUD)
- `scripts/test-new-player-playthrough.js`, `qa/playability/*`

## Features
- Contextual E / nearest NPC before street arcade (daily cap)
- Explicit **«Говорить»** button when NPC in range
- Quest panel always visible; guide beacons / portal hints
- Onboarding idle hint after ~45s without progress
- `onboarding` + `story.rewardsGranted` persisted; `grantRewardOnce` event IDs (`onboard:*`, `quest:*:complete`, `duel:payout:razor`)
- `questBump` safe on empty progress; Razor talk credits onboarding
- Post-initiation quest cleanup; initiation duel not farmable

## Automated tests
- `npm run test:loading` — PASS
- `npm run test:loading-early-save` — PASS
- `npm run test:playthrough` — PASS (`qa/playability/playthrough-report.json`)

## Manual check
1. New anonymous player → char select → onboarding 1–6 without dev hooks (Talk / Gang / dock).
2. Reload mid-onboarding → step preserved, no duplicate step-1 coins.
3. Reach Authority stage 4 → initiation ceremony via Gang → Razor.

## Screenshots
`qa/playability/desk-chromium-*.png`

## Known limits
- Full Authority stages 2–3 in one headless run are slow; smoke test uses UI initiation after onboarding.
- Voice defaults muted; subtitles remain (TZ §15).

## Rollback
Revert merge commit or checkout previous `GAME_VERSION` tag on `main`; no RTDB schema migration required.
