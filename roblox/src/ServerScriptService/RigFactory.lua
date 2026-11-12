--!strict
local Players = game:GetService("Players")

local AvatarPresets = require(game.ReplicatedStorage.Config.AvatarPresets)
local NpcVisuals = require(game.ReplicatedStorage.Config.NpcVisuals)
local NpcAnimator = require(script.Parent.NpcAnimator)

local RigFactory = {}

local function applyColors(desc: HumanoidDescription, body: Color3, accent: Color3)
	desc.HeadColor = accent
	desc.TorsoColor = body
	desc.LeftArmColor = body
	desc.RightArmColor = body
	desc.LeftLegColor = body
	desc.RightLegColor = body
end

function RigFactory.spawnNpc(parent: Instance, npcId: string, position: Vector3, actionText: string?): Model
	local preset = AvatarPresets.get(npcId:gsub("npc_", ""))
	local visual = (NpcVisuals :: any)[npcId]
	local desc = Instance.new("HumanoidDescription")
	if preset then
		applyColors(desc, preset.bodyColor, preset.accentColor)
	elseif visual then
		applyColors(desc, visual.bodyColor, visual.accentColor)
		if visual.height then
			desc.HeightScale = visual.height
		end
	else
		applyColors(desc, Color3.fromRGB(80, 80, 90), Color3.fromRGB(200, 200, 210))
	end

	local model = Players:CreateHumanoidModelFromDescription(desc, Enum.HumanoidRigType.R15)
	model.Name = npcId
	model:SetAttribute("NpcId", npcId)
	local hrp = model:FindFirstChild("HumanoidRootPart") :: BasePart?
	if hrp then
		model:PivotTo(CFrame.new(position + Vector3.new(0, 3, 0)))
	end
	local hum = model:FindFirstChildOfClass("Humanoid")
	if hum then
		hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	end
	model.Parent = parent

	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = actionText or "Talk"
	prompt.ObjectText = npcId
	prompt.MaxActivationDistance = 12
	prompt.Parent = hrp or model

	NpcAnimator.playIdle(model)
	return model
end

return RigFactory
