--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local TowerPuzzle = require(ReplicatedStorage.Shared.TowerPuzzle)
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
		duelStatus.Text = "Try again — talk to Razor"
		duelGui.Enabled = false
	end
end)

local endingOverlay = Instance.new("ScreenGui")
endingOverlay.Name = "EndingScene"
endingOverlay.ResetOnSpawn = false
endingOverlay.Enabled = false
endingOverlay.Parent = playerGui

local endingText = Instance.new("TextLabel")
endingText.Size = UDim2.new(0.8, 0, 0.4, 0)
endingText.Position = UDim2.new(0.1, 0, 0.3, 0)
endingText.BackgroundColor3 = Color3.fromRGB(10, 5, 20)
endingText.TextColor3 = Color3.fromRGB(255, 220, 255)
endingText.TextWrapped = true
endingText.TextSize = 20
endingText.Parent = endingOverlay

actionResult.OnClientEvent:Connect(function(res)
	if res and res.ok and res.endingScene then
		endingOverlay.Enabled = true
		endingText.Text = res.endingScene
		task.delay(8, function()
			endingOverlay.Enabled = false
		end)
	end
end)

-- Tower puzzle submit (canonical solution — hints in-world later)
local towerGui = Instance.new("ScreenGui")
towerGui.Name = "TowerPuzzleUI"
towerGui.ResetOnSpawn = false
towerGui.Parent = playerGui

local towerBtn = Instance.new("TextButton")
towerBtn.Size = UDim2.new(0, 200, 0, 40)
towerBtn.Position = UDim2.new(1, -210, 0.5, 0)
towerBtn.Text = "Solve tower"
towerBtn.Visible = false
towerBtn.Parent = towerGui
towerBtn.MouseButton1Click:Connect(function()
	requestAction:FireServer("tower_puzzle", {
		candles = TowerPuzzle.CANDLE_SEQUENCE,
		notes = TowerPuzzle.NOTE_SEQUENCE,
	})
end)

local profileUpdated = remotes:WaitForChild("ProfileUpdated") :: RemoteEvent
profileUpdated.OnClientEvent:Connect(function(p)
	if p and p.story and p.story.activeStepId == "ch4_s_crown" then
		towerBtn.Visible = true
	else
		towerBtn.Visible = false
	end
end)
