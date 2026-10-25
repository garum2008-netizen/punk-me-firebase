--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local RigFactory = require(script.Parent.RigFactory)
local FlyerEngine = require(ReplicatedStorage.Shared.FlyerEngine)

local WorldBuilder = {}

local function makePart(props: {
	Name: string,
	Size: Vector3,
	Position: Vector3,
	Color: Color3,
	Parent: Instance,
	Anchored: boolean?,
}): Part
	local p = Instance.new("Part")
	p.Name = props.Name
	p.Size = props.Size
	p.Position = props.Position
	p.Color = props.Color
	p.Anchored = if props.Anchored == nil then true else props.Anchored
	p.Material = Enum.Material.Concrete
	p.Parent = props.Parent
	return p
end

local function addZone(parent: Instance, name: string, size: Vector3, position: Vector3, color: Color3)
	local z = makePart({ Name = name, Size = size, Position = position, Color = color, Parent = parent })
	z.Transparency = 0.85
	z.CanCollide = false
	z:SetAttribute("ZoneId", name)
	return z
end

local function addFlyerSpot(parent: Instance, spotId: string, position: Vector3)
	local post = makePart({
		Name = spotId,
		Size = Vector3.new(2, 4, 0.2),
		Position = position,
		Color = Color3.fromRGB(255, 120, 200),
		Parent = parent,
	})
	post:SetAttribute("FlyerSpotId", spotId)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Post flyer"
	prompt.ObjectText = "Flyer spot"
	prompt.MaxActivationDistance = 10
	prompt.Parent = post
end

function WorldBuilder.build(parent: Folder)
	parent:ClearAllChildren()

	local house = Instance.new("Folder")
	house.Name = "House13"
	house.Parent = parent
	makePart({
		Name = "Floor",
		Size = Vector3.new(40, 1, 40),
		Position = Vector3.new(0, 0, 0),
		Color = Color3.fromRGB(55, 50, 60),
		Parent = house,
	})
	addZone(house, "zone_room", Vector3.new(18, 8, 18), Vector3.new(-12, 4, -12), Color3.fromRGB(120, 80, 200))
	addZone(house, "zone_hall", Vector3.new(20, 8, 20), Vector3.new(8, 4, 0), Color3.fromRGB(80, 120, 200))
	makePart({
		Name = "marker_move",
		Size = Vector3.new(4, 1, 4),
		Position = Vector3.new(15, 1, 0),
		Color = Color3.fromRGB(255, 220, 80),
		Parent = house,
	})
	local spawn = Instance.new("SpawnLocation")
	spawn.Size = Vector3.new(6, 1, 6)
	spawn.Position = Vector3.new(-5, 3, -5)
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Parent = house
	RigFactory.spawnNpc(house, "npc_mom", Vector3.new(18, 0, 8), "Talk")
	RigFactory.spawnNpc(house, "npc_shnurok", Vector3.new(-18, 0, -8), "Pet")

	local street = Instance.new("Folder")
	street.Name = "Street"
	street.Parent = parent
	makePart({
		Name = "StreetFloor",
		Size = Vector3.new(60, 1, 30),
		Position = Vector3.new(80, 0, 0),
		Color = Color3.fromRGB(45, 45, 50),
		Parent = street,
	})
	addZone(street, "zone_street", Vector3.new(55, 10, 28), Vector3.new(80, 5, 0), Color3.fromRGB(255, 100, 180))
	RigFactory.spawnNpc(street, "npc_razor", Vector3.new(70, 0, 5), "Talk")
	makePart({
		Name = "Shop",
		Size = Vector3.new(14, 10, 14),
		Position = Vector3.new(100, 5, -10),
		Color = Color3.fromRGB(90, 40, 120),
		Parent = street,
	})

	local city = Instance.new("Folder")
	city.Name = "City"
	city.Parent = parent
	makePart({
		Name = "CityFloor",
		Size = Vector3.new(40, 1, 40),
		Position = Vector3.new(80, 0, -60),
		Color = Color3.fromRGB(50, 50, 55),
		Parent = city,
	})

	local flyers = Instance.new("Folder")
	flyers.Name = "FlyerSpots"
	flyers.Parent = parent
	local spots = {
		{ "flyer_street_1", Vector3.new(65, 2, 8) },
		{ "flyer_street_2", Vector3.new(90, 2, 12) },
		{ "flyer_street_3", Vector3.new(75, 2, -5) },
		{ "flyer_city_1", Vector3.new(70, 2, -55) },
		{ "flyer_city_2", Vector3.new(90, 2, -70) },
		{ "flyer_city_3", Vector3.new(95, 2, -50) },
		{ "flyer_cemetery_gate", Vector3.new(5, 2, 105) },
		{ "flyer_shop_wall", Vector3.new(108, 4, -8) },
	}
	for _, pair in spots do
		if table.find(FlyerEngine.SPOT_IDS, pair[1]) then
			addFlyerSpot(flyers, pair[1], pair[2])
		end
	end

	local cemetery = Instance.new("Folder")
	cemetery.Name = "Cemetery"
	cemetery.Parent = parent
	makePart({
		Name = "CemeteryGround",
		Size = Vector3.new(50, 1, 50),
		Position = Vector3.new(0, 0, 120),
		Color = Color3.fromRGB(35, 50, 40),
		Parent = cemetery,
	})
	RigFactory.spawnNpc(cemetery, "npc_gravedigger", Vector3.new(-5, 0, 125), "Work")
	RigFactory.spawnNpc(cemetery, "npc_ghost", Vector3.new(10, 0, 130), "Help")
	local crypt = makePart({
		Name = "obj_crypt_site",
		Size = Vector3.new(12, 2, 12),
		Position = Vector3.new(-15, 1, 140),
		Color = Color3.fromRGB(50, 45, 55),
		Parent = cemetery,
	})
	local cp = Instance.new("ProximityPrompt")
	cp.ActionText = "Build crypt"
	cp.ObjectText = "Crypt"
	cp.MaxActivationDistance = 14
	cp.Parent = crypt

	local construction = Instance.new("Folder")
	construction.Name = "Construction"
	construction.Parent = parent
	for i, stageName in { "foundation", "frame", "neon", "grand_open" } do
		local part = makePart({
			Name = "hangout_" .. stageName,
			Size = Vector3.new(8, 2, 8),
			Position = Vector3.new(72 + i * 10, 1, 80),
			Color = Color3.fromRGB(60 + i * 20, 70, 90),
			Parent = construction,
		})
		part:SetAttribute("HangoutStage", stageName)
		local hp = Instance.new("ProximityPrompt")
		hp.ActionText = "Build: " .. stageName
		hp.MaxActivationDistance = 12
		hp.Parent = part
	end
	makePart({
		Name = "obj_hangout_site",
		Size = Vector3.new(20, 1, 20),
		Position = Vector3.new(80, 0, 80),
		Color = Color3.fromRGB(40, 40, 50),
		Parent = construction,
	})

	local duel = Instance.new("Folder")
	duel.Name = "DuelPit"
	duel.Parent = parent
	local arena = makePart({
		Name = "zone_duel",
		Size = Vector3.new(24, 1, 24),
		Position = Vector3.new(120, 0, 120),
		Color = Color3.fromRGB(80, 30, 30),
		Parent = duel,
	})
	arena:SetAttribute("ZoneId", "zone_duel")

	local castle = Instance.new("Folder")
	castle.Name = "Castle"
	castle.Parent = parent
	addZone(castle, "zone_castle_hall", Vector3.new(30, 10, 30), Vector3.new(-80, 5, 80), Color3.fromRGB(80, 50, 100))
	local tower = makePart({
		Name = "zone_castle_tower",
		Size = Vector3.new(12, 22, 12),
		Position = Vector3.new(-95, 11, 95),
		Color = Color3.fromRGB(50, 35, 70),
		Parent = castle,
	})
	tower:SetAttribute("ZoneId", "zone_castle_tower")
	for i = 1, 4 do
		local candle = makePart({
			Name = "candle_" .. i,
			Size = Vector3.new(1, 2, 1),
			Position = Vector3.new(-92 + i * 2, 3, 92),
			Color = Color3.fromRGB(255, 200, 80),
			Parent = castle,
		})
		candle:SetAttribute("CandleIndex", i)
	end
	RigFactory.spawnNpc(castle, "npc_count", Vector3.new(-80, 0, 80), "Talk")
	RigFactory.spawnNpc(castle, "npc_zoya", Vector3.new(-65, 0, 70), "Talk")
	makePart({
		Name = "zone_zombie_house",
		Size = Vector3.new(10, 8, 10),
		Position = Vector3.new(-55, 4, 90),
		Color = Color3.fromRGB(70, 90, 60),
		Parent = castle,
	}):SetAttribute("ZoneId", "zone_zombie_house")
end

return WorldBuilder
