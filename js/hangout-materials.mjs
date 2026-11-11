/** Gang hangout materials — prices match data/story/balance.json materialPrices. */

export const HANGOUT_SHOP = [
  { id: "mat_board", storyMat: "board", price: 10, qty: 1 },
  { id: "mat_nails", storyMat: "nails", price: 5, qty: 1 },
  { id: "mat_brick_hang", storyMat: "brick", price: 8, qty: 1 },
  { id: "mat_chain", storyMat: "chain", price: 15, qty: 1 },
  { id: "mat_spray", storyMat: "spray", price: 12, qty: 1 },
  { id: "mat_neon_tube", storyMat: "neon_tube", price: 25, qty: 1 }
];

export const SCRAP_SELL_PRICE = 3;
export const SMELT_SCRAP_COST = 5;

/**
 * Spend a stage recipe. Returns a shallow copy, or null when anything is short.
 * Does not mutate `have`.
 */
export function spendMaterials(have, need) {
  const src = have && typeof have === "object" ? have : {};
  const next = { ...src };
  for (const [key, qty] of Object.entries(need || {})) {
    if ((next[key] || 0) < qty) return null;
  }
  for (const [key, qty] of Object.entries(need || {})) {
    next[key] = (next[key] || 0) - qty;
  }
  return next;
}

export function firstShortMaterial(have, need) {
  for (const [key, qty] of Object.entries(need || {})) {
    const got = have?.[key] || 0;
    if (got < qty) return { key, have: got, need: qty, missing: qty - got };
  }
  return null;
}
