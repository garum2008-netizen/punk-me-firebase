--!strict
local MarketplaceService = game:GetService("MarketplaceService")
local DataStoreService = game:GetService("DataStoreService")
local RunService = game:GetService("RunService")

local ReceiptStore = require(game.ReplicatedStorage.Shared.ReceiptStore)
local DataStoreScope = require(game.ReplicatedStorage.Shared.DataStoreScope)
local DevProducts = require(game.ReplicatedStorage.Config.DevProducts)

local MonetizationService = {}

local RECEIPT_BASE = "PunkMeAngel_Receipts_v1"
local memoryReceipts: { [string]: boolean } = {}

local function receiptDatastore(): GlobalDataStore
	local name = DataStoreScope.receiptStoreName(RECEIPT_BASE, RunService:IsStudio(), nil)
	return DataStoreService:GetDataStore(name)
end

function MonetizationService.processReceipt(receiptInfo: any): Enum.ProductPurchaseDecision
	local purchaseId = receiptInfo.PurchaseId
	local productId = receiptInfo.ProductId
	if purchaseId == nil or productId == nil then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	local store = receiptDatastore()
	local key = "r_" .. purchaseId
	local already = false
	pcall(function()
		already = store:GetAsync(key) == true
	end)
	if already or ReceiptStore.wasProcessed(memoryReceipts, purchaseId) then
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	local result = ReceiptStore.fulfill(memoryReceipts, purchaseId, productId, DevProducts.TEST_PRODUCTS)
	if result == "unknown_product" then
		warn("[Monetization] Unknown test product", productId)
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	pcall(function()
		store:SetAsync(key, true)
	end)
	return Enum.ProductPurchaseDecision.PurchaseGranted
end

function MonetizationService.bind()
	MarketplaceService.ProcessReceipt = MonetizationService.processReceipt
end

return MonetizationService
