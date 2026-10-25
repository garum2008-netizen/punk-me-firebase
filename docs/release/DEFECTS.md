# Аудит — дефекты и статус (этап 1, MASTER TZ §3)

Единая матрица требований: **`REQUIREMENTS_MATRIX.md`** (без дублирования длинных описаний — здесь только дефекты и ссылки).

| ID | Описание | Статус | Проверка / PR |
|----|----------|--------|----------------|
| D-SAVE-01 | После отказа покупки (нехватка монет) сохранение не ломается | в разработке | `game.js` buyItem, smoke |
| D-SAVE-02 | В RTDB не уходит `undefined` | в разработке | `sanitizePlayer`, fixtures |
| D-SAVE-03 | «Сохранено» только после подтверждения записи | не сделано | save ack UI |
| D-SAVE-04 | Ошибка записи видна + безопасный retry | частично | loading boot, save errors |
| D-UI-01 | «Сменить героя» открывает выбор | работает | CharSelect |
| D-UI-02 | Управление голосом = речь (не только mute legacy) | в разработке | AudioManager + settings |
| D-UI-03 | Переключатель языка не перекрывает чужие кнопки | в разработке | `#langCorner` |
| D-INPUT-01 | WASD/E независимо от раскладки | в разработке | input layer |
| D-INPUT-02 | Ввод в текстовых полях не триггерит игру | в разработке | |
| D-MOB-01 | Мобильное меню помещается; чат ≠ помощь | в разработке | site QA |
| D-MOB-02 | Джойстик / камера / E на touch | в разработке | |
| D-GAME-01 | Победа дуэли засчитывается в квестах/обучении | работает | onboarding bump |
| D-RTDB-01 | Presence: свой uid write, чужой deny | работает (rules) | `npm run test:rules` |
| D-RTDB-02 | publicProfiles: свой write, чужой deny | работает (rules) | `npm run test:rules` |
| D-RTDB-03 | Live prod rules ≠ repo secure → permission_denied | известно | выкатка после приёмки |
| D-WEBGL-01 | Ошибка WebGL не как «ошибка сохранения» | работает | `loading-screen.js`, PR #41 |
| D-TEST-01 | Тесты не пишут в prod | в разработке | emulator flag, `list-test-artifacts` |

_Обновлять при закрытии дефекта; матрица §3 ссылается на ID вида `D-SAVE-01`._
