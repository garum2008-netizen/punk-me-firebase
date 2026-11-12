--!strict
local GhostRiddleEngine = {}

GhostRiddleEngine.RIDDLE_COUNT = 3

-- Answers are lowercase keywords (non-violent lore: bell, crypt path, Vienna)
GhostRiddleEngine.ANSWERS = { "колокол", "склеп", "вена" }

function GhostRiddleEngine.normalize(answer: string): string
	return string.lower(string.gsub(answer, "^%s+", "")):gsub("%s+$", "")
end

function GhostRiddleEngine.submit(step: number, answer: string): (boolean, number)
	if step < 0 or step >= GhostRiddleEngine.RIDDLE_COUNT then
		return false, step
	end
	local norm = GhostRiddleEngine.normalize(answer)
	if norm ~= GhostRiddleEngine.ANSWERS[step + 1] then
		return false, step
	end
	return true, step + 1
end

function GhostRiddleEngine.isComplete(step: number): boolean
	return step >= GhostRiddleEngine.RIDDLE_COUNT
end

return GhostRiddleEngine
