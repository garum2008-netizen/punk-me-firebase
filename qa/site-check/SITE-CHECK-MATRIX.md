# Halloween site QA matrix (2025-10-25)

| Field | Live (production) | Preview (local fix branch) |
| --- | --- | --- |
| URL | https://halloween.punk.contractbot.dk | http://127.0.0.1:8765 |
| Site bundle | `living3d-v22r5-accounts-r1` (deployed main) | `living3d-v22r5-accounts-r1` + PR [#41](https://github.com/garum2008-netizen/punk-me-firebase/pull/41) (`8b1e282`) |
| OS | Linux (cloud agent VM) | same |
| Device | headless display via Xvfb, 1920×1080 | same |
| Browser | Chromium **156.0.8078.4** (Playwright) | same |
| WebGL | probe on page: **no** (SwiftShader session) | **yes** — SwiftShader `ANGLE (Vulkan SwiftShader)` |
| WebKit (Playwright) | **not run** (not real Safari) | **not run** |

| Scenario | Live | Preview | Notes |
| --- | --- | --- | --- |
| Organic new player → onboarding → first quest → reward | **not verified** | **not verified** | Recording used `?solo=1` + test hooks for char select; full story path still needed |
| Movement (WASD) | **works** (video) | **works** | Short sample in recording |
| E / talk | **works** (video) | **works** | No quest dialog assert |
| First job / reward | **not verified** | **not verified** | |
| saveMe + reload restores progress | **works** (`cobalt`, coins 100) | **works** | Harness-assisted fresh player |
| Music / voice / subtitles | **not verified** | **not verified** | No audio stem check in this pass |
| Volume / mute settings | **not verified** | **not verified** | |
| Mobile touch / on-screen buttons | **not verified** | **not verified** | Desktop viewport only |
| Google sign-in | **not tested** | **not tested** | No shared credentials |
| Multiplayer (2 tabs, online count) | **not tested** | **not tested** | |
| Presence write | **broken** | **see console** | Live log: `permission_denied` on `/presence/room/{uid}` → `Presence disabled: write` |
| publicProfiles write | **broken** (live log) | **not checked** | Live: `permission_denied` on `/publicProfiles/{uid}` |
| WebGL boot error UI (no save reset) | **not on live yet** | **in PR #41** | Live lacks `loading-screen.js`; fix not deployed |
| Console logs | `qa/site-check/logs/live-console.log` | `qa/site-check/logs/preview-console.log` | Keys redacted |

## Artifacts

- `live.mp4` — 1080p (video; **no audio track** captured in this Playwright pass)
- `preview.mp4` — 1080p (video; **no audio track**)
- `TIMECODES.md` — step timestamps

## Follow-up

1. Deploy PR #41 static bundle to preview hosting (not merge) and re-record with **organic** route (no `__punkApplyFirebaseSnapshot`).
2. Confirm live RTDB rules vs `database.rules.json` (presence + publicProfiles) before rule GO.
3. Re-run with real GPU or document SwiftShader; optional WebKit install for “not Safari” smoke only.
