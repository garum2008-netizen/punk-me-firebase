/**
 * Data-driven avatar catalog (t204u). Maps config → Meshy procedural look.
 */
const CATALOG_URL = "data/story/avatar-catalog.json";
let catalog = null;

export async function loadAvatarCatalog() {
  if (catalog) return catalog;
  const r = await fetch(CATALOG_URL, { cache: "no-store" });
  catalog = await r.json();
  return catalog;
}

export function getCatalogSync() {
  return catalog;
}

function byId(list, id) {
  return list?.find(x => x.id === id) || null;
}

export function defaultAvatarConfig() {
  return {
    avatarVersion: 1,
    name: "",
    skinTone: "tone_08",
    hairStyle: "hair_mohawk",
    hairColor: "electric_blue",
    facePreset: "face_04",
    bodyPreset: "body_vienna",
    outfitStyle: "style_cyber_punk",
    accessories: ["wings_01"],
    companionAngelinaSkin: "A"
  };
}

export function validateAvatarConfig(cfg, cat = catalog) {
  if (!cfg || typeof cfg !== "object") return { ok: false, errors: ["missing"] };
  const errors = [];
  const c = cat || catalog;
  if (!c) return { ok: false, errors: ["catalog_not_loaded"] };
  if (!byId(c.skinTones, cfg.skinTone)) errors.push("skinTone");
  if (!byId(c.hairStyles, cfg.hairStyle)) errors.push("hairStyle");
  if (!byId(c.hairColors, cfg.hairColor)) errors.push("hairColor");
  if (!byId(c.facePresets, cfg.facePreset)) errors.push("facePreset");
  if (!byId(c.bodyPresets, cfg.bodyPreset)) errors.push("bodyPreset");
  if (!byId(c.clothingStyles, cfg.outfitStyle)) errors.push("outfitStyle");
  const acc = Array.isArray(cfg.accessories) ? cfg.accessories : [];
  for (const a of acc) {
    if (!byId(c.accessories, a)) errors.push(`accessory:${a}`);
  }
  return { ok: errors.length === 0, errors };
}

export function meshIdFromConfig(cfg, cat = catalog) {
  const body = byId(cat?.bodyPresets, cfg.bodyPreset);
  return body?.meshBase || "mohawk";
}

export function buildLookFromConfig(cfg, cat = catalog) {
  const c = cat || catalog;
  const skin = byId(c.skinTones, cfg.skinTone);
  const hair = byId(c.hairStyles, cfg.hairStyle);
  const hcol = byId(c.hairColors, cfg.hairColor);
  const style = byId(c.clothingStyles, cfg.outfitStyle);
  const body = byId(c.bodyPresets, cfg.bodyPreset);
  const acc = Array.isArray(cfg.accessories) ? cfg.accessories : [];
  let chain = false;
  let choker = false;
  let spikes = false;
  let emissive = style?.emissive ?? 0xff3399;
  for (const id of acc) {
    const a = byId(c.accessories, id);
    if (!a) continue;
    if (a.chain) chain = true;
    if (a.choker) choker = true;
    if (a.spikes) spikes = true;
    if (a.emissiveBoost) emissive = a.emissiveBoost;
  }
  return {
    scale: body?.scale ?? 1,
    hairStyle: hair?.meshyStyle || "mohawk",
    hair: hcol?.hex ?? 0x3399ff,
    jacket: style?.jacket ?? 0x2a0a28,
    pants: style?.pants ?? 0x180818,
    boots: style?.boots ?? 0x330022,
    emissive,
    tint: skin?.tint ?? 0xffbbaa,
    chain,
    choker,
    spikes
  };
}

export function randomizeConfig(cfg, cat = catalog) {
  const c = cat || catalog;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)]?.id;
  const out = { ...cfg };
  out.skinTone = pick(c.skinTones);
  out.hairStyle = pick(c.hairStyles);
  out.hairColor = pick(c.hairColors);
  out.facePreset = pick(c.facePresets);
  out.bodyPreset = pick(c.bodyPresets);
  out.outfitStyle = pick(c.clothingStyles);
  const accN = Math.floor(Math.random() * 3);
  out.accessories = [];
  for (let i = 0; i < accN; i++) {
    const a = pick(c.accessories.filter(x => x.id !== "acc_none"));
    if (a && !out.accessories.includes(a)) out.accessories.push(a);
  }
  return out;
}

export function summaryLine(cfg, lang, cat = catalog) {
  const L = id => {
    const c = cat || catalog;
    const lists = [c.skinTones, c.hairStyles, c.hairColors, c.clothingStyles, c.accessories];
    for (const list of lists) {
      const row = byId(list, id);
      if (row?.label) return row.label[lang] || row.label.en || id;
    }
    return id;
  };
  const acc = (cfg.accessories || []).filter(a => a !== "acc_none").map(a => L(a)).join(", ") || "—";
  return `${L(cfg.hairStyle)} · ${L(cfg.skinTone)} · ${L(cfg.outfitStyle)} · ${acc}`;
}

export function getPlayerAvatarLook(meState) {
  const cfg = (meState ?? (typeof globalThis !== "undefined" ? globalThis.me : undefined))?.avatarConfig;
  if (!cfg || !catalog) return null;
  const v = validateAvatarConfig(cfg);
  if (!v.ok) return null;
  return buildLookFromConfig(cfg);
}

if (typeof globalThis !== "undefined" && globalThis.window) {
  globalThis.getPlayerAvatarLook = () => getPlayerAvatarLook(globalThis.me);
  globalThis.meshIdFromAvatarConfig = cfg => meshIdFromConfig(cfg, catalog);
}
