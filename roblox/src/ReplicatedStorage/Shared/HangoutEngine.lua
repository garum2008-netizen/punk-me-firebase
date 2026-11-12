--!strict
local HangoutEngine = {}

export type StageId = "foundation" | "frame" | "neon" | "grand_open"

HangoutEngine.ORDER = { "foundation", "frame", "neon", "grand_open" }

export type Progress = {
	foundation: boolean,
	frame: boolean,
	neon: boolean,
	grand_open: boolean,
}

function HangoutEngine.newProgress(): Progress
	return { foundation = false, frame = false, neon = false, grand_open = false }
end

function HangoutEngine.stageIndex(stage: StageId): number
	for i, s in HangoutEngine.ORDER do
		if s == stage then
			return i
		end
	end
	return 0
end

function HangoutEngine.canComplete(progress: Progress, stage: StageId): boolean
	if progress[stage] then
		return false
	end
	local idx = HangoutEngine.stageIndex(stage)
	if idx <= 1 then
		return true
	end
	local prev = HangoutEngine.ORDER[idx - 1]
	return progress[prev] == true
end

function HangoutEngine.complete(progress: Progress, stage: StageId): (boolean, number)
	if not HangoutEngine.canComplete(progress, stage) then
		return false, HangoutEngine.completedCount(progress)
	end
	progress[stage] = true
	return true, HangoutEngine.completedCount(progress)
end

function HangoutEngine.completedCount(progress: Progress): number
	local n = 0
	for _, s in HangoutEngine.ORDER do
		if progress[s] then
			n += 1
		end
	end
	return n
end

function HangoutEngine.isDone(progress: Progress): boolean
	return HangoutEngine.completedCount(progress) >= #HangoutEngine.ORDER
end

return HangoutEngine
