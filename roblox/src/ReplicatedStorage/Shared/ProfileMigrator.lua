--!strict
local ProfileSchema = if script and script.Parent
	then require(script.Parent.ProfileSchema)
	else require("./ProfileSchema")

local ProfileMigrator = {}

local function migrateV1ToV2(profile: ProfileSchema.Profile): ProfileSchema.Profile
	profile.schemaVersion = 2
	return profile
end

local function migrateV2ToV3(profile: any): any
	if profile.roomDecor == nil then
		profile.roomDecor = {}
	end
	profile.schemaVersion = 3
	return profile
end

local function migrateV3ToV4(profile: ProfileSchema.Profile): ProfileSchema.Profile
	if profile.story == nil then
		local raw = profile :: any
		local migrated, _ = ProfileSchema.sanitize(raw)
		if migrated then
			return migrated
		end
	end
	profile.schemaVersion = 4
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
			profile = migrateV2ToV3(profile :: any) :: ProfileSchema.Profile
		elseif profile.schemaVersion < 4 then
			profile = migrateV3ToV4(profile)
		else
			break
		end
	end
	profile.schemaVersion = ProfileSchema.CURRENT_VERSION
	return profile, nil
end

return ProfileMigrator
