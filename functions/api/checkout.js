/**
 * Cloudflare Pages Function — Stripe Checkout (TEST mode only).
 * Env: STRIPE_SECRET_KEY must start with sk_test_
 */
import {
  assertStripeTestSecretKey,
  createStripeTestCheckoutSession,
  getCatalogItem,
  parseCheckoutBody,
  CHECKOUT_TEST_UNAVAILABLE_RU
} from "./checkout-logic.mjs";

export async function onRequestPost(context) {
  const secretKey = context.env.STRIPE_SECRET_KEY;
  const keyCheck = assertStripeTestSecretKey(secretKey);
  if (!keyCheck.ok) {
    return json(keyCheck.status, { error: keyCheck.error, message: keyCheck.message || CHECKOUT_TEST_UNAVAILABLE_RU });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json(400, { error: "bad_json", message: CHECKOUT_TEST_UNAVAILABLE_RU });
  }

  const parsed = parseCheckoutBody(body);
  if (!parsed.ok) {
    return json(400, { error: parsed.error, message: CHECKOUT_TEST_UNAVAILABLE_RU });
  }

  const item = getCatalogItem(parsed.itemId);
  if (!item) {
    return json(404, { error: "unknown_item", message: CHECKOUT_TEST_UNAVAILABLE_RU });
  }

  const origin = new URL(context.request.url).origin;
  const session = await createStripeTestCheckoutSession({
    secretKey,
    itemId: parsed.itemId,
    origin,
    catalogItem: item
  });

  if (!session.ok) {
    return json(session.status || 503, {
      error: session.error || "checkout_failed",
      message: session.message || CHECKOUT_TEST_UNAVAILABLE_RU
    });
  }

  return json(200, { url: session.url, sessionId: session.sessionId });
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json(405, { error: "method_not_allowed" });
}

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
