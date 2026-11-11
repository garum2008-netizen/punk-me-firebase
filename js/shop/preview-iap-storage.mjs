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

function stripCheckoutQueryParams() {
  const q = new URLSearchParams(location.search);
  q.delete("previewCheckout");
  q.delete("session_id");
  q.delete("item");
  const next = `${location.pathname}${q.toString() ? "?" + q.toString() : ""}`;
  history.replaceState({}, "", next);
}

/** Grant only after server confirms Stripe session is paid + catalog item. */
export async function applyPreviewCheckoutReturn() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("previewCheckout") !== "success") return null;
    const sessionId = q.get("session_id");
    if (!sessionId) {
      stripCheckoutQueryParams();
      return null;
    }
    const res = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sessionId)}`, {
      cache: "no-store"
    });
    const data = await res.json().catch(() => ({}));
    stripCheckoutQueryParams();
    if (!res.ok || !data.paid || !data.itemId) return null;
    grantPreviewIapItem(data.itemId);
    return data.itemId;
  } catch (_) {
    stripCheckoutQueryParams();
    return null;
  }
}
