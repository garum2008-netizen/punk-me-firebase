# Открытие проекта PUNK ME ANGEL (Roblox) в Studio

## Что нужно на машине владельца

- **Windows или macOS** с установленным [Roblox Studio](https://create.roblox.com/).
- [Rojo](https://rojo.space/) 7.4+ (или скачать бинарь с GitHub).
- Git-клон репозитория `garum2008-netizen/punk-me-firebase`, ветка **`cursor/roblox-ep1-d99c`**.

## Вариант A — готовый плейс-файл

1. Собрать или взять из CI/артефактов агента: `roblox/build/PunkMeAngel_Ep1.rbxlx`.
2. Studio → **File → Open from file** → выбрать `PunkMeAngel_Ep1.rbxlx`.
3. **Play** (F5) — проверить поток эпизода 1 (см. чеклист ниже).

## Вариант B — live sync (рекомендуется для правок)

```bash
cd roblox
# установить rojo в PATH
rojo serve default.project.json
```

В Studio: плагин Rojo → **Connect** (порт по умолчанию 34872).

## DataStore

В Studio сохранения идут в scope **`PunkMeAngel_Profile_v1_TEST`** (суффикс `_TEST` при `RunService:IsStudio()`). Production-данные игроков не затрагиваются.

## Что проверить в Studio (эпизод 1)

1. Новый тестовый аккаунт: спавн в Доме 13.
2. Выбор образа (Razor / Vienna / Cobalt / Mohawk).
3. Окно Ангелины: реплика, кнопки «Помоги» и сворачивание.
4. Перемещение → подсказки обучения.
5. NPC **npc_razor** на улице → разговор → квест кладбища.
6. **npc_gravedigger** → смена (+65 монет, один раз).
7. Магазин **Shop** → покупка постера (45 монет).
8. Повторный разговор с Razor в шаге дуэли → XP.
9. Комната **RoomFloor** → декор → завершение главы 0.
10. Выйти и зайти снова — монеты, инвентарь, `chapterComplete`.
11. Второй клиент (Play → **Start Server** + **Player**): оба видят мир и друг друга.
12. Мобильный эмулятор Studio — базовая читаемость HUD (полная приёмка — реальное устройство).

## Известные пробелы до публикации

- Нет загруженных аудио (голоса).
- Нет кастомных мешей персонажей (блоки-NPC).
- ProcessReceipt только с тестовым product id `0`.
- Нет привязки к группе/ experience владельца.
