# QA v22r4 — living3d-v22r4 (new PR from `main`)

| Item | Result | Artifact / notes |
|------|--------|------------------|
| Mobile stage 4 initiation: Razor lit during live dialogue framing (key/rim) | **PASS** | `mobile-authority-stage4.png` (NPC head span ~72px; live dialogue lights) |
| Desktop stage 4: Razor + player ~40–50% screen height | **PASS** | `desktop-authority-stage4.png` (player ~66px, Razor ~52px head spans) |
| Mobile duel 10+ hits, opponent in frame | **PASS** | `mobile-duel-10hits.png` (16 hits; opponent x≈0.24) |
| Desktop duel 10+ hits, both fighters framed | **PASS** | `desktop-duel-10hits.png` (16 hits; duel framing pass) |
| Mobile HUD: Chat top-right pill, no overlap with Here counter or joystick | **PASS** | `mobile-hud-chat-pill.png` (chat width ~11% viewport) |
| `index.html` cache-bust `?v=` matches `GAME_VERSION` | **PASS** | `living3d-v22r4` in `js/game.js` + all script/css links |

## Scripts

- `node scripts/capture-v22r4.js` — 3 min timeout, one retry per shot.
- Log: `qa/v22r4/capture.log`

## Scope

Polish only; no deploy. Does not modify `docs/game-design/`.
