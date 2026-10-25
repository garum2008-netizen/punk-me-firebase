--!strict
local WorldState = {}

function WorldState.applyEnding(world: Folder, endingId: string)
	local lighting = game:GetService("Lighting")
	if endingId == "ending_break_curse" then
		world:SetAttribute("EndingApplied", endingId)
		lighting.ClockTime = 6
		lighting.Brightness = 2.5
	elseif endingId == "ending_zombie_style" then
		world:SetAttribute("EndingApplied", endingId)
		lighting.ClockTime = 0
		lighting.Brightness = 1.2
	elseif endingId == "ending_count_deal" then
		world:SetAttribute("EndingApplied", endingId)
		lighting.ClockTime = 22
		lighting.Brightness = 1.8
	end
	local castle = world:FindFirstChild("Castle")
	if castle then
		castle:SetAttribute("EndingWorld", endingId)
	end
end

return WorldState
