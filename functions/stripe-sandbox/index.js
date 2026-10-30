/**
 * Stripe Checkout + webhook (SANDBOX ONLY). Deploy separately; set secrets in host env — never in client/repo.
 * Sets players/{uid}/premium via Admin SDK after checkout.session.completed (test mode).
 */
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PRICE_ID = process.env.STRIPE_PRICE_ID;

exports.createCheckoutSession = async (req, res) => {
  if (!STRIPE_SECRET || !PRICE_ID) {
    res.status(503).json({ error: "stripe_not_configured" });
    return;
  }
  if (STRIPE_SECRET.startsWith("sk_live_")) {
    res.status(403).json({ error: "live_keys_blocked" });
    return;
  }
  const stripe = require("stripe")(STRIPE_SECRET);
  const uid = req.body?.uid;
  if (!uid) {
    res.status(400).json({ error: "uid_required" });
    return;
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    success_url: req.body?.successUrl || "https://localhost/subscribe.html?paid=1",
    cancel_url: req.body?.cancelUrl || "https://localhost/subscribe.html?cancel=1",
    client_reference_id: uid,
    metadata: { firebaseUid: uid }
  });
  res.json({ url: session.url, id: session.id });
};

exports.stripeWebhook = async (req, res) => {
  if (!STRIPE_SECRET || !WEBHOOK_SECRET) {
    res.status(503).send("not_configured");
    return;
  }
  const stripe = require("stripe")(STRIPE_SECRET);
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const uid = session.metadata?.firebaseUid || session.client_reference_id;
    if (uid) {
      await admin.database().ref(`players/${uid}/premium`).set({
        active: true,
        plan: "monthly_499",
        stripeSession: session.id,
        updatedAt: Date.now(),
        sandbox: true
      });
    }
  }
  res.json({ received: true });
};
