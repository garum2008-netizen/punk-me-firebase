--!strict
--[[
	Playable gang presets — canonical names from CHARACTERS.md.
	Studio: map to HumanoidDescription or accessory bundles when assets exist.
]]

export type Preset = {
	id: string,
	displayKey: string,
	bodyColor: Color3,
	accentColor: Color3,
}

local presets: { Preset } = {
	{
		id = "razor",
		displayKey = "char_razor",
		bodyColor = Color3.fromRGB(40, 40, 45),
		accentColor = Color3.fromRGB(180, 180, 190),
	},
	{
		id = "vienna",
		displayKey = "char_vienna",
		bodyColor = Color3.fromRGB(50, 30, 45),
		accentColor = Color3.fromRGB(255, 60, 180),
	},
	{
		id = "cobalt",
		displayKey = "char_cobalt",
		bodyColor = Color3.fromRGB(35, 45, 70),
		accentColor = Color3.fromRGB(80, 200, 255),
	},
	{
		id = "mohawk",
		displayKey = "char_mohawk",
		bodyColor = Color3.fromRGB(40, 55, 35),
		accentColor = Color3.fromRGB(120, 255, 80),
	},
}

local byId: { [string]: Preset } = {}
for _, p in presets do
	byId[p.id] = p
end

return {
	list = presets,
	get = function(id: string): Preset?
		return byId[id]
	end,
}
