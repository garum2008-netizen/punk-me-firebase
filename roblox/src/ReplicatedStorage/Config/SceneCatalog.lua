--!strict
export type DialogueLine = {
	speaker: string,
	ru: string,
	en: string,
}

export type SceneDef = {
	id: string,
	durationSec: number,
	musicSlot: string?,
	cameraFrom: { x: number, y: number, z: number },
	cameraTo: { x: number, y: number, z: number },
	lookAt: { x: number, y: number, z: number },
	npcIds: { string },
	dialogue: { DialogueLine },
}

local SceneCatalog: { [string]: SceneDef } = {
	scene_ch0_razor = {
		id = "scene_ch0_razor",
		durationSec = 10,
		musicSlot = "ch0_home",
		cameraFrom = { x = 60, y = 8, z = 12 },
		cameraTo = { x = 72, y = 6, z = 8 },
		lookAt = { x = 70, y = 4, z = 5 },
		npcIds = { "npc_razor" },
		dialogue = {
			{
				speaker = "Razor",
				ru = "Ты на улице. Запомни: здесь платят уважением.",
				en = "You're on the street. Remember: respect is the currency.",
			},
			{
				speaker = "Angelina",
				ru = "Он ждёт — поговори, когда будешь готова.",
				en = "He's waiting — talk when you're ready.",
			},
		},
	},
	scene_ch1_duel_win = {
		id = "scene_ch1_duel_win",
		durationSec = 8,
		musicSlot = "ch1_duel",
		cameraFrom = { x = 115, y = 10, z = 125 },
		cameraTo = { x = 120, y = 7, z = 118 },
		lookAt = { x = 120, y = 3, z = 120 },
		npcIds = { "npc_razor" },
		dialogue = {
			{
				speaker = "Razor",
				ru = "Неплохо. Добро пожаловать в ржавчину.",
				en = "Not bad. Welcome to the rust.",
			},
		},
	},
	scene_ch2_antibully = {
		id = "scene_ch2_antibully",
		durationSec = 9,
		musicSlot = "ch2_hangout",
		cameraFrom = { x = 75, y = 8, z = 88 },
		cameraTo = { x = 80, y = 6, z = 82 },
		lookAt = { x = 70, y = 4, z = 5 },
		npcIds = { "npc_razor" },
		dialogue = {
			{
				speaker = "Razor",
				ru = "Город смотрит. Что ты выбрала — запомнят все.",
				en = "The city is watching. What you chose — everyone will remember.",
			},
		},
	},
	scene_ch4_confession = {
		id = "scene_ch4_confession",
		durationSec = 12,
		musicSlot = "ch4_confession",
		cameraFrom = { x = -90, y = 12, z = 88 },
		cameraTo = { x = -82, y = 8, z = 82 },
		lookAt = { x = -80, y = 4, z = 80 },
		npcIds = { "npc_count" },
		dialogue = {
			{
				speaker = "Count",
				ru = "Правда о Колоколе — не проклятие, а договор.",
				en = "The truth of the Bell is not a curse, but a bargain.",
			},
			{
				speaker = "Count",
				ru = "Выбор концовки — твой. Я лишь свидетель.",
				en = "The ending is yours. I am only a witness.",
			},
		},
	},
	scene_ending_break_curse = {
		id = "scene_ending_break_curse",
		durationSec = 14,
		musicSlot = "ending_break_curse",
		cameraFrom = { x = -100, y = 20, z = 100 },
		cameraTo = { x = -85, y = 14, z = 90 },
		lookAt = { x = -80, y = 30, z = 80 },
		npcIds = { "npc_count", "npc_razor" },
		dialogue = {
			{
				speaker = "Bell",
				ru = "Колокол звенит — мёртвины снова люди.",
				en = "The Bell rings — Mortwins are human again.",
			},
			{
				speaker = "Vienna",
				ru = "Вена поёт. Призраки идут в Склеп.",
				en = "Vienna sings. Ghosts find the Crypt.",
			},
		},
	},
	scene_ending_zombie_style = {
		id = "scene_ending_zombie_style",
		durationSec = 12,
		musicSlot = "ending_zombie_style",
		cameraFrom = { x = -60, y = 10, z = 95 },
		cameraTo = { x = -55, y = 8, z = 90 },
		lookAt = { x = -55, y = 6, z = 90 },
		npcIds = {},
		dialogue = {
			{
				speaker = "City",
				ru = "Зомби — стиль. Замок — клуб до рассвета.",
				en = "Zombie is style. The castle is a club till dawn.",
			},
		},
	},
	scene_ending_count_deal = {
		id = "scene_ending_count_deal",
		durationSec = 13,
		musicSlot = "ending_count_deal",
		cameraFrom = { x = -75, y = 9, z = 75 },
		cameraTo = { x = -80, y = 7, z = 80 },
		lookAt = { x = -80, y = 4, z = 80 },
		npcIds = { "npc_count" },
		dialogue = {
			{
				speaker = "Count",
				ru = "Сделка заключена. Ночной магазин открыт.",
				en = "The deal is sealed. The night shop opens.",
			},
			{
				speaker = "Angelina",
				ru = "Семья в безопасности — пока держим слово.",
				en = "Family is safe — as long as we keep our word.",
			},
		},
	},
}

return {
	get = function(id: string): SceneDef?
		return SceneCatalog[id]
	end,
	all = SceneCatalog,
}
