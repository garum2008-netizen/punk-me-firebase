# Angelina as player — Life Ch1 vertical slice rewrite

Owner decision 2026-11-03 (Inna): in the preview/slice gates only, **the player is Angelina** (2D cutouts A / B / C-v2). Vienna/Razor/Cobalt/Mohawk stay NPCs. Production `main` behaviour unchanged outside slice/preview.

## Dialogue — changed RU lines (`data/story/life-ch1-slice.json`)

| id | old RU | new RU |
|----|--------|--------|
| `steps.trust.objective` | Поговори с Ангелиной (метка в комнате) — выбери, кому доверяешь | Подойди к метке в комнате — реши, кому доверишься |
| `steps.reflect.objective` | Снова поговори с Ангелиной — посмотри, что изменилось | Снова подойди к метке — оглянись на свой выбор |
| `dlg_life_ch1_outfit.n0` (speaker → `player`) | Выбери, как ты хочешь выглядеть сегодня. Это только стиль — без давления. | Выбери, как ты хочешь выглядеть сегодня. Только стиль — без давления. |
| `dlg_life_ch1_trust.n0` | Я нашла записку на тумбочке. Что сделаем? | На тумбочке лежит записка. Что делать? |
| `dlg_life_ch1_trust.n0.choice trust_mira` | Довериться Ангелине | Довериться Мире |
| `dlg_life_ch1_trust.n_after_calm` | Спокойный образ — хороший знак. Я нашла записку на тумбочке. Что сделаем? | Спокойный образ — хороший знак. На тумбочке записка. Что делать? |
| `dlg_life_ch1_trust.n_after_calm.choice trust_mira` | Довериться Ангелине | Довериться Мире |
| `dlg_life_ch1_trust.n_after_bright` | Ярко! Записка на тумбочке — не для всех глаз. Решай. | Ярко! Записка на тумбочке — не для всех глаз. Решай сама. |
| `dlg_life_ch1_trust.n_after_bright.choice trust_mira` | Довериться Ангелине | Довериться Мире |
| `dlg_life_ch1_trust.n_after_bold` | Смело. Записка ждёт — если ошибёмся, последствия будут позже. | Смело. Записка ждёт — если ошибусь, последствия будут позже. |
| `dlg_life_ch1_trust.n_after_bold.choice trust_mira` | Довериться Ангелине | Довериться Мире |
| `dlg_life_ch1_reflect.n_secret` (speaker → `player`) | Хорошо. Тайна останется между нами — пока ты не решишь иначе. | Хорошо. Пока никому — пока сама не решишь иначе. |
| `dlg_life_ch1_reflect.n_open` (speaker → `mira`) | Ладно… но Мира может обидеться, если узнает не от тебя. | Ангелина, лучше расскажи мне сама — обидно узнать от других. |
| `dlg_life_ch1_reflect.n_trust` (speaker → `mira`) | Спасибо. Я помогу — без геройства, обещаю. | Спасибо, Ангелина. Я рядом — без геройства, обещаю. |
| `dlg_life_ch1_reflect.n_fallback` (speaker → `player`) | Ты уже сделал выбор — помни его. | Ты уже сделала выбор — помни его. |

Note: choice flag `mystery_trust_angelina` is unchanged for save compatibility; label now trusts **Mira**.

EN/DA strings updated in the same nodes (player POV / Mira addresses Angelina).

## UI copy (code, not JSON)

| location | old RU | new RU |
|----------|--------|--------|
| Wardrobe panel title (`life-ch1-slice.mjs`) | Ангелина — гардероб | Гардероб |

## Player visual — where behaviour changed (slice / preview gates only)

| Area | Change |
|------|--------|
| `js/story/life-ch1-slice.mjs` → `previewPlayerLifeCh1Skin` | Removed `location === "room"` gate; when `isLifeCh1SliceEnabled()`, 2D cutout shows in **all** locations (room, kitchen, street, cemetery, city, …). |
| `js/game.js` → `goLocation` | Calls `LifeCh1Slice.syncPlayerLifeCh1Skin()` after `syncStage3D()` so cutout follows travel. |
| `js/game.js` → `pickCharacterAndContinue` | Slice: forces mesh id `cobalt` under hidden root, `lifeCh1.playerCutout`, skin A default, `applySliceAngelinaPlayerChrome()`. |
| `js/char-select.mjs` | Slice: single confirm as Angelina (`data-testid="char-select-angelina"`), picks cobalt for 3D under cutout. |
| `js/story/life-ch1-slice.mjs` → `applySliceAngelinaPlayerChrome` | Adds `body.life-ch1-angelina-player`. |
| `css/game.css` | Hides «Сменить героя», how-to change hero, wardrobe «Вернуть стандартного героя (3D)» when `body.life-ch1-angelina-player`. |
| `js/game.js` → `changeCharacter` | No-op when slice enabled. |
| `js/story/life-ch1-slice.mjs` → wardrobe | Hides `#lifeCh1WardrobeDefault` in slice; title «Гардероб». |
| `js/story/life-ch1-slice.mjs` → `showDialogue` | Speaker titles: player / Mira; portrait on `player` lines. |

Assets: existing shipped webp world/portrait paths from `data/story/angelina-skin-manifest.json` (A, B, C-v2 only). No new 3D Angelina model.

## Tests

- `scripts/test-life-ch1-slice-unit.js` — no NPC Angelina objectives/choices; reflect speakers.
- `scripts/test-preview-build.js` — cutout visible room/street/cemetery; UI hidden; reload + wardrobe path unchanged.
