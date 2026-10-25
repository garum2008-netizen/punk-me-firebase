--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Localization = require(ReplicatedStorage.Shared.Localization)
local AngelinaLines = require(ReplicatedStorage.Shared.AngelinaLines)
local AvatarPresets = require(ReplicatedStorage.Config.AvatarPresets)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local profile: any = nil

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local profileUpdated = remotes:WaitForChild("ProfileUpdated") :: RemoteEvent
local requestAction = remotes:WaitForChild("RequestAction") :: RemoteEvent

local screen = Instance.new("ScreenGui")
screen.Name = "PunkMeHUD"
screen.ResetOnSpawn = false
screen.Parent = playerGui

local angelinaFrame = Instance.new("Frame")
angelinaFrame.Name = "Angelina"
angelinaFrame.Size = UDim2.new(0, 280, 0, 120)
angelinaFrame.Position = UDim2.new(1, -290, 1, -130)
angelinaFrame.BackgroundColor3 = Color3.fromRGB(25, 20, 35)
angelinaFrame.BorderSizePixel = 0
angelinaFrame.Parent = screen

local angelinaText = Instance.new("TextLabel")
angelinaText.Size = UDim2.new(1, -10, 1, -40)
angelinaText.Position = UDim2.new(0, 5, 0, 5)
angelinaText.BackgroundTransparency = 1
angelinaText.TextColor3 = Color3.fromRGB(240, 220, 255)
angelinaText.TextWrapped = true
angelinaText.TextXAlignment = Enum.TextXAlignment.Left
angelinaText.TextYAlignment = Enum.TextYAlignment.Top
angelinaText.Font = Enum.Font.Gotham
angelinaText.TextSize = 14
angelinaText.Parent = angelinaFrame

local helpBtn = Instance.new("TextButton")
helpBtn.Size = UDim2.new(0, 80, 0, 28)
helpBtn.Position = UDim2.new(0, 5, 1, -33)
helpBtn.Text = "Помоги"
helpBtn.Parent = angelinaFrame

local collapseBtn = Instance.new("TextButton")
collapseBtn.Size = UDim2.new(0, 28, 0, 28)
collapseBtn.Position = UDim2.new(1, -33, 0, 5)
collapseBtn.Text = "−"
collapseBtn.Parent = angelinaFrame

local questLabel = Instance.new("TextLabel")
questLabel.Size = UDim2.new(0, 320, 0, 60)
questLabel.Position = UDim2.new(0, 10, 0, 10)
questLabel.BackgroundTransparency = 0.3
questLabel.BackgroundColor3 = Color3.fromRGB(10, 10, 15)
questLabel.TextColor3 = Color3.new(1, 1, 1)
questLabel.TextWrapped = true
questLabel.Font = Enum.Font.GothamBold
questLabel.TextSize = 16
questLabel.Parent = screen

local coinsLabel = Instance.new("TextLabel")
coinsLabel.Size = UDim2.new(0, 160, 0, 32)
coinsLabel.Position = UDim2.new(0, 10, 0, 80)
coinsLabel.BackgroundTransparency = 0.2
coinsLabel.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
coinsLabel.TextColor3 = Color3.fromRGB(255, 220, 100)
coinsLabel.Font = Enum.Font.GothamBold
coinsLabel.TextSize = 18
coinsLabel.Parent = screen

local function lang(): AngelinaLines.Lang
	if profile and profile.language then
		return profile.language
	end
	return "ru"
end

local function say(ctx: AngelinaLines.Context)
	angelinaText.Text = AngelinaLines.forContext(ctx, lang())
end

local function questTextForStep(step: string): string
	local l = lang()
	if step == "talk_razor" then
		return Localization.t("quest_talk_razor", l)
	elseif step == "cemetery_job" then
		return Localization.t("quest_cemetery_job", l)
	elseif step == "shop_purchase" then
		return Localization.t("quest_shop", l)
	elseif step == "duel_razor" then
		return Localization.t("quest_duel", l)
	elseif step == "decorate_room" then
		return Localization.t("quest_decorate", l)
	elseif step == "chapter_complete" then
		return Localization.t("chapter0_complete", l)
	end
	return Localization.t("ui_play", l)
end

local function refreshHud()
	if not profile then
		return
	end
	coinsLabel.Text = Localization.t("ui_coins", lang()) .. ": " .. tostring(profile.coins)
	questLabel.Text = questTextForStep(profile.tutorialStep)
	helpBtn.Text = Localization.t("ui_help", lang())
end

profileUpdated.OnClientEvent:Connect(function(p)
	profile = p
	refreshHud()
	if profile.tutorialStep == "angelina_intro" then
		say("welcome")
	elseif profile.tutorialStep == "tutorial_move" then
		say("move")
	end
end)

helpBtn.MouseButton1Click:Connect(function()
	say("stuck")
end)

collapseBtn.MouseButton1Click:Connect(function()
	angelinaFrame.Visible = not angelinaFrame.Visible
end)

-- Avatar picker (simple)
local picker = Instance.new("Frame")
picker.Size = UDim2.new(0, 260, 0, 200)
picker.Position = UDim2.new(0.5, -130, 0.5, -100)
picker.BackgroundColor3 = Color3.fromRGB(15, 15, 20)
picker.Visible = false
picker.Parent = screen

for i, preset in AvatarPresets.list do
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.new(1, -20, 0, 36)
	btn.Position = UDim2.new(0, 10, 0, 10 + (i - 1) * 42)
	btn.Text = preset.id
	btn.Parent = picker
	btn.MouseButton1Click:Connect(function()
		requestAction:FireServer("set_avatar", preset.id)
		picker.Visible = false
	end)
end

profileUpdated.OnClientEvent:Connect(function(p)
	if p.tutorialStep == "choose_avatar" then
		picker.Visible = true
	end
end)

-- ProximityPrompt hook (client suggests server actions via prompts — server validates)
local function bindPrompt(prompt: ProximityPrompt)
	if prompt:GetAttribute("Bound") then
		return
	end
	prompt:SetAttribute("Bound", true)
	prompt.Triggered:Connect(function()
		if not profile then
			return
		end
		local parent = prompt.Parent
		local npcId = parent and parent:GetAttribute("NpcId")
		if npcId == "npc_razor" then
			if profile.tutorialStep == "talk_razor" then
				requestAction:FireServer("tutorial_complete", "talk_razor")
				say("job")
			elseif profile.tutorialStep == "duel_razor" then
				requestAction:FireServer("duel_win")
				say("save")
			end
		elseif npcId == "npc_gravedigger" and profile.tutorialStep == "cemetery_job" then
			requestAction:FireServer("cemetery_job_complete")
			say("shop")
		elseif parent and parent.Name == "Shop" and profile.tutorialStep == "shop_purchase" then
			requestAction:FireServer("shop_purchase", "decor_neon_poster")
		elseif parent and parent.Name == "RoomFloor" and profile.tutorialStep == "decorate_room" then
			requestAction:FireServer("decorate_room")
		end
	end)
end

workspace.DescendantAdded:Connect(function(inst)
	if inst:IsA("ProximityPrompt") then
		bindPrompt(inst)
	end
end)

for _, inst in workspace:GetDescendants() do
	if inst:IsA("ProximityPrompt") then
		bindPrompt(inst)
	end
end

local function tryAdvance(step: string)
	if profile and profile.tutorialStep == step then
		requestAction:FireServer("tutorial_complete", step)
	end
end

task.delay(2, function()
	tryAdvance("angelina_intro")
end)

RunService.Heartbeat:Connect(function()
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not hrp or not profile then
		return
	end
	if profile.tutorialStep == "tutorial_move" and hrp.Position.Magnitude > 12 then
		tryAdvance("tutorial_move")
		say("interact")
	elseif profile.tutorialStep == "tutorial_interact" and hrp.Position.Magnitude > 25 then
		tryAdvance("tutorial_interact")
	end
end)
