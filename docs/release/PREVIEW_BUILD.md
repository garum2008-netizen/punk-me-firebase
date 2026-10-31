# Cloudflare Pages preview build (Owner-approved closed preview)

**Not production.** Inna deploys manually; agents do not deploy.

## Build

```bash
npm run build:preview
```

Output: `dist-preview/` (~144 files, ~49 MB — mostly GLB models).

## Runtime

- `window.__PUNK_PREVIEW__=true` — no Firebase SDK, no auth/RTDB/analytics.
- Saves: `localStorage` keys `punkme_preview_player_v1`, `punkme_preview_device_id`, `punkme_preview_lifeCh1_v1_*`.
- Banner: **PREVIEW — test build, progress saved only on this device**
- Life ch1 slice **ON** in preview only (`?lifeCh1Slice=1` not required).
- Chat UI hidden; `sendChat` blocked.

## Pages deploy

1. Project output directory: `dist-preview`
2. Env vars: `PREVIEW_USER`, `PREVIEW_PASS` (Basic Auth via `functions/_middleware.js`; unset = 403 all)
3. `robots.txt`: `Disallow: /`
4. `index.html`: `<meta name="robots" content="noindex">`

## Verify locally

```bash
npm run test:preview-build
```

Asserts 0 production Firebase requests, 390×844 slice + reload persistence.
