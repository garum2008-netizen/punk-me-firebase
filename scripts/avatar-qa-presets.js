/** t206u QA presets (shared Node + docs). */
const QA_CYBER_PUNK_BLUE = {
  avatarVersion: 1,
  qaPresetId: "cyber_punk_blue",
  name: "CyberBlueQA",
  skinTone: "tone_02",
  hairStyle: "hair_mohawk",
  hairColor: "electric_blue",
  facePreset: "face_04",
  bodyPreset: "body_mohawk",
  outfitStyle: "style_cyber_punk",
  accessories: ["wings_01"],
  companionAngelinaSkin: "A"
};

/** Five visibly distinct configs (diversity gate t206u). */
const DIVERSITY_QA_CONFIGS = [
  QA_CYBER_PUNK_BLUE,
  {
    avatarVersion: 1,
    name: "GothicAsh",
    skinTone: "tone_06",
    hairStyle: "hair_gothic_long",
    hairColor: "hc_purple",
    facePreset: "face_07",
    bodyPreset: "body_razor",
    outfitStyle: "style_dark_gothic",
    accessories: ["jewelry_01"],
    companionAngelinaSkin: "B"
  },
  {
    avatarVersion: 1,
    name: "StreetAngel",
    skinTone: "tone_03",
    hairStyle: "hair_street_crop",
    hairColor: "hc_coral",
    facePreset: "face_02",
    bodyPreset: "body_cobalt",
    outfitStyle: "style_street_angel",
    accessories: ["backpack_01", "headphones_01"],
    companionAngelinaSkin: "C"
  },
  {
    avatarVersion: 1,
    name: "FantasyTeal",
    skinTone: "tone_12",
    hairStyle: "hair_angel_waves",
    hairColor: "hc_teal",
    facePreset: "face_06",
    bodyPreset: "body_tall",
    outfitStyle: "style_neon_rebel",
    accessories: ["aura_01"],
    companionAngelinaSkin: "A"
  },
  {
    avatarVersion: 1,
    name: "RainbowCompact",
    skinTone: "tone_01",
    hairStyle: "hair_rainbow",
    hairColor: "hc_multicolor",
    facePreset: "face_08",
    bodyPreset: "body_compact",
    outfitStyle: "style_punk_classic",
    accessories: ["glasses_01"],
    companionAngelinaSkin: "B"
  },
  {
    avatarVersion: 1,
    name: "NeonWolf",
    skinTone: "tone_05",
    hairStyle: "hair_neon_wolf",
    hairColor: "hc_magenta",
    facePreset: "face_05",
    bodyPreset: "body_vienna",
    outfitStyle: "style_cyber_punk",
    accessories: ["hat_01"],
    companionAngelinaSkin: "C"
  }
];

function lookSignature(cfg) {
  return [
    cfg.skinTone,
    cfg.hairStyle,
    cfg.hairColor,
    cfg.bodyPreset,
    cfg.outfitStyle,
    (cfg.accessories || []).slice().sort().join("+")
  ].join("|");
}

function assertDiversityDistinct(configs) {
  const sigs = new Set(configs.map(lookSignature));
  if (sigs.size < 6) {
    throw new Error(`diversity: need 6 distinct looks, got ${sigs.size}`);
  }
}

module.exports = { QA_CYBER_PUNK_BLUE, DIVERSITY_QA_CONFIGS, lookSignature, assertDiversityDistinct };
