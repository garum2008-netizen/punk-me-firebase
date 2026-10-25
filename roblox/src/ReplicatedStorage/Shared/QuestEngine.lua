--!strict
local QuestTable = if script and script.Parent
	then require(script.Parent.Parent.Config.QuestTable)
	else require("../Config/QuestTable")

local QuestEngine = {}

export type StoryState = {
	activeQuestId: string,
	activeStepId: string,
	completedQuests: { [string]: boolean },
	chapter: number,
	chapterComplete: { [number]: boolean },
	decisions: { [string]: string },
	relationships: { [string]: number },
	uniqueItems: { [string]: boolean },
	grantedRewards: { [string]: boolean },
	storyEnding: string?,
	freePlay: boolean,
	hangoutStage: number,
	ch0HouseZones: { [string]: boolean },
}

function QuestEngine.defaultStoryState(): StoryState
	return {
		activeQuestId = QuestTable.CH0,
		activeStepId = "ch0_s_awake",
		completedQuests = {},
		chapter = 0,
		chapterComplete = {},
		decisions = {},
		relationships = {
			razor = 0,
			vienna = 0,
			gang_rust = 0,
			count = 0,
		},
		uniqueItems = {},
		grantedRewards = {},
		storyEnding = nil,
		freePlay = false,
		hangoutStage = 0,
		ch0HouseZones = {},
	}
end

function QuestEngine.currentStep(state: StoryState): QuestTable.QuestStep?
	return QuestTable.stepDef(state.activeQuestId, state.activeStepId)
end

function QuestEngine.stepExpectsEvent(state: StoryState, eventId: string): boolean
	local step = QuestEngine.currentStep(state)
	return step ~= nil and step.completeEvent == eventId
end

local REWARD_TABLE = {
	reward_ch0_complete = { coins = 30, xp = 25, rel = { "razor", 5 } },
	reward_initiation_pay = { xp = 50, rel = { "gang_rust", 10 } },
	reward_initiation_duel = { xp = 60, rel = { "gang_rust", 15 } },
	reward_initiation_graffiti = { xp = 45, rel = { "gang_rust", 10 } },
	reward_ch2_hangout = { xp = 80, rel = { "vienna", 10 } },
	reward_ch2_choice = { xp = 20 },
	reward_ch3_rim = { unique = "bell_rim", xp = 70 },
	reward_ending_curse = { coins = 200, xp = 150 },
	reward_ending_zombie = { coins = 200, xp = 150 },
	reward_ending_deal = { coins = 250, xp = 150 },
}

export type GrantResult = {
	granted: boolean,
	coinsDelta: number,
	xpDelta: number,
}

function QuestEngine.grantReward(state: StoryState, grantKey: string): GrantResult
	local result: GrantResult = { granted = false, coinsDelta = 0, xpDelta = 0 }
	if state.grantedRewards[grantKey] then
		return result
	end
	local spec = REWARD_TABLE[grantKey]
	if not spec then
		return result
	end
	state.grantedRewards[grantKey] = true
	result.granted = true
	if spec.coins then
		result.coinsDelta = spec.coins
	end
	if spec.xp then
		result.xpDelta = spec.xp
	end
	if spec.rel then
		local key, val = spec.rel[1], spec.rel[2]
		state.relationships[key] = (state.relationships[key] or 0) + val
	end
	if spec.unique then
		state.uniqueItems[spec.unique] = true
	end
	return result
end

function QuestEngine.advanceStep(state: StoryState): (boolean, GrantResult?)
	local quest = QuestTable.get(state.activeQuestId)
	if not quest then
		return false, nil
	end
	local idx = 0
	for i, s in quest.steps do
		if s.id == state.activeStepId then
			idx = i
			break
		end
	end
	if idx == 0 then
		return false, nil
	end
	if idx < #quest.steps then
		state.activeStepId = quest.steps[idx + 1].id
		return true, nil
	end
	-- quest complete
	state.completedQuests[state.activeQuestId] = true
	local grant: GrantResult? = nil
	if quest.rewardGrantKey then
		grant = QuestEngine.grantReward(state, quest.rewardGrantKey)
	end
	if state.activeQuestId == QuestTable.CH0 then
		state.chapterComplete[0] = true
		state.chapter = 1
		state.activeQuestId = QuestTable.CH1_CHOICE
		local first = QuestTable.firstStep(QuestTable.CH1_CHOICE)
		state.activeStepId = if first then first.id else ""
	elseif quest.nextQuestId then
		state.activeQuestId = quest.nextQuestId
		local first = QuestTable.firstStep(quest.nextQuestId)
		state.activeStepId = if first then first.id else ""
		local nq = QuestTable.get(quest.nextQuestId)
		if nq then
			state.chapter = math.max(state.chapter, nq.chapter)
		end
	end
	return true, grant
end

function QuestEngine.tryCompleteEvent(state: StoryState, eventId: string): (boolean, GrantResult?)
	if not QuestEngine.stepExpectsEvent(state, eventId) then
		return false, nil
	end
	return QuestEngine.advanceStep(state)
end

function QuestEngine.setDecision(state: StoryState, key: string, value: string): boolean
	if state.decisions[key] ~= nil then
		return false
	end
	state.decisions[key] = value
	return true
end

function QuestEngine.pickInitiationPath(state: StoryState, path: "pay" | "duel" | "graffiti"): boolean
	if state.activeQuestId ~= QuestTable.CH1_CHOICE or state.activeStepId ~= "ch1_s_choice" then
		return false
	end
	if not QuestEngine.setDecision(state, "initiation", path) then
		return false
	end
	state.completedQuests[QuestTable.CH1_CHOICE] = true
	local nextId = if path == "pay"
		then "q_initiation_pay"
		elseif path == "duel" then "q_initiation_duel"
		else "q_initiation_graffiti"
	state.completedQuests[QuestTable.CH1_CHOICE] = true
	state.activeQuestId = nextId
	local first = QuestTable.firstStep(nextId)
	state.activeStepId = if first then first.id else ""
	return true
end

function QuestEngine.grantUniqueItem(state: StoryState, itemId: string): boolean
	if state.uniqueItems[itemId] then
		return false
	end
	state.uniqueItems[itemId] = true
	return true
end

function QuestEngine.pickEnding(state: StoryState, endingId: string): boolean
	if state.activeQuestId ~= "q_ch4_castle" or state.activeStepId ~= "ch4_s_ending" then
		return false
	end
	local ending = QuestTable.endings[endingId]
	if not ending then
		return false
	end
	QuestEngine.grantReward(state, ending.grantKey)
	state.storyEnding = endingId
	state.freePlay = true
	state.completedQuests["q_ch4_castle"] = true
	state.chapterComplete[4] = true
	state.chapter = 4
	return true
end

-- Special handlers for compound events
function QuestEngine.trySpecial(state: StoryState, eventId: string, ctx: { coins: number }?): (boolean, GrantResult?)
	if eventId == "coins>=150" and state.activeQuestId == "q_initiation_pay" then
		if ctx and ctx.coins >= 150 then
			return QuestEngine.tryCompleteEvent(state, eventId)
		end
		return false, nil
	end
	if eventId == "hangout_stage>=4" and state.activeQuestId == QuestTable.CH2 then
		if state.hangoutStage >= 4 then
			return QuestEngine.tryCompleteEvent(state, eventId)
		end
		return false, nil
	end
	return QuestEngine.tryCompleteEvent(state, eventId)
end

return QuestEngine
