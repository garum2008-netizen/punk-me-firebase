--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local AngelinaLines = require(ReplicatedStorage.Shared.AngelinaLines)
local AvatarPresets = require(ReplicatedStorage.Config.AvatarPresets)
local QuestTable = require(ReplicatedStorage.Config.QuestTable)
local EndingLogic = require(ReplicatedStorage.Shared.EndingLogic)
local FlyerEngine = require(ReplicatedStorage.Shared.FlyerEngine)
local ShopCatalog = require(ReplicatedStorage.Config.ShopCatalog)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local profile: any = nil
local lookedRoom = false
local interactDone = false

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local profileUpdated = remotes:WaitForChild("ProfileUpdated") :: RemoteEvent
local requestAction = remotes:WaitForChild("RequestAction") :: RemoteEvent

local screen = Instance.new("ScreenGui")
screen.Name = "PunkMeHUD"
screen.ResetOnSpawn = false
screen.Parent = playerGui

local questLabel = Instance.new("TextLabel")
questLabel.Size = UDim2.new(0, 360, 0, 72)
questLabel.Position = UDim2.new(0, 10, 0, 10)
questLabel.BackgroundTransparency = 0.25
questLabel.BackgroundColor3 = Color3.fromRGB(10, 10, 15)
questLabel.TextColor3 = Color3.new(1, 1, 1)
questLabel.TextWrapped = true
questLabel.Font = Enum.Font.GothamBold
questLabel.TextSize = 15
questLabel.Parent = screen

local coinsLabel = Instance.new("TextLabel")
coinsLabel.Size = UDim2.new(0, 180, 0, 28)
coinsLabel.Position = UDim2.new(0, 10, 0, 88)
coinsLabel.BackgroundTransparency = 0.2
coinsLabel.TextColor3 = Color3.fromRGB(255, 220, 100)
coinsLabel.Font = Enum.Font.GothamBold
coinsLabel.TextSize = 16
coinsLabel.Parent = screen

local flyerLabel = Instance.new("TextLabel")
flyerLabel.Size = UDim2.new(0, 200, 0, 24)
flyerLabel.Position = UDim2.new(0, 10, 0, 118)
flyerLabel.BackgroundTransparency = 0.3
flyerLabel.TextColor3 = Color3.fromRGB(255, 180, 220)
flyerLabel.Font = Enum.Font.Gotham
flyerLabel.TextSize = 14
flyerLabel.Visible = false
flyerLabel.Parent = screen

local duelHint = Instance.new("TextLabel")
duelHint.Size = UDim2.new(0, 280, 0, 40)
duelHint.Position = UDim2.new(0.5, -140, 0.2, 0)
duelHint.BackgroundTransparency = 0.2
duelHint.TextColor3 = Color3.fromRGB(255, 120, 120)
duelHint.Text =
	"Дуэль: иди на арену (красная площадка) и поговори с Рейзором"
duelHint.Visible = false
duelHint.Parent = screen

local angelinaFrame = Instance.new("Frame")
angelinaFrame.Size = UDim2.new(0, 300, 0, 110)
angelinaFrame.Position = UDim2.new(1, -310, 1, -120)
angelinaFrame.BackgroundColor3 = Color3.fromRGB(25, 20, 35)
angelinaFrame.Parent = screen

local angelinaText = Instance.new("TextLabel")
angelinaText.Size = UDim2.new(1, -10, 1, -36)
angelinaText.Position = UDim2.new(0, 5, 0, 4)
angelinaText.BackgroundTransparency = 1
angelinaText.TextColor3 = Color3.fromRGB(240, 220, 255)
angelinaText.TextWrapped = true
angelinaText.TextXAlignment = Enum.TextXAlignment.Left
angelinaText.Font = Enum.Font.Gotham
angelinaText.TextSize = 14
angelinaText.Parent = angelinaFrame

local helpBtn = Instance.new("TextButton")
helpBtn.Size = UDim2.new(0, 90, 0, 28)
helpBtn.Position = UDim2.new(0, 5, 1, -32)
helpBtn.Text = "Помоги"
helpBtn.Parent = angelinaFrame

local picker = Instance.new("Frame")
picker.Size = UDim2.new(0, 280, 0, 220)
picker.Position = UDim2.new(0.5, -140, 0.5, -110)
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

local choiceFrame = Instance.new("Frame")
choiceFrame.Size = UDim2.new(0, 300, 0, 120)
choiceFrame.Position = UDim2.new(0.5, -150, 0.7, 0)
choiceFrame.BackgroundColor3 = Color3.fromRGB(20, 15, 30)
choiceFrame.Visible = false
choiceFrame.Parent = screen

local function lang(): AngelinaLines.Lang
	if profile and profile.language then
		return profile.language
	end
	return "ru"
end

local function say(ctx: AngelinaLines.Context)
	angelinaText.Text = AngelinaLines.forContext(ctx, lang())
end

helpBtn.MouseButton1Click:Connect(function()
	say("stuck")
end)

local langRow = Instance.new("Frame")
langRow.Size = UDim2.new(0, 200, 0, 28)
langRow.Position = UDim2.new(0, 10, 0, 146)
langRow.BackgroundTransparency = 1
langRow.Parent = screen
for i, code in { "ru", "uk", "en", "da" } do
	local lb = Instance.new("TextButton")
	lb.Size = UDim2.new(0, 46, 1, 0)
	lb.Position = UDim2.new(0, (i - 1) * 48, 0, 0)
	lb.Text = string.upper(code)
	lb.Parent = langRow
	lb.MouseButton1Click:Connect(function()
		requestAction:FireServer("set_language", code)
	end)
end

local shopFrame = Instance.new("Frame")
shopFrame.Size = UDim2.new(0, 260, 0, 120)
shopFrame.Position = UDim2.new(1, -270, 0.35, 0)
shopFrame.BackgroundColor3 = Color3.fromRGB(25, 15, 35)
shopFrame.Visible = false
shopFrame.Parent = screen
for i, item in ShopCatalog.list do
	local sb = Instance.new("TextButton")
	sb.Size = UDim2.new(1, -12, 0, 32)
	sb.Position = UDim2.new(0, 6, 0, 6 + (i - 1) * 36)
	sb.Text = string.format("%s — %d🪙", item.id, item.price)
	sb.Parent = shopFrame
	sb.MouseButton1Click:Connect(function()
		requestAction:FireServer("shop_buy", item.id)
	end)
end

task.delay(1.5, function()
	if not lookedRoom then
		lookedRoom = true
		requestAction:FireServer("quest_event", "ch0_look_room")
	end
end)

local endingFrame = Instance.new("Frame")
endingFrame.Size = UDim2.new(0, 320, 0, 140)
endingFrame.Position = UDim2.new(0.5, -160, 0.55, 0)
endingFrame.BackgroundColor3 = Color3.fromRGB(25, 10, 35)
endingFrame.Visible = false
endingFrame.Parent = screen

local endingButtons: { [string]: TextButton } = {}
for id, def in QuestTable.endings do
	local b = Instance.new("TextButton")
	b.Size = UDim2.new(1, -12, 0, 36)
	b.Text = def.title.ru
	b.Parent = endingFrame
	b.Visible = false
	endingButtons[id] = b
	b.MouseButton1Click:Connect(function()
		requestAction:FireServer("pick_ending", id)
		endingFrame.Visible = false
	end)
end

local function refreshEndings()
	if not profile or not profile.story then
		return
	end
	local st = profile.story
	local rec = EndingLogic.recommended(st)
	for id, b in endingButtons do
		local can = EndingLogic.canPick(st, id :: EndingLogic.EndingId)
		b.Visible = can
		local star = if id == rec then " ★" else ""
		b.Text = QuestTable.endings[id].title.ru .. star
	end
end

local bullyFrame: Frame
local concertFrame: Frame

local function refreshQuest()
	if not profile or not profile.story then
		return
	end
	local st = profile.story
	local step = QuestTable.stepDef(st.activeQuestId, st.activeStepId)
	if step then
		questLabel.Text = step.objective[lang()] or step.objective.en or st.activeStepId
		if step.angelina then
			say(step.angelina :: AngelinaLines.Context)
		end
	else
		questLabel.Text = st.activeQuestId .. " / " .. st.activeStepId
	end
	coinsLabel.Text = "🪙 " .. tostring(profile.coins)
	if st.activeQuestId == "q_initiation_graffiti" then
		flyerLabel.Visible = true
		local n = FlyerEngine.count(st.flyersPosted)
		flyerLabel.Text = string.format("Флаеры: %d / %d", n, #FlyerEngine.SPOT_IDS)
	else
		flyerLabel.Visible = false
	end
	duelHint.Visible = st.activeQuestId == "q_initiation_duel"
	shopFrame.Visible = st.activeStepId == "s1" and st.activeQuestId == "q_initiation_pay"
	if st.activeStepId == "ch0_s_avatar" then
		picker.Visible = true
	end
	if st.activeStepId == "ch1_s_choice" then
		choiceFrame.Visible = true
	end
	if bullyFrame then
		bullyFrame.Visible = st.activeQuestId == "q_ch2_antibully"
	end
	if concertFrame then
		concertFrame.Visible = st.activeStepId == "ch4_s_concert"
	end
end

profileUpdated.OnClientEvent:Connect(function(p)
	profile = p
	refreshQuest()
	refreshEndings()
end)

local function bindPrompt(prompt: ProximityPrompt)
	if prompt:GetAttribute("Bound") then
		return
	end
	prompt:SetAttribute("Bound", true)
	prompt.Triggered:Connect(function()
		if not profile or not profile.story then
			return
		end
		local st = profile.story
		local parent = prompt.Parent
		local npcId = parent and parent:GetAttribute("NpcId")
		if not interactDone then
			interactDone = true
			requestAction:FireServer("quest_event", "ch0_interact_done")
		end
		if npcId == "npc_mom" then
			requestAction:FireServer("quest_event", "ch0_mom_talk")
		elseif npcId == "npc_shnurok" then
			requestAction:FireServer("quest_event", "ch0_pet_shnurok")
		elseif npcId == "npc_razor" then
			if st.activeStepId == "ch0_s_razor" then
				requestAction:FireServer("quest_event", "ch0_razor_talk")
			elseif st.activeQuestId == "q_initiation_pay" and st.activeStepId == "s2" then
				requestAction:FireServer("pay_initiation")
			elseif st.activeQuestId == "q_initiation_duel" then
				requestAction:FireServer("duel_start")
			end
		elseif npcId == "npc_gravedigger" then
			requestAction:FireServer("cemetery_job")
		elseif npcId == "npc_zoya" then
			requestAction:FireServer("bell_tongue", "zoya")
		elseif npcId == "npc_count" then
			if st.activeStepId == "ch4_s_confession" then
				requestAction:FireServer("graph_confession")
			elseif st.activeStepId == "ch4_s_ending" then
				refreshEndings()
				endingFrame.Visible = true
			end
		end
		local flyerId = parent and parent:GetAttribute("FlyerSpotId")
		if flyerId then
			requestAction:FireServer("flyer_post", flyerId)
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

local function addChoice(text: string, action: string, payload: string?)
	local b = Instance.new("TextButton")
	b.Size = UDim2.new(1, -16, 0, 32)
	b.Position = UDim2.new(0, 8, 0, 8 + #choiceFrame:GetChildren() * 36)
	b.Text = text
	b.Parent = choiceFrame
	b.MouseButton1Click:Connect(function()
		requestAction:FireServer(action, payload)
		choiceFrame.Visible = false
	end)
end

addChoice("Взнос 150", "initiation_choice", "pay")
addChoice("Дуэль", "initiation_choice", "duel")
addChoice("Флаеры", "initiation_choice", "graffiti")

bullyFrame = Instance.new("Frame")
bullyFrame.Size = UDim2.new(0, 280, 0, 90)
bullyFrame.Position = UDim2.new(0.5, -140, 0.65, 0)
bullyFrame.BackgroundColor3 = Color3.fromRGB(30, 20, 40)
bullyFrame.Visible = false
bullyFrame.Parent = screen
local standBtn = Instance.new("TextButton")
standBtn.Size = UDim2.new(0.45, 0, 0, 32)
standBtn.Position = UDim2.new(0.05, 0, 0.5, 0)
standBtn.Text = "Заступиться"
standBtn.Parent = bullyFrame
standBtn.MouseButton1Click:Connect(function()
	requestAction:FireServer("ch2_antibully", "stand")
	bullyFrame.Visible = false
end)
local joinBtn = Instance.new("TextButton")
joinBtn.Size = UDim2.new(0.45, 0, 0, 32)
joinBtn.Position = UDim2.new(0.5, 0, 0.5, 0)
joinBtn.Text = "Поддержать насмешки"
joinBtn.Parent = bullyFrame
joinBtn.MouseButton1Click:Connect(function()
	requestAction:FireServer("ch2_antibully", "join")
	bullyFrame.Visible = false
end)

concertFrame = Instance.new("Frame")
concertFrame.Size = UDim2.new(0, 300, 0, 120)
concertFrame.Position = UDim2.new(0.5, -150, 0.55, 0)
concertFrame.BackgroundColor3 = Color3.fromRGB(25, 15, 35)
concertFrame.Visible = false
concertFrame.Parent = screen
for i, head in { "vienna", "razor", "count", "ghost" } do
	local b = Instance.new("TextButton")
	b.Size = UDim2.new(0.45, 0, 0, 28)
	b.Position = UDim2.new((i - 1) % 2 * 0.5, 8, 0, 8 + math.floor((i - 1) / 2) * 34)
	b.Text = head
	b.Parent = concertFrame
	b.MouseButton1Click:Connect(function()
		requestAction:FireServer("concert_prepare", head)
		concertFrame.Visible = false
	end)
end

RunService.Heartbeat:Connect(function()
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not hrp or not profile or not profile.story then
		return
	end
	local st = profile.story
	if st.activeStepId == "ch0_s_move" then
		local marker = workspace:FindFirstChild("World", true)
		local house = marker and workspace.World:FindFirstChild("House13")
		local m = house and house:FindFirstChild("marker_move") :: BasePart?
		if m and (hrp.Position - m.Position).Magnitude < 8 then
			requestAction:FireServer("quest_event", "ch0_move_done")
		end
	end
	if st.activeStepId == "ch0_s_street" and hrp.Position.X > 55 then
		requestAction:FireServer("quest_event", "ch0_enter_street")
	end
	if st.activeQuestId == "q_ch4_castle" and st.activeStepId == "ch4_s_enter" and hrp.Position.X < -50 then
		requestAction:FireServer("ch4_enter")
	end
	if st.activeStepId == "ch4_s_tongue" and hrp.Position.X > -60 and hrp.Position.X < -50 and hrp.Position.Z > 85 then
		requestAction:FireServer("bell_tongue", "zombie")
	end
	for _, inst in workspace:GetDescendants() do
		if inst:IsA("BasePart") and inst:GetAttribute("ZoneId") then
			local zoneId = inst:GetAttribute("ZoneId") :: string
			local rel = hrp.Position - inst.Position
			if
				math.abs(rel.X) < inst.Size.X / 2
				and math.abs(rel.Y) < inst.Size.Y / 2
				and math.abs(rel.Z) < inst.Size.Z / 2
			then
				if zoneId == "zone_room" or zoneId == "zone_hall" then
					requestAction:FireServer("house_zone", zoneId)
				end
			end
		end
	end
end)
