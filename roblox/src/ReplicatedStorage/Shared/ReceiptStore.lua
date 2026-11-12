--!strict
--[[
	Idempotent ProcessReceipt / dev product fulfillment (pure store interface).
]]

local ReceiptStore = {}

export type MemoryStore = { [string]: boolean }

function ReceiptStore.wasProcessed(store: MemoryStore, purchaseId: string): boolean
	return store[purchaseId] == true
end

export type FulfillResult = "granted" | "duplicate" | "unknown_product"

function ReceiptStore.fulfill(
	store: MemoryStore,
	purchaseId: string,
	productId: number,
	testProductIds: { [number]: string }
): FulfillResult
	if ReceiptStore.wasProcessed(store, purchaseId) then
		return "duplicate"
	end
	if testProductIds[productId] == nil then
		return "unknown_product"
	end
	store[purchaseId] = true
	return "granted"
end

return ReceiptStore
