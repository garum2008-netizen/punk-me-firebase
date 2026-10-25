--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local requestAction = remotes:WaitForChild("RequestAction") :: RemoteEvent
local duelUpdate = remotes:WaitForChild("DuelUpdate") :: RemoteEvent
local actionResult = remotes:WaitForChild("ActionResult") :: RemoteEvent

local duelGui = Instance.new("ScreenGui")
duelGui.Name = "DuelUI"
duelGui.ResetOnSpawn = false
duelGui.Enabled = false
duelGui.Parent = playerGui

local duelStatus = Instance.new("TextLabel")
duelStatus.Size = UDim2.new(0, 320, 0, 80)
duelStatus.Position = UDim2.new(0.5, -160, 0.35, 0)
duelStatus.BackgroundColor3 = Color3.fromRGB(20, 10, 30)
duelStatus.TextColor3 = Color3.new(1, 1, 1)
duelStatus.TextWrapped = true
duelStatus.Parent = duelGui

local function duelBtn(text: string, action: string, y: number)
	local b = Instance.new("TextButton")
	b.Size = UDim2.new(0, 100, 0, 36)
	b.Position = UDim2.new(0.5, -160 + y * 110, 0.5, 0)
	b.Text = text
	b.Parent = duelGui
	b.MouseButton1Click:Connect(function()
		requestAction:FireServer("duel_action", action)
	end)
end

duelBtn("Attack", "attack", 0)
duelBtn("Block", "block", 1)
duelBtn("Dodge", "dodge", 2)

duelUpdate.OnClientEvent:Connect(function(state: any, meta: any?)
	if not state then
		return
	end
	duelGui.Enabled = state.phase == "fighting"
	local npcHp = state.opponentHp or 0
	local plHp = state.playerHp or 0
	duelStatus.Text = string.format("You %d  |  Razor %d", plHp, npcHp)
	if meta then
		if meta.hitNpc then
			duelStatus.Text ..= "\nHit!"
		end
		if meta.hitPlayer then
			duelStatus.Text ..= "\nBlocked or hit!"
		end
	end
	if state.phase == "player_win" then
		duelStatus.Text = "Victory!"
		duelGui.Enabled = false
	elseif state.phase == "player_lose" then
		duelStatus.Text = "Try again — go to duel pit"
		duelGui.Enabled = false
	end
end)

local endingOverlay = Instance.new("ScreenGui")
endingOverlay.Name = "EndingScene"
endingOverlay.ResetOnSpawn = false
endingOverlay.Enabled = false
endingOverlay.Parent = playerGui

local endingText = Instance.new("TextLabel")
endingText.Size = UDim2.new(0.8, 0, 0.5, 0)
endingText.Position = UDim2.new(0.1, 0, 0.25, 0)
endingText.BackgroundColor3 = Color3.fromRGB(10, 5, 20)
endingText.TextColor3 = Color3.fromRGB(255, 220, 255)
endingText.TextWrapped = true
endingText.TextSize = 20
endingText.Parent = endingOverlay

actionResult.OnClientEvent:Connect(function(res)
	if res and res.ok and res.endingScene then
		endingOverlay.Enabled = true
		endingText.Text = res.endingScene
		task.delay(12, function()
			endingOverlay.Enabled = false
		end)
	end
end)

local towerGui = Instance.new("ScreenGui")
towerGui.Name = "TowerPuzzleUI"
towerGui.ResetOnSpawn = false
towerGui.Parent = playerGui

local towerFrame = Instance.new("Frame")
towerFrame.Size = UDim2.new(0, 320, 0, 220)
towerFrame.Position = UDim2.new(0.5, -160, 0.4, 0)
towerFrame.BackgroundColor3 = Color3.fromRGB(15, 10, 25)
towerFrame.Visible = false
towerFrame.Parent = towerGui

local candleOrder: { number } = {}
local noteOrder: { string } = {}

local candleLabel = Instance.new("TextLabel")
candleLabel.Size = UDim2.new(1, -10, 0, 24)
candleLabel.Position = UDim2.new(0, 5, 0, 4)
candleLabel.Text = "Свечи (порядок зажигания):"
candleLabel.TextColor3 = Color3.new(1, 1, 1)
candleLabel.Parent = towerFrame

for i = 1, 4 do
	local cb = Instance.new("TextButton")
	cb.Size = UDim2.new(0, 60, 0, 28)
	cb.Position = UDim2.new(0, 8 + (i - 1) * 64, 0, 32)
	cb.Text = tostring(i)
	cb.Parent = towerFrame
	cb.MouseButton1Click:Connect(function()
		table.insert(candleOrder, i)
		candleLabel.Text = "Свечи: " .. table.concat(candleOrder, "-")
	end)
end

local noteLabel = Instance.new("TextLabel")
noteLabel.Size = UDim2.new(1, -10, 0, 24)
noteLabel.Position = UDim2.new(0, 5, 0, 68)
noteLabel.Text = "Орган (ноты):"
noteLabel.TextColor3 = Color3.new(1, 1, 1)
noteLabel.Parent = towerFrame

for j, note in { "C", "D", "E", "G" } do
	local nb = Instance.new("TextButton")
	nb.Size = UDim2.new(0, 60, 0, 28)
	nb.Position = UDim2.new(0, 8 + (j - 1) * 64, 0, 96)
	nb.Text = note
	nb.Parent = towerFrame
	nb.MouseButton1Click:Connect(function()
		table.insert(noteOrder, note)
		noteLabel.Text = "Орган: " .. table.concat(noteOrder, " ")
	end)
end

local resetTower = Instance.new("TextButton")
resetTower.Size = UDim2.new(0, 80, 0, 28)
resetTower.Position = UDim2.new(0, 8, 0, 132)
resetTower.Text = "Сброс"
resetTower.Parent = towerFrame
resetTower.MouseButton1Click:Connect(function()
	candleOrder = {}
	noteOrder = {}
	candleLabel.Text = "Свечи (порядок зажигания):"
	noteLabel.Text = "Орган (ноты):"
end)

local submitTower = Instance.new("TextButton")
submitTower.Size = UDim2.new(0, 120, 0, 32)
submitTower.Position = UDim2.new(0, 100, 0, 132)
submitTower.Text = "Проверить"
submitTower.Parent = towerFrame
submitTower.MouseButton1Click:Connect(function()
	requestAction:FireServer("tower_puzzle", { candles = candleOrder, notes = noteOrder })
end)

local towerOpen = Instance.new("TextButton")
towerOpen.Size = UDim2.new(0, 200, 0, 40)
towerOpen.Position = UDim2.new(1, -210, 0.5, 0)
towerOpen.Text = "Башня: головоломка"
towerOpen.Visible = false
towerOpen.Parent = towerGui
towerOpen.MouseButton1Click:Connect(function()
	towerFrame.Visible = not towerFrame.Visible
end)

local profileUpdated = remotes:WaitForChild("ProfileUpdated") :: RemoteEvent
profileUpdated.OnClientEvent:Connect(function(p)
	if p and p.story and p.story.activeStepId == "ch4_s_crown" then
		towerOpen.Visible = true
	else
		towerOpen.Visible = false
		towerFrame.Visible = false
	end
end)
