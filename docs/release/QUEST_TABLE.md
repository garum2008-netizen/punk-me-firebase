# PUNK ME — таблица обязательных заданий (канон id)

Источник сюжета: t104u, `STORY_STORYBOARD.md`, `data/story/quests.json`.  
**Roblox и веб используют одни и те же `id` заданий и шагов.** Данные в коде: `roblox/src/ReplicatedStorage/Config/QuestTable.lua`.

| id | gl | start | NPC / объект | цель (RU кратко) | успех | награда (grant key) | следующий |
|----|-----|-------|--------------|------------------|-------|---------------------|-----------|
| q_ch0_newbie | 0 | новый игрок | — | Пробуждение в Доме 13 | ch0_s_razor | reward_ch0_complete | q_ch1_initiation_choice |
| q_ch1_initiation_choice | 1 | q_ch0 done | npc_razor | Выбор пути прописки | ch1_s_choice | — | ветка |
| q_initiation_pay | 1 | выбор: взнос | npc_razor | Заработать 150 и отдать взнос | s2 pay | reward_initiation_pay | q_ch2_hangout |
| q_initiation_duel | 1 | выбор: дуэль | npc_razor | Победить в дуэли | s1 duel win | reward_initiation_duel | q_ch2_hangout |
| q_initiation_graffiti | 1 | выбор: флаеры | npc_razor | 8 флаеров | s1 flyers | reward_initiation_graffiti | q_ch2_hangout |
| q_ch2_hangout | 2 | посвящение | obj_hangout_site | Тусовка 4 этапа | hangout_stage>=4 | reward_ch2_hangout | q_ch3_cemetery_night |
| q_ch2_antibully | 2 | gang_member | npc_razor | Заступиться или нет | ch2_done | reward_ch2_choice | — |
| q_ch3_cemetery_night | 3 | ch2 done | npc_gravedigger | Смена + призрак + склеп | ch3_s_crypt | reward_ch3_rim | q_ch4_castle |
| q_ch4_castle | 4 | обод есть | npc_count | Части Колокола + концерт | ch4_s_finale | по концовке | free_play |
| ending_break_curse | 4 | финал | — | Снять проклятие | pick ending | reward_ending_curse | free_play |
| ending_zombie_style | 4 | финал | — | Зомби — это стиль | pick ending | reward_ending_zombie | free_play |
| ending_count_deal | 4 | финал | — | Сделка с Графом | pick ending | reward_ending_deal | free_play |

## Шаги q_ch0_newbie

| step | event / условие | восстановление |
|------|-----------------|----------------|
| ch0_s_awake | ch0_look_room | Ангелина: осмотрись |
| ch0_s_mom | ch0_mom_talk | дверь кухни |
| ch0_s_shnurok | ch0_pet_shnurok | npc_shnurok |
| ch0_s_avatar | ch0_avatar_chosen | выбор образа |
| ch0_s_move | ch0_move_done | пройти 12+ studs |
| ch0_s_interact | ch0_interact_done | любой ProximityPrompt |
| ch0_s_house | ch0_house_tour | 2 зоны дома |
| ch0_s_street | ch0_enter_street | зона Street |
| ch0_s_razor | ch0_razor_talk | npc_razor |

## Уникальные предметы (story)

| item id | глава | ветка |
|---------|-------|-------|
| bell_rim | 3 | один раз |
| bell_tongue_zoya | 4 | Зоя |
| bell_tongue_zombie | 4 | дом зомби (взаимоискл.) |
| bell_crown | 4 | башня |
