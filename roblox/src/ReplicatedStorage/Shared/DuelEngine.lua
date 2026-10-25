--!strict
local DuelEngine = {}

export type Action = "attack" | "block" | "dodge"
export type Phase = "fighting" | "player_win" | "player_lose"

export type State = {
	playerHp: number,
	opponentHp: number,
	phase: Phase,
	round: number,
	lastNpcAction: Action?,
}

local MAX_HP = 100
local DAMAGE = 18
local BLOCKED_DAMAGE = 4

function DuelEngine.newState(): State
	return {
		playerHp = MAX_HP,
		opponentHp = MAX_HP,
		phase = "fighting",
		round = 0,
		lastNpcAction = nil,
	}
end

local function npcActionForRound(round: number): Action
	local pattern: { Action } = { "attack", "attack", "block", "dodge" }
	return pattern[(round % #pattern) + 1]
end

function DuelEngine.resolveTurn(state: State, playerAction: Action): (State, { hitPlayer: boolean, hitNpc: boolean })
	if state.phase ~= "fighting" then
		return state, { hitPlayer = false, hitNpc = false }
	end
	local npcAction = npcActionForRound(state.round)
	local hitPlayer = false
	local hitNpc = false

	if playerAction == "attack" and npcAction ~= "dodge" then
		if npcAction == "block" then
			state.opponentHp = math.max(0, state.opponentHp - BLOCKED_DAMAGE)
			hitNpc = true
		else
			state.opponentHp = math.max(0, state.opponentHp - DAMAGE)
			hitNpc = true
		end
	end

	if npcAction == "attack" and playerAction ~= "dodge" then
		if playerAction == "block" then
			state.playerHp = math.max(0, state.playerHp - BLOCKED_DAMAGE)
			hitPlayer = true
		else
			state.playerHp = math.max(0, state.playerHp - DAMAGE)
			hitPlayer = true
		end
	end

	state.round += 1
	state.lastNpcAction = npcAction

	if state.opponentHp <= 0 then
		state.phase = "player_win"
	elseif state.playerHp <= 0 then
		state.phase = "player_lose"
	end

	return state, { hitPlayer = hitPlayer, hitNpc = hitNpc }
end

return DuelEngine
