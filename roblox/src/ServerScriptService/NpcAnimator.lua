--!strict
local AnimationCatalog = require(game.ReplicatedStorage.Config.AnimationCatalog)

local NpcAnimator = {}

local function getAnimator(model: Model): Animator?
	local hum = model:FindFirstChildOfClass("Humanoid")
	if not hum then
		return nil
	end
	local animator = hum:FindFirstChildOfClass("Animator")
	if not animator then
		animator = Instance.new("Animator")
		animator.Parent = hum
	end
	return animator
end

function NpcAnimator.playTrack(model: Model, assetId: string): AnimationTrack?
	local animator = getAnimator(model)
	if not animator then
		return nil
	end
	local anim = Instance.new("Animation")
	anim.AnimationId = assetId
	local track = animator:LoadAnimation(anim)
	track:Play()
	return track
end

function NpcAnimator.playIdle(model: Model)
	NpcAnimator.playTrack(model, AnimationCatalog.idle)
end

function NpcAnimator.playTalk(model: Model)
	NpcAnimator.playTrack(model, AnimationCatalog.talk)
end

return NpcAnimator
