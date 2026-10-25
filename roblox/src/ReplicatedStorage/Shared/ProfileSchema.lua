--!strict
--[[
	Default player profile schema and validation (pure logic, testable outside Studio).
]]

local ProfileSchema = {}

ProfileSchema.CURRENT_VERSION = 3

export type Language = "ru" | "uk" | "en" | "da"

export type Profile = {
	schemaVersion: number,
	coins: number,
	xp: number,
	level: number,
	language: Language,
	avatarPreset: string,
	tutorialStep: string,
	chapter: number,
	chapterComplete: boolean,
	questFlags: { [string]: boolean },
	grantedRewards: { [string]: boolean },
	inventory: { [string]: number },
	roomDecor: { [string]: boolean },
	settings: {
		musicVolume: number,
		voiceVolume: number,
		sfxVolume: number,
		angelinaHints: boolean,
		subtitles: boolean,
	},
}

local DEFAULT_SETTINGS = {
	musicVolume = 0.7,
	voiceVolume = 1,
	sfxVolume = 0.8,
	angelinaHints = true,
	subtitles = true,
}

function ProfileSchema.defaultProfile(): Profile
	return {
		schemaVersion = ProfileSchema.CURRENT_VERSION,
		coins = 100,
		xp = 0,
		level = 1,
		language = "ru",
		avatarPreset = "",
		tutorialStep = "welcome",
		chapter = 0,
		chapterComplete = false,
		questFlags = {},
		grantedRewards = {},
		inventory = {},
		roomDecor = {},
		settings = table.clone(DEFAULT_SETTINGS),
	}
end

local function isLanguage(v: any): boolean
	return v == "ru" or v == "uk" or v == "en" or v == "da"
end

function ProfileSchema.sanitize(raw: any): (Profile?, string?)
	if type(raw) ~= "table" then
		return nil, "not_a_table"
	end
	local coins = raw.coins
	if type(coins) ~= "number" or coins < 0 or coins ~= coins then
		return nil, "invalid_coins"
	end
	local lang = raw.language
	if not isLanguage(lang) then
		lang = "ru"
	end
	local settings = raw.settings
	if type(settings) ~= "table" then
		settings = table.clone(DEFAULT_SETTINGS)
	end
	local profile: Profile = {
		schemaVersion = type(raw.schemaVersion) == "number" and raw.schemaVersion or 0,
		coins = math.floor(coins),
		xp = type(raw.xp) == "number" and math.max(0, math.floor(raw.xp)) or 0,
		level = type(raw.level) == "number" and math.max(1, math.floor(raw.level)) or 1,
		language = lang,
		avatarPreset = type(raw.avatarPreset) == "string" and raw.avatarPreset or "",
		tutorialStep = type(raw.tutorialStep) == "string" and raw.tutorialStep or "welcome",
		chapter = type(raw.chapter) == "number" and math.max(0, math.floor(raw.chapter)) or 0,
		chapterComplete = raw.chapterComplete == true,
		questFlags = type(raw.questFlags) == "table" and raw.questFlags or {},
		grantedRewards = type(raw.grantedRewards) == "table" and raw.grantedRewards or {},
		inventory = type(raw.inventory) == "table" and raw.inventory or {},
		roomDecor = type(raw.roomDecor) == "table" and raw.roomDecor or {},
		settings = {
			musicVolume = type(settings.musicVolume) == "number" and settings.musicVolume or 0.7,
			voiceVolume = type(settings.voiceVolume) == "number" and settings.voiceVolume or 1,
			sfxVolume = type(settings.sfxVolume) == "number" and settings.sfxVolume or 0.8,
			angelinaHints = settings.angelinaHints ~= false,
			subtitles = settings.subtitles ~= false,
		},
	}
	return profile, nil
end

function ProfileSchema.isEmptyProfile(raw: any): boolean
	if raw == nil then
		return true
	end
	if type(raw) ~= "table" then
		return true
	end
	if next(raw) == nil then
		return true
	end
	return false
end

return ProfileSchema
