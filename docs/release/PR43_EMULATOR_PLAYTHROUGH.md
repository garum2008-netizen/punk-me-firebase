# PR #43 — честный прогон на эмуляторе (без `?dev=1`)

**URL:** `?solo=1&firebaseEmulator=1`  
**Runner:** `SCENARIO_CACHE=honest-full-v12 FIREBASE_EMULATOR=1 PUNK_BASE=http://127.0.0.1:3456 node scripts/honest-emulator-scenario-run.js`  
**Артефакты:** `/opt/cursor/artifacts/scenario-ch01/v12-*.png` (не в git)

## Исправления в игре (не обходы раннера)

| ID | Проблема | Фикс |
|----|----------|------|
| D-ONBOARD-02 | `talk_razor` не закрывался | `tryStoryNpc` + `trigger.conditions` |
| D-UI-02 | Overlays блокируют HUD | `dismissTutorialBlockingOverlays`, shop close |
| D-AUTH-01 | Нашивка под story-scene | z-index, overlays в `runInitiationCeremony` |
| D-CH3-01 | `bell_rim` без сцены (stale `job_cemetery_done`) | `unique:bell_rim`, repair на кладбище |
| D-CH4-01 | Язык колокола | `tryTongueQuest` на `onLocationChange` |
| D-CH4-02 | Концерт под canvas | `#concertPrep` z-index; organ `advanceOrganPuzzle` |
| D-STORY-03 | Граф / confession | `trigger.flag` в `tryStoryNpc` |

## Чекпоинты v12 (`ending_break_curse` — PASS)

| Шаг | Скрин |
|-----|--------|
| Онбординг 0–5 | `v12-break_curse-02` … `08` |
| Authority + нашивка | `09`, `10-initiation-patch` |
| Тусовка этап 4 | `11-hangout-stage-4` |
| Гл.3 Обод | `12-ch3-bell-rim` |
| Гл.4 Язык / замок / корона / концерт | `13` … `16` |
| Признание Графа | `17-count-confession` |
| Выбор финала | `18-ending-choice` |
| Финал | `19-ending-ending_break_curse` |
| F5 | `20-after-f5` |
| Пост-игра | `21-free-play` |

Три финала (`ending_zombie_style`, `ending_count_deal`) — отдельные прогоны тем же раннером (без `HONEST_ENDINGS`). Лог: `honest-run-log.json`.
