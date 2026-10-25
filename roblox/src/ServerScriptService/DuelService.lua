--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local DuelEngine = require(ReplicatedStorage.Shared.DuelEngine)

local DuelService = {}

export type ActiveDuel = {
	userId: number,
	state: DuelEngine.State,
	opponentNpcId: string,
}

local active: { [number]: ActiveDuel } = {}

function DuelService.startDuel(userId: number, npcId: string): (boolean, DuelEngine.State?)
	if active[userId] then
		return false, nil
	end
	local state = DuelEngine.newState()
	active[userId] = { userId = userId, state = state, opponentNpcId = npcId }
	return true, state
end

function DuelService.action(
	userId: number,
	action: string
): (boolean, DuelEngine.State?, { hitPlayer: boolean, hitNpc: boolean }?)
	local duel = active[userId]
	if not duel then
		return false, nil, nil
	end
	if action ~= "attack" and action ~= "block" and action ~= "dodge" then
		return false, duel.state, nil
	end
	local newState, meta = DuelEngine.resolveTurn(duel.state, action :: DuelEngine.Action)
	duel.state = newState
	if newState.phase ~= "fighting" then
		active[userId] = nil
	end
	return true, newState, meta
end

function DuelService.get(userId: number): ActiveDuel?
	return active[userId]
end

function DuelService.cancel(userId: number)
	active[userId] = nil
end

return DuelService
