# PUNK ME — настройка аккаунтов (OWNER ACTION: Inna)

**Код:** `living3d-v22r5-accounts-r1` · Правила и хостинг **не деплоятся** из этого PR автоматически.

## ⚠️ Порядок выкладки (обязательно)

**Новые `database.rules.json` публиковать только вместе с этим кодом на production (или сразу после него).**

| Если сделать только… | Что сломается |
|----------------------|----------------|
| **Только rules** (старый JS ещё live) | Старый клиент читает весь `players` → **PERMISSION_DENIED**, список игроков / глобальный онлайн |
| **Только код** (старые rules) | Игра работает; `owner.html` не видит всех игроков до публикации rules — **ожидаемо** |

### Рекомендуемая последовательность

1. Задеплоить **статику** с `living3d-v22r5-accounts-r1` (presence-based multiplayer, аккаунты).
2. В течение **той же сессии** (или сразу после) → Firebase Console → **Realtime Database** → **Rules** → вставить `database.rules.json` → **Publish**.
3. Включить провайдеры Auth (ниже) и authorized domains.
4. Smoke: игра, вход гостя, owner.html под owner-аккаунтом.

### Откат (rollback)

1. **Rules:** в Console вернуть **текст rules, скопированный до публикации**, или вкладка **Rules** → **History**. Не использовать `live-published-open.json` (не совпадает с live).
2. **Сайт:** откатить хостинг на предыдущий релиз (`living3d-v22r4-loadfix` или последний стабильный).
3. Порядок отката: можно сначала **rules** (старый JS снова читает `players`), затем статику — или одновременно. Не оставлять новые rules + старый JS надолго.

---

## 1. Authentication → Sign-in method

В [Firebase Console](https://console.firebase.google.com/) → проект **punk-me-40605** → **Authentication** → **Sign-in method**:

| Провайдер | Действие |
|-----------|----------|
| **Anonymous** | **Enabled** |
| **Google** | **Enable** |
| **Email/Password** | **Enable** |

## 2. Authorized domains

`halloween.punk.contractbot.dk`, `localhost`, `punk-me-40605.firebaseapp.com`, `punk-me-40605.web.app`

## 3. Realtime Database → Rules

Содержимое `database.rules.json` из репозитория — **после** деплоя кода (см. выше).

| Путь | Было | Стало |
|------|------|--------|
| `players` `.read` | `true` (live) | только `auth.token.admin === true` |
| `players/$uid` `.read` | часто публично (live) | `auth.uid === $uid` или admin |
| `publicProfiles/$uid` | — | публично: name, avatar, coins |

Мультиплеер в локации: **`presence/`** (`.read: true`).

## 4. Проверка

1. Гость → **Войти** → link Google/email → тот же **uid**.
2. Другой браузер → тот же аккаунт → тот же save.
3. **Выйти** → новый anonymous; старые данные в RTDB не удаляются.
4. `owner.html` — Google sign-in + **admin Custom Claim**:

   ```bash
   gcloud auth application-default login
   gcloud auth application-default set-quota-project punk-me-40605
   node scripts/set-admin-claim.mjs --email garum2008@gmail.com
   ```

   Без JSON-ключей в репозитории; можно из **Google Cloud Shell** на Mac владельца.

5. Перед публикацией rules: `docs/release/RULES_PUBLISH_CHECKLIST.md` (скопировать **текущие** rules из Console для отката).

### Резервная копия `/players` (только чтение)

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project punk-me-40605
node scripts/backup-players-export.js
```

## 5. Тесты

```bash
npm run test:loading
npm run test:loading-early-save
npm run test:accounts
node scripts/capture-accounts-qa.js
```

Email/Google link — **SKIP** до включения провайдеров.
