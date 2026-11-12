--!strict
local SceneTriggers = {}

local ENDING_SCENE: { [string]: string } = {
	ending_break_curse = "scene_ending_break_curse",
	ending_zombie_style = "scene_ending_zombie_style",
	ending_count_deal = "scene_ending_count_deal",
}

function SceneTriggers.afterAction(
	action: string,
	payload: any,
	profile: { language: string, story: { storyEnding: string?, activeStepId: string } }
): string?
	if action == "pick_ending" and profile.story.storyEnding then
		return ENDING_SCENE[profile.story.storyEnding]
	end
	if action == "quest_event" and payload == "ch0_razor_talk" then
		return "scene_ch0_razor"
	end
	if action == "ch2_antibully" then
		return "scene_ch2_antibully"
	end
	if action == "graph_confession" then
		return "scene_ch4_confession"
	end
	if action == "duel_action" and type(payload) == "string" then
		-- duel win handled separately when state ends
		return nil
	end
	return nil
end

function SceneTriggers.onDuelWin(): string
	return "scene_ch1_duel_win"
end

return SceneTriggers
