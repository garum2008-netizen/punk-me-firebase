--!strict
local FlyerEngine = {}

FlyerEngine.SPOT_IDS = {
	"flyer_street_1",
	"flyer_street_2",
	"flyer_street_3",
	"flyer_city_1",
	"flyer_city_2",
	"flyer_city_3",
	"flyer_cemetery_gate",
	"flyer_shop_wall",
}

function FlyerEngine.newProgress(): { [string]: boolean }
	return {}
end

function FlyerEngine.postSpot(progress: { [string]: boolean }, spotId: string): (boolean, number)
	if progress[spotId] then
		return false, FlyerEngine.count(progress)
	end
	local valid = false
	for _, id in FlyerEngine.SPOT_IDS do
		if id == spotId then
			valid = true
			break
		end
	end
	if not valid then
		return false, FlyerEngine.count(progress)
	end
	progress[spotId] = true
	return true, FlyerEngine.count(progress)
end

function FlyerEngine.count(progress: { [string]: boolean }): number
	local n = 0
	for _, id in FlyerEngine.SPOT_IDS do
		if progress[id] then
			n += 1
		end
	end
	return n
end

function FlyerEngine.isComplete(progress: { [string]: boolean }): boolean
	return FlyerEngine.count(progress) >= #FlyerEngine.SPOT_IDS
end

return FlyerEngine
