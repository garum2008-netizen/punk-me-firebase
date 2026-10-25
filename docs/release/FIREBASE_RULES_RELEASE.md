# Firebase RTDB rules — release bundle (подготовка, без публикации до приёмки)

**Владелец:** Inna Kragh  
**Обновлено:** 2026-10-25 (уточнение: правила публикуются **вместе с релизом** после «приёмка подтверждена»; до этого — только репозиторий и эмулятор).

---

## 1. Файлы в репозитории

| Файл | Назначение |
|------|------------|
| `database.rules.json` | **Целевые правила релиза** (secure saves, `publicProfiles`, `presence`, `chat`, `buildings`). Публиковать из этого файла после приёмки §18. |
| `database.rules.review-presence.json` | Фрагмент только `presence` (для ревью diff); не деплоить отдельно. |
| `scripts/rules-deploy-snapshots/prod-rollback-2026-10-25.json` | **Снимок текущих prod-правил** для отката (копия задокументированного open `/players`). |
| `scripts/rules-deploy-snapshots/live-published-open.json` | Тот же live baseline (исторический аудит 2026-10-24). |
| `scripts/rules-deploy-snapshots/secure-pr33.json` | Снимок secure-ветки PR #33 (сверка). |

### Обновить снимок prod перед выкаткой

1. Firebase Console → Realtime Database → **Rules** → скопировать JSON.  
2. Сохранить как `scripts/rules-deploy-snapshots/prod-rollback-YYYY-MM-DD.json`.  
3. Обновить таблицу в `scripts/rules-deploy-snapshots/README.md`.

Агент **не** публикует правила и **не** вызывает `firebase deploy --only database` на production.

---

## 2. Эмуляторные тесты (обязательны перед выкаткой)

```bash
npm install
npm run test:rules          # матрица: гость/вошедший/чужие данные/presence/publicProfiles
npm run test:deploy-order   # совместимость порядка клиент ↔ правила
```

`scripts/test-database-rules.js` проверяет:

| Сценарий | Ожидание |
|----------|----------|
| Без auth: чтение `/players`, `/players/{uid}` | **deny** |
| Без auth: запись `presence` | **deny** |
| Игрок A: чтение/запись **своего** `players/{uid}` | **allow** |
| Игрок A: чтение/запись **чужого** `players/{uid}` | **deny** |
| Игрок A: `publicProfiles` своего uid | **allow** write |
| Игрок B: `publicProfiles` игрока A | **deny** write |
| `publicProfiles` read без auth | **allow** (name, avatar, coins) |
| `presence/{loc}/{uid}`: только свой uid | **allow** write / **deny** чужой |
| Невалидный presence (без `name`) | **deny** |
| Admin claim: чтение `/players` | **allow** |

Гостевой режим в Firebase = **anonymous auth** с тем же `auth.uid`; отдельного «без uid» сохранения нет — тесты через `signUp` эмулятора покрывают гостя.

---

## 3. Порядок выкатки (forward) — только после «приёмка подтверждена»

Рекомендуемый порядок (минимизирует permission_denied у старого кэша):

1. **Бэкап данных** — `node scripts/backup-players-export.js` (offline, владелец).  
2. **Тег на текущий `main` / hosting** — для отката статики.  
3. **Снимок prod rules** → `prod-rollback-*.json`.  
4. **Деплой статики** (новый `GAME_VERSION`, presence payload, `publicProfiles` с `.catch()`, secure client).  
5. **Smoke на preview / staging** (если есть) или сразу prod: сохранение, presence, owner с `admin` claim.  
6. **Публикация `database.rules.json`** в Console (или `firebase deploy --only database` **владельцем**).  
7. **Post-publish smoke:** incognito, reload save, нет `GET /players.json` root, multiplayer presence, `publicProfiles` write OK.

### Почему клиент перед правилами

Старый open-rules prod терпит новый клиент (`players/{uid}` + опциональный `publicProfiles`).  
Новые secure rules **до** нового клиента дают `permission_denied` на `publicProfiles` и ужесточают `/players` — поэтому сначала статика, затем rules.

### Откат

1. **Сразу** восстановить rules из `prod-rollback-2026-10-25.json` (Console → Rules history или paste).  
2. При необходимости — redeploy предыдущей статики по тегу.  
3. Данные RTDB не удаляются сменой правил.

---

## 4. Совместимость сохранений

Правила **не удаляют** поля; только `.validate` на известных ключах. Новые поля релиза (additive migration на клиенте):

| Поле | Правило | Старые сохранения |
|------|---------|-------------------|
| `onboarding` | object | OK |
| `settings` | object (optional) | OK — отсутствует |
| `dialogueHeard` | object (optional) | OK — отсутствует |
| `linkedAuth` | object (optional) | OK |
| `characterId`, `lang`, `story`, … | как раньше | OK |

Клиент: `migratePlayerFromSave()` только **добавляет** поля; не перезаписывает более полное облако гостем (`player-save-merge.mjs` при конфликте аккаунта).

Запрещено в payload: `undefined` (санитизация перед `update`).

---

## 5. Что не делать до приёмки

- Не публиковать rules на `punk-me-40605` production.  
- Не менять custom claims / admin кроме уже сделанного владельцем.  
- Не гонять Playwright/запись видео против prod с записью в `/players`.

---

## 6. Связанные документы

- `docs/release/RULES_PUBLISH_CHECKLIST.md` — чеклист владельца (обновлён под политику приёмки).  
- `docs/database/PRESENCE-PERMISSION-ANALYSIS.md` — разбор presence vs клиент.  
- `REQUIREMENTS_MATRIX.md` — строка «§3 presence / publicProfiles».
