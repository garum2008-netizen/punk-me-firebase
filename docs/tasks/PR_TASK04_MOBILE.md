# TASK 04 — Mobile controls

## Goal
MASTER TZ §5.2 / TASK 04: touch-only completion of main onboarding tasks; stable joystick, interact, jump, visible HUD.

## Changed files (incremental on TASK 03)
- `js/touch-controls.mjs`
- `css/game.css` (touch-action, coins pin, Fight dock order, talk/jump buttons)
- `index.html` (`touchTalk`, `touchJump`, `touchInteract`)
- `js/game.js` (portal E via `getNearPortal` in `onInteract`)

## Features
- Joystick pointer capture + `touch-action: none`
- **E**, **Говорить**, **Jump** on-screen
- Coins badge pinned top-right on narrow viewports
- Fight button ordered first in horizontal dock scroll

## Automated tests
- `npm run test:playthrough` with `RUN_MOBILE=1` (optional matrix)

## Manual check
390×844: walk with joystick, portal E, talk to Razor, open shop, duel button visible.

## Screenshots
`qa/playability/mob-chromium-*.png`

## Known limits
- Joystick still validate on real iPhone Safari (emulator differs).

## Rollback
Revert TASK 04 commit only; TASK 03 remains.
