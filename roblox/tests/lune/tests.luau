--!strict
local function assertEq<T>(a: T, b: T, msg: string)
	if a ~= b then
		error(msg .. " (got " .. tostring(a) .. ", want " .. tostring(b) .. ")")
	end
end

local ProfileSchema = require("../../src/ReplicatedStorage/Shared/ProfileSchema")
local ProfileMigrator = require("../../src/ReplicatedStorage/Shared/ProfileMigrator")
local Economy = require("../../src/ReplicatedStorage/Shared/Economy")
local QuestEpisode1 = require("../../src/ReplicatedStorage/Shared/QuestEpisode1")
local ReceiptStore = require("../../src/ReplicatedStorage/Shared/ReceiptStore")
local RemoteValidation = require("../../src/ReplicatedStorage/Shared/RemoteValidation")
local DataStoreScope = require("../../src/ReplicatedStorage/Shared/DataStoreScope")
local Localization = require("../../src/ReplicatedStorage/Shared/Localization")

local passed = 0

local function test(name: string, fn: () -> ())
	local ok, err = pcall(fn)
	if ok then
		passed += 1
		print("[ok]", name)
	else
		error("[fail] " .. name .. ": " .. tostring(err))
	end
end

test("default profile coins", function()
	local p = ProfileSchema.defaultProfile()
	assertEq(p.coins, 100, "coins")
end)

test("sanitize rejects bad coins", function()
	local p, err = ProfileSchema.sanitize({ coins = -1 })
	assertEq(p, nil, "profile")
	assertEq(err, "invalid_coins", "err")
end)

test("migrate v1 to current", function()
	local raw = { schemaVersion = 1, coins = 50, language = "en" }
	local p, err = ProfileMigrator.migrate(raw)
	assertEq(err, nil, "err")
	assertEq(p and p.schemaVersion, ProfileSchema.CURRENT_VERSION, "version")
	assertEq(p and p.roomDecor ~= nil, true, "roomDecor")
end)

test("purchase insufficient", function()
	local item = { id = "x", price = 200, category = "d", grantInventoryKey = "k" }
	local r = Economy.tryPurchase(100, item, false)
	assertEq(r.ok, false, "ok")
	if not r.ok then
		assertEq(r.reason, "insufficient_funds", "reason")
	end
end)

test("job idempotency", function()
	local granted = {}
	local c1, g1 = Economy.payJobReward(10, 65, "job1", granted)
	assertEq(g1, true, "first grant")
	granted["job1"] = true
	local c2, g2 = Economy.payJobReward(c1, 65, "job1", granted)
	assertEq(g2, false, "second grant blocked")
	assertEq(c2, c1, "coins unchanged")
end)

test("quest advance valid", function()
	local nxt, ok = QuestEpisode1.advanceIfValid("choose_avatar", "choose_avatar")
	assertEq(ok, true, "advanced")
	assertEq(nxt, "angelina_intro", "next")
end)

test("receipt duplicate", function()
	local store = {}
	assertEq(ReceiptStore.fulfill(store, "p1", 0, { [0] = "test" }), "granted", "first")
	assertEq(ReceiptStore.fulfill(store, "p1", 0, { [0] = "test" }), "duplicate", "dup")
end)

test("rate limit", function()
	local b = RemoteValidation.newBucket()
	assertEq(RemoteValidation.checkRate(b, 0, 1, 2), true, "1")
	assertEq(RemoteValidation.checkRate(b, 0.5, 1, 2), true, "2")
	assertEq(RemoteValidation.checkRate(b, 0.6, 1, 2), false, "3 blocked")
end)

test("datastore test scope", function()
	assertEq(DataStoreScope.profileStoreName("Punk", true, nil), "Punk_TEST", "studio")
	assertEq(DataStoreScope.profileStoreName("Punk", false, nil), "Punk", "live")
end)

test("localization uk", function()
	local t = Localization.t("ui_play", "uk")
	assertEq(t, "Грати", "uk play")
end)

print(string.format("All %d tests passed", passed))
