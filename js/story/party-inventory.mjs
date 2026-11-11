/** One hangout inventory. Story materials are canonical; the shop stack is folded in once. */

export const PARTY_MATERIAL_IDS = ["board", "brick", "nails", "chain", "spray", "neon_tube", "scrap"];

export function emptyPartyMaterials() {
  return { board: 0, brick: 0, nails: 0, chain: 0, spray: 0, neon_tube: 0, scrap: 0 };
}

/**
 * `merge` keeps the higher count the first time an old save is opened.
 * Later calls copy story → inventory so a build spend is not refunded.
 * Non-party keys (crypt, neon_sign, shack) stay on the inventory object.
 */
export function unifyPartyMaterials(storyMats, inventoryMats, { merge = false } = {}) {
  const story = { ...emptyPartyMaterials(), ...(storyMats || {}) };
  const inv = { ...(inventoryMats || {}) };
  for (const id of PARTY_MATERIAL_IDS) {
    const fromStory = Number(story[id]) || 0;
    const fromInv = Number(inv[id]) || 0;
    if (merge) story[id] = Math.max(fromStory, fromInv);
    else story[id] = fromStory;
    inv[id] = story[id];
  }
  return { story, inventory: inv };
}

export function canAfford(coins, price, qty, isOwner) {
  const cost = (Number(price) || 0) * (qty || 1);
  if (cost <= 0) return { ok: false, cost: 0, short: 0, reason: "unknown" };
  if (isOwner) return { ok: true, cost, short: 0 };
  if ((coins || 0) < cost) return { ok: false, cost, short: cost - (coins || 0), reason: "coins" };
  return { ok: true, cost, short: 0 };
}

export function partyNeedsMet(materials, need) {
  return Object.entries(need || {}).every(([id, n]) => (Number(materials?.[id]) || 0) >= n);
}

export function spendPartyMaterials(materials, need) {
  const next = { ...emptyPartyMaterials(), ...(materials || {}) };
  if (!partyNeedsMet(next, need)) return { ok: false, materials: next };
  for (const [id, n] of Object.entries(need)) next[id] = (Number(next[id]) || 0) - n;
  return { ok: true, materials: next };
}
