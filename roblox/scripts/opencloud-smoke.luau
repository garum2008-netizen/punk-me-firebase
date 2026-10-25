-- Headless smoke (Open Cloud Luau Execution). Expects TEST DataStore scope in Studio/cloud config.
local DataStoreScope = require(game.ReplicatedStorage.Shared.DataStoreScope)
local name = DataStoreScope.profileStoreName("PunkMeAngel_Profile_v1", false, nil)
if not string.find(name, "_TEST") then
	error("Refusing non-test DataStore scope: " .. name)
end
print("[opencloud-smoke] DataStore scope OK:", name)
return { ok = true, scope = name }
