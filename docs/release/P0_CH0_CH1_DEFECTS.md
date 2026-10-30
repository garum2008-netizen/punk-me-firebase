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

Артефакты honest e2e: `artifacts/honest-first10-e2e/` или `/opt/cursor/artifacts/honest-first10-e2e/`.
