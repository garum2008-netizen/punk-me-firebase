--!strict
--[[
	Must stay in sync with docs/release/QUEST_TABLE.md (same quest/step ids).
]]

export type Lang = "ru" | "uk" | "en" | "da"

export type QuestStep = {
	id: string,
	completeEvent: string,
	objective: { [Lang]: string },
	beacon: string?,
	angelina: string?,
}

export type QuestDef = {
	id: string,
	chapter: number,
	startWhen: string,
	steps: { QuestStep },
	rewardGrantKey: string?,
	nextQuestId: string?,
}

export type EndingDef = {
	id: string,
	grantKey: string,
	title: { [Lang]: string },
}

local QuestTable = {}

QuestTable.CH0 = "q_ch0_newbie"
QuestTable.CH1_CHOICE = "q_ch1_initiation_choice"
QuestTable.CH2 = "q_ch2_hangout"
QuestTable.CH3 = "q_ch3_cemetery_night"
QuestTable.CH4 = "q_ch4_castle"
QuestTable.INIT_PAY = "q_initiation_pay"
QuestTable.INIT_DUEL = "q_initiation_duel"
QuestTable.INIT_GRAFFITI = "q_initiation_graffiti"

QuestTable.quests = {
	q_ch0_newbie = {
		id = "q_ch0_newbie",
		chapter = 0,
		startWhen = "new_player",
		rewardGrantKey = "reward_ch0_complete",
		nextQuestId = "q_ch1_initiation_choice",
		steps = {
			{
				id = "ch0_s_awake",
				completeEvent = "ch0_look_room",
				objective = {
					ru = "Осмотрись в комнате",
					uk = "Оглянись у кімнаті",
					en = "Look around your room",
					da = "Kig dig omkring i værelset",
				},
				beacon = "zone_room",
				angelina = "move",
			},
			{
				id = "ch0_s_mom",
				completeEvent = "ch0_mom_talk",
				objective = {
					ru = "Поговори с мамой Лидой (кухня)",
					uk = "Поговори з мамою Лідою (кухня)",
					en = "Talk to mom Lida (kitchen)",
					da = "Tal med mor Lida (køkken)",
				},
				beacon = "npc_mom",
			},
			{
				id = "ch0_s_shnurok",
				completeEvent = "ch0_pet_shnurok",
				objective = {
					ru = "Познакомься со Шнурком",
					uk = "Познайомся зі Шнурком",
					en = "Meet Shoelace the pup",
					da = "Mød hvalpen Snor",
				},
				beacon = "npc_shnurok",
			},
			{
				id = "ch0_s_avatar",
				completeEvent = "ch0_avatar_chosen",
				objective = {
					ru = "Выбери образ панка",
					uk = "Обери образ панка",
					en = "Pick your punk look",
					da = "Vælg dit punk-look",
				},
				beacon = "ui_avatar",
			},
			{
				id = "ch0_s_move",
				completeEvent = "ch0_move_done",
				objective = {
					ru = "Дойди до отмеченной точки",
					uk = "Дійди до позначеної точки",
					en = "Walk to the marked spot",
					da = "Gå til det markerede punkt",
				},
				beacon = "marker_move",
				angelina = "move",
			},
			{
				id = "ch0_s_interact",
				completeEvent = "ch0_interact_done",
				objective = {
					ru = "Используй взаимодействие (E / кнопка)",
					uk = "Скористайся взаємодією",
					en = "Use interact (E / button)",
					da = "Brug interager (E / knap)",
				},
				beacon = "npc_shnurok",
				angelina = "interact",
			},
			{
				id = "ch0_s_house",
				completeEvent = "ch0_house_tour",
				objective = {
					ru = "Обойди дом: комната и холл",
					uk = "Обійди дім: кімната й хол",
					en = "Tour the house: room and hall",
					da = "Gå gennem huset: værelse og hall",
				},
				beacon = "zone_hall",
			},
			{
				id = "ch0_s_street",
				completeEvent = "ch0_enter_street",
				objective = {
					ru = "Выйди на улицу банды",
					uk = "Вийди на вулицю банди",
					en = "Go to Gang Street",
					da = "Gå til Bandegaden",
				},
				beacon = "zone_street",
			},
			{
				id = "ch0_s_razor",
				completeEvent = "ch0_razor_talk",
				objective = {
					ru = "Поговори с Рейзором",
					uk = "Поговори з Рейзором",
					en = "Talk to Razor",
					da = "Tal med Razor",
				},
				beacon = "npc_razor",
			},
		},
	},
	q_ch1_initiation_choice = {
		id = "q_ch1_initiation_choice",
		chapter = 1,
		startWhen = "quest:q_ch0_newbie:done",
		steps = {
			{
				id = "ch1_s_choice",
				completeEvent = "ch1_pick_initiation_path",
				objective = {
					ru = "Рейзор: выбери путь прописки (взнос, дуэль или флаеры)",
					uk = "Рейзор: обери шлях прописки",
					en = "Razor: pick your initiation path",
					da = "Razor: vælg optagelsesvej",
				},
				beacon = "npc_razor",
			},
		},
		nextQuestId = nil,
	},
	q_initiation_pay = {
		id = "q_initiation_pay",
		chapter = 1,
		startWhen = "decision:initiation:pay",
		rewardGrantKey = "reward_initiation_pay",
		nextQuestId = "q_ch2_hangout",
		steps = {
			{
				id = "s1",
				completeEvent = "coins>=150",
				objective = {
					ru = "Заработай 150 монет",
					uk = "Зароби 150 монет",
					en = "Earn 150 coins",
					da = "Tjen 150 mønter",
				},
				beacon = "npc_gravedigger",
			},
			{
				id = "s2",
				completeEvent = "event:pay_initiation_fee",
				objective = {
					ru = "Отдай взнос Рейзору",
					uk = "Віддай внесок Рейзору",
					en = "Pay Razor the fee",
					da = "Betal gebyr til Razor",
				},
				beacon = "npc_razor",
			},
		},
	},
	q_initiation_duel = {
		id = "q_initiation_duel",
		chapter = 1,
		startWhen = "decision:initiation:duel",
		rewardGrantKey = "reward_initiation_duel",
		nextQuestId = "q_ch2_hangout",
		steps = {
			{
				id = "s1",
				completeEvent = "event:duel_razor_win",
				objective = {
					ru = "Выиграй дуэль у Рейзора",
					uk = "Виграй дуель у Рейзора",
					en = "Win the duel against Razor",
					da = "Vind duellen mod Razor",
				},
				beacon = "zone_duel",
			},
		},
	},
	q_initiation_graffiti = {
		id = "q_initiation_graffiti",
		chapter = 1,
		startWhen = "decision:initiation:graffiti",
		rewardGrantKey = "reward_initiation_graffiti",
		nextQuestId = "q_ch2_hangout",
		steps = {
			{
				id = "s1",
				completeEvent = "event:flyers_done",
				objective = {
					ru = "Расклей 8 флаеров с Рейзором",
					uk = "Розклей 8 флаєрів",
					en = "Post 8 flyers with Razor",
					da = "Sæt 8 plakater op",
				},
				beacon = "npc_razor",
			},
		},
	},
	q_ch2_hangout = {
		id = "q_ch2_hangout",
		chapter = 2,
		startWhen = "chapter>=2",
		rewardGrantKey = "reward_ch2_hangout",
		nextQuestId = "q_ch3_cemetery_night",
		steps = {
			{
				id = "s1",
				completeEvent = "hangout_stage>=4",
				objective = {
					ru = "Построй Тусовку — 4 этапа (заглушка: 4 взаимодействия)",
					uk = "Побудуй Тусовку — 4 етапи",
					en = "Build the hangout — 4 stages (stub)",
					da = "Byg hænget — 4 etaper (stub)",
				},
				beacon = "obj_hangout_site",
			},
		},
	},
	q_ch2_antibully = {
		id = "q_ch2_antibully",
		chapter = 2,
		startWhen = "flag:gang_member",
		rewardGrantKey = "reward_ch2_choice",
		steps = {
			{
				id = "s1",
				completeEvent = "ch2_antibully_choice",
				objective = {
					ru = "Новичок в городе: заступись или нет",
					uk = "Новачок: заступись чи ні",
					en = "New kid: stand up or join teasing",
					da = "Ny kid: tag parti",
				},
				beacon = "npc_razor",
			},
		},
	},
	q_ch3_cemetery_night = {
		id = "q_ch3_cemetery_night",
		chapter = 3,
		startWhen = "chapter>=3",
		rewardGrantKey = "reward_ch3_rim",
		nextQuestId = "q_ch4_castle",
		steps = {
			{
				id = "ch3_s_job",
				completeEvent = "ch3_cemetery_shift",
				objective = {
					ru = "Отработай смену у смотрителя",
					uk = "Відпрацюй зміну",
					en = "Work a cemetery shift",
					da = "Arbejd en kirkegårdsvagt",
				},
				beacon = "npc_gravedigger",
			},
			{
				id = "ch3_s_ghost",
				completeEvent = "ch3_ghost_helped",
				objective = {
					ru = "Помоги потерявшемуся призраку",
					uk = "Допоможи привиду",
					en = "Help the lost ghost",
					da = "Hjælp det fortabte spøgelse",
				},
				beacon = "npc_ghost",
			},
			{
				id = "ch3_s_crypt",
				completeEvent = "ch3_crypt_built",
				objective = {
					ru = "Склеп: этап стройки (заглушка)",
					uk = "Склеп: етап",
					en = "Crypt build stage (stub)",
					da = "Krypt (stub)",
				},
				beacon = "obj_crypt_site",
			},
		},
	},
	q_ch4_castle = {
		id = "q_ch4_castle",
		chapter = 4,
		startWhen = "unique:bell_rim",
		rewardGrantKey = nil,
		nextQuestId = nil,
		steps = {
			{
				id = "ch4_s_tongue",
				completeEvent = "ch4_tongue_obtained",
				objective = {
					ru = "Язык Колокола: Зоя ИЛИ дом зомби",
					uk = "Язик Дзвона",
					en = "Bell clapper: Zoya OR zombie house",
					da = "Klokkeklapper",
				},
				beacon = "npc_zoya",
			},
			{
				id = "ch4_s_crown",
				completeEvent = "ch4_crown_obtained",
				objective = {
					ru = "Корона Колокола в башне (заглушка)",
					uk = "Корона",
					en = "Bell crown in tower (stub)",
					da = "Krone (stub)",
				},
				beacon = "zone_castle_tower",
			},
			{
				id = "ch4_s_concert",
				completeEvent = "ch4_concert_ready",
				objective = {
					ru = "Подготовь концерт-развязку",
					uk = "Підготуй концерт",
					en = "Prepare the finale concert",
					da = "Forbered koncerten",
				},
				beacon = "zone_castle_hall",
			},
			{
				id = "ch4_s_finale",
				completeEvent = "ch4_pick_ending",
				objective = {
					ru = "Выбери судьбу Колокола и Тыквограда",
					uk = "Обери фінал",
					en = "Choose the Bell's fate",
					da = "Vælg klokkens skæbne",
				},
				beacon = "npc_count",
			},
		},
	},
}

QuestTable.endings = {
	ending_break_curse = {
		id = "ending_break_curse",
		grantKey = "reward_ending_curse",
		title = {
			ru = "Снять проклятие",
			uk = "Зняти прокляття",
			en = "Break the curse",
			da = "Bryd forbandelsen",
		},
	},
	ending_zombie_style = {
		id = "ending_zombie_style",
		grantKey = "reward_ending_zombie",
		title = {
			ru = "Зомби — это стиль",
			uk = "Зомбі — це стиль",
			en = "Zombie is a style",
			da = "Zombie er en stil",
		},
	},
	ending_count_deal = {
		id = "ending_count_deal",
		grantKey = "reward_ending_deal",
		title = {
			ru = "Сделка с Графом",
			uk = "Угода з Графом",
			en = "Deal with the Count",
			da = "Aftale med greven",
		},
	},
}

function QuestTable.get(questId: string): QuestDef?
	return QuestTable.quests[questId]
end

function QuestTable.stepDef(questId: string, stepId: string): QuestStep?
	local q = QuestTable.get(questId)
	if not q then
		return nil
	end
	for _, s in q.steps do
		if s.id == stepId then
			return s
		end
	end
	return nil
end

function QuestTable.firstStep(questId: string): QuestStep?
	local q = QuestTable.get(questId)
	if not q or #q.steps == 0 then
		return nil
	end
	return q.steps[1]
end

return QuestTable
