--!strict
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local AvatarPresets = require(ReplicatedStorage.Config.AvatarPresets)
local ProfileService = require(script.Parent.ProfileService)

local AvatarService = {}

local function applyPresetToCharacter(player: Player, presetId: string)
	local preset = AvatarPresets.get(presetId)
	if not preset then
		return
	end
	local char = player.Character
	if not char then
		return
	end
	local hum = char:FindFirstChildOfClass("Humanoid")
	if not hum then
		return
	end
	local desc = hum:GetAppliedDescription()
	desc.HeadColor = preset.accentColor
	desc.TorsoColor = preset.bodyColor
	desc.LeftArmColor = preset.bodyColor
	desc.RightArmColor = preset.bodyColor
	desc.LeftLegColor = preset.bodyColor
	desc.RightLegColor = preset.bodyColor
	hum:ApplyDescription(desc)
end

function AvatarService.bindPlayer(player: Player)
	player.CharacterAdded:Connect(function()
		local session = ProfileService.getSession(player.UserId)
		if session and session.profile.avatarPreset ~= "" then
			task.defer(function()
				applyPresetToCharacter(player, session.profile.avatarPreset)
			end)
		end
	end)
	if player.Character and player.Character.Parent then
		local session = ProfileService.getSession(player.UserId)
		if session and session.profile.avatarPreset ~= "" then
			applyPresetToCharacter(player, session.profile.avatarPreset)
		end
	end
end

function AvatarService.start()
	Players.PlayerAdded:Connect(AvatarService.bindPlayer)
	for _, p in Players:GetPlayers() do
		AvatarService.bindPlayer(p)
	end
end

return AvatarService
