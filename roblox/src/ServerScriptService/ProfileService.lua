--!strict
local DataStoreService = game:GetService("DataStoreService")
local RunService = game:GetService("RunService")

local ProfileSchema = require(game.ReplicatedStorage.Shared.ProfileSchema)
local ProfileMigrator = require(game.ReplicatedStorage.Shared.ProfileMigrator)
local DataStoreScope = require(game.ReplicatedStorage.Shared.DataStoreScope)

local ProfileService = {}
ProfileService.__index = ProfileService

export type Session = {
	profile: ProfileSchema.Profile,
	locked: boolean,
	userId: number,
}

local STORE_BASE = "PunkMeAngel_Profile_v1"
local MAX_RETRIES = 5
local RETRY_PAUSE = 1

local SessionRegistry = require(game.ReplicatedStorage.Shared.SessionRegistry)

local function getStore(): GlobalDataStore
	local name = DataStoreScope.profileStoreName(STORE_BASE, RunService:IsStudio(), nil)
	return DataStoreService:GetDataStore(name)
end

local function keyForUser(userId: number): string
	return "player_" .. tostring(userId)
end

local function withRetry<T>(fn: () -> T): (T?, string?)
	local lastErr: string? = nil
	for attempt = 1, MAX_RETRIES do
		local ok, result = pcall(fn)
		if ok then
			return result, nil
		end
		lastErr = tostring(result)
		task.wait(RETRY_PAUSE * attempt)
	end
	return nil, lastErr
end

function ProfileService.load(userId: number): (ProfileSchema.Profile?, string?)
	local store = getStore()
	local k = keyForUser(userId)
	local loaded, loadErr = withRetry(function()
		return store:GetAsync(k)
	end)
	if loadErr and loaded == nil then
		return nil, "load_failed"
	end
	if ProfileSchema.isEmptyProfile(loaded) then
		return ProfileSchema.defaultProfile(), nil
	end
	local migrated, migrateErr = ProfileMigrator.migrate(loaded)
	if not migrated then
		-- Never overwrite existing cloud data with empty defaults on parse failure
		return nil, migrateErr or "migrate_failed"
	end
	return migrated, nil
end

function ProfileService.startSession(userId: number): (Session?, string?)
	local existing = SessionRegistry.getSession(userId)
	if existing and existing.data then
		return existing.data :: Session, nil
	end
	local profile, err = ProfileService.load(userId)
	if not profile then
		return nil, err
	end
	local session: Session = {
		profile = profile,
		locked = true,
		userId = userId,
	}
	SessionRegistry.startSession(userId, session)
	return session, nil
end

function ProfileService.saveSession(session: Session): (boolean, string?)
	local store = getStore()
	local k = keyForUser(session.userId)
	local toSave = session.profile
	local _, saveErr = withRetry(function()
		store:UpdateAsync(k, function(old)
			if ProfileSchema.isEmptyProfile(old) and toSave == nil then
				return nil
			end
			return toSave
		end)
		return true
	end)
	if saveErr then
		return false, saveErr or "save_failed"
	end
	return true, nil
end

function ProfileService.endSession(userId: number)
	SessionRegistry.endSession(userId)
end

function ProfileService.getSession(userId: number): Session?
	local entry = SessionRegistry.getSession(userId)
	if entry and entry.data then
		return entry.data :: Session
	end
	return nil
end

return ProfileService
