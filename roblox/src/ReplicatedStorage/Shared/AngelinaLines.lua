--!strict
local AngelinaLines = {}

export type Lang = "ru" | "uk" | "en" | "da"
export type Context = "welcome" | "move" | "interact" | "job" | "shop" | "duel" | "save" | "stuck"

local lines: { [Context]: { [Lang]: string } } = {
	welcome = {
		ru = "Привет! Я Ангелина. Сначала выбери образ — панки любят индивидуальность.",
		uk = "Привіт! Я Ангеліна. Спочатку обери образ — панки люблять індивідуальність.",
		en = "Hi! I'm Angelina. Pick a look first — punks love personality.",
		da = "Hej! Jeg er Angelina. Vælg et look først — punks elsker personlighed.",
	},
	move = {
		ru = "Сначала подойдём поближе. На расстоянии через всю комнату даже панки пока не телепаты.",
		uk = "Спочатку підійдемо ближче. На відстані через усю кімнату навіть панки поки не телепати.",
		en = "Let's get closer first. Even punks aren't telepaths across the room.",
		da = "Lad os komme tættere på først. Selv punks er ikke telepater på tværs af rummet.",
	},
	interact = {
		ru = "Нажми кнопку взаимодействия, когда увидишь подсказку. На телефоне — круглая кнопка.",
		uk = "Натисни кнопку взаємодії, коли побачиш підказку. На телефоні — кругла кнопка.",
		en = "Press interact when you see the prompt. On mobile — the round button.",
		da = "Tryk på interager, når du ser prompten. På mobil — den runde knap.",
	},
	job = {
		ru = "Монет маловато. Давай найдём работу — диван, к сожалению, зарплату не выдаёт.",
		uk = "Монет замало. Знайдемо роботу — диван, на жаль, зарплату не видає.",
		en = "Short on coins. Let's find work — couches don't pay, sadly.",
		da = "Få mønter. Lad os finde arbejde — sofaer betaler desværre ikke.",
	},
	shop = {
		ru = "В магазине на улице можно купить декор. Сначала проверь цену.",
		uk = "У магазині на вулиці можна купити декор. Спочатку перевір ціну.",
		en = "The street shop sells decor. Check the price first.",
		da = "Butikken på gaden sælger dekoration. Tjek prisen først.",
	},
	duel = {
		ru = "В дуэли: атака, блок, уклон. Рейзор сдержится — это учебный бой.",
		uk = "У дуелі: атака, блок, ухилення. Рейзор стриматиметься — це навчальний бій.",
		en = "In duels: attack, block, dodge. Razor holds back — training fight.",
		da = "I dueller: angreb, blok, undvig. Razor holder igen — træningskamp.",
	},
	save = {
		ru = "Получилось! Теперь сохраним успех. Красивый выход тоже часть плана.",
		uk = "Вийшло! Тепер збережемо успіх. Гарний вихід теж частина плану.",
		en = "Nice! Let's save that win. A clean exit is part of the plan.",
		da = "Fedt! Lad os gemme det. En pæn afslutning er også en del af planen.",
	},
	stuck = {
		ru = "Застряла цель? Открой журнал — там текущий шаг.",
		uk = "Застрягла ціль? Відкрий журнал — там поточний крок.",
		en = "Stuck? Open the journal — your current step is there.",
		da = "Fast? Åbn journalen — dit nuværende trin står der.",
	},
}

function AngelinaLines.forContext(ctx: Context, lang: Lang): string
	local row = lines[ctx]
	if row == nil then
		return ""
	end
	return row[lang] or row.en or ""
end

return AngelinaLines
