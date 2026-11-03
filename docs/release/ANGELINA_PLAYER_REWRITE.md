# Angelina as player — Life Ch1 vertical slice rewrite

Owner decision 2026-11-03 (Inna): in the preview/slice gates only, **the player is Angelina** (2D cutouts A / B / C-v2). Vienna/Razor/Cobalt/Mohawk stay NPCs. Production `main` behaviour unchanged outside slice/preview.

## Dialogue — changed RU lines (`data/story/life-ch1-slice.json`)

Structure unchanged (ids, flags, rewards, step order). Speaker / POV fixes only.

| id | new RU (summary) |
|----|------------------|
| `steps.trust.objective` | Подойди к метке — реши, что делать с запиской (matches «Спрятать и подумать» / note choices) |
| `steps.reflect.objective` | Снова подойди к метке — вспомни, что ты решила |
| `dlg_life_ch1_outfit.n0` | Какой образ мне сегодня? В зеркале — только стиль. |
| `dlg_life_ch1_trust.*` | Player 1st person; choice label **Довериться Мире** (flag `mystery_trust_angelina` unchanged) |
| `dlg_life_ch1_reflect.n_secret` | Хорошо. Никому, пока сама не решу иначе. |
| `dlg_life_ch1_reflect.n_open` | Напишу Мире, когда соберусь с мыслями — сама, своими словами. |
| `dlg_life_ch1_reflect.n_trust` (mira) | Спасибо, Ангелина. Я на связи. Без геройства — просто поддержу. |
| `dlg_life_ch1_reflect.n_fallback` | Я уже решила — держу это в голове. |

EN/DA updated in the same nodes.

## UI copy (code, not JSON)

| location | new RU |
|----------|--------|
| Quest title (`life-ch1-slice.mjs`) | Новенькая в городе |
| Wardrobe hint | Выбери образ и стиль — в мире это моё отражение. |
| Chat input placeholder | Только готовые фразы (no internal D12-A code) |
| Mira dialogue title | Мира (сообщение) — subtitle pill cleared while dialog open (no double label) |
| Wardrobe panel title | Гардероб |

## Player visual — where behaviour changed (slice / preview gates only)

| Area | Change |
|------|--------|
| `js/story/life-ch1-slice.mjs` → `previewPlayerLifeCh1Skin` | When `isLifeCh1SliceEnabled()`, 2D cutout in **all** locations. |
| `js/game.js` → `goLocation` | `LifeCh1Slice.syncPlayerLifeCh1Skin()` after travel. |
| `js/game.js` → `pickCharacterAndContinue` | Slice: `life_ch1_proxy` mesh, skin A default, Angelina chrome. |
| `js/world3d.mjs` | Full-height world WebP layout (~1.78m), contact shadow, kitchen placement offset; cutout re-parent on `rebuildLocation`. |
| `scripts/build-angelina-skin-assets.py` | Full-height crop (280px wide); A variant right-edge alpha cleanup only. |
| `data/story/angelina-skin-manifest.json` | Updated **world** sha256 for A/B/C-v2 (portraits unchanged). |
| `css/game.css` | Hide empty `#gameplayHud` / subtitle pill. |

## Production safety (post 41aad01 verification)

| Item | Change |
|------|--------|
| RTDB | `database.rules.json` on slice PR **matches `main`** (no `lifeCh1` writes on production). Draft rules: branch `cursor/life-ch1-database-rules-1430`, `docs/release/LIFE_CH1_RTDB_RULES_DRAFT.md`. |
| Query flags | `?lifeCh1Slice=1` and `?lifeCh1E2e=1` inert on `*.punk.contractbot.dk` / `*.web.app` (incl. E2E nav aid in `world3d.mjs`). |
| Coins | `startingCoins + 50` clamp in `story-engine.mjs` when not preview and not slice. |
| Public hosting | `docs/release/PUBLIC_SERVING_AUDIT.md`; extra ignores in `firebase.json`. |
| Cache bust | `living3d-v22r5-ch1-angelina-r3` |

## Tests

- `scripts/test-life-ch1-slice-unit.js` — production flags inert, reflect/fallback copy, anti-cheat source assert.
- `scripts/test-preview-build.js` — cutout locations + kitchen 390×844 placement.
