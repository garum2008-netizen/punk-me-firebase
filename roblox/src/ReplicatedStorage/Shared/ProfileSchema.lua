--!strict
local QuestEngine = if script and script.Parent then require(script.Parent.QuestEngine) else require("./QuestEngine")

local ProfileSchema = {}

ProfileSchema.CURRENT_VERSION = 5

export type Language = "ru" | "uk" | "en" | "da"

export type Profile = {
	schemaVersion: number,
	coins: number,
	xp: number,
	level: number,
	language: Language,
	avatarPreset: string,
	story: QuestEngine.StoryState,
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
		story = QuestEngine.defaultStoryState(),
		inventory = {},
		roomDecor = {},
		settings = table.clone(DEFAULT_SETTINGS),
	}
end

local function isLanguage(v: any): boolean
	return v == "ru" or v == "uk" or v == "en" or v == "da"
end

local function sanitizeStory(raw: any): QuestEngine.StoryState
	local base = QuestEngine.defaultStoryState()
	if type(raw) ~= "table" then
		return base
	end
	base.activeQuestId = type(raw.activeQuestId) == "string" and raw.activeQuestId or base.activeQuestId
	base.activeStepId = type(raw.activeStepId) == "string" and raw.activeStepId or base.activeStepId
	base.completedQuests = type(raw.completedQuests) == "table" and raw.completedQuests or base.completedQuests
	base.chapter = type(raw.chapter) == "number" and raw.chapter or base.chapter
	base.chapterComplete = type(raw.chapterComplete) == "table" and raw.chapterComplete or base.chapterComplete
	base.decisions = type(raw.decisions) == "table" and raw.decisions or base.decisions
	base.relationships = type(raw.relationships) == "table" and raw.relationships or base.relationships
	base.uniqueItems = type(raw.uniqueItems) == "table" and raw.uniqueItems or base.uniqueItems
	base.grantedRewards = type(raw.grantedRewards) == "table" and raw.grantedRewards or base.grantedRewards
	base.storyEnding = type(raw.storyEnding) == "string" and raw.storyEnding or nil
	base.freePlay = raw.freePlay == true
	base.hangoutStage = type(raw.hangoutStage) == "number" and raw.hangoutStage or 0
	base.hangout = type(raw.hangout) == "table" and raw.hangout or base.hangout
	base.flyersPosted = type(raw.flyersPosted) == "table" and raw.flyersPosted or base.flyersPosted
	base.concertHeadliner = type(raw.concertHeadliner) == "string" and raw.concertHeadliner or nil
	base.flags = type(raw.flags) == "table" and raw.flags or base.flags
	base.ch0HouseZones = type(raw.ch0HouseZones) == "table" and raw.ch0HouseZones or base.ch0HouseZones
	return base
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

	local story = sanitizeStory(raw.story)
	-- legacy v3 fields
	if raw.story == nil and raw.tutorialStep ~= nil then
		story = QuestEngine.defaultStoryState()
		if raw.tutorialStep == "chapter_complete" or raw.chapterComplete == true then
			story.completedQuests[QuestEngine.defaultStoryState().activeQuestId] = true
			story.chapter = 1
			story.activeQuestId = "q_ch1_initiation_choice"
			story.activeStepId = "ch1_s_choice"
		end
		if type(raw.grantedRewards) == "table" then
			story.grantedRewards = raw.grantedRewards
		end
		if type(raw.questFlags) == "table" then
			for k, v in raw.questFlags do
				if v then
					story.completedQuests[k] = true
				end
			end
		end
	end

	local profile: Profile = {
		schemaVersion = type(raw.schemaVersion) == "number" and raw.schemaVersion or 0,
		coins = math.floor(coins),
		xp = type(raw.xp) == "number" and math.max(0, math.floor(raw.xp)) or 0,
		level = type(raw.level) == "number" and math.max(1, math.floor(raw.level)) or 1,
		language = lang,
		avatarPreset = type(raw.avatarPreset) == "string" and raw.avatarPreset or "",
		story = story,
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
