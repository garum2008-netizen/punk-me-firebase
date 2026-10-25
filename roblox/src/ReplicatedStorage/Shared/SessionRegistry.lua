--!strict
local SessionRegistry = {}

export type Entry<T> = {
	userId: number,
	data: T,
}

local store: { [number]: any } = {}

function SessionRegistry.startSession<T>(userId: number, data: T): Entry<T>
	local entry: Entry<T> = { userId = userId, data = data }
	store[userId] = entry
	return entry
end

function SessionRegistry.getSession<T>(userId: number): Entry<T>?
	return store[userId]
end

function SessionRegistry.endSession(userId: number)
	store[userId] = nil
end

function SessionRegistry.sessionCount(): number
	local n = 0
	for _ in store do
		n += 1
	end
	return n
end

return SessionRegistry
