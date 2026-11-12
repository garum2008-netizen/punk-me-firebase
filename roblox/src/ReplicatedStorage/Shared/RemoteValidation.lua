--!strict
local RemoteValidation = {}

export type Bucket = {
	lastAt: number,
	count: number,
}

function RemoteValidation.newBucket(): Bucket
	return { lastAt = 0, count = 0 }
end

function RemoteValidation.checkRate(bucket: Bucket, now: number, windowSec: number, maxInWindow: number): boolean
	if now - bucket.lastAt > windowSec then
		bucket.lastAt = now
		bucket.count = 0
	end
	if bucket.count >= maxInWindow then
		return false
	end
	bucket.count += 1
	return true
end

function RemoteValidation.validateString(value: any, maxLen: number): string?
	if type(value) ~= "string" then
		return nil
	end
	if #value > maxLen or #value == 0 then
		return nil
	end
	return value
end

function RemoteValidation.validateEnum<T>(value: any, allowed: { T }): T?
	for _, v in allowed do
		if value == v then
			return value
		end
	end
	return nil
end

function RemoteValidation.validateInt(value: any, min: number, max: number): number?
	if type(value) ~= "number" or value % 1 ~= 0 then
		return nil
	end
	if value < min or value > max then
		return nil
	end
	return value
end

return RemoteValidation
