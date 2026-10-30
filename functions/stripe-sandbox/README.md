# Stripe webhook (sandbox) — шаблон

Deploy **only** after owner enables live payments. Use Stripe **test** keys.

```
POST /webhook
  verify Stripe-Signature with STRIPE_WEBHOOK_SECRET
  on checkout.session.completed / invoice.paid:
    admin.database().ref(`players/${uid}`).update({
      premium: true,
      premiumUntil: period_end_ms,
      stripeCustomerId: customer
    })
```

UID mapping: `client_reference_id` or `metadata.firebaseUid` from Checkout Session.

Do not ship API secret to static hosting.
