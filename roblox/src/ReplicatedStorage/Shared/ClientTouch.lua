--!strict
local UserInputService = game:GetService("UserInputService")

local ClientTouch = {}

function ClientTouch.isTouch(): boolean
	return UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled
end

function ClientTouch.stylePrimaryButton(button: TextButton)
	if ClientTouch.isTouch() or UserInputService.TouchEnabled then
		button.Size = UDim2.new(0, math.max(button.Size.X.Offset, 112), 0, math.max(button.Size.Y.Offset, 48))
		button.TextSize = 18
	end
end

return ClientTouch
