# PUNK ME — настройка аккаунтов (OWNER ACTION: Inna)

**Код:** `living3d-v22r5-accounts` · **Правила в репозитории не деплоятся автоматически** — шаги ниже для Firebase Console.

## 1. Authentication → Sign-in method

В [Firebase Console](https://console.firebase.google.com/) → проект **punk-me-40605** → **Authentication** → **Sign-in method**:

| Провайдер | Действие |
|-----------|----------|
| **Anonymous** | Оставить **Enabled** (гости + апгрейд uid) |
| **Google** | **Enable**, support email, при необходии OAuth client для Web |
| **Email/Password** | **Enable** (Email + Password) |

## 2. Authorized domains

**Authentication** → **Settings** → **Authorized domains** — добавить:

- `halloween.punk.contractbot.dk`
- `localhost` (для локальных тестов)
- домен Firebase Hosting по умолчанию (`punk-me-40605.firebaseapp.com`, `punk-me-40605.web.app`)

## 3. Realtime Database → Rules

Скопировать содержимое `database.rules.json` из репозитория в **Realtime Database** → **Rules** → **Publish**.

### Суть diff (от текущего production)

| Путь | Было | Стало |
|------|------|--------|
| `players` `.read` | `true` (все читают всех) | только **owner** `garum2008@gmail.com` + `email_verified` |
| `players/$uid` `.read` | (наследовалось) | `auth.uid === $uid` — игрок читает **только свой** save |
| `players/$uid` `.write` | без изменений по смыслу | свой uid или owner |

Игра для мультиплеера в локации использует **`presence/`** (по-прежнему `.read: true`), не полный список `players`.

**Важно:** пока rules не опубликованы, owner.html может не показать счётчик игроков; вход игроков по-прежнему работает со старыми rules.

## 4. Проверка после включения провайдеров

1. Открыть игру → **Войти** → Google или Email.
2. Гость с прогрессом → привязать email → **тот же uid** в Firebase Auth → данные в `players/{uid}` на месте.
3. Другой браузер → войти тем же email → тот же save.
4. **Выйти** → новый anonymous uid, старый save в Firebase **не удаляется**.
5. `owner.html` → вход owner Google/email verified → таблица игроков (после deploy rules).

## 5. Что не делает этот релиз

- Не подключает оплату / подписку.
- Не меняет тексты 13+, 4,99 €, parental consent на `subscribe.html`.
- Не удаляет anonymous saves и не мигрирует чужие uid автоматически при конфликте аккаунта (игрок выбирает: войти в существующий или остаться гостем).

## 6. Тесты в CI

```bash
npm run test:loading
npm run test:loading-early-save
npm run test:accounts
```

Email/Google link-тесты в `test:accounts` помечаются **SKIP** с `auth/operation-not-allowed`, пока провайдеры не включены.
