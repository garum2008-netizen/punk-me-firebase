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
| `npm run test:playthrough` | PASS — UI onboarding, reload grant check, **Authority stages 1–4 via gang/jobs UI** (no save prep), initiation, mobile 390×844 when `RUN_MOBILE≠0`. Desktop hangout: `RUN_CH2=1`. |
| `npm run test:chapter2-hangout` | PASS after `test:playthrough` with `RUN_CH2=1` (`hangoutStage` 4, `desk-chromium-06-hangout-complete.png`, `hangout-ch2.log`) |

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

- **Authority path:** automated run uses **20 counted UI actions** (nav, gang NPC, jobs, parkour button, Mohawk training duel). No `page.evaluate` save prep.
- **Duels:** headless uses 2D fallback for Mohawk training when 3D duel cannot run (`webdriver` / `__force2dFight`); not a substitute for manual 3D duel QA.
- **Hangout:** `RUN_CH2=1` desktop only (~15 min): jobs for coins, **«Где взять?»** → City → Bolt gang UI, four **Build** stages. Log: `hangout-ch2.log`.

## Rollback

Revert PR #17 on `main`; no RTDB schema migration.
