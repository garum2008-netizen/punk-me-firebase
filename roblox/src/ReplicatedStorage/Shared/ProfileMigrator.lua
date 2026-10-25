--!strict
local ProfileSchema = if script and script.Parent
	then require(script.Parent.ProfileSchema)
	else require("./ProfileSchema")

local ProfileMigrator = {}

local function migrateV1ToV2(profile: ProfileSchema.Profile): ProfileSchema.Profile
	if profile.questFlags == nil then
		profile.questFlags = {}
	end
	if profile.grantedRewards == nil then
		profile.grantedRewards = {}
	end
	profile.schemaVersion = 2
	return profile
end

local function migrateV2ToV3(profile: ProfileSchema.Profile): ProfileSchema.Profile
	if profile.roomDecor == nil then
		profile.roomDecor = {}
	end
	if profile.settings == nil then
		profile.settings = ProfileSchema.defaultProfile().settings
	end
	profile.schemaVersion = 3
	return profile
end

function ProfileMigrator.migrate(raw: any): (ProfileSchema.Profile?, string?)
	local profile, err = ProfileSchema.sanitize(raw)
	if not profile then
		return nil, err
	end
	while profile.schemaVersion < ProfileSchema.CURRENT_VERSION do
		if profile.schemaVersion < 2 then
			profile = migrateV1ToV2(profile)
		elseif profile.schemaVersion < 3 then
			profile = migrateV2ToV3(profile)
		else
			break
		end
	end
	profile.schemaVersion = ProfileSchema.CURRENT_VERSION
	return profile, nil
end

return ProfileMigrator
