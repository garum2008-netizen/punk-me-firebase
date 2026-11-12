--!strict
local FlyerEngine = if script and script.Parent then require(script.Parent.FlyerEngine) else require("./FlyerEngine")

export type Vec3 = { x: number, y: number, z: number }
export type BoxZone = {
	center: Vec3,
	size: Vec3,
}

local ActionGuards = {}

function ActionGuards.positionInBox(pos: Vec3, zone: BoxZone): boolean
	local rel = {
		x = pos.x - zone.center.x,
		y = pos.y - zone.center.y,
		z = pos.z - zone.center.z,
	}
	return math.abs(rel.x) <= zone.size.x / 2
		and math.abs(rel.y) <= zone.size.y / 2
		and math.abs(rel.z) <= zone.size.z / 2
end

function ActionGuards.distance(a: Vec3, b: Vec3): number
	local dx = a.x - b.x
	local dy = a.y - b.y
	local dz = a.z - b.z
	return math.sqrt(dx * dx + dy * dy + dz * dz)
end

function ActionGuards.nearPoint(pos: Vec3, target: Vec3, maxDist: number): boolean
	return ActionGuards.distance(pos, target) <= maxDist
end

-- Approximate world anchors (match WorldBuilder layout)
ActionGuards.ZONES = {
	zone_duel = { center = { x = 120, y = 0, z = 120 }, size = { x = 24, y = 4, z = 24 } },
	zone_shop = { center = { x = 100, y = 5, z = -10 }, size = { x = 14, y = 10, z = 14 } },
	zone_castle_tower = { center = { x = -95, y = 11, z = 95 }, size = { x = 12, y = 22, z = 12 } },
	zone_castle_hall = { center = { x = -80, y = 5, z = 80 }, size = { x = 30, y = 10, z = 30 } },
}

ActionGuards.FLYER_SPOTS = {
	flyer_street_1 = { x = 65, y = 2, z = 8 },
	flyer_street_2 = { x = 90, y = 2, z = 12 },
	flyer_street_3 = { x = 75, y = 2, z = -5 },
	flyer_city_1 = { x = 70, y = 2, z = -55 },
	flyer_city_2 = { x = 90, y = 2, z = -70 },
	flyer_city_3 = { x = 95, y = 2, z = -50 },
	flyer_cemetery_gate = { x = 5, y = 2, z = 105 },
	flyer_shop_wall = { x = 108, y = 4, z = -8 },
}

ActionGuards.NPC_ANCHORS = {
	npc_razor = { x = 70, y = 3, z = 5 },
	npc_gravedigger = { x = -5, y = 3, z = 125 },
	npc_ghost = { x = 10, y = 3, z = 130 },
	npc_count = { x = -80, y = 3, z = 80 },
	npc_zoya = { x = -65, y = 3, z = 70 },
}

export type GuardContext = {
	position: Vec3,
	action: string,
	payload: any,
}

function ActionGuards.flyerSpotAllowed(spotId: string): boolean
	for _, id in FlyerEngine.SPOT_IDS do
		if id == spotId then
			return true
		end
	end
	return false
end

function ActionGuards.validate(ctx: GuardContext): boolean
	local action = ctx.action
	local pos = ctx.position

	if action == "duel_start" then
		local z = ActionGuards.ZONES.zone_duel
		return z ~= nil and ActionGuards.positionInBox(pos, z)
	end
	if action == "shop_buy" then
		local z = ActionGuards.ZONES.zone_shop
		return z ~= nil and ActionGuards.positionInBox(pos, z)
	end
	if action == "flyer_post" then
		local spot = if type(ctx.payload) == "string" then ctx.payload else nil
		if not spot or not ActionGuards.flyerSpotAllowed(spot) then
			return false
		end
		local anchor = ActionGuards.FLYER_SPOTS[spot]
		return anchor ~= nil and ActionGuards.nearPoint(pos, anchor, 18)
	end
	if action == "tower_puzzle" then
		local z = ActionGuards.ZONES.zone_castle_tower
		return z ~= nil and ActionGuards.positionInBox(pos, z)
	end
	if action == "graph_confession" or action == "pick_ending" then
		local z = ActionGuards.ZONES.zone_castle_hall
		return z ~= nil and ActionGuards.positionInBox(pos, z)
	end
	if action == "cemetery_job" then
		local g = ActionGuards.NPC_ANCHORS.npc_gravedigger
		return g ~= nil and ActionGuards.nearPoint(pos, g, 20)
	end
	if action == "ch3_ghost" then
		local g = ActionGuards.NPC_ANCHORS.npc_ghost
		return g ~= nil and ActionGuards.nearPoint(pos, g, 18)
	end
	if action == "bell_tongue" then
		local branch = if type(ctx.payload) == "string" then ctx.payload else ""
		if branch == "zoya" then
			local z = ActionGuards.NPC_ANCHORS.npc_zoya
			return z ~= nil and ActionGuards.nearPoint(pos, z, 16)
		end
		return ActionGuards.nearPoint(pos, { x = -55, y = 4, z = 90 }, 14)
	end
	if action == "duel_action" then
		local z = ActionGuards.ZONES.zone_duel
		return z ~= nil and ActionGuards.positionInBox(pos, z)
	end
	if action == "hangout_build" then
		return ActionGuards.nearPoint(pos, { x = 80, y = 2, z = 80 }, 45)
	end
	if action == "ch3_crypt" then
		return ActionGuards.nearPoint(pos, { x = -15, y = 2, z = 140 }, 16)
	end
	return true
end

return ActionGuards
