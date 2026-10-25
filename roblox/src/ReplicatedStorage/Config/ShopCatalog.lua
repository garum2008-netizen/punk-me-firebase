--!strict
export type ShopItem = {
	id: string,
	price: number,
	category: string,
	grantInventoryKey: string?,
}

local ShopCatalog: { ShopItem } = {
	{
		id = "decor_neon_poster",
		price = 45,
		category = "decor",
		grantInventoryKey = "decor_neon_poster",
	},
	{
		id = "emote_wave",
		price = 30,
		category = "emote",
		grantInventoryKey = "emote_wave",
	},
}

local byId: { [string]: ShopItem } = {}
for _, item in ShopCatalog do
	byId[item.id] = item
end

return {
	list = ShopCatalog,
	get = function(id: string): ShopItem?
		return byId[id]
	end,
}
