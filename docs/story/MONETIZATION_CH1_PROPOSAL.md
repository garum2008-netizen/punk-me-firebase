# Chapter 1 — Monetization design (proposal only, t203u)

**Not approved for production.** No real payments, no prod checkout (`preview-shop` stub only).

## Owner recommendation

Hybrid: **free Ch1 story** + **optional cosmetics / later chapters** (scenario B + selective scenario A).

## Scenario A — Paid continuations (indicative prices)

| SKU | Indicative | Notes |
|-----|------------|-------|
| Chapter 2 | €2.99 | Story unlock |
| Chapter 3 | €2.99 | |
| Season 1 bundle | €7.99 | Ch2–5 |

**Hard rule:** Ch1 ending, crypt, core resources **never** paywalled.

## Scenario B — Cosmetics (no gameplay advantage)

| Item | Indicative | Gate |
|------|------------|------|
| Wings skin | €1.99 | Parent gate |
| Costume pack | €2.99 | Parent gate |
| Companion cosmetic | €1.99 | Parent gate |

Existing: `js/shop/parent-gate.mjs`, `preview-iap-catalog.json` (preview).

## Kids / teens compliance (EU)

- **Parental gating** before any purchase UI (`parent-gate`).  
- **DSA / GDPR-K:** no dark patterns; clear price; age-appropriate copy.  
- **Receipt / account:** preview uses local storage; prod would need lawful basis + DPA.

## Technical (preview)

| Piece | Status |
|-------|--------|
| Shop modal | Onboarding step 6 |
| Checkout API | `functions/api/checkout` — **503** on live preview |
| IAP catalog | `data/story/preview-iap-catalog.json` |

## Shop screen (preview)

Route: in-game **Shop** button → `#shopModal` → `preview-shop.mjs`.  
Cosmetics only in catalog; no “buy victory” SKUs.

## Principle

Pay because **what happens next** matters — not because the game blocked crypt or chapter end.
