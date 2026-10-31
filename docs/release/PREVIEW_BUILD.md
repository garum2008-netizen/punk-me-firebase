# Cloudflare Pages preview build (Owner-approved closed preview)

**Not production.** Owner approved a closed free preview on Cloudflare Pages. **PUNK ME Game Bot** deploys after its own verification pass (this agent prepares the bundle only; no deploy from the agent run).

## Build

```bash
npm run build:preview
```

Output: `dist-preview/` (~144 files, ~50 MB — mostly GLB models).

## Runtime

- `window.__PUNK_PREVIEW__=true` — no Firebase SDK, no auth/RTDB/analytics.
- Saves: `localStorage` keys `punkme_preview_player_v1`, `punkme_preview_device_id`, `punkme_preview_lifeCh1_v1_*`.
- Banner: **PREVIEW — test build, progress saved only on this device**
- Life ch1 slice **ON** in preview only.
- Chat UI hidden; `sendChat` blocked.
- Production Firebase config stripped from bundled `js/game.js`; `owner-admin.mjs` excluded.

## Pages deploy (Game Bot)

1. Project output directory: `dist-preview`
2. Env vars: `PREVIEW_USER`, `PREVIEW_PASS` (Basic Auth via `functions/_middleware.js`; unset = 403 all)
3. `robots.txt`: `Disallow: /`
4. `index.html`: `<meta name="robots" content="noindex">`

## Verify locally

```bash
npm run test:preview-build
```

Asserts 0 production Firebase requests, no prod config strings in bundle, 390×844 slice + reload persistence (coins ×3 reload).
