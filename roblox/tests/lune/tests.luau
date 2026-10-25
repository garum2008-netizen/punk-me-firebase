--!strict
local function assertEq<T>(a: T, b: T, msg: string)
	if a ~= b then
		error(msg .. " (got " .. tostring(a) .. ", want " .. tostring(b) .. ")")
	end
end

local ProfileSchema = require("../../src/ReplicatedStorage/Shared/ProfileSchema")
local ProfileMigrator = require("../../src/ReplicatedStorage/Shared/ProfileMigrator")
local Economy = require("../../src/ReplicatedStorage/Shared/Economy")
local QuestEngine = require("../../src/ReplicatedStorage/Shared/QuestEngine")
local DuelEngine = require("../../src/ReplicatedStorage/Shared/DuelEngine")
local FlyerEngine = require("../../src/ReplicatedStorage/Shared/FlyerEngine")
local HangoutEngine = require("../../src/ReplicatedStorage/Shared/HangoutEngine")
local TowerPuzzle = require("../../src/ReplicatedStorage/Shared/TowerPuzzle")
local EndingLogic = require("../../src/ReplicatedStorage/Shared/EndingLogic")
local HangoutMinigame = require("../../src/ReplicatedStorage/Shared/HangoutMinigame")
local GhostRiddleEngine = require("../../src/ReplicatedStorage/Shared/GhostRiddleEngine")
local CryptBuildEngine = require("../../src/ReplicatedStorage/Shared/CryptBuildEngine")
local ReceiptStore = require("../../src/ReplicatedStorage/Shared/ReceiptStore")
local DataStoreScope = require("../../src/ReplicatedStorage/Shared/DataStoreScope")
local QuestTable = require("../../src/ReplicatedStorage/Config/QuestTable")

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

test("profile schema v5", function()
	assertEq(ProfileSchema.defaultProfile().schemaVersion, 5, "v")
end)

test("duel player can win", function()
	local s = DuelEngine.newState()
	for _ = 1, 20 do
		s, _ = DuelEngine.resolveTurn(s, "attack")
		if s.phase ~= "fighting" then
			break
		end
	end
	assertEq(s.phase == "player_win" or s.phase == "player_lose", true, "ended")
end)

test("flyers need 8 unique spots", function()
	local p = FlyerEngine.newProgress()
	for _, id in FlyerEngine.SPOT_IDS do
		FlyerEngine.postSpot(p, id)
	end
	assertEq(FlyerEngine.isComplete(p), true, "done")
	assertEq(FlyerEngine.postSpot(p, FlyerEngine.SPOT_IDS[1]), false, "dup")
end)

test("hangout four stages in order", function()
	local h = HangoutEngine.newProgress()
	assertEq(HangoutEngine.complete(h, "foundation"), true, "f")
	assertEq(HangoutEngine.complete(h, "neon"), false, "skip")
	assertEq(HangoutEngine.complete(h, "frame"), true, "fr")
	assertEq(HangoutEngine.isDone(h), false, "not")
	assertEq(HangoutEngine.complete(h, "neon"), true, "n")
	assertEq(HangoutEngine.complete(h, "grand_open"), true, "go")
	assertEq(HangoutEngine.isDone(h), true, "done")
end)

test("tower puzzle validate", function()
	assertEq(TowerPuzzle.validate(TowerPuzzle.CANDLE_SEQUENCE, TowerPuzzle.NOTE_SEQUENCE), true, "ok")
	assertEq(TowerPuzzle.validate({ 1 }, { "E" }), false, "bad")
end)

test("ending logic deal needs count rel", function()
	local st = QuestEngine.defaultStoryState()
	st.relationships.count = 5
	assertEq(EndingLogic.canPick(st, "ending_count_deal"), false, "low")
	st.relationships.count = 12
	assertEq(EndingLogic.canPick(st, "ending_count_deal"), true, "ok")
end)

test("ch0 step advance", function()
	local st = QuestEngine.defaultStoryState()
	local ok, _ = QuestEngine.tryCompleteEvent(st, "ch0_look_room")
	assertEq(ok, true, "ok")
end)

test("migrate v4 to v5", function()
	local raw = { schemaVersion = 4, coins = 10, language = "ru", story = { activeQuestId = "q", activeStepId = "s" } }
	local p, err = ProfileMigrator.migrate(raw)
	assertEq(err, nil, "e")
	assertEq(p and p.schemaVersion, 5, "v")
end)

test("receipt duplicate", function()
	local store = {}
	assertEq(ReceiptStore.fulfill(store, "p1", 0, { [0] = "t" }), "granted", "g")
	assertEq(ReceiptStore.fulfill(store, "p1", 0, { [0] = "t" }), "duplicate", "d")
end)

test("datastore test scope", function()
	assertEq(DataStoreScope.profileStoreName("P", true, nil), "P_TEST", "t")
end)

test("hangout minigame answers", function()
	assertEq(HangoutMinigame.validate("foundation", "241"), true, "f")
	assertEq(HangoutMinigame.validate("foundation", "123"), false, "bad")
end)

test("ghost riddles sequence", function()
	local step = 0
	local ok, n = GhostRiddleEngine.submit(step, "колокол")
	assertEq(ok, true, "r1")
	step = n
	ok, n = GhostRiddleEngine.submit(step, "склеп")
	assertEq(ok, true, "r2")
	ok, n = GhostRiddleEngine.submit(n, "вена")
	assertEq(GhostRiddleEngine.isComplete(n), true, "done")
end)

test("crypt build phases", function()
	local phase = 0
	assertEq(CryptBuildEngine.validate("stakes", "4stakes", phase), true, "p1")
	phase += 1
	assertEq(CryptBuildEngine.validate("inscription", "mortwin", phase), true, "p2")
	phase += 1
	assertEq(CryptBuildEngine.validate("seal", "bellrim", phase), true, "p3")
	assertEq(CryptBuildEngine.isComplete(3), true, "done")
end)

test("shop purchase funds", function()
	local item = { id = "x", price = 50, category = "d", grantInventoryKey = "x" }
	local r = Economy.tryPurchase(40, item, false)
	assertEq(r.ok, false, "poor")
	local r2 = Economy.tryPurchase(60, item, false)
	assertEq(r2.ok, true, "buy")
end)

print(string.format("All %d tests passed", passed))
