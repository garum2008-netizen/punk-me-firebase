# Открытие проекта PUNK ME ANGEL (Roblox) в Studio

**Статус:** PR #44 — **Draft**, **не RELEASE READY** (t105u).  
**Канон заданий:** [`docs/release/QUEST_TABLE.md`](../../docs/release/QUEST_TABLE.md) (включая «Синхронизация id», коммит веб-ветки `bb5083d`).

## Что нужно на машине владельца

- **Windows или macOS** с [Roblox Studio](https://create.roblox.com/).
- [Rojo](https://rojo.space/) 7.4+.
- Репозиторий `garum2008-netizen/punk-me-firebase`, ветка **`cursor/roblox-ep1-d99c`**.

## Сборка плейса

```bash
cd roblox
./scripts/check.sh   # StyLua, Selene, lune, rojo build
```

Файл: **`roblox/build/PunkMeAngel_Ep1.rbxlx`** (копия для релиза: `roblox/release/` — по готовности t105u §9).

### Live sync (правки кода)

```bash
cd roblox && rojo serve default.project.json
```

Studio → плагин Rojo → Connect (порт 34872).

## DataStore

В Studio: **`PunkMeAngel_Profile_v1_TEST`** (`RunService:IsStudio()`). Production не трогать до решения владельца.

---

## Чеклист Studio — глава 0 (`q_ch0_newbie`)

Гл.0 заканчивается **разговором с Рейзором** (`ch0_s_razor`). Кладбище, магазин, дуэль и декор комнаты — **не часть гл.0** (см. гл.1+ в QUEST_TABLE).

| # | step id | Проверка |
|---|---------|----------|
| 1 | ch0_s_awake | После входа — цель «осмотрись»; событие `ch0_look_room` |
| 2 | ch0_s_mom | **npc_mom** (кухня) → `ch0_mom_talk` |
| 3 | ch0_s_shnurok | **npc_shnurok** → `ch0_pet_shnurok` |
| 4 | ch0_s_avatar | Выбор Razor / Vienna / Cobalt / Mohawk → `ch0_avatar_chosen` |
| 5 | ch0_s_move | Дойти до жёлтого маркера `marker_move` → `ch0_move_done` |
| 6 | ch0_s_interact | Любой ProximityPrompt → `ch0_interact_done` |
| 7 | ch0_s_house | Зоны **zone_room** + **zone_hall** → `ch0_house_tour` |
| 8 | ch0_s_street | Выйти на улицу (X > 55 / zone_street) → `ch0_enter_street` |
| 9 | ch0_s_razor | **npc_razor** → `ch0_razor_talk`; квест `q_ch1_initiation_choice` |

Дополнительно: окно **Ангелины** (текст, «Помоги»), журнал цели на HUD, выход/вход — прогресс `story.*` в профиле.

---

## Чеклист Studio — глава 1+ (по QUEST_TABLE; механики в разработке t105u)

| Глава | id | Что должно быть (канон) | Статус Roblox (честно) |
|-------|-----|-------------------------|-------------------------|
| 1 | q_ch1_initiation_choice + `q_initiation_*` | Один путь: **150 монет + взнос** ИЛИ **настоящая дуэль** ИЛИ **8 флаеров** | Частично: взнос/дуэль/флаеры — **заглушки** |
| 2 | q_ch2_hangout, q_ch2_antibully | 4 разных этапа Тусовки; конфликт с новичком | Заглушка (повтор interact) |
| 3 | q_ch3_cemetery_night | Смена, призрак, склеп, **bell_rim** | Частично |
| 4 | q_ch4_castle + ending_* | Язык, головоломка башни, концерт, Граф, 3 концовки | Заглушка / UI выбора |

Полная матрица тестов: `roblox/release/TEST_MATRIX.md`.

---

## Мультиплеер и мобильный (t105u §6, §8)

- **2 клиента:** Play → Start Server → добавить Player — видимость мира (не полноценный co-op-тест сюжета).
- **Мобильный:** эмулятор Studio — только ориентир; приёмка — реальное устройство.

## Известные блокеры

- Нет Experience / группы владельца → нет облачного приёмочного контура, нет реальных Product ID.
- Нет загруженной озвучки (`VoiceManifest.lua` — пустые id).
- Open Cloud / headless Luau — см. `roblox/release/TESTING.md` (нужен API-ключ владельца, не в репозитории).
