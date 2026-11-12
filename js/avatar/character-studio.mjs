import {
  loadAvatarCatalog,
  defaultAvatarConfig,
  validateAvatarConfig,
  buildLookFromConfig,
  randomizeConfig,
  summaryLine,
  meshIdFromConfig
} from "./avatar-catalog.mjs";

let config = defaultAvatarConfig();
let catalog = null;
let onChangePreview = null;
let onConfirmCb = null;

function L(obj) {
  const lang = typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
  if (!obj) return "";
  return obj[lang] || obj.en || obj.ru || "";
}

function tt(key, fb) {
  return typeof window.t === "function" ? window.t(key) : fb;
}

function sectionOptions(list, selected, field, multi = false) {
  const accSet = multi ? new Set(config.accessories || []) : null;
  return (list || [])
    .map(row => {
      const isSel = multi ? accSet.has(row.id) : row.id === selected;
      return `<button type="button" class="studio-pick${isSel ? " selected" : ""}" data-field="${field}" data-id="${row.id}">${L(row.label)}</button>`;
    })
    .join("");
}

function renderStudio(root) {
  if (!root || !catalog) return;
  const summary = summaryLine(config, typeof window.getLanguage === "function" ? window.getLanguage() : "ru");
  root.innerHTML = `
    <div class="character-studio" data-testid="character-studio">
      <h3 class="studio-title">${tt("studio_title", "Character Studio")}</h3>
      <label class="studio-label">${tt("studio_hero_name", "Hero name")}
        <input type="text" id="heroNameInput" data-testid="hero-name-input" maxlength="24" value="${escapeHtml(config.name || "")}" placeholder="${escapeHtml(tt("studio_name_ph", "Name"))}" />
      </label>
      <div class="studio-section"><b>${tt("studio_hair", "Hair")}</b><div class="studio-row">${sectionOptions(catalog.hairStyles, config.hairStyle, "hairStyle")}</div></div>
      <div class="studio-section"><b>${tt("studio_skin", "Skin tone")}</b><div class="studio-row studio-row-scroll">${sectionOptions(catalog.skinTones, config.skinTone, "skinTone")}</div></div>
      <div class="studio-section"><b>${tt("studio_hair_color", "Hair color")}</b><div class="studio-row studio-row-scroll">${sectionOptions(catalog.hairColors, config.hairColor, "hairColor")}</div></div>
      <div class="studio-section"><b>${tt("studio_body", "Body")}</b><div class="studio-row">${sectionOptions(catalog.bodyPresets, config.bodyPreset, "bodyPreset")}</div></div>
      <div class="studio-section"><b>${tt("studio_style", "Outfit style")}</b><div class="studio-row">${sectionOptions(catalog.clothingStyles, config.outfitStyle, "outfitStyle")}</div></div>
      <div class="studio-section"><b>${tt("studio_accessories", "Accessories")}</b><div class="studio-row studio-row-scroll">${sectionOptions(catalog.accessories, config.accessories?.[0], "accessoryToggle", true)}</div></div>
      <div class="studio-section"><b>${tt("studio_companion", "Companion Angelina (story)")}</b><div class="studio-row">${
        (catalog.companionAngelinaSkins || ["A", "B", "C"])
          .map(
            id =>
              `<button type="button" class="studio-pick studio-companion${id === config.companionAngelinaSkin ? " selected" : ""}" data-field="companionAngelinaSkin" data-id="${id}">Angelina ${id}</button>`
          )
          .join("")
      }</div></div>
      <p class="studio-summary" data-testid="studio-summary">${tt("studio_your_hero", "Your hero")}: ${escapeHtml(summary)}</p>
      <div class="studio-actions">
        <button type="button" class="btn secondary" id="studioRandom" data-testid="studio-random">${tt("studio_random", "Randomize")}</button>
        <button type="button" class="btn" id="studioConfirm" data-testid="character-studio-confirm">${tt("studio_use_hero", "Use as test hero")}</button>
      </div>
    </div>`;
  root.querySelectorAll(".studio-pick").forEach(btn => {
    btn.onclick = () => {
      const field = btn.dataset.field;
      const id = btn.dataset.id;
      if (field === "accessoryToggle") {
        const set = new Set(config.accessories || []);
        if (id === "acc_none") set.clear();
        else if (set.has(id)) set.delete(id);
        else set.add(id);
        config.accessories = [...set];
      } else {
        config[field] = id;
      }
      renderStudio(root);
      emitPreview();
    };
  });
  root.querySelector("#heroNameInput")?.addEventListener("input", e => {
    config.name = String(e.target.value || "").trim().slice(0, 24);
  });
  root.querySelector("#studioRandom")?.addEventListener("click", () => {
    config = randomizeConfig(config, catalog);
    renderStudio(root);
    emitPreview();
  });
  root.querySelector("#studioConfirm")?.addEventListener("click", () => {
    const nameInput = document.getElementById("heroNameInput");
    config.name = String(nameInput?.value || config.name || "").trim().slice(0, 24);
    const val = validateAvatarConfig(config, catalog);
    if (!val.ok) return;
    try {
      localStorage.setItem("punkme_avatar_v1", JSON.stringify(config));
    } catch (_) {}
    const payload = { ...config, meshId: meshIdFromConfig(config, catalog) };
    onConfirmCb?.(payload);
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emitPreview() {
  const meshId = meshIdFromConfig(config, catalog);
  const look = buildLookFromConfig(config, catalog);
  onChangePreview?.(meshId, look);
}

export async function mountCharacterStudio(container, { onPreview, onConfirm }) {
  catalog = await loadAvatarCatalog();
  window.__punkAvatarCatalog = catalog;
  onChangePreview = onPreview;
  onConfirmCb = onConfirm;
  try {
    const stored = localStorage.getItem("punkme_avatar_v1");
    if (stored) config = { ...defaultAvatarConfig(), ...JSON.parse(stored) };
  } catch (_) {}
  const v = validateAvatarConfig(config, catalog);
  if (!v.ok) config = defaultAvatarConfig();
  renderStudio(container);
  emitPreview();
  return {
    getConfig: () => ({ ...config }),
    confirm: () => {
      const nameInput = document.getElementById("heroNameInput");
      config.name = String(nameInput?.value || config.name || "").trim().slice(0, 24);
      const val = validateAvatarConfig(config, catalog);
      if (!val.ok) return null;
      try {
        localStorage.setItem("punkme_avatar_v1", JSON.stringify(config));
      } catch (_) {}
      return { ...config, meshId: meshIdFromConfig(config, catalog) };
    }
  };
}
