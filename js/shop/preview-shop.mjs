import { createParentChallenge, verifyParentGate, mintParentGateSession, hasParentGateSession } from "./parent-gate.mjs";
import { applyPreviewCheckoutReturn, hasPreviewIapItem, loadPreviewIapOwned } from "./preview-iap-storage.mjs";

const CHECKOUT_UNAVAILABLE = "Тестовые платежи недоступны";
let catalogItems = null;

async function loadCatalog() {
  if (catalogItems) return catalogItems;
  const r = await fetch("data/story/preview-iap-catalog.json", { cache: "no-store" });
  const data = await r.json();
  catalogItems = data.items || {};
  return catalogItems;
}

let challenge = null;
let gateOpen = false;

function L(obj) {
  const lang = window.currentLang?.() || "ru";
  return obj[lang] || obj.ru || obj.en || "";
}

function ensureGateModal() {
  let el = document.getElementById("previewParentGateModal");
  if (el) return el;
  el = document.createElement("div");
  el.id = "previewParentGateModal";
  el.className = "modal preview-parent-gate-modal";
  el.innerHTML = `
    <button type="button" class="close" id="previewParentGateClose">✕</button>
    <h2 data-testid="preview-parent-gate-title">${L({ ru: "Покупка с согласия взрослого", en: "Purchase with adult consent" })}</h2>
    <p class="preview-parent-gate-note">${L({
      ru: "Косметика за реальные деньги — только тест Stripe. Мы не собираем персональные данные.",
      en: "Real-money cosmetics — Stripe TEST only. We collect no personal data."
    })}</p>
    <label class="preview-parent-gate-check"><input type="checkbox" id="previewAgeGate"> ${L({
      ru: "Мне 13+ лет",
      en: "I am 13+"
    })}</label>
    <label class="preview-parent-gate-check"><input type="checkbox" id="previewAdultGate"> ${L({
      ru: "Рядом взрослый (родитель/опекун)",
      en: "An adult (parent/guardian) is present"
    })}</label>
    <p id="previewParentChallengeLabel" class="preview-parent-challenge"></p>
    <input id="previewParentChallengeAnswer" inputmode="numeric" autocomplete="off" placeholder="${L({
      ru: "Ответ",
      en: "Answer"
    })}" />
    <p id="previewParentGateError" class="preview-parent-gate-error" hidden></p>
    <button type="button" class="btn" id="previewParentGateContinue">${L({ ru: "Продолжить", en: "Continue" })}</button>
  `;
  document.body.appendChild(el);
  el.querySelector("#previewParentGateClose").onclick = () => closeParentGateModal();
  return el;
}

function closeParentGateModal() {
  gateOpen = false;
  document.getElementById("previewParentGateModal")?.classList.remove("active");
}

function openParentGateModal(onSuccess) {
  const modal = ensureGateModal();
  challenge = createParentChallenge();
  modal.querySelector("#previewParentChallengeLabel").textContent = L(challenge.prompt);
  modal.querySelector("#previewParentChallengeAnswer").value = "";
  modal.querySelector("#previewAgeGate").checked = false;
  modal.querySelector("#previewAdultGate").checked = false;
  const err = modal.querySelector("#previewParentGateError");
  err.hidden = true;
  err.textContent = "";
  modal.classList.add("active");
  gateOpen = true;
  modal.querySelector("#previewParentGateContinue").onclick = () => {
    const result = verifyParentGate({
      ageConfirmed: modal.querySelector("#previewAgeGate").checked,
      adultConfirmed: modal.querySelector("#previewAdultGate").checked,
      userAnswer: modal.querySelector("#previewParentChallengeAnswer").value,
      challenge
    });
    if (!result.ok) {
      err.hidden = false;
      err.textContent = L({
        ru: "Нужны галочки 13+ и взрослый рядом, а также верный ответ.",
        en: "Confirm 13+, adult present, and correct answer."
      });
      return;
    }
    mintParentGateSession();
    closeParentGateModal();
    onSuccess?.();
  };
}

async function startTestCheckout(itemId) {
  const items = await loadCatalog();
  const item = items[itemId];
  if (!item) {
    window.toast?.(CHECKOUT_UNAVAILABLE);
    return;
  }
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      window.toast?.(data.message || CHECKOUT_UNAVAILABLE);
      return;
    }
    location.href = data.url;
  } catch (_) {
    window.toast?.(CHECKOUT_UNAVAILABLE);
  }
}

function renderPreviewPremiumGrid() {
  const grid = document.getElementById("shopGrid");
  if (!grid) return;
  loadCatalog().then(items => {
    const owned = loadPreviewIapOwned();
    grid.innerHTML = Object.values(items)
    .map(item => {
      const own = owned.includes(item.id) || hasPreviewIapItem(item.id);
      return `<div class="card preview-iap-card" data-testid="preview-iap-${item.id}">
      <div class="preview-iap-badge">${L({ ru: "Тест · Stripe", en: "Test · Stripe" })}</div>
      <div><b>${item.label}</b></div>
      <div class="price preview-iap-price">${item.priceLabel} · ${L({ ru: "разовая покупка", en: "one-time" })}</div>
      <button type="button" class="btn" ${own ? "disabled" : ""} data-iap-id="${item.id}">
        ${own ? L({ ru: "Куплено (preview)", en: "Owned (preview)" }) : L({ ru: "Купить (тест)", en: "Buy (test)" })}
      </button></div>`;
    })
    .join("");
    grid.querySelectorAll("[data-iap-id]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.iapId;
        if (hasPreviewIapItem(id)) return;
        const run = () => startTestCheckout(id);
        if (hasParentGateSession()) run();
        else openParentGateModal(run);
      };
    });
  });
}

export function initPreviewShop({ renderShop }) {
  if (window.__PUNK_PREVIEW__ !== true) return;

  const granted = applyPreviewCheckoutReturn();
  if (granted) {
    window.toast?.(
      L({ ru: `Тестовая покупка сохранена локально: ${granted}`, en: `Test purchase saved locally: ${granted}` })
    );
  }

  const tabs = document.querySelector("#shopModal .tabs");
  if (tabs && !document.getElementById("shopTabPremium")) {
    const tab = document.createElement("span");
    tab.className = "tab";
    tab.id = "shopTabPremium";
    tab.dataset.tab = "premium";
    tab.dataset.testid = "shop-tab-premium";
    tab.textContent = L({ ru: "Косметика €", en: "Cosmetics €" });
    tabs.appendChild(tab);
  }

  const note = document.getElementById("previewShopNote");
  if (note) note.hidden = false;

  window.__previewRenderShopHook = originalTab => {
    if (originalTab === "premium") {
      renderPreviewPremiumGrid();
      return true;
    }
    return false;
  };

  window.PreviewShop = {
    renderPremium: renderPreviewPremiumGrid,
    openParentGateModal,
    verifyParentGate,
    createParentChallenge
  };

  document.querySelectorAll("#shopModal .tab").forEach(t => {
    t.addEventListener("click", () => {
      if (t.dataset.tab === "premium") renderPreviewPremiumGrid();
    });
  });

  if (typeof renderShop === "function") {
    const prev = renderShop;
    window.renderShopWrapped = prev;
  }
}
