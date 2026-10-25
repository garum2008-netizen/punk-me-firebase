--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Economy = require(ReplicatedStorage.Shared.Economy)
local QuestEngine = require(ReplicatedStorage.Shared.QuestEngine)
local ProfileSchema = require(ReplicatedStorage.Shared.ProfileSchema)
local QuestTable = require(ReplicatedStorage.Config.QuestTable)
local FlyerEngine = require(ReplicatedStorage.Shared.FlyerEngine)
local HangoutEngine = require(ReplicatedStorage.Shared.HangoutEngine)
local HangoutMinigame = require(ReplicatedStorage.Shared.HangoutMinigame)
local GhostRiddleEngine = require(ReplicatedStorage.Shared.GhostRiddleEngine)
local CryptBuildEngine = require(ReplicatedStorage.Shared.CryptBuildEngine)
local TowerPuzzle = require(ReplicatedStorage.Shared.TowerPuzzle)
local EndingLogic = require(ReplicatedStorage.Shared.EndingLogic)
local WorldState = require(script.Parent.WorldState)

local StoryHandlers = {}

local function applyGrants(profile: ProfileSchema.Profile, grant: QuestEngine.GrantResult)
	if grant.granted then
		profile.coins += grant.coinsDelta
		if grant.xpDelta > 0 then
			profile.xp, profile.level = Economy.applyXp(profile.xp + grant.xpDelta, profile.level)
		end
	end
end

function StoryHandlers.handleEvent(profile: ProfileSchema.Profile, eventId: string): boolean
	local story = profile.story
	if eventId == "event:pay_initiation_fee" then
		if profile.coins < 150 then
			return false
		end
		profile.coins -= 150
	end
	local ok, grant = QuestEngine.trySpecial(story, eventId, { coins = profile.coins })
	if not ok then
		return false
	end
	if grant then
		applyGrants(profile, grant)
	end
	return true
end

function StoryHandlers.handleInitiationChoice(profile: ProfileSchema.Profile, path: string): boolean
	if path ~= "pay" and path ~= "duel" and path ~= "graffiti" then
		return false
	end
	return QuestEngine.pickInitiationPath(profile.story, path :: "pay" | "duel" | "graffiti")
end

function StoryHandlers.handleCemeteryJob(profile: ProfileSchema.Profile): boolean
	local story = profile.story
	if story.activeQuestId == "q_initiation_pay" and story.activeStepId == "s1" then
		local key = "job_cemetery_ch1"
		local newCoins, granted, _ = Economy.payJobReward(profile.coins, 65, key, story.grantedRewards)
		if granted then
			story.grantedRewards[key] = true
			profile.coins = newCoins
			QuestEngine.trySpecial(story, "coins>=150", { coins = profile.coins })
			return true
		end
	end
	if story.activeQuestId == QuestTable.CH3 and story.activeStepId == "ch3_s_job" then
		local key = "job_ch3_cemetery"
		local newCoins, granted, _ = Economy.payJobReward(profile.coins, 70, key, story.grantedRewards)
		if granted then
			story.grantedRewards[key] = true
			profile.coins = newCoins
			return QuestEngine.tryCompleteEvent(story, "ch3_cemetery_shift") ~= false
		end
	end
	return false
end

function StoryHandlers.handleDuelWin(profile: ProfileSchema.Profile): boolean
	local story = profile.story
	if story.activeQuestId == "q_initiation_duel" then
		local ok, grant = QuestEngine.tryCompleteEvent(story, "event:duel_razor_win")
		if ok and grant then
			applyGrants(profile, grant)
		end
		return ok
	end
	return false
end

function StoryHandlers.handleFlyerPost(profile: ProfileSchema.Profile, spotId: string): boolean
	local story = profile.story
	if story.activeQuestId ~= "q_initiation_graffiti" then
		return false
	end
	local posted = FlyerEngine.postSpot(story.flyersPosted, spotId)
	if not posted then
		return false
	end
	if story.activeQuestId == "q_initiation_graffiti" and FlyerEngine.isComplete(story.flyersPosted) then
		local ok, grant = QuestEngine.tryCompleteEvent(story, "event:flyers_done")
		if ok and grant then
			applyGrants(profile, grant)
		end
		return ok
	end
	return true
end

function StoryHandlers.handleHangoutBuild(profile: ProfileSchema.Profile, stage: string, answer: string): boolean
	local story = profile.story
	if story.activeQuestId ~= QuestTable.CH2 then
		return false
	end
	if stage ~= "foundation" and stage ~= "frame" and stage ~= "neon" and stage ~= "grand_open" then
		return false
	end
	if not HangoutMinigame.validate(stage :: HangoutMinigame.StageId, answer) then
		return false
	end
	local ok, count = HangoutEngine.complete(story.hangout, stage :: HangoutEngine.StageId)
	if not ok then
		return false
	end
	story.hangoutStage = count
	if HangoutEngine.isDone(story.hangout) then
		local done, grant = QuestEngine.trySpecial(story, "hangout_stage>=4", nil)
		if grant then
			applyGrants(profile, grant)
		end
		return done
	end
	return true
end

function StoryHandlers.handleCh2Antibully(profile: ProfileSchema.Profile, choice: string): boolean
	if choice ~= "stand" and choice ~= "join" then
		return false
	end
	QuestEngine.setDecision(profile.story, "ch2_bully", choice)
	if choice == "stand" then
		profile.story.relationships.razor = (profile.story.relationships.razor or 0) + 10
	else
		profile.story.relationships.razor = (profile.story.relationships.razor or 0) - 5
	end
	if profile.story.activeQuestId == "q_ch2_antibully" then
		QuestEngine.tryCompleteEvent(profile.story, "ch2_antibully_resolved")
		local g = QuestEngine.grantReward(profile.story, "reward_ch2_choice")
		applyGrants(profile, g)
	end
	return true
end

function StoryHandlers.handleCh3Ghost(profile: ProfileSchema.Profile, answer: string): boolean
	local story = profile.story
	if story.activeQuestId ~= QuestTable.CH3 or story.activeStepId ~= "ch3_s_ghost" then
		return false
	end
	local ok, nextStep = GhostRiddleEngine.submit(story.ghostRiddleStep, answer)
	if not ok then
		return false
	end
	story.ghostRiddleStep = nextStep
	if GhostRiddleEngine.isComplete(nextStep) then
		story.relationships.count = (story.relationships.count or 0) + 3
		return QuestEngine.tryCompleteEvent(story, "ch3_ghost_helped") ~= false
	end
	return true
end

function StoryHandlers.handleCh3Crypt(profile: ProfileSchema.Profile, phaseId: string, answer: string): boolean
	local story = profile.story
	if story.activeQuestId ~= QuestTable.CH3 or story.activeStepId ~= "ch3_s_crypt" then
		return false
	end
	if not CryptBuildEngine.validate(phaseId, answer, story.cryptPhase) then
		return false
	end
	story.cryptPhase += 1
	if CryptBuildEngine.isComplete(story.cryptPhase) then
		local ok, grant = QuestEngine.tryCompleteEvent(story, "ch3_crypt_built")
		if ok and grant then
			applyGrants(profile, grant)
		end
		return ok
	end
	return true
end

function StoryHandlers.handleCh4Enter(profile: ProfileSchema.Profile): boolean
	if not profile.story.uniqueItems.bell_rim then
		return false
	end
	if profile.story.activeQuestId == QuestTable.CH4 and profile.story.activeStepId == "ch4_s_enter" then
		return QuestEngine.tryCompleteEvent(profile.story, "ch4_castle_entered") ~= false
	end
	return false
end

function StoryHandlers.handleBellTongue(profile: ProfileSchema.Profile, branch: string): boolean
	if profile.story.activeQuestId ~= QuestTable.CH4 or profile.story.activeStepId ~= "ch4_s_tongue" then
		return false
	end
	if branch == "zoya" then
		if profile.story.uniqueItems.bell_tongue_zombie then
			return false
		end
		if QuestEngine.grantUniqueItem(profile.story, "bell_tongue_zoya") then
			return QuestEngine.tryCompleteEvent(profile.story, "ch4_tongue_obtained") ~= false
		end
	elseif branch == "zombie" then
		if profile.story.uniqueItems.bell_tongue_zoya then
			return false
		end
		if QuestEngine.grantUniqueItem(profile.story, "bell_tongue_zombie") then
			return QuestEngine.tryCompleteEvent(profile.story, "ch4_tongue_obtained") ~= false
		end
	end
	return false
end

function StoryHandlers.handleTowerPuzzle(
	profile: ProfileSchema.Profile,
	candles: { number },
	notes: { string }
): boolean
	if profile.story.activeQuestId ~= QuestTable.CH4 or profile.story.activeStepId ~= "ch4_s_crown" then
		return false
	end
	if not TowerPuzzle.validate(candles, notes) then
		return false
	end
	QuestEngine.grantUniqueItem(profile.story, "bell_crown")
	return QuestEngine.tryCompleteEvent(profile.story, "ch4_crown_obtained") ~= false
end

function StoryHandlers.handleConcert(profile: ProfileSchema.Profile, headliner: string): boolean
	if profile.story.activeQuestId ~= QuestTable.CH4 or profile.story.activeStepId ~= "ch4_s_concert" then
		return false
	end
	if headliner ~= "vienna" and headliner ~= "razor" and headliner ~= "count" and headliner ~= "ghost" then
		return false
	end
	profile.story.concertHeadliner = headliner
	profile.story.flags.concert_ready = true
	profile.story.relationships.count = (profile.story.relationships.count or 0) + 5
	return QuestEngine.tryCompleteEvent(profile.story, "ch4_concert_ready") ~= false
end

function StoryHandlers.handleConfession(profile: ProfileSchema.Profile): boolean
	if profile.story.activeQuestId ~= QuestTable.CH4 or profile.story.activeStepId ~= "ch4_s_confession" then
		return false
	end
	profile.story.flags.graph_truth = true
	profile.story.relationships.count = (profile.story.relationships.count or 0) + 8
	return QuestEngine.tryCompleteEvent(profile.story, "ch4_graph_confession") ~= false
end

function StoryHandlers.handleEnding(profile: ProfileSchema.Profile, endingId: string): boolean
	if not EndingLogic.canPick(profile.story, endingId :: EndingLogic.EndingId) then
		return false
	end
	if QuestEngine.pickEnding(profile.story, endingId) then
		local ending = QuestTable.endings[endingId]
		if ending then
			local g = QuestEngine.grantReward(profile.story, ending.grantKey)
			applyGrants(profile, g)
		end
		profile.story.freePlay = true
		local world = workspace:FindFirstChild("World")
		if world and world:IsA("Folder") then
			WorldState.applyEnding(world, endingId)
		end
		return true
	end
	return false
end

function StoryHandlers.handleHouseZone(profile: ProfileSchema.Profile, zoneId: string): boolean
	local story = profile.story
	if story.activeStepId ~= "ch0_s_house" then
		return false
	end
	story.ch0HouseZones[zoneId] = true
	local count = 0
	for _, v in story.ch0HouseZones do
		if v then
			count += 1
		end
	end
	if count >= 2 then
		return QuestEngine.tryCompleteEvent(story, "ch0_house_tour") ~= false
	end
	return false
end

return StoryHandlers
