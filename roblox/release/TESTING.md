# Тестирование Roblox (t105u §8)

## Автотесты (без Studio GUI)

| Инструмент | Что покрывает | Команда |
|------------|---------------|---------|
| **lune** | `QuestEngine`, профиль v4, экономика, rate limit, receipts, миграции | `cd roblox && lune run tests/lune/tests.luau` |
| **selene / stylua** | Статический анализ Luau | `roblox/scripts/check.sh` |

**Ограничение:** автотесты **не** заменяют игровой тест в Studio (физика, UI, DataStore в облаке, MarketplaceService).

## Headless / Open Cloud

По состоянию на t105u:

- **Roblox Studio на Linux-VM агента не запускается** — headless-прохождение в облаке агента недоступно.
- **Open Cloud APIs** (в т.ч. выполнение Luau на опубликованном/universe experience) требуют:
  1. Universe/Place, принадлежащий владельцу (Инна).
  2. **Open Cloud API Key** с нужными scopes (создаётся в Creator Dashboard владельца).
  3. Хранение ключа **только** в секретах CI/владельца — **не в репозитории и не в чате**.

**Блокер для агента:** без API-ключа и place id тесты Open Cloud не запускаются.

### Шаги для тестировщика / владельца (минимум)

1. Создать/открыть **приватный** Experience под аккаунтом/группой Инны.
2. Залить `roblox/build/PunkMeAngel_Ep1.rbxlx` (см. `IMPORT.md`).
3. Включить **Enable Studio Access to API Services** для DataStore в Studio (тест).
4. Пройти чеклисты `roblox/docs/OPEN_IN_STUDIO.md` (гл.0 обязательно; гл.1–4 по матрице).
5. Два клиента + мобильный — по `TEST_MATRIX.md`.
6. (Опционально) Выдать разработчику Open Cloud key в **1Password / GitHub Secrets** для CI — отдельное решение владельца.

## Studio Output

При ручном тесте фиксировать ошибки в `DEFECTS.md` (дата, шаг, текст Output).
