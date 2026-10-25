# Инвентаризация материалов — PUNK ME ANGEL (Roblox)

Дата: 2026-10-25. Ветка разработки: `cursor/roblox-ep1-d99c`.

## Ограничения среды (зафиксировано)

| Ресурс | Статус |
|--------|--------|
| Roblox-аккаунт / группа владельца (Инна) | **Нет доступа** у cloud-агента |
| Roblox Studio на Linux-VM | **Не запускается** (сборка только `rojo build` → `.rbxlx`) |
| Публикация experience | **Запрещено** заданием до приёмки владельцем |

Дальнейшая работа: исходники Luau, Rojo, автотесты чистой логики, документация. Проверка геймплея в Studio — на стороне владельца (см. `OPEN_IN_STUDIO.md`).

---

## Сценарий и дизайн (репозиторий)

| Материал | Путь | Способ переноса | Права / примечание |
|----------|------|-------------------|-------------------|
| Мастер-ТЗ игры | `docs/game-design/PUNK_ME_MASTER_TZ.md` | Переработка под Roblox (DataStore, RemoteEvents) | Канон проекта |
| Сториборд | `docs/game-design/STORY_STORYBOARD.md` | Сценарий эпизодов 0–4 | Канон |
| Персонажи | `docs/CHARACTERS.md` | Имена/роли в конфигах NPC | Razor, Vienna, Cobalt, Mohawk, Ghost, Шнурок |
| Квесты (браузер) | `data/story/quests.json` | Переработка → `QuestEpisode1` + будущие главы | Не 1:1 UI |
| Экономика | `docs/game-design/GAME_ECONOMY.md`, `data/story/balance.json` | Цифры адаптированы в `ShopCatalog` / награды смены | Игровая валюта |
| Диалоги JSON | `data/story/dialogues.json` | Конвертация в локализацию по ключам | RU/UK/EN/DA частично в `Localization.lua` |
| Roblox-ТЗ | `roblox/docs/TASK-INNA-2026-10-25-ROBLOX.md` | Прямо | — |
| Master release ТЗ | `roblox/docs/TASK-INNA-2026-10-25-MASTER-RELEASE.md` | Прямо | — |

---

## 3D, анимации, текстуры

| Материал | Путь | Способ | Права |
|----------|------|--------|-------|
| Meshy-персонажи (Vienna, Cobalt, Mohawk, Razor) | `assets/models/meshy/*.glb` | **Конвертация** → Mesh/Accessory в Studio; не автоматический импорт в Rojo | `assets/models/meshy/LICENSE.txt` (Inna/Meshy) |
| CC0 teen / анимации | `assets/models/cc0/` | Переработка ригов под R15/R6 в Studio | CC0 |
| Постеры UI | `imagine_images/` | **Не** как 3D; только референс оформления | Постеры проекта |
| Мир эпизода 1 | `WorldBuilder.lua` | **Генерация Parts** (примитивы), без чужих ассетов | Оригинальный код |

---

## Аудио и голос

| Материал | Статус | Способ |
|----------|--------|--------|
| Озвучка Ангелины (4 языка) | Нет записей в Roblox | Слоты `VoiceManifest.lua`, ID пустые |
| Голоса NPC (Razor, смотритель) | Нет | Список в `VoiceManifest.lua` |
| Музыка локаций | Нет | Плейсхолдер; настройки громкости в профиле |
| Встроенный TTS Roblox | Не используется для RU/UK/DA | По ТЗ |

---

## Код и механики

| Компонент | Реализация | Проверка |
|-----------|------------|----------|
| Rojo-проект | `roblox/default.project.json` | `rojo build` ✓ (вне Studio) |
| DataStore профиль | `ProfileService.lua`, scope `_TEST` в Studio | Логика миграций — lune-тесты; запись в облаке — **не проверено** |
| Session / retry | `ProfileService` UpdateAsync + retries | Автотесты частично |
| Экономика / магазин | `Economy.lua`, `GameServer` | lune-тесты |
| Квест эпизода 1 | `QuestEpisode1.lua`, `GameServer` | lune-тесты |
| ProcessReceipt | `MonetizationService.lua` | Только test product id `0`; Studio — **не проверено** |
| RemoteEvents + rate limit | `GameServer`, `RemoteValidation` | lune-тесты |
| Ангелина (без AI) | `AngelinaLines.lua`, HUD клиент | Studio — **не проверено** |
| Локализация RU/UK/EN/DA | `Localization.lua` | lune (выборочно); полнота — в работе |

---

## Чужие Roblox-игры / Avatar World

Копирование карт, персонажей и оформления **не выполнялось**. Упоминание Avatar World в мастер-ТЗ — только ориентир по жанру.

---

## Firebase / браузерная игра

Каталоги `js/`, `index.html`, Firebase — **не изменялись** (параллельная ветка `cursor/scenario-preview-d81d`).
