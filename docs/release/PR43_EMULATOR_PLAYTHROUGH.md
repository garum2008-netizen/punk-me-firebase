# PR #43 — честный прогон на эмуляторе (без `?dev=1`)

**URL:** `http://127.0.0.1:3456/?solo=1&firebaseEmulator=1`  
**Runner:** `FIREBASE_EMULATOR=1 PUNK_BASE=http://127.0.0.1:3456 node scripts/honest-emulator-scenario-run.js`  
**Артефакты:** `/opt/cursor/artifacts/scenario-ch01/honest-*.png` (не в git)

## Исправление D-ONBOARD-02

`dlg_razor_initiation` требует `onboarding:done`, но `tryStoryNpc` раньше открывал его на шаге `talk_razor` → `Onboarding.onTalkRazor` не срабатывал как ожидалось.  
**Фикс:** `checkRequires(d.trigger?.conditions)` при выборе диалога в `story-engine.mjs`.

## Цепочка раннера

1. Онбординг: move → street → Razor (gang) → cemetery → duel → shop → `done`
2. Инициация (`finishInitiationUi`) → `joined_gang`
3. Hangout stages 1–4 (`buildAllHangoutStages`)
4. Authority path (гл.3–4 UI)
5. `graph_confession_done` → выбор финала → скрин

Лог: `honest-run-log.json` в каталоге артефактов.
