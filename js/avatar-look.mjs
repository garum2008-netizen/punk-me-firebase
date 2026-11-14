/** Saved player look. Hair, jacket, and one accessory on the existing body. */

export const HAIR = [
  { id: "cyan", color: 0x33bbff },
  { id: "pink", color: 0xff3399 },
  { id: "lime", color: 0x66ff22 },
  { id: "violet", color: 0xaa44ff }
];

export const JACKETS = [
  { id: "night", color: 0x1a4a62 },
  { id: "magenta", color: 0xc41878 },
  { id: "olive", color: 0x3d7a22 },
  { id: "ink", color: 0x2a2a38 }
];

export const ACCESSORIES = ["chain", "choker", "spikes"];

export const AVATAR_PRESETS = {
  cobalt: { hair: "cyan", jacket: "night", accessory: "spikes" },
  vienna: { hair: "pink", jacket: "magenta", accessory: "choker" },
  mohawk: { hair: "lime", jacket: "olive", accessory: "spikes" },
  razor: { hair: "violet", jacket: "ink", accessory: "chain" }
};

export function normalizeAvatarLook(raw) {
  if (!raw || typeof raw !== "object") return null;
  const hair = HAIR.some(h => h.id === raw.hair) ? raw.hair : null;
  const jacket = JACKETS.some(j => j.id === raw.jacket) ? raw.jacket : null;
  const accessory = ACCESSORIES.includes(raw.accessory) ? raw.accessory : null;
  if (!hair || !jacket || !accessory) return null;
  return { hair, jacket, accessory };
}

export function presetFor(characterId) {
  return { ...(AVATAR_PRESETS[characterId] || AVATAR_PRESETS.cobalt) };
}

if (typeof window !== "undefined") {
  window.AvatarLook = { normalizeAvatarLook, presetFor, HAIR, JACKETS, ACCESSORIES, AVATAR_PRESETS };
}
