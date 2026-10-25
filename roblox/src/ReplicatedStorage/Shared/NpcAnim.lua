--!strict
local AnimationCatalog = if script and script.Parent
	then require(script.Parent.Parent.Config.AnimationCatalog)
	else require("../Config/AnimationCatalog")

local NpcAnim = {}

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

function NpcAnim.playTrack(model: Model, assetId: string): AnimationTrack?
	local animator = getAnimator(model)
	if not animator or assetId == "" then
		return nil
	end
	local anim = Instance.new("Animation")
	anim.AnimationId = assetId
	local track = animator:LoadAnimation(anim)
	track:Play()
	return track
end

function NpcAnim.playIdle(model: Model)
	NpcAnim.playTrack(model, AnimationCatalog.idle)
end

function NpcAnim.playTalk(model: Model)
	NpcAnim.playTrack(model, AnimationCatalog.talk)
end

return NpcAnim
