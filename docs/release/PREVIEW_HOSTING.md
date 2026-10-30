# Preview-сборка для Инны (без production)

**Цель:** показать интегрированную игру (сюжет §0, обучение, озвучка RU, связь локаций) **не трогая** `halloween.punk.contractbot.dk` и **не записывая** в prod RTDB.

## Рекомендуемый вариант (ждём подтверждения Инны перед деплоем)

### A. Firebase Hosting **preview channel** (предпочтительно)

1. Владелец (или CI с ограниченным токеном) один раз:
   ```bash
   firebase hosting:channel:deploy scenario-preview --expires 30d --only hosting
   ```
   из ветки `cursor/scenario-preview-d81d` после merge PR #43.

2. URL вида: `https://punk-me-40605--scenario-preview-<hash>.web.app`  
   Передаётся только Инне; не подменяет основной сайт.

3. **База данных:** в `index.html` / конфиге для preview использовать:
   - `?firebaseEmulator=1` **или**
   - отдельный Firebase project / **read-only guest** с правилом «только `players/{ownUid}`» (уже в `database.rules.json`).

### B. Статический preview на поддомене (альтернатива)

- Поддомен, например `preview.punk.contractbot.dk` → тот же hosting channel или Cloudflare Pages из ветки.
- DNS + SSL настраивает владелец; агент **не** деплоит без «GO».

### C. Локально + туннель (быстрая демо)

- `npm start` → `ngrok http 3456` — только для внутренней проверки, не для финальной приёмки.

## Изоляция от prod-игроков

| Мера | Как |
|------|-----|
| Не писать в prod | Preview URL с `firebaseEmulator=1` для QA; Playwright с `FIREBASE_EMULATOR=1` |
| Гостевой режим | Anonymous auth — только свой `players/{uid}` |
| Запись видео | `?solo=1` + эмулятор или отдельный тестовый проект |
| Правила RTDB | На preview **не** публиковать prod rules до приёмки; эмулятор грузит `database.rules.json` из репо |

## Что проверить на preview (P0)

1. Комикс-интро гл.0 + озвучка RU + панель цели.  
2. Обучение шаг за шагом + рассказчик.  
3. Переход room → street → cemetery по подсказкам; лишние локации подписаны/закрыты.  
4. После обучения — линия к Рейзору (Authority / initiation).

## Статус

- **Деплой не выполнен** — ждём подтверждения способа (A/B) от Инны.  
- Интеграционный PR: [#43](https://github.com/garum2008-netizen/punk-me-firebase/pull/43).
