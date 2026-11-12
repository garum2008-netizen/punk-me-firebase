--!strict
local NpcAnimator = require(script.Parent.NpcAnimator)

local NpcInteractService = {}

function NpcInteractService.playTalk(npcId: string)
	local world = workspace:FindFirstChild("World")
	if not world then
		return
	end
	for _, desc in world:GetDescendants() do
		if desc:IsA("Model") and desc:GetAttribute("NpcId") == npcId then
			NpcAnimator.playTalk(desc)
			task.delay(2.5, function()
				NpcAnimator.playIdle(desc)
			end)
			return
		end
	end
end

return NpcInteractService
