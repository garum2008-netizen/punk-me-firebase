/**
 * Chapter 1 Razor duel pays once. A repeated win event, a reopened scene,
 * or a reloaded save must not mint the coins again. Training pays nothing.
 */

export function claimRazorDuelReward(player, {
  training = false,
  npcId = "",
  baseRoll = 0,
  onboardingCoins = 0,
  questCoins = 0
} = {}) {
  if (training) return { granted: false, coins: 0, reason: "training" };
  const story = player.story && typeof player.story === "object"
    ? player.story
    : (player.story = {});
  if (!story.duelClaims || typeof story.duelClaims !== "object") story.duelClaims = {};

  const razor = !npcId || npcId === "razor";
  if (razor && story.duelClaims.razor_chapter1) {
    return {
      granted: false,
      coins: 0,
      reason: "already",
      previous: story.duelClaims.razor_chapter1.coins
    };
  }

  let coins = 0;
  let source = "roll";
  if (onboardingCoins > 0) {
    coins = onboardingCoins;
    source = "onboarding";
  } else if (questCoins > 0) {
    coins = questCoins;
    source = "quest";
  } else if (baseRoll > 0) {
    coins = baseRoll;
    source = "roll";
  }
  if (razor) story.duelClaims.razor_chapter1 = { coins, source };
  return { granted: true, coins, source, reason: source };
}
