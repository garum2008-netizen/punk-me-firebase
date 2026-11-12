--!strict
local EndingLogic = {}

export type EndingId = "ending_break_curse" | "ending_zombie_style" | "ending_count_deal"

function EndingLogic.recommended(story: {
	relationships: { [string]: number },
	decisions: { [string]: string },
	concertHeadliner: string?,
}): EndingId
	local razor = story.relationships.razor or 0
	local count = story.relationships.count or 0
	local bully = story.decisions.ch2_bully
	if count >= 15 and (story.concertHeadliner == "count" or story.concertHeadliner == "ghost") then
		return "ending_count_deal"
	end
	if bully == "join" or razor < 5 then
		return "ending_zombie_style"
	end
	return "ending_break_curse"
end

function EndingLogic.canPick(
	story: { relationships: { [string]: number }, decisions: { [string]: string } },
	endingId: EndingId
): boolean
	if endingId == "ending_break_curse" then
		return (story.relationships.razor or 0) >= 0
	end
	if endingId == "ending_zombie_style" then
		return true
	end
	if endingId == "ending_count_deal" then
		return (story.relationships.count or 0) >= 10
	end
	return false
end

return EndingLogic
