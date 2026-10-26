# PR #43 — честный прогон на эмуляторе (без `?dev=1`)

**URL:** `?solo=1&firebaseEmulator=1`  
**Runner:** `FIREBASE_EMULATOR=1 PUNK_BASE=http://127.0.0.1:3456 node scripts/honest-emulator-scenario-run.js`  
**Артефакты:** `/opt/cursor/artifacts/scenario-ch01/honest-*.png` (не в git)

## Исправления в игре (не раннер)

| ID | Проблема | Фикс |
|----|----------|------|
| D-ONBOARD-02 | `talk_razor` не закрывался | `tryStoryNpc` учитывает `trigger.conditions` → legacy Razor + `onTalkRazor` |
| D-UI-02 | howTo / chapter intro / shop modal блокируют HUD | `dismissTutorialBlockingOverlays` при travel; `openModal` закрывает другие modals; `buyItem` закрывает shop |
| D-AUTH-01 | Церемония нашивки не открывалась после trials | `tryAuthorityNpc` razor: `stage>=3` + `stage3Complete` + authority≥80 |

## Подтверждённые чекпоинты (эмулятор, v9–v10)

| Шаг | Скрин |
|-----|--------|
| Комната / cobalt | `honest-01-room-boot.png` |
| Move | `honest-02-move-done.png` |
| Улица | `honest-03-street.png` |
| Razor talk (step→3) | `honest-04-razor-talk.png` |
| Кладбище | `honest-05-cemetery.png` |
| Дуэль | `honest-06-duel-win.png` |
| Лавка | `honest-07-shop.png` |
| `onboarding.done` | `honest-08-onboarding-done.png` |
| Authority trials | `honest-09-ch3-4-authority.png` |
| Razor initiation dialog | `honest-10-razor-initiation-dialog.png` |

Полный прогон (нашивка → hangout 4 → финалы): см. `honest-run-log.json` после успешного `honest-full-v11`.
