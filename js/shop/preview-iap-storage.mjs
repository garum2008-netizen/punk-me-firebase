/**
 * Preview-only real-money cosmetics (local grant, separate from Firebase save).
 */
const IAP_KEY = "punkme_preview_iap_owned_v1";

export function loadPreviewIapOwned() {
  try {
    const raw = localStorage.getItem(IAP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === "string") : [];
  } catch (_) {
    return [];
  }
}

export function savePreviewIapOwned(ids) {
  try {
    localStorage.setItem(IAP_KEY, JSON.stringify([...new Set(ids)]));
    return true;
  } catch (_) {
    return false;
  }
}

export function grantPreviewIapItem(itemId) {
  const ids = loadPreviewIapOwned();
  if (!ids.includes(itemId)) ids.push(itemId);
  savePreviewIapOwned(ids);
  return ids;
}

export function hasPreviewIapItem(itemId) {
  return loadPreviewIapOwned().includes(itemId);
}

export function applyPreviewCheckoutReturn() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("previewCheckout") !== "success") return null;
    const itemId = q.get("item");
    if (!itemId) return null;
    grantPreviewIapItem(itemId);
    q.delete("previewCheckout");
    q.delete("item");
    const next = `${location.pathname}${q.toString() ? "?" + q.toString() : ""}`;
    history.replaceState({}, "", next);
    return itemId;
  } catch (_) {
    return null;
  }
}
