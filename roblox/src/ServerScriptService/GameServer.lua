--!strict
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ProfileService = require(script.Parent.ProfileService)
local WorldBuilder = require(script.Parent.WorldBuilder)
local MonetizationService = require(script.Parent.MonetizationService)

local Economy = require(ReplicatedStorage.Shared.Economy)
local QuestEpisode1 = require(ReplicatedStorage.Shared.QuestEpisode1)
local RemoteValidation = require(ReplicatedStorage.Shared.RemoteValidation)
local ShopCatalog = require(ReplicatedStorage.Config.ShopCatalog)

local GameServer = {}

local rateBuckets: { [number]: { [string]: RemoteValidation.Bucket } } = {}

local function getBucket(userId: number, action: string): RemoteValidation.Bucket
	local userBuckets = rateBuckets[userId]
	if userBuckets == nil then
		userBuckets = {}
		rateBuckets[userId] = userBuckets
	end
	local b = userBuckets[action]
	if b == nil then
		b = RemoteValidation.newBucket()
		userBuckets[action] = b
	end
	return b
end

local function rateOk(player: Player, action: string): boolean
	return RemoteValidation.checkRate(getBucket(player.UserId, action), os.clock(), 2, 8)
end

local function pushProfile(player: Player)
	local session = ProfileService.getSession(player.UserId)
	if not session then
		return
	end
	local remotes = ReplicatedStorage:WaitForChild("Remotes")
	local ev = remotes:FindFirstChild("ProfileUpdated")
	if ev and ev:IsA("RemoteEvent") then
		ev:FireClient(player, session.profile)
	end
end

function GameServer.setupRemotes()
	local folder = ReplicatedStorage:FindFirstChild("Remotes")
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = "Remotes"
		folder.Parent = ReplicatedStorage
	end
	local names = { "ProfileUpdated", "RequestAction", "ActionResult" }
	for _, n in names do
		if not folder:FindFirstChild(n) then
			local ev = Instance.new("RemoteEvent")
			ev.Name = n
			ev.Parent = folder
		end
	end
	local request = folder:WaitForChild("RequestAction") :: RemoteEvent
	local result = folder:WaitForChild("ActionResult") :: RemoteEvent

	request.OnServerEvent:Connect(function(player, action: any, payload: any)
		if not rateOk(player, "RequestAction") then
			return
		end
		if type(action) ~= "string" then
			return
		end
		local session = ProfileService.getSession(player.UserId)
		if not session then
			return
		end
		local profile = session.profile

		if action == "set_avatar" then
			local preset = RemoteValidation.validateString(payload, 32)
			if preset == nil then
				return
			end
			profile.avatarPreset = preset
			local advanced, ok = QuestEpisode1.advanceIfValid(profile.tutorialStep, "choose_avatar")
			if ok then
				profile.tutorialStep = advanced
			end
		elseif action == "set_language" then
			local lang = RemoteValidation.validateEnum(payload, { "ru", "uk", "en", "da" })
			if lang then
				profile.language = lang
			end
		elseif action == "tutorial_complete" then
			local step = RemoteValidation.validateString(payload, 40)
			if step == nil then
				return
			end
			local advanced, ok = QuestEpisode1.advanceIfValid(profile.tutorialStep, step :: QuestEpisode1.StepId)
			if ok then
				profile.tutorialStep = advanced
			end
		elseif action == "cemetery_job_complete" then
			if profile.tutorialStep ~= "cemetery_job" then
				return
			end
			local grantKey = "job_cemetery_ep1_" .. tostring(player.UserId)
			local newCoins, granted, _ = Economy.payJobReward(profile.coins, 65, grantKey, profile.grantedRewards)
			if granted then
				profile.grantedRewards[grantKey] = true
				profile.coins = newCoins
				profile.tutorialStep = QuestEpisode1.nextStep(profile.tutorialStep) or profile.tutorialStep
			end
		elseif action == "shop_purchase" then
			if profile.tutorialStep ~= "shop_purchase" then
				return
			end
			local itemId = RemoteValidation.validateString(payload, 64)
			if itemId == nil then
				return
			end
			local item = ShopCatalog.get(itemId)
			local owned = item and item.grantInventoryKey and (profile.inventory[item.grantInventoryKey] or 0) > 0
			local purchase = Economy.tryPurchase(profile.coins, item, owned == true)
			if purchase.ok then
				profile.coins = purchase.newBalance
				if item and item.grantInventoryKey then
					profile.inventory[item.grantInventoryKey] = 1
				end
				profile.tutorialStep = QuestEpisode1.nextStep(profile.tutorialStep) or profile.tutorialStep
			else
				result:FireClient(player, { ok = false, reason = purchase.reason })
				return
			end
		elseif action == "duel_win" then
			if profile.tutorialStep ~= "duel_razor" then
				return
			end
			local grantKey = "duel_training_ep1"
			if not profile.grantedRewards[grantKey] then
				profile.grantedRewards[grantKey] = true
				profile.xp, profile.level = Economy.applyXp(profile.xp + 40, profile.level)
				profile.tutorialStep = QuestEpisode1.nextStep(profile.tutorialStep) or profile.tutorialStep
			end
		elseif action == "decorate_room" then
			if profile.tutorialStep ~= "decorate_room" then
				return
			end
			if (profile.inventory["decor_neon_poster"] or 0) < 1 then
				return
			end
			profile.roomDecor["decor_neon_poster"] = true
			profile.tutorialStep = "chapter_complete"
			profile.chapter = 0
			profile.chapterComplete = true
		end

		ProfileService.saveSession(session)
		pushProfile(player)
		result:FireClient(player, { ok = true })
	end)
end

function GameServer.onPlayerAdded(player: Player)
	local session, err = ProfileService.startSession(player.UserId)
	if not session then
		player:Kick("Save load failed: " .. tostring(err))
		return
	end
	if session.profile.tutorialStep == "welcome" then
		session.profile.tutorialStep = "choose_avatar"
		ProfileService.saveSession(session)
	end
	pushProfile(player)
end

function GameServer.onPlayerRemoving(player: Player)
	local session = ProfileService.getSession(player.UserId)
	if session then
		ProfileService.saveSession(session)
	end
	ProfileService.endSession(player.UserId)
	rateBuckets[player.UserId] = nil
end

function GameServer.start()
	MonetizationService.bind()
	local worldFolder = workspace:WaitForChild("World") :: Folder
	WorldBuilder.build(worldFolder)
	GameServer.setupRemotes()
	Players.PlayerAdded:Connect(GameServer.onPlayerAdded)
	Players.PlayerRemoving:Connect(GameServer.onPlayerRemoving)
	for _, p in Players:GetPlayers() do
		task.spawn(GameServer.onPlayerAdded, p)
	end
end

return GameServer
