--!strict
local DataStoreScope = {}

function DataStoreScope.profileStoreName(baseName: string, isStudio: boolean, forceTest: boolean?): string
	if forceTest == true or isStudio then
		return baseName .. "_TEST"
	end
	return baseName
end

function DataStoreScope.receiptStoreName(baseName: string, isStudio: boolean, forceTest: boolean?): string
	return DataStoreScope.profileStoreName(baseName, isStudio, forceTest)
end

return DataStoreScope
