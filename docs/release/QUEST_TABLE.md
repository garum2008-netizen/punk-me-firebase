# PUNK ME — таблица обязательных заданий (канон id)

**Единый реестр для Roblox и веб.** Основа: ветка `cursor/roblox-ep1-d99c` @ `6315248` (PR [#44](https://github.com/garum2008-netizen/punk-me-firebase/pull/44)).  
Дополнено по t104u: `STORY_ENDINGS_TZ_2026-10-25.md`, `STORY_STORYBOARD.md`, `PUNK_ME_TZ_locations.md`.

| Код | Путь |
|-----|------|
| Roblox | `roblox/src/ReplicatedStorage/Config/QuestTable.lua` |
| Веб (машиночитаемо) | `data/story/quest-table.json` |
| Веб (шаги / диалоги) | `data/story/quests.json`, `data/story/dialogues.json` |

## Главная линия (одинаковые `id`)

| id | gl | start | NPC / объект | цель (RU кратко) | успех | награда (grant key) | следующий |
|----|-----|-------|--------------|------------------|-------|---------------------|-----------|
| q_ch0_newbie | 0 | новый игрок | — | Пробуждение в Доме 13 | ch0_s_razor | reward_ch0_complete | q_ch1_initiation_choice |
| q_ch1_initiation_choice | 1 | q_ch0 done | npc_razor | Выбор пути прописки | ch1_s_choice | — | ветка |
| q_initiation_pay | 1 | выбор: взнос | npc_razor | Заработать 150 и отдать взнос | s2 pay | reward_initiation_pay | q_ch2_hangout |
| q_initiation_duel | 1 | выбор: дуэль | npc_razor | Победить в дуэли | s1 duel win | reward_initiation_duel | q_ch2_hangout |
| q_initiation_graffiti | 1 | выбор: флаеры | npc_razor | 8 флаеров | s1 flyers | reward_initiation_graffiti | q_ch2_hangout |
| q_ch2_hangout | 2 | посвящение | obj_hangout_site | Тусовка 4 этапа | hangout_stage>=4 | reward_ch2_hangout | q_ch3_cemetery_night |
| q_ch2_antibully | 2 | gang_member | npc_razor | Заступиться или нет | ch2_antibully_resolved | reward_ch2_choice | — |
| q_ch3_cemetery_night | 3 | ch2 done | npc_gravedigger | Смена + призрак + склеп | ch3_s_crypt + bell_rim | reward_ch3_rim | q_ch4_castle |
| q_ch4_castle | 4 | bell_rim | npc_count | Части Колокола + концерт | ch4_s_finale | по концовке | free_play |
| ending_break_curse | 4 | финал | — | Снять проклятие | pick ending | reward_ending_curse | free_play |
| ending_zombie_style | 4 | финал | — | Зомби — это стиль | pick ending | reward_ending_zombie | free_play |
| ending_count_deal | 4 | финал | — | Сделка с Графом | pick ending | reward_ending_deal | free_play |

`story.ending` (сохранение): **`ending_break_curse` | `ending_zombie_style` | `ending_count_deal`** (те же строки, что `id` концовки).

## Шаги q_ch0_newbie (Roblox `step.id`)

| step | event / условие | восстановление |
|------|-----------------|----------------|
| ch0_s_awake | ch0_look_room | Ангелина: осмотрись |
| ch0_s_mom | ch0_mom_talk | дверь кухни |
| ch0_s_shnurok | ch0_pet_shnurok | npc_shnurok |
| ch0_s_avatar | ch0_avatar_chosen | выбор образа |
| ch0_s_move | ch0_move_done | пройти / waypoint |
| ch0_s_interact | ch0_interact_done | E / кнопка |
| ch0_s_house | ch0_house_tour | 2 зоны дома |
| ch0_s_street | ch0_enter_street | портал Street |
| ch0_s_razor | ch0_razor_talk | npc_razor |

### Веб: соответствие шагам (без отдельных quest id)

| step | веб сейчас | событие / флаг |
|------|------------|----------------|
| (пролог) | `#chapterIntro` 4 слайда | `flags.intro_seen` |
| ch0_s_move … ch0_s_shop | `onboarding` steps 0–5 | `Onboarding.STEPS` → `onboarding.done` |
| ch0_s_razor | Razor + дуэль + лавка | `talk_razor`, `win_fight`, `shop_buy` |
| ch0_s_mom | WIP голос Лиды | `flags.mama_morning` (параллельно) |
| ch0_s_shnurok | пёс Шнурок | `pet_dog` / лавка |
| ch0_s_avatar | кастомизация | герой / инвентарь |

## Шаги q_ch4_castle (канон, детализация веб)

| step | предмет / флаг | примечание |
|------|----------------|------------|
| ch4_s_enter | `bell_rim` | замок 3D — **блокер preview** |
| ch4_s_tongue | `bell_tongue_zoya` **или** `bell_tongue_zombie` | взаимоискл. |
| ch4_s_crown | `bell_crown` | головоломка башни |
| ch4_s_concert | `flags.concert_ready` | сцена + хедлайнер |
| ch4_s_confession | `flags.graph_truth` | `dlg_count_confession` |
| ch4_s_ending | UI выбора | три `ending_*` |

## Уникальные предметы (story)

| item id | глава | ветка |
|---------|-------|-------|
| bell_rim | 3 | один раз |
| bell_tongue_zoya | 4 | Зоя |
| bell_tongue_zombie | 4 | дом зомби (взаимоискл.) |
| bell_crown | 4 | башня |

## Синхронизация id (Roblox ↔ веб)

| Было (веб preview, убрать) | Стало (канон) | Кто обновляет |
|----------------------------|---------------|---------------|
| `q_hangout_build` | `q_ch2_hangout` | веб: `quests.json`, engine; Roblox: уже `q_ch2_hangout` |
| `end_lift_curse` / `lift_curse` | `ending_break_curse` | веб: UI + save; миграция старых save |
| `end_zombie_style` / `zombie_style` (как ending key) | `ending_zombie_style` | веб |
| `end_deal_count` / `deal_count` | `ending_count_deal` | веб |
| `q0_onboard_*`, `q1_init_*` (отдельные id в json) | шаги `q_ch0_newbie` / квесты `q_initiation_*` | только `quest-table.json` legacy rows удалены |
| `q3_bell_rim` (как quest id) | часть `q_ch3_cemetery_night`, предмет `bell_rim` | веб metadata |
| `q4_graph_confession` | подшаг `q_ch4_castle` (`ch4_s_confession`) | веб: квест → alias к `q_ch4_castle` |

**Правило:** новые id только через правку этого файла + `QuestTable.lua` + `quest-table.json` в одном PR/паре PR.

## Статус реализации (веб preview `cursor/scenario-preview-d81d`)

| Глава | id | Статус |
|-------|-----|--------|
| 0 | q_ch0_newbie | интро + onboarding ≈ шаги; мама/аватар — частично |
| 1 | q_initiation_* | pay/duel/graffiti в data; одна ветка за раз |
| 2 | q_ch2_hangout | 4 этапа engine; свободная стройка WIP |
| 2 | q_ch2_antibully | PLANNED диалог |
| 3 | q_ch3_cemetery_night | смена кладбища; склеп/призрак — частично |
| 4 | q_ch4_castle | замок 3D блокер; confession + UI концовок |
| 4 | ending_* | UI + save + награды 1×; сцены финала PLANNED |
