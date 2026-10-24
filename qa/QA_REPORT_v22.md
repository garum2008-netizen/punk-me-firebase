# PUNK ME living3d-v22r1 — audit fix QA report

Branch: `cursor/living3d-v22-4053` · `GAME_VERSION=living3d-v22r1` · local captures on port 8765 (not deployed).

| ID | Item | Status | Evidence |
|---|---|---|---|
| B1 | Story `quest.completed` backfill after Firebase load | **done** | `js/story/story-engine.mjs` `ensureStoryState`; smoke `node -e` import test |
| B3 | Presence probe + stale filter + private room | **done** | `js/game.js` `initMultiplayer`, `listenPresence`, `PRESENCE_STALE_MS`; rules-compatible probe payload |
| B2/B4/B5 | Cinematic dialogue camera in normal play + stricter capture asserts | **done** | `applyDialogueCamera` / `snapDialogueNpcShot`; `/workspace/qa/authority/desktop-stage{1-4}.png`, `mobile-stage{1-4}.png` (capture script verified) |
| B6 | Mobile `#elevator` deep link + portal grace | **done** | Hash parse fix `applyHashRoute`; `setPortalGrace`; `/workspace/qa/mobile-elevator-deeplink.png` (location=elevator) |
| B7/B8 | Compact mobile HUD + chat off joystick | **partial** | Collapsible quests, desktop-only lang/mute/hero, `?` menu extras in `how-to-play.mjs`; not re-shot all mobile HUD fight PNGs this run |
| B9 | Street foreground car | **done** | `street_car` tag + reposition in `location-enrich.mjs`; hidden in dialogue/duel |
| B10 | Duel layout + crowd hide + idle | **done** | `gameplay-v21.mjs` `startDuel3D`; `world3d.mjs` hide others when duel; **not** re-captured duel PNG this run |
| B11 | Char select skip (premature `vienna` save) | **done** | `sanitizePlayer` no default `characterId`; `loadMe` skips `saveMe` until pick |
| B9 | Version + cache bust | **done** | `living3d-v22r1` in `game.js` + `index.html?v=` |
| B12–B15 | Props, tutorial deeplink, cemetery title, empty authority bar | **partial** | Cemetery i18n, construction sign i18n, authority bar hidden at 0; floating props **not** fully audited |
| §8.1–3 | 2+ quests / dialogues per location | **not done** | Scope; data unchanged beyond fixes |
| Firebase cleanup | Script only (no delete) | **done** | `scripts/firebase-cleanup-test-data.md` + `.js` dry-run |

## PNG paths (this PR)

- Authority: `/workspace/qa/authority/desktop-stage1.png` … `mobile-stage4.png`, `desktop-razor-initiation-patch.png`
- Locations (desktop 1280×800): `/workspace/qa/v21/qa-v21-desktop-*.png` (10 files)
- Locations (mobile subset): `/workspace/qa/v21/qa-v21-mobile-*.png`
- Mobile elevator: `/workspace/qa/mobile-elevator-deeplink.png`

## Not verified this run

- Live Firebase reload with real returning player account
- Duel PNG after 10+ hits (white material)
- Full mobile HUD during chain duel
- Jitter matrix remaining cells
- MVP quest/dialogue expansion (item 10)
