/** Saved player look: hair, skin, clothes, and one accessory on the existing body. */

export const HAIR = [
  { id: "cyan", color: 0x33bbff },
  { id: "pink", color: 0xff3399 },
  { id: "lime", color: 0x66ff22 },
  { id: "violet", color: 0xaa44ff }
];

export const HAIR_STYLES = ["bob", "mohawk", "pigtails", "spikes"];

export const SKINS = [
  { id: "porcelain", color: 0xffd2b8 },
  { id: "tan", color: 0xc68642 },
  { id: "brown", color: 0x6b3e26 },
  { id: "cyber", color: 0x9fdfff }
];

export const JACKETS = [
  { id: "night", color: 0x1a4a62 },
  { id: "magenta", color: 0xc41878 },
  { id: "olive", color: 0x3d7a22 },
  { id: "ink", color: 0x2a2a38 },
  { id: "cyber", color: 0x1aa0ff }
];

export const ACCESSORIES = ["chain", "choker", "spikes", "wings"];

export const CYBER_BLUE = {
  hair: "cyan",
  hairStyle: "spikes",
  skin: "cyber",
  jacket: "cyber",
  accessory: "wings"
};

/** Warm skin, blue mohawk, cyber jacket, wings. A selectable test look, not a new character. */
export const WARM_CREW = {
  hair: "cyan",
  hairStyle: "mohawk",
  skin: "tan",
  jacket: "cyber",
  accessory: "wings"
};

export const AVATAR_PRESETS = {
  cobalt: { hair: "cyan", hairStyle: "pigtails", skin: "porcelain", jacket: "night", accessory: "spikes" },
  vienna: { hair: "pink", hairStyle: "mohawk", skin: "tan", jacket: "magenta", accessory: "choker" },
  mohawk: { hair: "lime", hairStyle: "mohawk", skin: "brown", jacket: "olive", accessory: "spikes" },
  razor: { hair: "violet", hairStyle: "spikes", skin: "porcelain", jacket: "ink", accessory: "chain" }
};

export function normalizeAvatarLook(raw) {
  if (!raw || typeof raw !== "object") return null;
  const hair = HAIR.some(h => h.id === raw.hair) ? raw.hair : null;
  const jacket = JACKETS.some(j => j.id === raw.jacket) ? raw.jacket : null;
  const accessory = ACCESSORIES.includes(raw.accessory) ? raw.accessory : null;
  if (!hair || !jacket || !accessory) return null;
  return {
    hair,
    hairStyle: HAIR_STYLES.includes(raw.hairStyle) ? raw.hairStyle : "bob",
    skin: SKINS.some(s => s.id === raw.skin) ? raw.skin : "porcelain",
    jacket,
    accessory
  };
}

export function isCyberBlue(look) {
  const n = normalizeAvatarLook(look);
  if (!n) return false;
  return n.hair === CYBER_BLUE.hair
    && n.hairStyle === CYBER_BLUE.hairStyle
    && n.skin === CYBER_BLUE.skin
    && n.jacket === CYBER_BLUE.jacket
    && n.accessory === CYBER_BLUE.accessory;
}

export function presetFor(characterId) {
  return { ...(AVATAR_PRESETS[characterId] || AVATAR_PRESETS.cobalt) };
}

if (typeof window !== "undefined") {
  window.AvatarLook = {
    normalizeAvatarLook,
    presetFor,
    isCyberBlue,
    HAIR,
    HAIR_STYLES,
    SKINS,
    JACKETS,
    ACCESSORIES,
    AVATAR_PRESETS,
    CYBER_BLUE,
    WARM_CREW
  };
}
