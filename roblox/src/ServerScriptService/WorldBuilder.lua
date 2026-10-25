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

local function addZoneLabel(parent: Instance, text: string, position: Vector3)
	local anchor = makePart({
		Name = "Zone_" .. text,
		Size = Vector3.new(4, 1, 4),
		Position = position + Vector3.new(0, 8, 0),
		Color = Color3.fromRGB(255, 120, 200),
		Parent = parent,
	})
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.fromOffset(200, 50)
	bb.AlwaysOnTop = true
	bb.Parent = anchor
	local tl = Instance.new("TextLabel")
	tl.Size = UDim2.fromScale(1, 1)
	tl.BackgroundTransparency = 1
	tl.TextColor3 = Color3.new(1, 1, 1)
	tl.TextScaled = true
	tl.Font = Enum.Font.GothamBold
	tl.Text = text
	tl.Parent = bb
end

local function addNpc(parent: Instance, name: string, position: Vector3, color: Color3)
	local root = makePart({
		Name = name,
		Size = Vector3.new(2, 5, 2),
		Position = position + Vector3.new(0, 2.5, 0),
		Color = color,
		Parent = parent,
	})
	root:SetAttribute("NpcId", name)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Talk"
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
	local room = makePart({
		Name = "RoomFloor",
		Size = Vector3.new(16, 1, 16),
		Position = Vector3.new(-12, 0.5, -12),
		Color = Color3.fromRGB(70, 65, 80),
		Parent = house,
	})
	local roomPrompt = Instance.new("ProximityPrompt")
	roomPrompt.ActionText = "Decorate"
	roomPrompt.ObjectText = "Your room"
	roomPrompt.MaxActivationDistance = 12
	roomPrompt.Parent = room
	addSpawn(house, "SpawnHouse", Vector3.new(0, 3, 0))
	addZoneLabel(house, "House 13", Vector3.new(0, 0, 0))

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
	local shop = makePart({
		Name = "Shop",
		Size = Vector3.new(14, 10, 14),
		Position = Vector3.new(100, 5, -10),
		Color = Color3.fromRGB(90, 40, 120),
		Parent = street,
	})
	local shopPrompt = Instance.new("ProximityPrompt")
	shopPrompt.ActionText = "Shop"
	shopPrompt.ObjectText = "Neon Store"
	shopPrompt.MaxActivationDistance = 14
	shopPrompt.Parent = shop
	addNpc(street, "npc_razor", Vector3.new(70, 0, 5), Color3.fromRGB(30, 30, 35))
	addZoneLabel(street, "Gang Street", Vector3.new(80, 0, 0))

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
	addNpc(cemetery, "npc_gravedigger", Vector3.new(-5, 0, 125), Color3.fromRGB(60, 55, 45))
	addZoneLabel(cemetery, "Cemetery", Vector3.new(0, 0, 120))

	local duel = Instance.new("Folder")
	duel.Name = "DuelPit"
	duel.Parent = parent
	makePart({
		Name = "Arena",
		Size = Vector3.new(24, 1, 24),
		Position = Vector3.new(120, 0, 120),
		Color = Color3.fromRGB(80, 30, 30),
		Parent = duel,
	})
	addZoneLabel(duel, "Duel Pit", Vector3.new(120, 0, 120))

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
	local finish = makePart({
		Name = "ParkourFinish",
		Size = Vector3.new(8, 1, 8),
		Position = Vector3.new(px + 56, 19, 40),
		Color = Color3.fromRGB(80, 255, 120),
		Parent = parkour,
	})
	finish:SetAttribute("Checkpoint", "finish")
	addZoneLabel(parkour, "Parkour", Vector3.new(px, 0, 40))
end

return WorldBuilder
