# Аудит записей `?dev=1` в production RTDB (24–25.10.2026)

**Хост production:** `halloween.punk.contractbot.dk` / Firebase project `punk-me-40605` (RTDB `europe-west1`).  
**Интеграционная ветка:** `cursor/scenario-preview-d81d` @ `bb5083d+`.

## Механизм риска (до исправления)

| Вектор | Поведение |
|--------|-----------|
| Браузер `?dev=1` / `localStorage.punkme_dev` на live | `devCoinsEnabled()` → **9999** монет, ускоренный прогресс, **`saveMe()` пишет в `players/{uid}`** |
| Playwright `capture-*.js` с `PUNK_BASE=https://halloween…` и `?dev=1` | Полный цикл игры с записью в prod RTDB |
| `test-accounts-auth.js` без эмулятора | Писал в prod (исправлено ранее) |

## Подтверждение: запись прекращена (код preview)

| Слой | Мера | Коммит / файл |
|------|------|----------------|
| Клиент | `isProductionFirebaseClient()` — dev/qa **не дают** чит-монеты | `js/game.js` |
| Клиент | `prodDevWriteBlocked()` — **`saveMe()` no-op** при dev/qa на prod | `js/game.js` |
| Скрипты RTDB | `FIREBASE_EMULATOR=1` обязателен для `test:accounts` | `scripts/test-accounts-auth.js` |
| Скрипты URL | `guard-no-prod-firebase.js` — `PUNK_BASE` только localhost; `PUNK_ALLOW_PROD_TESTS` всегда exit 2 | `scripts/lib/` |
| Capture | `require-local-capture.js` на всех `capture-*` / `qa-release*` / `proof-*` с `?dev=1` | этот коммит |
| Live smoke | `verify-live-playable.js` — **без** `?dev=1`, read-only UI | `scripts/verify-live-playable.js` |

**Деплой правил RTDB (`premium`, блок `qa`) в prod — не выполнялся** (только репозиторий).

## Кто / что (24–25.10) — атрибуция

| Наблюдение | Источник | Вывод |
|------------|----------|--------|
| Строки `players/*` с **9999** монет, `dev`-подобный прогресс | Аудит Инны / REST 25.10 | Типичный след **`?dev=1` + saveMe на live** до client-guard |
| Окно **25.10 ~22:22–22:23 CET** dev-записи | Отчёт владельца | **Не приписано** интеграционному агенту scenario-preview без логов Firebase; возможны ручной браузер, старый capture-скрипт или другой агент |
| Сессии **Cobalt** 25.10 13:24 / 14:04 / 14:44 | Упоминание в аудите | Без correlation id в RTDB — **источник не установлен** агентом |
| `punktest+1792953969532@contractbot.dk` | `TEST_SCRIPTS_DATA.md` | Легитимный **test:accounts** (свой uid); после guard — только эмулятор |
| Анонимы **25.10 18:00–20:00 UTC** | Запрос Инны | Идентификация: `npm run list:test-artifacts -- --anon-window=2026-10-25T18:00:00Z/2026-10-25T20:00:00Z` (**требует ADC владельца**, read-only) |

### Действия интеграционного агента (scenario-preview)

- После `b370d70`: **намеренных** заходов на live с `?dev=1` и записью — **нет** (политика `PROD_TEST_POLICY.md`).
- Тесты и записи — только `127.0.0.1` + `FIREBASE_EMULATOR=1` (когда запускались).

## Рекомендация владельцу

1. Один раз выполнить `list-test-artifacts` с ADC на prod для email и anon-window (см. выше).  
2. Не удалять следы без отдельного OK.  
3. После «приёмка подтверждена» — опубликовать rules из репо + задеплоить preview с client-guard на live.
