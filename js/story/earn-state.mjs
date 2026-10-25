/** Build story.earn objects safe for Firebase (no undefined keys). */

export function buildEarnState(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function resolveReturnBeacon(context, storyState) {
  const fromCtx = context?.returnBeacon;
  if (typeof fromCtx === "string" && fromCtx.length > 0) return fromCtx;
  const fromStory = storyState?.beacon;
  if (typeof fromStory === "string" && fromStory.length > 0) return fromStory;
  return "obj_shop";
}

export function resolveReturnLabel(context, labelFn) {
  const fromCtx = context?.returnLabel;
  if (typeof fromCtx === "string" && fromCtx.length > 0) return fromCtx;
  const fromQuest = labelFn?.();
  if (typeof fromQuest === "string" && fromQuest.length > 0) return fromQuest;
  return null;
}
