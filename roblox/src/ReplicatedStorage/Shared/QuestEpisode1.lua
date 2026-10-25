--!strict
--[[
	Chapter 0 episode flow: onboarding through first chapter completion.
]]

local QuestEpisode1 = {}

export type StepId =
	"welcome"
	| "choose_avatar"
	| "angelina_intro"
	| "tutorial_move"
	| "tutorial_interact"
	| "talk_razor"
	| "cemetery_job"
	| "shop_purchase"
	| "duel_razor"
	| "decorate_room"
	| "chapter_complete"

QuestEpisode1.ORDER = {
	"welcome",
	"choose_avatar",
	"angelina_intro",
	"tutorial_move",
	"tutorial_interact",
	"talk_razor",
	"cemetery_job",
	"shop_purchase",
	"duel_razor",
	"decorate_room",
	"chapter_complete",
}

function QuestEpisode1.stepIndex(step: string): number?
	for i, id in QuestEpisode1.ORDER do
		if id == step then
			return i
		end
	end
	return nil
end

function QuestEpisode1.canAdvance(current: string, completed: StepId): boolean
	local cur = QuestEpisode1.stepIndex(current)
	local done = QuestEpisode1.stepIndex(completed)
	if cur == nil or done == nil then
		return false
	end
	return done == cur
end

function QuestEpisode1.nextStep(current: string): string?
	local idx = QuestEpisode1.stepIndex(current)
	if idx == nil then
		return nil
	end
	if idx >= #QuestEpisode1.ORDER then
		return nil
	end
	return QuestEpisode1.ORDER[idx + 1]
end

function QuestEpisode1.advanceIfValid(current: string, completed: StepId): (string, boolean)
	if QuestEpisode1.canAdvance(current, completed) then
		local nxt = QuestEpisode1.nextStep(current)
		if nxt then
			return nxt, true
		end
	end
	return current, false
end

function QuestEpisode1.isChapterComplete(step: string): boolean
	return step == "chapter_complete"
end

return QuestEpisode1
