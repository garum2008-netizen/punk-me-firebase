# Аудит — дефекты и статус (этап 1, MASTER TZ §3)

Единая матрица требований: **`REQUIREMENTS_MATRIX.md`**.  
Отчёт 25.10 (внешние игроки / вход): `REPORT-2026-10-25_777e.md` (часть B, блокеры).

| ID | Описание | Статус | Проверка / PR |
|----|----------|--------|----------------|
| D-SAVE-01 | После отказа покупки (нехватка монет) сохранение не ломается | в разработке | `buyItem`, `beginEarnCoins`, `stripUndefinedDeep` |
| D-SAVE-02 | В RTDB не уходит `undefined` | в разработке | `sanitizeStory`, fixtures |
| D-SAVE-03 | «Сохранено» только после подтверждения записи | не сделано | save ack UI (отчёт B) |
| D-SAVE-04 | Ошибка записи видна + безопасный retry | частично | `saveMe().catch`, loading boot |
| D-UI-01 | «Сменить героя» открывает выбор (не переключает EN) | в разработке | `lang-btn[data-lang]` only |
| D-UI-02 | Управление голосом = речь (не только mute legacy) | в разработке | AudioManager + settings |
| D-UI-03 | Переключатель языка не перекрывает чужие кнопки | в разработке | `#langCorner`, mobile HUD |
| D-INPUT-01 | WASD/E по `e.code`, любая раскладка | в разработке | `controls-3d.mjs`, `game.js` |
| D-INPUT-02 | Ввод в текстовых полях не триггерит игру | в разработке | |
| D-INPUT-03 | Короткое нажатие W даёт заметный шаг | не сделано | отчёт B |
| D-MOB-01 | Мобильное меню помещается; чат ≠ «?» | в разработке | site QA |
| D-MOB-02 | Джойстик / камера / E на touch | в разработке | `touchActive` в controls |
| D-GAME-01 | Победа дуэли засчитывается в квестах/обучении | работает | onboarding bump |
| D-ONBOARD-01 | Обучение стартует автоматически для нового профиля | не сделано | отчёт B (preview: intro+onboarding в PR #43) |
| D-QUEST-01 | Активный квест виден после F5 | не сделано | отчёт B |
| D-CHAT-01 | Чат без фейковых строк (только реальные /chat) | не сделано | отчёт B; убрать seed/демо |
| D-I18N-UK | Украинский в переключателе, игре, subscribe | не сделано | MASTER §11 |
| D-AUTH-01 | Гостевой старт подписан; запрос имени | не сделано | отчёт B |
| D-AUTH-02 | Конфликт гость→существующий: предупреждение о потере прогресса | не сделано | `account-auth.mjs` |
| D-RTDB-01 | Presence: свой uid write, чужой deny | работает (rules) | `npm run test:rules` |
| D-RTDB-02 | publicProfiles: свой write, чужой deny | работает (rules) | `npm run test:rules` |
| D-RTDB-03 | Live prod rules ≠ repo secure → permission_denied | известно | выкатка после приёмки |
| D-RTDB-04 | Публичное чтение всей `/players` на live | известно | GET без auth → 200; закрывают rules при релизе |
| D-RTDB-05 | `premium` / `entitlements` клиентом не пишутся | в разработке | `database.rules.json` (только admin); webhook позже |
| D-TEST-01 | Тесты/capture не пишут в prod | в разработке | `guard-no-prod-firebase.js`, `prodDevWriteBlocked`, `?dev` off на prod |
| D-WEBGL-01 | Ошибка WebGL не как «ошибка сохранения» | работает | PR #41 |
| D-ANALYTICS-01 | Минимальная аналитика + UTM + `createdAt` / `qa` | **только предложение** | отчёт §«Предложение» — ждём решения Инны, не внедрять |

_Обновлять при закрытии дефекта._
