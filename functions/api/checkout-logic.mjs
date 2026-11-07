/** Stripe checkout (TEST keys only) — shared by Pages Function + unit tests. */
import catalog from "../../data/story/preview-iap-catalog.json" with { type: "json" };

export const CHECKOUT_TEST_UNAVAILABLE_RU = "Тестовые платежи недоступны";

export const PREVIEW_IAP_CATALOG = catalog.items;

export function getCatalogItem(itemId) {
  return PREVIEW_IAP_CATALOG[itemId] || null;
}

export function assertStripeTestSecretKey(secretKey) {
  if (!secretKey || typeof secretKey !== "string") {
    return { ok: false, status: 503, error: "missing_key", message: CHECKOUT_TEST_UNAVAILABLE_RU };
  }
  if (!secretKey.startsWith("sk_test_")) {
    return { ok: false, status: 403, error: "live_forbidden", message: CHECKOUT_TEST_UNAVAILABLE_RU };
  }
  return { ok: true };
}

export function parseCheckoutBody(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, error: "bad_json" };
  const itemId = String(raw.itemId || "").trim();
  if (!itemId || itemId.length > 64) return { ok: false, error: "bad_item" };
  return { ok: true, itemId };
}

export async function createStripeTestCheckoutSession({ secretKey, itemId, origin, catalogItem }) {
  const gate = assertStripeTestSecretKey(secretKey);
  if (!gate.ok) return gate;

  const priceCents = catalogItem?.priceCents;
  const label = catalogItem?.label || itemId;
  if (!Number.isFinite(priceCents) || priceCents < 50 || priceCents > 50000) {
    return { ok: false, status: 400, error: "bad_price" };
  }

  const base = (origin || "").replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${base}/?previewCheckout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${base}/?previewCheckout=cancel`);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", catalogItem.currency || "eur");
  params.append("line_items[0][price_data][unit_amount]", String(priceCents));
  params.append("line_items[0][price_data][product_data][name]", label);
  params.append("metadata[itemId]", itemId);
  params.append("metadata[preview]", "1");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: 502, error: "stripe_error", message: CHECKOUT_TEST_UNAVAILABLE_RU };
  }
  if (!data.url) {
    return { ok: false, status: 502, error: "no_url", message: CHECKOUT_TEST_UNAVAILABLE_RU };
  }
  return { ok: true, url: data.url, sessionId: data.id };
}

const SESSION_ID_RE = /^cs_test_[A-Za-z0-9]+$/;

export async function verifyStripeCheckoutSessionPaid({ secretKey, sessionId }) {
  const gate = assertStripeTestSecretKey(secretKey);
  if (!gate.ok) return gate;

  const sid = String(sessionId || "").trim();
  if (!SESSION_ID_RE.test(sid)) {
    return { ok: false, status: 400, error: "bad_session", paid: false };
  }

  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: 502, error: "stripe_error", paid: false };
  }

  const paid = data.payment_status === "paid";
  const itemId = data.metadata?.itemId ? String(data.metadata.itemId) : "";
  const catalogItem = itemId ? getCatalogItem(itemId) : null;
  if (!paid || !catalogItem || data.metadata?.preview !== "1") {
    return { ok: true, paid: false, itemId: null, payment_status: data.payment_status || "unknown" };
  }
  return { ok: true, paid: true, itemId, payment_status: data.payment_status };
}
