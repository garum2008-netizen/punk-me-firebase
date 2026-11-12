--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

local SceneCatalog = require(ReplicatedStorage.Config.SceneCatalog)
local MusicCatalog = require(ReplicatedStorage.Config.MusicCatalog)
local NpcAnim = require(ReplicatedStorage.Shared.NpcAnim)

local player = Players.LocalPlayer
local camera = workspace.CurrentCamera
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local actionResult = remotes:WaitForChild("ActionResult") :: RemoteEvent

local gui = Instance.new("ScreenGui")
gui.Name = "SceneDirector"
gui.ResetOnSpawn = false
gui.DisplayOrder = 50
gui.Parent = player:WaitForChild("PlayerGui")

local dialogue = Instance.new("TextLabel")
dialogue.Size = UDim2.new(0.85, 0, 0, 100)
dialogue.Position = UDim2.new(0.075, 0, 0.78, 0)
dialogue.BackgroundColor3 = Color3.fromRGB(8, 6, 14)
dialogue.BackgroundTransparency = 0.15
dialogue.TextColor3 = Color3.fromRGB(255, 240, 255)
dialogue.TextWrapped = true
dialogue.TextSize = 18
dialogue.Visible = false
dialogue.Parent = gui

local playing = false

local function vec3(t: { x: number, y: number, z: number }): Vector3
	return Vector3.new(t.x, t.y, t.z)
end

local function findNpc(npcId: string): Model?
	local world = workspace:FindFirstChild("World")
	if not world then
		return nil
	end
	for _, desc in world:GetDescendants() do
		if desc:IsA("Model") and desc:GetAttribute("NpcId") == npcId then
			return desc
		end
	end
	return nil
end

local function playMusic(slot: string?)
	if not slot then
		return
	end
	local id = (MusicCatalog :: any)[slot]
	if type(id) ~= "string" or id == "" then
		return
	end
	local s = Instance.new("Sound")
	s.SoundId = "rbxassetid://" .. id
	s.Volume = 0.6
	s.Parent = SoundService
	s:Play()
	game:GetService("Debris"):AddItem(s, 30)
end

local function playScene(sceneId: string, lang: string)
	if playing then
		return
	end
	local def = SceneCatalog.get(sceneId)
	if not def or not camera then
		return
	end
	playing = true
	local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
	local oldWalk = hum and hum.WalkSpeed or 16
	if hum then
		hum.WalkSpeed = 0
	end

	playMusic(def.musicSlot)
	for _, npcId in def.npcIds do
		local m = findNpc(npcId)
		if m then
			NpcAnim.playTalk(m)
		end
	end

	local from = CFrame.new(vec3(def.cameraFrom), vec3(def.lookAt))
	local to = CFrame.new(vec3(def.cameraTo), vec3(def.lookAt))
	camera.CameraType = Enum.CameraType.Scriptable
	camera.CFrame = from
	local tween =
		TweenService:Create(camera, TweenInfo.new(def.durationSec * 0.35, Enum.EasingStyle.Sine), { CFrame = to })
	tween:Play()

	dialogue.Visible = true
	for _, line in def.dialogue do
		local text = if lang == "ru" then line.ru else line.en
		dialogue.Text = line.speaker .. ": " .. text
		task.wait(math.max(2.5, def.durationSec / #def.dialogue))
	end
	dialogue.Visible = false

	task.wait(0.5)
	camera.CameraType = Enum.CameraType.Custom
	if hum then
		hum.WalkSpeed = oldWalk
	end
	for _, npcId in def.npcIds do
		local m = findNpc(npcId)
		if m then
			NpcAnim.playIdle(m)
		end
	end
	playing = false
end

actionResult.OnClientEvent:Connect(function(res)
	if res and res.ok and res.playSceneId then
		local lang = if type(res.language) == "string" then res.language else "ru"
		task.spawn(playScene, res.playSceneId :: string, lang)
	end
end)

remotes:WaitForChild("ProfileUpdated").OnClientEvent:Connect(function(profile)
	if profile and profile.language then
		player:SetAttribute("Language", profile.language)
	end
end)
