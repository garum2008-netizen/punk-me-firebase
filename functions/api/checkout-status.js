/**
 * Confirm Stripe Checkout session before granting preview IAP locally.
 * GET /api/checkout-status?session_id=cs_test_...
 */
import {
  assertStripeTestSecretKey,
  verifyStripeCheckoutSessionPaid,
  CHECKOUT_TEST_UNAVAILABLE_RU
} from "./checkout-logic.mjs";

export async function onRequestGet(context) {
  const secretKey = context.env.STRIPE_SECRET_KEY;
  const keyCheck = assertStripeTestSecretKey(secretKey);
  if (!keyCheck.ok) {
    return json(keyCheck.status, {
      paid: false,
      error: keyCheck.error,
      message: keyCheck.message || CHECKOUT_TEST_UNAVAILABLE_RU
    });
  }

  const sessionId = new URL(context.request.url).searchParams.get("session_id");
  const result = await verifyStripeCheckoutSessionPaid({ secretKey, sessionId });
  if (!result.ok) {
    return json(result.status || 400, {
      paid: false,
      error: result.error,
      message: CHECKOUT_TEST_UNAVAILABLE_RU
    });
  }
  return json(200, {
    paid: !!result.paid,
    itemId: result.paid ? result.itemId : null,
    payment_status: result.payment_status
  });
}

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return json(405, { paid: false, error: "method_not_allowed" });
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
