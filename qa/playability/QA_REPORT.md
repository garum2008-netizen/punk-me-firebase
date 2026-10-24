# Playability fixes — PR #17 QA report

**Branch:** `cursor/playability-fixes-d81d`  
**Base:** `main` @ `a0e15b5`  
**Version label:** `living3d-v22r6-master-p1-r1` (see `index.html` cache bust)  
**Date:** 2026-10-24

## Automated tests (this branch)

| Test | Result |
|------|--------|
| `npm run test:loading` | PASS (Chromium + WebKit) |
| `npm run test:loading-early-save` | PASS |
| `npm run test:playthrough` | PASS — UI onboarding path, reload grant check, initiation button, mobile 390×844 (`RUN_MOBILE` default on). Set `RUN_CH2=1` for hangout build on desktop. |
| `npm run test:chapter2-hangout` | PASS after `test:playthrough` with `RUN_CH2=1` |

## MASTER TZ / audit coverage

| Item | In #17 |
|------|--------|
| Contextual street E / arcade cap | Yes |
| Explicit **«Говорить»** (`btnTalk` / `touchTalk`) | Yes (this commit) |
| Quest HUD visible + guide / portal hints | Yes |
| Idle hint ~45s (`tickOnboardIdleHint`) | Yes (this commit) |
| `grantRewardOnce` / `story.rewardsGranted` | Yes (this commit) |
| Onboarding persisted; no duplicate step rewards on reload | Yes (test: `reload_no_dup_grants`) |
| Ch.2 Bolt, materials sync, construction job | Yes (c010568) |
| Mobile touch joystick / interact / jump | Yes |
| Playable with sound off (voice muted default) | Yes |
| `database.rules.json` | **Unchanged** |

## Screenshots

- Desktop: `qa/playability/desk-chromium-01-after-char.png` … `05b-reload.png`, `final.png`, optional `06-hangout-complete.png`
- Mobile 390×844: `qa/playability/mob-chromium-*.png`

## Honest limits

- **Gang initiation (Authority 2–3):** automated run still **shortcuts** trials/tasks via save state before the Razor **«Принять нашивку»** UI click — not a full manual Authority grind.
- **Duels:** headless uses 2d fight path when `__force2dFight` is set at boot; not a substitute for manual 3D duel QA.
- **Hangout stage 4:** requires `RUN_CH2=1` on desktop suite (~5+ min with job + Bolt buys).

## Rollback

Revert PR #17 on `main`; no RTDB schema migration.
