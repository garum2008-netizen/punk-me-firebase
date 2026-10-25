--!strict
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
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = props.Parent
	return p
end

local function addZone(parent: Instance, name: string, size: Vector3, position: Vector3, color: Color3)
	local z = makePart({
		Name = name,
		Size = size,
		Position = position,
		Color = color,
		Parent = parent,
	})
	z.Transparency = 0.85
	z.CanCollide = false
	z:SetAttribute("ZoneId", name)
	return z
end

local function addSpawn(parent: Instance, name: string, position: Vector3)
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = name
	spawn.Size = Vector3.new(6, 1, 6)
	spawn.Position = position
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.Parent = parent
end

local function addNpc(parent: Instance, name: string, position: Vector3, color: Color3, action: string?)
	local root = makePart({
		Name = name,
		Size = Vector3.new(2, 5, 2),
		Position = position + Vector3.new(0, 2.5, 0),
		Color = color,
		Parent = parent,
	})
	root:SetAttribute("NpcId", name)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = action or "Talk"
	prompt.ObjectText = name
	prompt.MaxActivationDistance = 12
	prompt.Parent = root
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
	addSpawn(house, "SpawnHouse", Vector3.new(-5, 3, -5))
	addNpc(house, "npc_mom", Vector3.new(18, 0, 8), Color3.fromRGB(180, 120, 140), "Talk")
	addNpc(house, "npc_shnurok", Vector3.new(-18, 0, -8), Color3.fromRGB(140, 100, 60), "Pet")

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
	addNpc(street, "npc_razor", Vector3.new(70, 0, 5), Color3.fromRGB(30, 30, 35))
	makePart({
		Name = "Shop",
		Size = Vector3.new(14, 10, 14),
		Position = Vector3.new(100, 5, -10),
		Color = Color3.fromRGB(90, 40, 120),
		Parent = street,
	})

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
	addNpc(cemetery, "npc_gravedigger", Vector3.new(-5, 0, 125), Color3.fromRGB(60, 55, 45), "Work")
	addNpc(cemetery, "npc_ghost", Vector3.new(10, 0, 130), Color3.fromRGB(200, 180, 255), "Help")
	local crypt = makePart({
		Name = "obj_crypt_site",
		Size = Vector3.new(12, 2, 12),
		Position = Vector3.new(-15, 1, 140),
		Color = Color3.fromRGB(50, 45, 55),
		Parent = cemetery,
	})
	local cp = Instance.new("ProximityPrompt")
	cp.ActionText = "Build"
	cp.ObjectText = "Crypt"
	cp.MaxActivationDistance = 14
	cp.Parent = crypt

	local construction = Instance.new("Folder")
	construction.Name = "Construction"
	construction.Parent = parent
	local hangout = makePart({
		Name = "obj_hangout_site",
		Size = Vector3.new(20, 2, 20),
		Position = Vector3.new(80, 0, 80),
		Color = Color3.fromRGB(70, 70, 90),
		Parent = construction,
	})
	local hp = Instance.new("ProximityPrompt")
	hp.ActionText = "Build"
	hp.ObjectText = "Hangout"
	hp.MaxActivationDistance = 14
	hp.Parent = hangout

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
	makePart({
		Name = "zone_castle_hall",
		Size = Vector3.new(30, 1, 30),
		Position = Vector3.new(-80, 0, 80),
		Color = Color3.fromRGB(60, 40, 80),
		Parent = castle,
	})
	makePart({
		Name = "zone_castle_tower",
		Size = Vector3.new(10, 20, 10),
		Position = Vector3.new(-95, 10, 95),
		Color = Color3.fromRGB(50, 35, 70),
		Parent = castle,
	})
	addNpc(castle, "npc_count", Vector3.new(-80, 0, 80), Color3.fromRGB(90, 70, 120))
	addNpc(castle, "npc_zoya", Vector3.new(-65, 0, 70), Color3.fromRGB(200, 140, 80), "Talk")

	local parkour = Instance.new("Folder")
	parkour.Name = "Parkour"
	parkour.Parent = parent
	local px = 160
	for i = 1, 6 do
		makePart({
			Name = "Step" .. i,
			Size = Vector3.new(6, 2, 6),
			Position = Vector3.new(px + i * 8, i * 3, 40),
			Color = Color3.fromRGB(255, 180, 60),
			Parent = parkour,
		})
	end
end

return WorldBuilder
