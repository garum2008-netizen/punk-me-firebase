--!strict
local CryptBuildEngine = {}

CryptBuildEngine.PHASE_COUNT = 3

CryptBuildEngine.PHASE_IDS = { "stakes", "inscription", "seal" }

CryptBuildEngine.ANSWERS = {
	stakes = "4stakes",
	inscription = "mortwin",
	seal = "bellrim",
}

function CryptBuildEngine.phaseIndex(phaseId: string): number
	for i, id in CryptBuildEngine.PHASE_IDS do
		if id == phaseId then
			return i
		end
	end
	return 0
end

function CryptBuildEngine.validate(phaseId: string, answer: string, completedPhase: number): boolean
	local idx = CryptBuildEngine.phaseIndex(phaseId)
	if idx == 0 then
		return false
	end
	if idx ~= completedPhase + 1 then
		return false
	end
	return answer == CryptBuildEngine.ANSWERS[phaseId]
end

function CryptBuildEngine.isComplete(completedPhase: number): boolean
	return completedPhase >= CryptBuildEngine.PHASE_COUNT
end

return CryptBuildEngine
