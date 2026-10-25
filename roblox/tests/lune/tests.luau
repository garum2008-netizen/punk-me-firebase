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
local ReceiptStore = require("../../src/ReplicatedStorage/Shared/ReceiptStore")
local RemoteValidation = require("../../src/ReplicatedStorage/Shared/RemoteValidation")
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

test("default profile schema v4", function()
	local p = ProfileSchema.defaultProfile()
	assertEq(p.schemaVersion, 4, "version")
	assertEq(p.story.activeQuestId, QuestTable.CH0, "quest")
end)

test("reward idempotency", function()
	local st = QuestEngine.defaultStoryState()
	local g1 = QuestEngine.grantReward(st, "reward_ch0_complete")
	local g2 = QuestEngine.grantReward(st, "reward_ch0_complete")
	assertEq(g1.granted, true, "first")
	assertEq(g2.granted, false, "dup")
end)

test("ch0 step advance", function()
	local st = QuestEngine.defaultStoryState()
	local ok, _ = QuestEngine.tryCompleteEvent(st, "ch0_look_room")
	assertEq(ok, true, "ok")
	assertEq(st.activeStepId, "ch0_s_mom", "next")
end)

test("initiation decision exclusive", function()
	local st = QuestEngine.defaultStoryState()
	st.activeQuestId = QuestTable.CH1_CHOICE
	st.activeStepId = "ch1_s_choice"
	assertEq(QuestEngine.pickInitiationPath(st, "pay"), true, "pick")
	assertEq(st.decisions.initiation, "pay", "decision")
	assertEq(st.activeQuestId, QuestTable.INIT_PAY, "quest")
	assertEq(QuestEngine.pickInitiationPath(st, "duel"), false, "no re-pick")
end)

test("bell tongue mutual exclusive", function()
	local st = QuestEngine.defaultStoryState()
	st.activeQuestId = QuestTable.CH4
	st.activeStepId = "ch4_s_tongue"
	QuestEngine.grantUniqueItem(st, "bell_tongue_zoya")
	assertEq(st.uniqueItems.bell_tongue_zombie, nil, "no zombie")
end)

test("ending pick", function()
	local st = QuestEngine.defaultStoryState()
	st.activeQuestId = QuestTable.CH4
	st.activeStepId = "ch4_s_finale"
	assertEq(QuestEngine.pickEnding(st, "ending_break_curse"), true, "ending")
	assertEq(st.storyEnding, "ending_break_curse", "id")
	assertEq(st.freePlay, true, "free")
end)

test("migrate v3 to v4", function()
	local raw = {
		schemaVersion = 3,
		coins = 80,
		language = "en",
		tutorialStep = "chapter_complete",
		grantedRewards = { x = true },
	}
	local p, err = ProfileMigrator.migrate(raw)
	assertEq(err, nil, "err")
	assertEq(p and p.schemaVersion, 4, "ver")
	assertEq(p and p.story ~= nil, true, "story")
end)

test("purchase insufficient", function()
	local item = { id = "x", price = 200, category = "d", grantInventoryKey = "k" }
	local r = Economy.tryPurchase(100, item, false)
	assertEq(r.ok, false, "ok")
end)

test("receipt duplicate", function()
	local store = {}
	assertEq(ReceiptStore.fulfill(store, "p1", 0, { [0] = "test" }), "granted", "first")
	assertEq(ReceiptStore.fulfill(store, "p1", 0, { [0] = "test" }), "duplicate", "dup")
end)

test("datastore test scope", function()
	assertEq(DataStoreScope.profileStoreName("Punk", true, nil), "Punk_TEST", "studio")
end)

print(string.format("All %d tests passed", passed))
