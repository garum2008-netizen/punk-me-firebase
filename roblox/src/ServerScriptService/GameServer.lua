--!strict
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ProfileService = require(script.Parent.ProfileService)
local WorldBuilder = require(script.Parent.WorldBuilder)
local MonetizationService = require(script.Parent.MonetizationService)
local StoryHandlers = require(script.Parent.StoryHandlers)
local DuelService = require(script.Parent.DuelService)
local AvatarService = require(script.Parent.AvatarService)

local RemoteValidation = require(ReplicatedStorage.Shared.RemoteValidation)
local QuestEngine = require(ReplicatedStorage.Shared.QuestEngine)
local ShopCatalog = require(ReplicatedStorage.Config.ShopCatalog)
local Economy = require(ReplicatedStorage.Shared.Economy)
local EndingScenes = require(ReplicatedStorage.Config.EndingScenes)
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
	return RemoteValidation.checkRate(getBucket(player.UserId, action), os.clock(), 2, 12)
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
	local names = { "ProfileUpdated", "RequestAction", "ActionResult", "DuelUpdate" }
	for _, n in names do
		if not folder:FindFirstChild(n) then
			local ev = Instance.new("RemoteEvent")
			ev.Name = n
			ev.Parent = folder
		end
	end
	local request = folder:WaitForChild("RequestAction") :: RemoteEvent
	local result = folder:WaitForChild("ActionResult") :: RemoteEvent
	local duelUpdate = folder:WaitForChild("DuelUpdate") :: RemoteEvent

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
		local ok = false

		if action == "set_language" then
			local lang = RemoteValidation.validateEnum(payload, { "ru", "uk", "en", "da" })
			if lang then
				profile.language = lang
				ok = true
			end
		elseif action == "set_avatar" then
			local preset = RemoteValidation.validateString(payload, 32)
			if preset then
				profile.avatarPreset = preset
				if QuestEngine.stepExpectsEvent(profile.story, "ch0_avatar_chosen") then
					ok = StoryHandlers.handleEvent(profile, "ch0_avatar_chosen")
				else
					ok = true
				end
			end
		elseif action == "quest_event" then
			local eventId = RemoteValidation.validateString(payload, 64)
			if eventId then
				ok = StoryHandlers.handleEvent(profile, eventId)
			end
		elseif action == "house_zone" then
			local zone = RemoteValidation.validateString(payload, 32)
			if zone then
				ok = StoryHandlers.handleHouseZone(profile, zone)
			end
		elseif action == "initiation_choice" then
			local path = RemoteValidation.validateString(payload, 16)
			if path then
				ok = StoryHandlers.handleInitiationChoice(profile, path)
			end
		elseif action == "cemetery_job" then
			ok = StoryHandlers.handleCemeteryJob(profile)
		elseif action == "duel_start" then
			if profile.story.activeQuestId == "q_initiation_duel" then
				local started, state = DuelService.startDuel(player.UserId, "npc_razor")
				if started and state then
					duelUpdate:FireClient(player, state)
					ok = true
				end
			end
		elseif action == "duel_action" then
			local act = RemoteValidation.validateEnum(payload, { "attack", "block", "dodge" })
			if act then
				local success, state, meta = DuelService.action(player.UserId, act)
				if success and state then
					duelUpdate:FireClient(player, state, meta)
					if state.phase == "player_win" then
						ok = StoryHandlers.handleDuelWin(profile)
					elseif state.phase == "player_lose" then
						DuelService.cancel(player.UserId)
						ok = true
					else
						ok = true
					end
				end
			end
		elseif action == "flyer_post" then
			local spot = RemoteValidation.validateString(payload, 48)
			if spot then
				ok = StoryHandlers.handleFlyerPost(profile, spot)
			end
		elseif action == "hangout_build" then
			local stage = RemoteValidation.validateString(payload, 24)
			if stage then
				ok = StoryHandlers.handleHangoutBuild(profile, stage)
			end
		elseif action == "ch2_antibully" then
			local choice = RemoteValidation.validateString(payload, 16)
			if choice then
				ok = StoryHandlers.handleCh2Antibully(profile, choice)
			end
		elseif action == "ch3_ghost" then
			ok = StoryHandlers.handleCh3Ghost(profile)
		elseif action == "ch3_crypt" then
			ok = StoryHandlers.handleCh3Crypt(profile)
		elseif action == "bell_tongue" then
			local branch = RemoteValidation.validateString(payload, 16)
			if branch then
				ok = StoryHandlers.handleBellTongue(profile, branch)
			end
		elseif action == "ch4_enter" then
			ok = StoryHandlers.handleCh4Enter(profile)
		elseif action == "tower_puzzle" then
			if type(payload) == "table" then
				ok = StoryHandlers.handleTowerPuzzle(profile, payload.candles or {}, payload.notes or {})
			end
		elseif action == "concert_prepare" then
			local headliner = RemoteValidation.validateString(payload, 16)
			if headliner then
				ok = StoryHandlers.handleConcert(profile, headliner)
			end
		elseif action == "graph_confession" then
			ok = StoryHandlers.handleConfession(profile)
		elseif action == "shop_buy" then
			local itemId = RemoteValidation.validateString(payload, 64)
			if itemId then
				local item = ShopCatalog.get(itemId)
				local owned = item and item.grantInventoryKey and (profile.inventory[item.grantInventoryKey] or 0) > 0
				local purchase = Economy.tryPurchase(profile.coins, item, owned == true)
				if purchase.ok then
					profile.coins = purchase.newBalance
					if item and item.grantInventoryKey then
						profile.inventory[item.grantInventoryKey] = 1
					end
					ok = true
				end
			end
		elseif action == "pick_ending" then
			local endingId = RemoteValidation.validateString(payload, 40)
			if endingId then
				ok = StoryHandlers.handleEnding(profile, endingId)
			end
		elseif action == "pay_initiation" then
			ok = StoryHandlers.handleEvent(profile, "event:pay_initiation_fee")
		end

		if ok then
			ProfileService.saveSession(session)
			pushProfile(player)
			local extra: any = { ok = true }
			if action == "pick_ending" and profile.story.storyEnding then
				local lang = profile.language
				local scene = (EndingScenes :: any)[profile.story.storyEnding]
				if scene then
					extra.endingScene = scene[lang] or scene.en
				end
			end
			result:FireClient(player, extra)
		else
			result:FireClient(player, { ok = false })
		end
	end)
end

function GameServer.onPlayerAdded(player: Player)
	local session, err = ProfileService.startSession(player.UserId)
	if not session then
		player:Kick("Save load failed: " .. tostring(err))
		return
	end
	AvatarService.bindPlayer(player)
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
	AvatarService.start()
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
