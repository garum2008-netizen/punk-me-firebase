/** One-time rewards keyed by stable event IDs (persisted in story.rewardsGranted). */

export function ensureRewardsGranted(me) {
  if (window.StoryEngine?.ensureStoryState) window.StoryEngine.ensureStoryState(me);
  if (!me?.story || typeof me.story !== "object") return {};
  if (!me.story.rewardsGranted || typeof me.story.rewardsGranted !== "object") {
    me.story.rewardsGranted = {};
  }
  return me.story.rewardsGranted;
}

/**
 * @returns {boolean} true if reward was applied now; false if already granted
 */
export function grantRewardOnce(me, eventId, apply) {
  if (!eventId || !me) return false;
  const rg = ensureRewardsGranted(me);
  if (rg[eventId]) return false;
  rg[eventId] = Date.now();
  apply?.();
  return true;
}

export function wasRewardGranted(me, eventId) {
  return !!ensureRewardsGranted(me)[eventId];
}
