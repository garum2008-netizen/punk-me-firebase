# PR #45 — проверки в Google Cloud Shell (с нуля)

**Без GO владельца:** не выполнять `firebase deploy` (ни hosting, ни database).  
Публичный сайт — **GitHub Pages с `main`**, не Firebase Hosting.

## 1. Клон и зависимости

```bash
# Cloud Shell уже имеет git и Node 20+
git clone https://github.com/garum2008-netizen/punk-me-firebase.git
cd punk-me-firebase
git fetch origin cursor/prod-security-hotfix-d81d
git checkout cursor/prod-security-hotfix-d81d

# В репозитории нет закоммиченного package-lock.json (см. .gitignore) — `npm ci` не подходит.
npm install --no-audit --no-fund --ignore-scripts
```

`--ignore-scripts` достаточно для `owner:readonly-check`, `build:hotfix-rules` и unit/emulator-скриптов PR #45 (Playwright-браузеры для них не нужны). Для полного `npm run test:emulator` при необходимости: `npx playwright install chromium`.

## 2. Firebase CLI

Локальный CLI из `devDependencies` (после `npm install`):

```bash
npx firebase --version
```

Глобально (опционально, то же поведение):

```bash
npm install -g firebase-tools@13.29.1
firebase --version
```

## 3. Аутентификация Firebase CLI (rules export, будущий deploy)

Нужна для `firebase database:rules:get` и (после GO) `firebase deploy --only database`.

```bash
npx firebase login --no-localhost
# Cloud Shell: скопировать ссылку из терминала в браузер, войти аккаунтом владельца проекта

npx firebase projects:list | grep punk-me-40605
export FIREBASE_PROJECT=punk-me-40605
```

Проверка read-only (без записи в RTDB):

```bash
npx firebase database:rules:get --project punk-me-40605 | head -c 200
```

## 4. ADC для Admin SDK (`list-test-artifacts`, owner scripts)

Скрипты `scripts/list-test-artifacts.mjs` и эмуляторные тесты с `firebase-admin` в Cloud Shell используют **Application Default Credentials** пользователя Cloud Shell:

```bash
gcloud auth application-default login
gcloud config set project punk-me-40605
```

Проверка (только счётчики, без дампа UID в git):

```bash
node scripts/list-test-artifacts.mjs --auth-stats
```

## 5. Owner read-only сессия (экспорт live rules)

```bash
npm run owner:readonly-check
```

(внутри вызывается `npx firebase database:rules:get` — глобальный `firebase` не нужен)

Артефакты: `docs/release/prod-readonly-snapshots/rtdb-rules-prod-<timestamp>.json` — **не коммитить** в публичный репозиторий.

## 6. Собрать hotfix rules (не git `database.rules.json` целиком)

Минимальный патч поверх live export:

```bash
# после owner-readonly-check (или явный путь):
npm run build:hotfix-rules -- --input=docs/release/prod-readonly-snapshots/rtdb-rules-prod-YYYYMMDDTHHMMZ.json

# без live export — модель аудита prod (public /players, остальное deny):
npm run build:hotfix-rules -- --model-audit

# diff + эмулятор (локально в Cloud Shell; порты 9000/9099 свободны):
npm run build:hotfix-rules -- --model-audit --test
```

Выход: `scripts/rules-deploy-snapshots/rtdb-rules-hotfix-from-live.json` — **этот** файл (после ревью diff) для deploy rules, не `database.rules.json` из корня репо.

## 7. Остальные тесты PR #45

```bash
npm run test:save-sanitize
npm run test:rules
```

`test:rules` гоняет **git** `database.rules.json` (целевая модель в репо). Для prod-совместимого deploy используйте `build:hotfix-rules --test` (профиль `prod-hotfix` / модель аудита).

## 8. Deploy (только после явного GO владельца)

```bash
# НЕ ЗАПУСКАТЬ без GO
npx firebase deploy --only database --project punk-me-40605 \
  --config firebase.json \
  # подставить согласованный файл rules через временную подмену database.rules.json
# или: скопировать rtdb-rules-hotfix-from-live.json → database.rules.json только на время deploy
```

Client hotfix: merge PR #45 → `main` → GitHub Pages build (не `firebase deploy --only hosting`).

## 9. Откат rules

Redeploy файла `rtdb-rules-prod-<timestamp>.json` из шага 5 (до hotfix).
