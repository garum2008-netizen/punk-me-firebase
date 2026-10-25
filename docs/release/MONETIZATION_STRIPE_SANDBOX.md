# Монетизация — подготовка (sandbox only, без live-списаний)

**Статус:** подготовка в ветке `cursor/scenario-preview-d81d`. Кнопка Subscribe на production **отключена**. История проходится **без покупки**.

## Провайдер

В репозитории **нет** подключённого Stripe/Paddle/Lemon. По типу продукта (€4.99/мес, EU, 13+) рекомендуется **Stripe Billing** (Checkout + Customer Portal).

### Нужно от владельца (до live)

| Что | Зачем |
|-----|--------|
| Stripe account (EU) | Merchant of record |
| Product + Price `price_…` 4.99 EUR / month | Checkout |
| Webhook signing secret | `STRIPE_WEBHOOK_SECRET` в Cloud Functions / Worker |
| Реквизиты продавца (CVR, адрес, юрлицо) | Terms §Seller — в репо помечены `[OWNER: legal entity]` |
| Решение: Firebase Extension vs свой Worker | См. `functions/stripe-sandbox/README.md` |

Секреты **не** коммитить; только Secret Manager / Firebase env.

## Серверная модель

1. Клиент **никогда** не пишет `premium` (правило в `database.rules.json`: только `auth.token.admin`).
2. После оплаты webhook выставляет `players/{uid}/premium: true`, `premiumUntil`, `stripeCustomerId` (admin SDK).
3. Клиент читает `premium` только для UI (скины/бонусы), не для сюжета.

## Sandbox

- Stripe Test mode keys в `.env.local` (не в git).
- `subscribe.html` кнопка: `data-stripe-mode="test"` + feature flag `PUNK_STRIPE_TEST=1` на preview host only.
- E2E: Stripe CLI `stripe listen --forward-to localhost:5001/webhook`.

## Черновики → рабочие

- `terms.html`, `privacy.html` — без пометки Draft (v2026-10-25).
- `subscribe-i18n.js` — ссылки без «(черновик)».
