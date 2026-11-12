--!strict
local Localization = {}

export type Lang = "ru" | "uk" | "en" | "da"

local strings: { [string]: { [Lang]: string } } = {
	ui_play = {
		ru = "Играть",
		uk = "Грати",
		en = "Play",
		da = "Spil",
	},
	ui_continue = {
		ru = "Продолжить",
		uk = "Продовжити",
		en = "Continue",
		da = "Fortsæt",
	},
	ui_language = {
		ru = "Язык",
		uk = "Мова",
		en = "Language",
		da = "Sprog",
	},
	ui_coins = {
		ru = "Монеты",
		uk = "Монети",
		en = "Coins",
		da = "Mønter",
	},
	ui_help = {
		ru = "Помоги",
		uk = "Допоможи",
		en = "Help me",
		da = "Hjælp mig",
	},
	err_save_failed = {
		ru = "Не удалось сохранить. Попробуем ещё раз.",
		uk = "Не вдалося зберегти. Спробуємо ще раз.",
		en = "Could not save. We will try again.",
		da = "Kunne ikke gemme. Vi prøver igen.",
	},
	err_not_enough_coins = {
		ru = "Не хватает монет. Заработай на кладбище у смотрителя.",
		uk = "Не вистачає монет. Зароби на цвинтарі.",
		en = "Not enough coins. Earn at the cemetery job.",
		da = "Ikke nok mønter. Tjen på kirkegårdsjobbet.",
	},
	loc_house13 = {
		ru = "Дом 13",
		uk = "Будинок 13",
		en = "House 13",
		da = "Hus 13",
	},
	loc_street = {
		ru = "Улица банды",
		uk = "Вулиця банди",
		en = "Gang Street",
		da = "Bandegaden",
	},
	loc_cemetery = {
		ru = "Кладбище",
		uk = "Цвинтар",
		en = "Cemetery",
		da = "Kirkegård",
	},
	loc_duel = {
		ru = "Зона дуэлей",
		uk = "Зона дуелей",
		en = "Duel pit",
		da = "Duelfelt",
	},
	loc_parkour = {
		ru = "Паркур",
		uk = "Паркур",
		en = "Parkour",
		da = "Parkour",
	},
	quest_talk_razor = {
		ru = "Поговори с Рейзором на улице",
		uk = "Поговори з Рейзором на вулиці",
		en = "Talk to Razor on the street",
		da = "Tal med Razor på gaden",
	},
	quest_cemetery_job = {
		ru = "Отработай смену на кладбище",
		uk = "Відпрацюй зміну на цвинтарі",
		en = "Complete a cemetery shift",
		da = "Fuldfør en kirkegårdsvagt",
	},
	quest_shop = {
		ru = "Купи неоновый постер в магазине",
		uk = "Купи неоновий постер у магазині",
		en = "Buy a neon poster at the shop",
		da = "Køb en neonplakat i butikken",
	},
	quest_duel = {
		ru = "Выиграй учебную дуэль с Рейзором",
		uk = "Виграй навчальну дуель з Рейзором",
		en = "Win the training duel with Razor",
		da = "Vind træningsduellen mod Razor",
	},
	quest_decorate = {
		ru = "Повесь постер в своей комнате",
		uk = "Повісь постер у своїй кімнаті",
		en = "Hang the poster in your room",
		da = "Hæng plakaten på dit værelse",
	},
	chapter0_complete = {
		ru = "Глава 0 завершена! Добро пожаловать в Дом 13.",
		uk = "Розділ 0 завершено! Ласкаво просимо до Будинку 13.",
		en = "Chapter 0 complete! Welcome to House 13.",
		da = "Kapitel 0 fuldført! Velkommen til Hus 13.",
	},
}

function Localization.t(key: string, lang: Lang): string
	local row = strings[key]
	if row == nil then
		return key
	end
	return row[lang] or row.en or key
end

function Localization.keys(): { string }
	local out: { string } = {}
	for k in strings do
		table.insert(out, k)
	end
	table.sort(out)
	return out
end

return Localization
