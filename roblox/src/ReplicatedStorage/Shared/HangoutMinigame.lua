--!strict
local HangoutEngine = if script and script.Parent
	then require(script.Parent.HangoutEngine)
	else require("./HangoutEngine")

export type StageId = HangoutEngine.StageId

local ANSWERS: { [StageId]: string } = {
	foundation = "241",
	frame = "punkframe",
	neon = "neon4",
	grand_open = "tu-sovka",
}

local HangoutMinigame = {
	ANSWERS = ANSWERS,
}

function HangoutMinigame.validate(stage: StageId, answer: string): boolean
	local expected = ANSWERS[stage]
	if expected == nil then
		return false
	end
	return answer == expected
end

return HangoutMinigame
