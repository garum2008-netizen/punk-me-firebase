# Production security hotfix — план (независим от релиза сюжета)

**Ветка:** `cursor/prod-security-hotfix-d81d` (от `main` @ `450d6da`, **не** из PR #43).  
**Статус:** черновик PR — **не публиковать** rules/hosting без отдельного GO владельца.

## Цели

| # | Защита | Где |
|---|--------|-----|
| 1 | `?dev=1` / `localStorage.punkme_dev` / `?qa=1` **не дают 9999 монет** на prod-хосте | `js/game.js` `devCoinsEnabled` + `isProductionFirebaseClient` |
| 2 | Запись в RTDB с prod при dev/qa флагах **блокируется** | `prodDevWriteBlocked()` → `saveMe()` no-op |
| 3 | `undefined` не уходит в `players/{uid}.update` | `stripUndefinedDeep` + `npm run test:save-sanitize` |
| 4 | Клиент **не может** выставить `premium` / `entitlements` / `qa` | `database.rules.json` |
| 5 | Список `players` — только **admin**; игрок читает **только свой** `players/{uid}` | уже на `main` @ `450d6da`; зафиксировано в эмулятор-тестах |
| 6 | `publicProfiles`, `presence`, `chat`, `buildings` — без поломки текущей игры | тесты эмулятора + ручная smoke на preview |
| 7 | Playwright/capture **не бьют prod** | `scripts/lib/guard-no-prod-firebase.js` + `require-local-capture.js` |

## Снимок правил (репозиторий)

| Файл | Содержание |
|------|------------|
| `scripts/rules-deploy-snapshots/main-450d6da-pre-hotfix.json` | **Точная копия** `database.rules.json` с `main` @ `450d6da` (до hotfix) |
| `database.rules.json` (в hotfix PR) | Добавлены только `premium`, `entitlements`, `qa` под admin |

**Важно:** фактические правила в Firebase Console может отличаться от git. Сравнение **prod ↔ git** выполняет владелец (Console export или `firebase database:rules:get` с ADC).

## Тесты (только эмулятор)

```bash
npm ci
npm run test:save-sanitize
npm run test:rules    # Auth + Database emulators, test-database-rules.js + fixtures
```

Матрица `test-database-rules.js` (hotfix):

- unauth → deny read `players`, deny write `players/{uid}`
- alice → read/write own `coins`, deny bob's node
- admin → read `/players` root
- `publicProfiles` — read all, write only own uid
- **premium / entitlements** — client write **deny**
- (на `main` без расширенного набора) presence/chat/buildings — см. полный набор в PR #43; для hotfix достаточно не менять существующие правила кроме premium\*

**Старый клиент `main` @ `450d6da`:** после публикации **только rules** (без принудительного деплоя нового `game.js`) игра продолжит работать; новые поля premium по-прежнему недоступны клиенту. Деплой `game.js` с hotfix желателен для блокировки dev-записей.

## Публикация (после GO владельца)

1. Merge draft PR `cursor/prod-security-hotfix-d81d` → `main`.
2. **Rules first** (рекомендуется):
   ```bash
   firebase deploy --only database --project punk-me-40605
   ```
3. **Hosting** (client guards + hosting.ignore для qa):
   ```bash
   firebase deploy --only hosting --project punk-me-40605
   ```
4. Smoke: открыть live **без** `?dev=1`, убедиться что сохранение работает; с `?dev=1` на prod — в консоли предупреждение, RTDB не меняется.

## Откат одной командой

Вернуть rules к снимку до hotfix:

```bash
firebase deploy --only database --project punk-me-40605 \
  --config firebase.json \
  # положить main-450d6da-pre-hotfix.json как database.rules.json или:
  cp scripts/rules-deploy-snapshots/main-450d6da-pre-hotfix.json database.rules.json && \
  firebase deploy --only database --project punk-me-40605
```

Откат hosting: redeploy предыдущего release в Firebase Console → Hosting → Rollback.

## Расследование тестовых записей в prod RTDB

### Установленные источники (по признакам)

| Признак | Вероятный источник | Статус |
|---------|-------------------|--------|
| `coins: 9999`, полный прогресс, даты 24–25.10.2026 | Браузер `?dev=1` + `saveMe` на live до client-guard | Закрывается hotfix `game.js` |
| Playwright `capture-*.js` с `PUNK_BASE` на halloween | CI/агент до `require-local-capture` | Закрывается guard в скриптах |
| `punktest+*@contractbot.dk` | Осознанные QA-аккаунты | Инвентаризация владельцем |

### Источник **не установлен** (нужны логи RTDB)

| Наблюдение | Почему неясно | Как закроет владелец |
|------------|---------------|----------------------|
| Анонимные `players/*` с аномальными монетами **без** 9999 и **без** dev-меток | Нет audit log по uid в репо | **Одна команда (read-only):** Cloud Shell + ADC → `npm run list:test-artifacts -- --anon-window=2026-10-24T00:00:00Z/2026-10-26T00:00:00Z` — список uid (хеш/префикс), coins, `lastSeen`, без выгрузки PII в PR |
| Записи `presence/*` от «probe» | Не привязаны к скрипту в git | Тот же `list:test-artifacts` + сопоставление `ts` с deploy/capture логами |
| `publicProfiles` с несоответствием `players` | Мог быть частичный save / старый клиент | Выборочная сверка через admin SDK (владелец) |

Скрипт: `scripts/list-test-artifacts.mjs` — **только чтение**, без delete.

## Связь с PR #43

PR #43 (сюжет) **не мержить** для security. Этот пакет — минимальный diff от `main`. После GO можно выкатить hotfix раньше релиза гл.0–4.
