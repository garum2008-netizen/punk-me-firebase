/**
 * Room pieces and Pumpkingrad plots. A purchase spends coins and leaves a mesh.
 */

const ROOM_ITEMS = [
  { id: "lamp", type: "lamp", cost: 15, x: 2.35, z: -1.6 },
  { id: "poster", type: "poster", cost: 20, x: 2.1, z: -1.4 },
  { id: "neon_arch", type: "neon_sign", cost: 500, x: 0, z: 1.6 }
];

export const CITY_PLOTS = [
  { id: "gate", kind: "arch", cost: 30, x: -4.2, z: 2.2 },
  { id: "stall", kind: "stall", cost: 45, x: 0.2, z: 3.1 },
  { id: "crypt", kind: "crypt", cost: 35, x: 4.1, z: 1.4 }
];

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function me() {
  return window.me;
}

function chapterAllows(stepId) {
  const ob = me()?.onboarding;
  if (!ob) return false;
  if (ob.done) return true;
  return window.Onboarding?.stepId?.() === stepId;
}

function paint() {
  const host = document.getElementById("chapterBuild");
  const player = me();
  if (!host || !player) return;
  const loc = player.location;
  if (loc !== "room" && loc !== "city") {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  host.hidden = false;
  if (loc === "room") {
    host.innerHTML = `<b>${t("build_room_title")}</b>` + ROOM_ITEMS.map(item =>
      `<button type="button" class="btn secondary" id="buy-${item.id}" data-decor="${item.id}">${t("build_" + item.id)} · ${item.cost}</button>`
    ).join("");
  } else {
    window.World3D?.ensurePlotPads?.(CITY_PLOTS);
    host.innerHTML = `<b>${t("build_city_title")}</b>` + CITY_PLOTS.map(plot => {
      const owned = (player.cityPlots || []).some(p => p.id === plot.id);
      return `<button type="button" class="btn secondary" id="buyPlot-${plot.id}" data-plot="${plot.id}" ${owned ? "disabled" : ""}>${t("plot_" + plot.id)} · ${plot.cost}</button>`;
    }).join("");
  }
  host.querySelectorAll("[data-decor]").forEach(btn => {
    btn.onclick = () => buyDecor(btn.getAttribute("data-decor"));
  });
  host.querySelectorAll("[data-plot]").forEach(btn => {
    btn.onclick = () => buyPlot(btn.getAttribute("data-plot"));
  });
}

function buyDecor(id) {
  const item = ROOM_ITEMS.find(row => row.id === id);
  const player = me();
  if (!item || !player) return;
  if (player.location !== "room" || !chapterAllows("room_decor") || player.coins < item.cost) {
    window.AngelinaVoice?.mistake?.();
    return;
  }
  player.coins -= item.cost;
  const placed = window.World3D?.placeRoomPiece?.(item.type, item.x, item.z, true);
  if (!placed) {
    player.coins += item.cost;
    window.AngelinaVoice?.mistake?.();
    return;
  }
  window.Onboarding?.onRoomDecor?.();
  window.saveMe?.();
  document.getElementById("coins").textContent = player.coins;
  paint();
}

function buyPlot(id) {
  const plot = CITY_PLOTS.find(row => row.id === id);
  const player = me();
  if (!plot || !player) return;
  if ((player.cityPlots || []).some(row => row.id === id)) return;
  if (player.location !== "city" || !chapterAllows("city_build") || player.coins < plot.cost) {
    window.AngelinaVoice?.mistake?.();
    return;
  }
  player.coins -= plot.cost;
  const placed = window.World3D?.placeCityPlot?.(plot, true);
  if (!placed) {
    player.coins += plot.cost;
    window.AngelinaVoice?.mistake?.();
    return;
  }
  window.Onboarding?.onCityBuild?.();
  window.saveMe?.();
  document.getElementById("coins").textContent = player.coins;
  paint();
}

export function refreshBuildUi() {
  paint();
}

if (typeof window !== "undefined") {
  window.ChapterBuild = { refresh: refreshBuildUi, CITY_PLOTS, ROOM_ITEMS };
}
