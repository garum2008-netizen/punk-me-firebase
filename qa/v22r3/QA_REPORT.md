# QA v22r3 — PR #9 (living3d-v22r3)

| Item | Result | Artifact |
|------|--------|----------|
| Desktop authority stage 1 (Mohawk) | **PASS** | `desktop-authority-stage1.png` (heads P≥52 N≥62) |
| Desktop authority stage 4 (Razor initiation) | **PASS** | `desktop-authority-stage4.png` |
| Mobile authority stage 4 (390×844) | **PASS** | `mobile-authority-stage4.png` (heads P≥60 N≥60) |
| Desktop duel 10+ hits, HP bars, opponent in frame | **PASS** | `desktop-duel-10hits.png` (16 hits logged) |
| Mobile duel 10+ hits | **PASS** | `mobile-duel-10hits.png` |
| Mobile HUD: Chat clear of joystick, quests collapsed, top HUD ≤20% | **PASS** | `mobile-hud-layout.png` (col ~9% height) |

## Not re-captured this round (unchanged from v22r2 acceptance)

Desktop/mobile authority stages 2–3, 10+10 location PNGs, B1 log, street occluder — still valid under `qa/` and `qa/authority-v22/`.

## Scripts

- `node scripts/capture-v22r3.js` — 3 min timeout, one retry per shot.
- Log: `qa/v22r3/capture.log`
