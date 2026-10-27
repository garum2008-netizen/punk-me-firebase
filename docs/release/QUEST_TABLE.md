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
| q_ch0_newbie | 0 | новый игрок | — | Пробуждение в Доме 13 | ch0_s_razor | reward_ch0_complete | q_ch1_authority (web: Authority) → q_ch1_initiation_choice |
| q_ch1_initiation_choice | 1 | q_ch1_authority errands / tease done (web: `flag:ch1_initiation_unlocked`) | npc_razor | Выбор пути прописки | ch1_s_choice | — | ветка |
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
| ch0_s_awake … ch0_s_razor | `onboarding.js` (11 шагов, id `ch0_s_*`) | `onboarding.step` / `onboarding.done` + `reward_ch0_complete` |
| ch0_s_razor | Razor на улице, тост «Игра сохранена» | `ch0_razor_talk`, без дуэли до `q_ch1_initiation_choice` |
| ch0_s_mom | субтитры Лиды за дверью (без модели, без VO-файла) | `Onboarding.onMomTalk` |
| ch0_s_shnurok | Шнурок NPC + миска | `ch0_feed_bowl`, `ch0_pet_shnurok` |
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
| bell_tongue_zoya | 4 | Зоя; **только** после `bell_rim` + `ch4_album` / ветка «Барабанные палочки» (web gated, TODO CANON-E) |
| bell_tongue_zombie | 4 | дом зомби (взаимоискл.); те же гейты |
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

## Обязательные механики по главам (t105u — веб и Roblox)

| gl | Обязательно | Критерий успеха (канон) |
|----|-------------|-------------------------|
| 0 | Знакомство, настройка аватара, дом, обучение, Рейзор | `q_ch0_newbie` → шаги `ch0_s_*` / веб: intro + onboarding + razor |
| 1 | Заработок + взнос 150 **или** настоящая дуэль **или** 8 флаеров | ровно одна ветка `q_initiation_*` → `joined_gang` |
| 2 | Тусовка: **4 разных игровых этапа** + конфликт с новичком | `hangout_stage>=4` (этапы 1–4 с разными `gameplayId` в `construction-hangout.json`) + `q_ch2_antibully` → `ch2_antibully_resolved` |
| 3 | Смена, призрак, склеп, Обод (rim) | `q_ch3_cemetery_night` → `bell_rim` |
| 4 | Язык (Зоя/дом зомби), башня-головоломка, концерт + хедлайнер, кульминация | `bell_tongue_*`, `bell_crown`, `concert_ready` + `concert_headliner`, `graph_truth`, затем `ending_*` |

**Этапы Тусовки (веб, `gameplayId`):** `foundation_materials` → `frame_materials` → `shell_materials` → `punk_finish` (каждый этап — отдельная петля «заработок материалов + постройка», события `hangout_stage_1`…`hangout_stage_4`).

## Концовки: логика, не только кнопка (t105u)

Исход рекомендуется движком (`js/story/ending-resolve.mjs`) по сохранённым **решениям** (`story.decisions`), **отношениям** (`story.rel`), **хедлайнеру** (`flags.concert_headliner`), antibully, ветке Языка. Игрок может выбрать другой `ending_*` в UI — тогда фиксируется `decisions.ending_override`.

| ending id | Сдвигает вес (кратко) |
|-----------|------------------------|
| `ending_break_curse` | antibully help, высокий `rel.zombie`, хедлайнер «семья» |
| `ending_zombie_style` | `bell_tongue_zombie`, высокий `rel.gang_rust`, хедлайнер zombina/банда |
| `ending_count_deal` | `bell_tongue_zoya`, `rel.count`, хедлайнер count |

У каждой концовки — **своя** сцена, анимация/озвучка, диалоги, музыка, награды (`reward_ending_*`), изменение мира (`castle_club`, `night_shop`, `zombina_npc` и 3D `applyCastleEndingVisual`). Автотесты (`npm run test:*`) **не** заменяют игровую приёмку.

## Статус реализации (веб preview `cursor/scenario-preview-d81d`)

| Глава | id | Статус |
|-------|-----|--------|
| 0 | q_ch0_newbie | интро + onboarding ≈ шаги; мама/аватар — частично |
| 1 | q_initiation_* | pay/duel/graffiti в data; одна ветка за раз |
| 2 | q_ch2_hangout | 4 этапа (разные gameplayId); 3D стройка; **не** полная приёмка |
| 2 | q_ch2_antibully | диалог + save; **не** полная приёмка |
| 3 | q_ch3_cemetery_night | смена; склеп/призрак — частично; **не** полная приёмка |
| 4 | q_ch4_castle | локация `castle` 3D WIP: орган, концерт, граф; **не** полная приёмка |
| 4 | ending_* | scoring + UI; оверлей-сцена; 3D-финал и мир — **не** полная приёмка |
