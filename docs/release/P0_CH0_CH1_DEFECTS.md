# P0 — первые 10 минут (гл. 0–1): дефекты и статус R4

QA newcomer R4 (`QA_FIRST10_R4_2026-10-27.md`) на head `d0512fd` — **FAIL**. Ниже — статус после remediation на `cursor/scenario-preview-d81d` (см. git log / PR #43).

Автоматическая приёмка не заменяет живой проход ([P0] п.9).

## R4 → fix mapping (P0/P1)

| Пункт QA | Коммит(ы) | Проверка |
|----------|-----------|----------|
| **P0-c** DA перекрывает ☰ на 390px | `fix(ui): mobile game menu vs language corner` | `#langCorner` скрыт ≤900px; ☰ 44×44 @ right:56px; язык в меню `#gameMenuLang`; `test:honest-first10-e2e` ru390 menu open |
| **P1** E: квест/NPC > пёс > предметы | `fix(gameplay): quest-aware interact priority` | `js/interact-priority.mjs`, порядок в `game.js` onInteract, `context-hints.mjs`, блок props на `ch0_pet_shnurok` |
| **P1** `ep1_intro_01/02`, 404 ogg | `fix(voice): start narrator without orphan line ids` | Start: `start_narrator_welcome` + без очереди ep1 после resume; manifest-only fetch в `audio-manager.mjs` |
| **P1** `npc_mom:` / сырые ключи | `fix(voice): subtitle labels and mom lock` | `npc_mom` в i18n; `speech-bridge` без двойного «Имя:»; `honest-first10-e2e` DOM scan |
| **P1** субтитр мамы vs тост / «no VO» | same + i18n | `subtitleLockUntil` на `#voiceSubtitle`; EN/DA mom text без «no VO»/«ingen VO» |
| **P1** tier4 ch0 «нет решения» / ch1 без маяка | `fix(hints): tier-4 solution path and beacons` | `hint_solution*` на всех шагах ch0; tier4 Angelina → exact + `showSolutionPath` + `syncBeacon`; RU «Ирокез» в authority |
| **P1** монеты ~291 vs взнос 150 | — (design) | Сумма наград ch0 (~141 onboarding + side XP/coins) + пропорциональное кладбище (`15+round(65×frac)`) — буфер под частичную оплату и arcade cap; не prod-save |
| **P1** тесты char-pick flake | `test: stable char select wait` | `waitForCharSelectReady` в helpers; `p0-first-10min` / `newcomer-no-force` |
| **P1** честный e2e | `test: honest first10 playwright smoke` | `npm run test:honest-first10-e2e` — только клавиши/тапы, 1440+390, F5; **AUTOMATED**, не human |

## P2 (частично в этом цикле)

| Пункт | Статус |
|-------|--------|
| Start overlay текст «глава 0» в ch1 | **исправлено** `start_game_body_ch1` + `refreshStartOverlayCopy` |
| «Рейзор: Рейзор:» | **исправлено** dedupe в `speech-bridge` / story speak |
| Мохок vs Ирокез | **исправлено** RU objective → Ирокез (`CHARACTERS.md`) |
| Улица двойной тап, Мохок spam 10s, Angelina panel после этапа 1, intro+how-to stack, EN how-to in RU, lang on char pick, ложный +5, камера кухни | **открыто** — вне критического пути R4 или требует отдельного тикета |

## Legacy backlog

| ID | Описание | Статус |
|----|----------|--------|
| P0-D01 | `q_ch1_authority` отдельный quest-id | TODO(CANON-V3) |
| P0-D02 | Третий путь прописки | TODO(CANON-V2) |
| P0-D03 | `ch4_s_album` | TODO(CANON-E) |
| P0-D04 | Озвучка Ангелины | spec pending — не встраивать |
| P1-D01..D03 | пёс/кладбище/4/4 | см. R4 QA §1 (cb9337d) |

## Команды

```bash
npm run test:honest-first10-e2e
npm run test:newcomer-no-force
npm run test:p0-first-10min
npm run test:p1-gameplay-economy
```

Артефакты honest e2e: `artifacts/honest-ch01-emulator-e2e/` или `/opt/cursor/artifacts/honest-ch01-emulator-e2e/`.

## R6 branch (`cursor/scenario-preview-r6-d81d`, от `492d464`)

| Пункт P2 R4 | Коммит | Проверка |
|-------------|--------|----------|
| Двойной тап «Улица» из кухни | `f867bd6` | `goLocation('street')` цепляет лифт→улица |
| «Насмешки» до Рейзора | `f867bd6` | `razor_bridge_seen` + gate Mohawk stage1 / proximity |
| Повтор приветствия Мohawk ~10s | `f867bd6` | `s1ProximityShown` once |
| Start F5 в ch1 = «глава 0» | `f867bd6` | `ch1_started`, `refreshStartOverlayCopy` on load |
| «Рейзор: Рейзор:» (stage1 body) | `f867bd6` | убран ручной префикс в `openStage1Dialog` |
| intro + how-to одновременно | `f867bd6` | chapter intro finish → how-to; блок при active intro |
| EN how-to в RU | `f867bd6` | `onLanguageChanged` перерисовывает how-to |
| Язык на char select | `f867bd6` | `#langCorner` скрыт при `#charSelect.active` |
| Панель Angelina после этапа 1 | `f867bd6` | сброс tier/body при смене `auth.stage` |
| E — погладить у TV/зеркала | `492d464`+`f867bd6` | `interact-priority` prop steps |
| Субтитры pointer-events | `492d464` | `.voice-subtitle { pointer-events: none }` |
| Камера кухни | `f867bd6` | мягче spawn sync в `world3d.mjs` |
| Ложный +5 / +3 без монет | `492d464` + `b367a48` | pet toast только при награде; trash toast только при +coins |
| **Честный e2e ch0→ch1** | `9c6d09f`…`1f4b151` | `npm run test:honest-ch01-emulator-e2e` (AUTOMATED); см. exit code в CI/агенте |
| **Human phone playtest kit** | `docs/release/PLAYTEST_NEW_PLAYER_PHONE.md` | **не выполнялся** — только инструкция для живого теста |

Smoke `test:honest-first10-e2e` на **`492d464`** — не полный проход (snapshot cheat / 3×E); заменён `test:honest-ch01-emulator-e2e`.
