# PUNK ME — dual-platform architecture (WEB + ROBLOX)

**Status:** recommendation document (MASTER TZ §9, TASK 07).  
**Owner:** Inna. **No file moves or repo splits in this doc alone.**

## 1. Product split

| Dimension | PUNK ME WEB | PUNK ME ROBLOX |
|-----------|-------------|----------------|
| Runtime | Browser (Three.js / `world3d.mjs`) | Roblox Studio / Luau |
| Auth | Firebase Auth (Google; email/password optional) | Roblox platform identity |
| Saves | Firebase Realtime Database `players/{uid}` | DataStoreService (per experience) |
| Payments | Web subscription / future Stripe (owner-controlled) | Roblox Developer Products / passes (Robux) |
| UI | HTML/CSS + in-canvas HUD | Roblox ScreenGui + ProximityPrompt |
| Canon | **Shared** — story, characters, location names | **Shared** — same bible, Roblox-adapted UX |

**Hard rules (TZ §9, §13):**

- Do **not** use Firebase Auth as Roblox login.
- Do **not** share coin balance, inventory, or paid entitlements across platforms without a separate approved integration project.
- Progress on WEB and ROBLOX remains **independent** unless Inna approves a future bridge.

## 2. What is shared vs platform-specific

### Shared (single source of truth)

- Brand, character bible (`docs/CHARACTERS.md`, `imagine_images/` posters).
- Story and quest design specs (`docs/game-design/`, approved canon only).
- Localization strings (export to Roblox `LocalizationTable` when ROBLOX ships).
- Licensed 3D **metadata** and version tags — not blind duplication of multi‑MB GLBs.

### WEB-only

- `js/`, `index.html`, Firebase config, `database.rules.json`, `owner.html`.
- Service worker / PWA (`manifest.json`, cache keyed by `GAME_VERSION`).
- Web-specific rendering, `meshy-punk.mjs`, procedural animation layers.

### ROBLOX-only

- Rojo project (`roblox/` — proposed), place files, Luau modules.
- Roblox rigs (Humanoid/R15 retarget), MeshPart import pipeline.
- Experience settings, maturity questionnaire, monetization products.

## 3. Resource catalog (versioned)

Proposed layout (logical, not yet enforced in CI):

```
shared/
  canon/           # story IDs, quest graph JSON (future)
  l10n/            # RU / EN / DA source strings (future extract from web i18n)
  assets-manifest.json   # GLB id, sha256, license, tri count, Roblox-ready flag
```

WEB continues to serve binaries from `assets/` and `imagine_images/`.  
ROBLOX stores imported MeshParts in the experience or a private asset pack; manifest links WEB `assets/models/meshy/*.glb` → Roblox asset id after import.

## 4. Git structure — recommendation

**Recommended: monorepo with isolated `roblox/` Rojo tree** (same GitHub repo `punk-me-firebase`).

```
punk-me-firebase/
  js/ …                    # WEB (unchanged)
  assets/ …                # WEB 3D + audio
  docs/
    architecture/          # this file
    roblox/                # ROBLOX_PLAN.md
  roblox/                  # NEW — Rojo default.project.json, src/, tests/
  database.rules.json      # WEB only
```

**Why monorepo**

- One issue/PR trail for MASTER TZ tasks.
- Shared docs and `assets-manifest` without submodule drift.
- Cloud agents can edit Luau + docs in one PR; Studio binary place still opened by Inna locally.

**Alternative: separate repo `punk-me-roblox`**

- Use if Roblox collaborators must not see Firebase rules or web secrets.
- Cost: duplicate CI, manual manifest sync, two PR workflows.

**Explicit non-goals**

- No `git filter-repo` or history rewrite.
- No moving `js/` or `assets/` into `roblox/` in TASK 07.

## 5. CI and testing (target state)

| Platform | Automated (agent-friendly) | Requires human / Studio |
|----------|---------------------------|-------------------------|
| WEB | `npm run test:loading`, `test:accounts`, `node scripts/smoke-check.js`, Playwright QA PNGs | Safari real device, payment flows |
| ROBLOX | Rojo build, Luau type check / TestService scripts (future) | Studio playtest, import, publish, maturity form |

## 6. Release and environments

- **WEB production:** `https://halloween.punk.contractbot.dk` — deploy only with written OK (TZ §17).
- **ROBLOX:** private/unlisted place until MVP sign-off; no public discovery without OK.
- Staging: continue using `?solo=1`, version query `v=living3d-*`, or owner-approved Firebase project if split later.

## 7. Security boundary

- WEB secrets: Firebase web API key (public by design), **no** service account in client.
- Admin: move from client email checks to Custom Claims (TASK 02).
- ROBLOX: use standard DataStore keying per `UserId`; no RTDB credentials in Luau.

## 8. Related work

- Audit: `docs/audit/MASTER_AUDIT_2026-10-24.md`
- Roblox plan: `docs/roblox/ROBLOX_PLAN.md`
- GitHub: TASK 07 — issue #21; TASK 08 — issue #23
