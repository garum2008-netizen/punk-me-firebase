# Тестирование Roblox (t105u §8)

## Автотесты (без Studio GUI)

| Инструмент | Что покрывает | Команда |
|------------|---------------|---------|
| **lune** | QuestEngine, профиль v5, экономика, ActionGuards, SessionRegistry, мини-игры | `cd roblox && ./scripts/check.sh` |
| **selene / stylua** | Статический анализ Luau | входит в `check.sh` |

`check.sh` также собирает `build/PunkMeAngel_Ep1.rbxlx`, копирует в `release/` и `/opt/cursor/artifacts/`.

**Ограничение:** lune **не** заменяет Play в Studio (камера, тач, DataStore в облаке, Marketplace).

---

## Владельцу: пустой Experience + Open Cloud (коротко)

### 1. Experience в группе (без публикации в каталог)

1. [Creator Dashboard](https://create.roblox.com/) → **Creations** → ваша **группа** Инны.
2. **Create new experience** → шаблон **Baseplate** (или пустой).
3. Оставить **Private** (не публиковать в Discover).
4. Запомнить **Universe ID** и **Place ID** (настройки experience / Places).

### 2. Залить плейс (без «релиза» игрокам)

**Рекомендуется:** Roblox Studio → **File → Open from file** → `roblox/release/PunkMeAngel_Ep1.rbxlx` → **File → Publish to Roblox** в **этот** приватный place (не создавать новый публичный).

Для CI позже можно отдельный API-ключ с правом публикации версии place; для приёмки достаточно Studio.

### 3. API-ключ Open Cloud (минимальные права)

Dashboard → **Credentials** → **Create API Key**:

| Назначение | API / операция | Scope (как в Creator Dashboard) |
|------------|----------------|----------------------------------|
| Headless Luau smoke | **Luau Execution** | `universe.place.luau-execution-session:write` |
| (Опционально) чтение place | Places | `universe.place:read` |
| (Опционально) загрузка .rbxlx через API | Place versions | `universe.place:write` или операции **Create Place Version** (см. [Scopes](https://create.roblox.com/docs/cloud/reference/scopes)) |

Обязательно:

- **Restrict by Experience** — только тестовый universe выше.
- Ключ хранить в **GitHub Actions secret** / 1Password, имя например `ROBLOX_OPEN_CLOUD_KEY`.
- **Не** добавлять scopes на Marketplace / Developer Products для smoke-теста.

DataStore в Studio: **Game Settings → Security → Enable Studio Access to API Services**. В коде профиль в Studio использует суффикс `_TEST` (`DataStoreScope.lua`).

### 4. Headless smoke (когда ключ в секретах)

На машине тестировщика / в CI:

```bash
export ROBLOX_OPEN_CLOUD_KEY='…'      # из секрета
export ROBLOX_UNIVERSE_ID='…'
export ROBLOX_PLACE_ID='…'
export ROBLOX_PLACE_VERSION='0'       # или id опубликованной версии после Publish

cd roblox
chmod +x scripts/opencloud-smoke.sh
./scripts/opencloud-smoke.sh
```

Скрипт создаёт **Luau Execution** task ([документация](https://create.roblox.com/docs/cloud/features/luau-execution)), выполняет `scripts/opencloud-smoke.luau` (проверка `_TEST` scope) и ждёт `COMPLETED`.

**Запрещено в этом контуре:** публикация в каталог, реальные покупки, продакшен DataStore без `_TEST`.

### 5. Ручной Studio-чеклист

`roblox/docs/OPEN_IN_STUDIO.md` + `release/TEST_MATRIX.md` (все Studio — NOT RUN до прохождения владельцем).

Ошибки Output → `release/DEFECTS.md`.

---

## Мультиплеер / мобильный

- **2 игрока:** Studio → Start Server → 2 Players; прогресс изолирован по `UserId` (lune: `SessionRegistry`).
- **Мобильный:** эмулятор Studio или устройство; дуэль и мини-игры — увеличенные тач-кнопки (`ClientTouch`).
