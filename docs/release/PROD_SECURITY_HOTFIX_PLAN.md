# Production security hotfix — план (независим от релиза сюжета)

**Ветка:** `cursor/prod-security-hotfix-d81d` (от `main` @ `450d6da`, **не** PR #43).  
**Draft PR:** [#45](https://github.com/garum2008-netizen/punk-me-firebase/pull/45)  
**Статус:** **не публиковать** без GO владельца.

## Клиент: GitHub Pages, не Firebase Hosting

Публичный сайт собирается из **`main` → GitHub Pages** (корень репозитория).  
`firebase.json` → `hosting` **не используется** для прод-сайта; блок `hosting.ignore` на Pages **не влияет**.

| Действие | Правильно |
|----------|-----------|
| Выкатить client hotfix (`js/game.js`) | Merge PR #45 (или cherry-pick) в **`main`** → дождаться Pages build |
| Откатить client | **`git revert`** merge-коммита на `main` **или** тег/ветка backup на `450d6da` + reset Pages source |
| ~~`firebase deploy --only hosting`~~ | **Не применимо** к текущему прод-сайту |

### Что станет доступно на Pages из PR #45

В репозитории лежат `docs/release/*`, `scripts/*` — при Pages из корня они **теоретически скачиваемы по URL**, если путь угадать. В #45 **нет** секретов, service-account, полных UID.  
В `list-test-artifacts.mjs` убраны примеры с реальными email; отчёты владельца (`prod-readonly-snapshots/`) **не коммитить**.

## RTDB rules: prod ≠ git `main`

**Факт (владелец, 25.10 ~22:24 UTC):** анонимный REST **читает** `/players`; `/presence`, `/publicProfiles`, `/chat`, `/buildings` — **permission denied**.

Файл `database.rules.json` в git (и `scripts/rules-deploy-snapshots/main-450d6da-pre-hotfix.json`) описывает **желаемую** модель, **не** текущий prod.  
**Полный** `firebase deploy --only database` с git-файлом изменит не только `premium`, но и, например, **откроет** чтение `presence`/`chat`/`publicProfiles`/`buildings`, если в prod они закрыты.

### Шаг 0 (обязательно, владелец, read-only)

Одна сессия Cloud Shell (ADC, без записи в RTDB):

```bash
chmod +x scripts/owner-readonly-check.sh
./scripts/owner-readonly-check.sh
```

Скрипт выполняет:

1. **Экспорт live rules** → `docs/release/prod-readonly-snapshots/rtdb-rules-prod-<timestamp>.json`  
   (команда внутри: `firebase database:rules:get --project punk-me-40605`)
2. **`npm run list:test-artifacts`** с окном по умолчанию `2026-10-24T00:00:00Z/2026-10-26T00:00:00Z`
3. **`node scripts/list-test-artifacts.mjs --auth-stats`** (только счётчики пользователей)

**Откат rules после hotfix** = redeploy файла из шага 0, **не** `main-450d6da-pre-hotfix.json`.

Рекомендуемый порядок после экспорта:

1. **`npm run build:hotfix-rules -- --input=docs/release/prod-readonly-snapshots/rtdb-rules-prod-*.json`** — патч только `/players` + `premium`/`entitlements`/`qa`; presence/chat/publicProfiles/buildings **не трогает** (остаются как в live).
2. Просмотреть stdout **diff (live → hotfix)** и файл `scripts/rules-deploy-snapshots/rtdb-rules-hotfix-from-live.json`.
3. **`npm run build:hotfix-rules -- --input=... --test`** (или `--model-audit --test` без live export) — эмулятор на итоговых rules.
4. Только затем `firebase deploy --only database` с **hotfix-from-live** (после GO), **не** с корневым `database.rules.json` из git.

Пошаговые команды Cloud Shell: [`TESTING_CLOUD_SHELL.md`](./TESTING_CLOUD_SHELL.md).

## Цели hotfix (PR #45)

| # | Защита | Где |
|---|--------|-----|
| 1 | `?dev=1` / `punkme_dev` / `?qa=1` не дают читы на prod-хосте | `js/game.js` |
| 2 | `saveMe()` no-op на prod при dev/qa | `prodDevWriteBlocked()` |
| 3 | `undefined` не в RTDB update | `stripUndefinedDeep` + `npm run test:save-sanitize` |
| 4 | Клиент не выставляет `premium` / `entitlements` / `qa` (в т.ч. **SET** всего `players/{uid}`) | `database.rules.json` |
| 5 | Сохранение владельца с уже выставленным admin `premium:true` | validate: unchanged value allowed |
| 6 | Capture не бьёт prod | `scripts/lib/guard-no-prod-firebase.js`, `require-local-capture.js` |

Скрипты: `npm run list:test-artifacts` (файл `scripts/list-test-artifacts.mjs`).

## Тесты (эмулятор)

```bash
npm ci
npm run test:save-sanitize
npm run test:rules
```

Лог последнего прогона: `docs/release/RULES_EMULATOR_LAST_RUN.md` (обновляется при CI/агенте).

### Влияние на клиент `main` @ `450d6da`

| Путь RTDB | Использование в `game.js` | Если применить git rules как есть |
|-----------|---------------------------|-----------------------------------|
| `/players` root | **Нет** (только `players/{uid}`) | Закрытие публичного чтения **не ломает** гостевой старт/save/F5 |
| `/presence/{loc}` | Да, список в локации | Prod сейчас deny anon — git **открывает** read → нужен merge с prod export |
| `/publicProfiles` | `saveMe` set own | Prod deny — git allow write own |
| `owner-admin.mjs` `/players` | Только owner UI | Нужен `auth.token.admin` |

Новый клиент #45: тот же контракт + блок dev-записи на prod.

## Публикация (после GO)

1. Merge #45 → `main` (client → Pages).
2. Rules: deploy **патча от prod export**, не слепой git file (см. шаг 0).
3. Smoke: prod без `?dev=1` — save OK; с `?dev=1` — запись заблокирована (после деплоя client).

## Откат

| Слой | Откат |
|------|--------|
| Client (Pages) | `git revert` merge на `main` или восстановить `main` с тега `backup-450d6da` |
| RTDB rules | `firebase deploy --only database` с `rtdb-rules-prod-<timestamp>.json` из шага 0 |

## Связь с PR #43

Сюжет и QA-артефакты — только PR #43 (Draft). Security — только #45.
