# PR #43 — честный прогон на эмуляторе (без `?dev=1`)

**Дата:** 2026-10-25  
**URL:** `http://127.0.0.1:3456/?solo=1&firebaseEmulator=1` (без `dev=1` / `qa=1`)  
**Скрипт:** `FIREBASE_EMULATOR=1 PUNK_BASE=http://127.0.0.1:3456 node scripts/honest-emulator-scenario-run.js`  
**Артефакты (не в git):** `/opt/cursor/artifacts/scenario-ch01/honest-*.png`, `honest-run-log.json`

## Гл.0–1 (частично)

| Чекпоинт | Файл | Состояние |
|----------|------|-----------|
| Выбор персонажа | `honest-00-char-select.png` | OK, anon + emulator |
| Старт в комнате | `honest-01-room-boot.png` | OK |
| Онбординг move (step 0→1) | `honest-02-walk-r4-step1.png` | OK после ходьбы WASD |
| Улица | `honest-03-street.png` | OK, `location=street` |
| Конец цикла ch0 | `honest-04-ch0-end.png` | **step 2** (`talk_razor`), onboarding не завершён |

**Не дойдено в этом прогоне:** разговор с Razor, дуэль, лавка, `onboarding.done`, активный `story.quest` для гл.2.

## Тусовка / гл.3–4 / финалы

Попытка `buildAllHangoutStages` без открытого сюжетного квеста → **timeout** на `navGo('construction')` (`honest-99-error.png`).  
Ожидаемо: сначала завершить онбординг + цепочку гл.1–2, затем hangout stages 1–4.

## Следующие шаги (PR #43)

1. Доработать `honest-emulator-scenario-run.js`: `openGangNpc('razor')`, `winFightUi`, shop, дождаться `onboarding.done`.
2. Старт `q_ch2_*` / construction только после `StoryEngine` gate.
3. Повторить hangout 4 этапа + authority path + финалы; скрины в тот же каталог артефактов.

**Prod:** не трогали. **Merge/publish:** нет.
