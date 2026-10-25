--!strict
--[[
	Required voice recordings (upload to Roblox as Audio). IDs empty until owner provides assets.
]]

export type VoiceSlot = {
	id: string,
	lang: "ru" | "uk" | "en" | "da",
	robloxAudioId: string,
	notes: string,
}

return {
	slots = {
		{ id = "angelina_welcome", lang = "ru", robloxAudioId = "", notes = "Angelina welcome, ch0" },
		{ id = "angelina_welcome", lang = "uk", robloxAudioId = "", notes = "Angelina welcome, ch0" },
		{ id = "angelina_welcome", lang = "en", robloxAudioId = "", notes = "Angelina welcome, ch0" },
		{ id = "angelina_welcome", lang = "da", robloxAudioId = "", notes = "Angelina welcome, ch0" },
		{ id = "razor_intro", lang = "ru", robloxAudioId = "", notes = "Razor street intro" },
		{ id = "razor_intro", lang = "en", robloxAudioId = "", notes = "Razor street intro" },
		{ id = "gravedigger_job", lang = "ru", robloxAudioId = "", notes = "Cemetery job offer" },
		{ id = "gravedigger_job", lang = "en", robloxAudioId = "", notes = "Cemetery job offer" },
	} :: { VoiceSlot },
}
