# REQUIREMENTS_MATRIX — MASTER TZ (2026-10-25)

Пункт ТЗ → реализация → проверка → статус.  
Дефекты аудита §3: ссылки **`DEFECTS.md`** (`D-*`).

**Интеграция:** ветка `cursor/scenario-preview-d81d` (единый preview), commit `e5de1fb`.  
**Production / rules:** не публиковать до «приёмка подтверждена» (Инна).

---

## Этап 1 — §3 Ошибки аудита (текущий фокус)

| ТЗ §3 | Реализация | Проверка | Статус |
|-------|------------|----------|--------|
| Сохранение после отказа покупки | `js/game.js` `buyItem` | Playwright shop flow | в разработке → D-SAVE-01 |
| Нет undefined в save | `sanitizePlayer`, migrate | `player-save-fixtures`, rules tests | в разработке → D-SAVE-02 |
| Подтверждённое «Сохранено» | TBD save ack | manual + test | не сделано → D-SAVE-03 |
| Ошибка записи + retry | `showLoadingFailure`, save catch | `test:loading` | частично → D-SAVE-04 |
| Сменить героя | `CharSelect`, `changeCharacter` | accounts test | работает → D-UI-01 |
| Голос | `audio-manager`, Piper, `speech-bridge` | `test:voice-narrator`, mp4 QA | в разработке → D-UI-02 |
| Язык RU/EN/DA (+ UK позже §11) | `i18n.js`, `#langCorner` | voice-narrator test | в разработке → D-UI-03 |
| Раскладка / WASD | input modules | desktop test | в разработке → D-INPUT-01 |
| Текстовый ввод | forms guard | manual | в разработке → D-INPUT-02 |
| Мобильный HUD | `css/game.css`, chat toggle | site-check QA | в разработке → D-MOB-01 |
| Touch controls | `touch-controls`, world3d | mobile WebKit | в разработке → D-MOB-02 |
| Победа → квест/обучение | `onboarding.js`, duel hooks | `test:duel-onboarding` | работает → D-GAME-01 |
| Presence / profiles rules | `database.rules.json` | `npm run test:rules` | готово в репо → D-RTDB-01/02 |
| Prod rules mismatch | `FIREBASE_RULES_RELEASE.md` | live deny logs | ждёт выкатки → D-RTDB-03 |
| WebGL boot copy | `js/loading-screen.js` | `npm run test:loading` | работает → D-WEBGL-01 |
| Тесты изолированы от prod | emulator env, docs | CI scripts | в разработке → D-TEST-01 |

---

## §15 Сохранения (пересечение с этапом 1)

| Требование | Реализация | Проверка | Статус |
|------------|------------|----------|--------|
| Гость → аккаунт без потери | `player-save-merge.mjs`, link uid | `test:accounts` | в разработке |
| Поля onboarding/settings/dialogueHeard | `game.js` migrate + sanitize | reload test | в разработке |
| Rules: новые поля optional | `database.rules.json` | `test:rules` | работает |

---

## §19–20 Публикация и rules (подготовка)

| Требование | Реализация | Проверка | Статус |
|------------|------------|----------|--------|
| Файл правил в репо | `database.rules.json` | diff review | готово |
| Эмулятор: гость/свой/чужой | `scripts/test-database-rules.js` | `npm run test:rules` | готово |
| Снимок prod для отката | `prod-rollback-2026-10-25.json` | owner refresh pre-go | готово (baseline) |
| Порядок выкатки | `FIREBASE_RULES_RELEASE.md` | deploy-order test | документировано |
| Публикация rules | — | только после приёмки | **заблокировано** |

---

## Следующие этапы (кратко, не начаты)

| Этап | § TZ | Статус |
|------|------|--------|
| 2 Механики | 7, 8, 13, 14, 15 | не начато |
| 3 Сюжет 0–4 | 6, 9 | частично в `story-engine` |
| 4 Звук + 4 языка + Ангелина | 10–12 | звук в работе |
| 5 Creator Mode | 16 | не начато |
| 6 Настройки/perf | 17 | не начато |
| 7 Приёмка §18 | 18 | не начато |

_Матрица обновляется в конце каждого этапа с commit hash и preview URL._
