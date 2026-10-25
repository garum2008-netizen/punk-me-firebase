--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local CryptBuildEngine = require(ReplicatedStorage.Shared.CryptBuildEngine)
local GhostRiddleEngine = require(ReplicatedStorage.Shared.GhostRiddleEngine)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local requestAction = remotes:WaitForChild("RequestAction") :: RemoteEvent

local profile: any = nil
remotes:WaitForChild("ProfileUpdated").OnClientEvent:Connect(function(p)
	profile = p
end)

local hangoutGui = Instance.new("ScreenGui")
hangoutGui.Name = "HangoutMinigame"
hangoutGui.ResetOnSpawn = false
hangoutGui.Enabled = false
hangoutGui.Parent = playerGui

local hangTitle = Instance.new("TextLabel")
hangTitle.Size = UDim2.new(1, -20, 0, 40)
hangTitle.Position = UDim2.new(0, 10, 0, 8)
hangTitle.BackgroundTransparency = 1
hangTitle.TextColor3 = Color3.new(1, 1, 1)
hangTitle.TextWrapped = true
hangTitle.Parent = hangoutGui

local hangInput = Instance.new("TextBox")
hangInput.Size = UDim2.new(1, -20, 0, 36)
hangInput.Position = UDim2.new(0, 10, 0, 52)
hangInput.Parent = hangoutGui

local hangSubmit = Instance.new("TextButton")
hangSubmit.Size = UDim2.new(0, 120, 0, 32)
hangSubmit.Position = UDim2.new(0.5, -60, 0, 96)
hangSubmit.Text = "Готово"
hangSubmit.Parent = hangoutGui

local pendingHangoutStage: string? = nil

local HANGOUT_COPY: { [string]: string } = {
	foundation = "Фундамент: введи порядок блоков (подсказка: 2-4-1)",
	frame = "Каркас: кодовое слово каркаса",
	neon = "Неон: сколько ламп? (цифра+neon)",
	grand_open = "Открытие: название места латиницей",
}

local function openHangout(stage: string)
	pendingHangoutStage = stage
	hangTitle.Text = HANGOUT_COPY[stage] or stage
	hangInput.Text = ""
	hangoutGui.Enabled = true
end

hangSubmit.MouseButton1Click:Connect(function()
	if pendingHangoutStage then
		requestAction:FireServer("hangout_build", { stage = pendingHangoutStage, answer = hangInput.Text })
		hangoutGui.Enabled = false
		pendingHangoutStage = nil
	end
end)

local ghostGui = Instance.new("ScreenGui")
ghostGui.Name = "GhostRiddle"
ghostGui.ResetOnSpawn = false
ghostGui.Enabled = false
ghostGui.Parent = playerGui

local ghostQ = Instance.new("TextLabel")
ghostQ.Size = UDim2.new(0.9, 0, 0, 60)
ghostQ.Position = UDim2.new(0.05, 0, 0, 10)
ghostQ.TextWrapped = true
ghostQ.TextColor3 = Color3.fromRGB(200, 220, 255)
ghostQ.Parent = ghostGui

local ghostInput = Instance.new("TextBox")
ghostInput.Size = UDim2.new(0.9, 0, 0, 32)
ghostInput.Position = UDim2.new(0.05, 0, 0, 78)
ghostInput.Parent = ghostGui

local ghostSubmit = Instance.new("TextButton")
ghostSubmit.Size = UDim2.new(0, 100, 0, 30)
ghostSubmit.Position = UDim2.new(0.35, 0, 0, 118)
ghostSubmit.Text = "Ответ"
ghostSubmit.Parent = ghostGui

local RIDDLE_TEXT = {
	"Что звенит над Веной и зовёт мёртвинов?",
	"Где призраки ждут ночью?",
	"Кто держит город в ритме?",
}

local function openGhost()
	local step = (profile and profile.story and profile.story.ghostRiddleStep) or 0
	if step >= GhostRiddleEngine.RIDDLE_COUNT then
		return
	end
	ghostQ.Text = RIDDLE_TEXT[step + 1] or "..."
	ghostInput.Text = ""
	ghostGui.Enabled = true
end

ghostSubmit.MouseButton1Click:Connect(function()
	requestAction:FireServer("ch3_ghost", ghostInput.Text)
	ghostGui.Enabled = false
end)

local cryptGui = Instance.new("ScreenGui")
cryptGui.Name = "CryptBuild"
cryptGui.ResetOnSpawn = false
cryptGui.Enabled = false
cryptGui.Parent = playerGui

local cryptLabel = Instance.new("TextLabel")
cryptLabel.Size = UDim2.new(0.9, 0, 0, 50)
cryptLabel.Position = UDim2.new(0.05, 0, 0, 8)
cryptLabel.TextWrapped = true
cryptLabel.TextColor3 = Color3.new(1, 1, 1)
cryptLabel.Parent = cryptGui

local cryptInput = Instance.new("TextBox")
cryptInput.Size = UDim2.new(0.9, 0, 0, 32)
cryptInput.Position = UDim2.new(0.05, 0, 0, 64)
cryptInput.Parent = cryptGui

local cryptSubmit = Instance.new("TextButton")
cryptSubmit.Size = UDim2.new(0, 100, 0, 30)
cryptSubmit.Position = UDim2.new(0.35, 0, 0, 102)
cryptSubmit.Text = "Строить"
cryptSubmit.Parent = cryptGui

local CRYPT_HINTS = {
	"Фаза 1: крепления (4stakes)",
	"Фаза 2: фамилия на плите",
	"Фаза 3: печать с колоколом",
}

local function openCrypt()
	local phase = (profile and profile.story and profile.story.cryptPhase) or 0
	if phase >= CryptBuildEngine.PHASE_COUNT then
		return
	end
	local phaseId = CryptBuildEngine.PHASE_IDS[phase + 1]
	cryptLabel.Text = CRYPT_HINTS[phase + 1] or phaseId
	cryptInput.Text = ""
	cryptGui.Enabled = true
	cryptGui:SetAttribute("PendingPhase", phaseId)
end

cryptSubmit.MouseButton1Click:Connect(function()
	local phase = cryptGui:GetAttribute("PendingPhase")
	if type(phase) == "string" then
		requestAction:FireServer("ch3_crypt", { phase = phase, answer = cryptInput.Text })
		cryptGui.Enabled = false
	end
end)

local function bindPrompt(prompt: ProximityPrompt)
	if prompt:GetAttribute("MinigameBound") then
		return
	end
	prompt:SetAttribute("MinigameBound", true)
	prompt.Triggered:Connect(function()
		local parent = prompt.Parent
		local hangoutStage = parent and parent:GetAttribute("HangoutStage")
		if hangoutStage then
			openHangout(hangoutStage :: string)
			return
		end
		if parent and parent.Name == "obj_crypt_site" then
			openCrypt()
			return
		end
		local npcId = parent and parent:GetAttribute("NpcId")
		if npcId == "npc_ghost" then
			openGhost()
		end
	end)
end

for _, inst in workspace:GetDescendants() do
	if inst:IsA("ProximityPrompt") then
		bindPrompt(inst)
	end
end
workspace.DescendantAdded:Connect(function(inst)
	if inst:IsA("ProximityPrompt") then
		bindPrompt(inst)
	end
end)
