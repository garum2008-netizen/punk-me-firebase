--!strict
export type Visual = {
	bodyColor: Color3,
	accentColor: Color3,
	height: number?,
}

return {
	npc_mom = { bodyColor = Color3.fromRGB(180, 120, 140), accentColor = Color3.fromRGB(240, 200, 210), height = 1.05 },
	npc_shnurok = { bodyColor = Color3.fromRGB(140, 100, 60), accentColor = Color3.fromRGB(90, 60, 40), height = 0.55 },
	npc_razor = { bodyColor = Color3.fromRGB(40, 40, 45), accentColor = Color3.fromRGB(180, 180, 190), height = 1.08 },
	npc_gravedigger = {
		bodyColor = Color3.fromRGB(60, 55, 45),
		accentColor = Color3.fromRGB(100, 90, 70),
		height = 1.1,
	},
	npc_ghost = { bodyColor = Color3.fromRGB(200, 180, 255), accentColor = Color3.fromRGB(230, 220, 255), height = 1.0 },
	npc_zoya = { bodyColor = Color3.fromRGB(120, 80, 60), accentColor = Color3.fromRGB(220, 180, 120), height = 0.95 },
	npc_count = { bodyColor = Color3.fromRGB(50, 35, 70), accentColor = Color3.fromRGB(120, 90, 160), height = 1.12 },
}
