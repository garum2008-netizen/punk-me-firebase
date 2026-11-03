# Cloudflare Pages preview build (Owner-approved closed preview)

**Not production.** Owner approved a closed free preview on Cloudflare Pages. **PUNK ME Game Bot** deploys after its own verification pass (this agent prepares the bundle only; no deploy from the agent run).

## Build

```bash
npm run build:preview
```

Output: `dist-preview/` static assets only (~144 files). **Do not** put `functions/` inside `dist-preview/` — that would expose worker source as static files.

## Runtime

- `window.__PUNK_PREVIEW__=true` — no Firebase SDK, no auth/RTDB/analytics.
- Saves: `localStorage` keys `punkme_preview_player_v1`, `punkme_preview_device_id`, `punkme_preview_lifeCh1_v1_*`.
- Banner: **PREVIEW — test build, progress saved only on this device**
- Life ch1 slice **ON** in preview only.
- Chat UI hidden; `sendChat` blocked.
- Production Firebase config stripped from bundled `js/game.js`; `owner-admin.mjs` excluded.

## Pages deploy (Game Bot)

1. **Build output directory:** `dist-preview` (static only)
2. **Functions directory:** repo-root `functions/` ( `_middleware.js`, `api/checkout.js`, etc.) — configured automatically when deploying from the repository root.
3. Env vars: `PREVIEW_USER`, `PREVIEW_PASS` (Basic Auth via `functions/_middleware.js`; unset = 403 all)
4. Optional: `STRIPE_SECRET_KEY` must be `sk_test_…` for `/api/checkout` and `/api/checkout-status`
5. `robots.txt`: `Disallow: /`
6. `dist-preview/_headers`: `X-Robots-Tag: noindex, nofollow` (middleware also sets the header)

## Verify locally

```bash
npm run test:preview-build
npm run test:preview-wrangler
```

`test:preview-wrangler` runs `wrangler pages functions build`, asserts the bundle has no `createRequire`, then `wrangler pages dev dist-preview` and checks **401** without Basic Auth and **200** with test creds.

Asserts 0 production Firebase requests, no prod config strings in bundle, 390×844 slice + reload persistence (coins ×3 reload).
