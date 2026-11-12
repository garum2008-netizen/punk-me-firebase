--!strict
local Economy = {}

export type ShopItem = {
	id: string,
	price: number,
	category: string,
	grantInventoryKey: string?,
}

export type PurchaseResult = { ok: true, newBalance: number } | {
	ok: false,
	reason: "insufficient_funds" | "unknown_item" | "already_owned",
	need: number?,
}

function Economy.tryPurchase(coins: number, item: ShopItem?, alreadyOwned: boolean): PurchaseResult
	if item == nil then
		return { ok = false, reason = "unknown_item" }
	end
	if alreadyOwned and item.grantInventoryKey ~= nil then
		return { ok = false, reason = "already_owned" }
	end
	if coins < item.price then
		return { ok = false, reason = "insufficient_funds", need = item.price - coins }
	end
	return { ok = true, newBalance = coins - item.price }
end

function Economy.payJobReward(
	coins: number,
	amount: number,
	grantKey: string,
	granted: { [string]: boolean }
): (number, boolean, string?)
	if amount <= 0 then
		return coins, false, "invalid_amount"
	end
	if granted[grantKey] then
		return coins, false, "already_granted"
	end
	return coins + amount, true, nil
end

function Economy.xpForLevel(level: number): number
	return 50 + (level - 1) * 25
end

function Economy.applyXp(xp: number, level: number): (number, number)
	local newXp = xp
	local newLevel = level
	while newXp >= Economy.xpForLevel(newLevel) do
		newXp -= Economy.xpForLevel(newLevel)
		newLevel += 1
	end
	return newXp, newLevel
end

return Economy
