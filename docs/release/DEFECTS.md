# Реестр дефектов — единая таблица (Инна t99u / t104u)

**Ответственный за интеграцию:** агент на ветке `cursor/scenario-preview-d81d`.  
**Базовая линия:** `main` @ `450d6da` (live build `living3d-v22r5-accounts-r1`); preview HEAD — см. PR [#43](https://github.com/garum2008-netizen/punk-me-firebase/pull/43).

| ID | Находка | Источник | Ответственный | Воспроизведён | Исправлен (коммит) | Повторно проверен |
|----|---------|----------|---------------|---------------|-------------------|-------------------|
| D-SAVE-01 | Покупка без монет → `undefined` в earn → save ломается | аудит live / Инна | интеграция | local: buyItem + RTDB reject | `earn-state.mjs`, snack path, `b370d70+` | `npm run test:save-sanitize`, `test:earn-state` — PASS; браузер — pending |
| D-SAVE-02 | RTDB payload с `undefined` | аудит | интеграция | да | `stripUndefinedDeep` | unit PASS |
| D-SAVE-03 | Нет «Сохранено» после commit | отчёт B | интеграция | prod main да | `updateSaveStatusUi`, `#saveStatus` | preview — pending |
| D-SAVE-04 | Ошибка save не видна | отчёт B | интеграция | да | `.catch` + toast | pending |
| D-UI-01 | Смена героя / mute → EN | аудит | интеграция | да на main | `lang-btn[data-lang]` only | pending |
| D-INPUT-01 | WASD/E по раскладке | аудит | интеграция | RU E на main | `e.code` controls + decor | pending |
| D-MOB-01 | Чат на «?» | аудит | интеграция | mobile CSS | chat `top:48px` | эмуляция — pending |
| D-MOB-02 | Джойстик | аудит | интеграция | да | `touchActive` controls | телефон — Инна |
| D-TEST-01 | Тесты в prod RTDB / `?dev=1` записи 24–25.10 | отчёт / Инна | интеграция + владелец ADC | 25.10 следы 9999 coins | `guard-no-prod-firebase`, `require-local-capture`, client `prodDevWriteBlocked` | отчёт `PROD_DEV1_AUDIT_2026-10-24_25.md`; list-test-artifacts — владелец |
| D-RTDB-04 | GET `/players` публично | REST аудит | владелец+rules | да live | rules в repo, не deploy | после приёмки |
| D-RTDB-05 | `premium` клиентом | отчёт B | интеграция | код | rules validate admin | emulator rules test |
| D-ONBOARD-01 | Нет авто-обучения | отчёт B | интеграция | main да | preview: intro+6 steps | preview pending |
| D-ONBOARD-02 | `talk_razor` (step 2): `dlg_razor_initiation` без `onboarding:done` → шаг не сдвигался | честный эмулятор PR #43 | интеграция | да | `checkRequires` на `trigger.conditions` в `tryStoryNpc` | онбординг 6/6 PASS (honest v9) |
| D-UI-02 | howTo / chapter intro / shop modal блокируют Gang/HUD | честный эмулятор | интеграция | да | `dismissTutorialBlockingOverlays`, `openModal`, `buyItem` close shop | онбординг + authority скрины |
| D-AUTH-01 | `#authInitBtn` не появлялся после trials при Razor | honest v10 | интеграция | да | `tryAuthorityNpc` + `runInitiationCeremony` gate | pending v11 E2E |
| D-QUEST-01 | Квест не после F5 | отчёт B | интеграция | main | `QUEST_TABLE` + engine | pending |
| D-STORY-01 | Нет 3 концовок | t104u | интеграция | preview код | `story-endings.mjs` + `story-scenes.mjs` + UI | браузер честное прохождение — pending |
| D-STORY-02 | Замок не в 3D | MASTER TZ | интеграция | WIP `castle` локация | — | частично: двор 3D, орган, концерт; **не** приёмка |
| D-BUILD-01 | Стройка построек WIP | t104u | интеграция | да | `build_wip` toast | да (код) |
| D-MONO-01 | Terms/Privacy draft | t104u | интеграция | да | v2026-10-25 terms/privacy | pending |
| D-MONO-02 | Stripe sandbox | t104u | интеграция | — | `functions/stripe-sandbox/`, subscribe disabled on prod host | live pay OFF |
| D-I18N-UK | Нет UK | MASTER §11 | интеграция | частично | lang UK + fallback ru | pending полный перевод |
| D-VOICE-01 | Модели Piper (irina) | t104u | интеграция | — | `VOICE_MODEL_ACCEPTANCE.md` | samples pending |

_Отчёт PDF ≠ доказательство; строка «Повторно проверен» заполняется только после браузера/устройства._
