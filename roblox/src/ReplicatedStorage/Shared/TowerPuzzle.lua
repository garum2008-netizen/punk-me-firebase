--!strict
local TowerPuzzle = {}

-- Canonical solution (observable hints in-world later)
TowerPuzzle.CANDLE_SEQUENCE = { 2, 4, 1, 3 }
TowerPuzzle.NOTE_SEQUENCE = { "E", "G", "C", "D" }

function TowerPuzzle.validate(candles: { number }, notes: { string }): boolean
	if #candles ~= #TowerPuzzle.CANDLE_SEQUENCE then
		return false
	end
	if #notes ~= #TowerPuzzle.NOTE_SEQUENCE then
		return false
	end
	for i, v in TowerPuzzle.CANDLE_SEQUENCE do
		if candles[i] ~= v then
			return false
		end
	end
	for i, v in TowerPuzzle.NOTE_SEQUENCE do
		if notes[i] ~= v then
			return false
		end
	end
	return true
end

return TowerPuzzle
