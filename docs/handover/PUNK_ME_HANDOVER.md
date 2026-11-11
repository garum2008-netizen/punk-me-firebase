# PUNK ME — Handover to Cursor Commander

Owner directive: Inna Kragh, t198u, 11.11.2026 11:27 CET.  
**Cursor verification pass:** 2026-11-11 against live repo `garum2008-netizen/punk-me-firebase` (see `HANDOVER_RECEIPT.md`).

## Operating model

OWNER → CURSOR COMMANDER (sole permanent PUNK executor) → PUNK ME BOT (on demand only) → CURSOR COMMANDER.  
No additional permanent agents. No duplicate development agents.  
**PUNK ME and Talk & Grow Kids are separate:** never merge repos, architecture, assets or release plans.

## Repository and environments

| Item | Value |
|---|---|
| Repo | https://github.com/garum2008-netizen/punk-me-firebase |
| Live/production | https://halloween.punk.contractbot.dk — GitHub Pages from `main`. **Merge to `main` = production deploy.** |
| Firebase prod project | `punk-me-40605` — NEVER touched by automated tests |
| Closed preview | Cloudflare Pages (free plan): `dist-preview`, local saves only, noindex, Basic Auth via Pages Function (`PREVIEW_USER` / `PREVIEW_PASS` in environment only — never in Git/docs/chat). |

## Branches / PRs (verified live 2026-11-11)

| PR | Branch | Base | State | Notes |
|---|---|---|---|---|
| [#52](https://github.com/garum2008-netizen/punk-me-firebase/pull/52) | `cursor/vertical-slice-ch1-d81d` | `main` | OPEN, **draft** | Chapter 1 gameplay slice. **Current head:** `0badbab7ac1c726c578b3aeea580c63890a379a7` (capture fixes after `db3866f`). NOT merge-ready. |
| [#53](https://github.com/garum2008-netizen/punk-me-firebase/pull/53) | `cursor/safe-chat-verifier-fixes-3dff` | `main` | OPEN, **draft** | Safe-chat / rules-related; merge can auto-deploy DB rules — **NO-GO without separate owner GO**. |
| [#55](https://github.com/garum2008-netizen/punk-me-firebase/pull/55) | `cursor/a-contour-preview-tooling-1430` | `cursor/vertical-slice-ch1-d81d` | OPEN, ready | Halo/contour/hybrid **tooling only**; head includes `f2c533c`. **DO NOT MERGE** shipped assets. |
| [#56](https://github.com/garum2008-netizen/punk-me-firebase/pull/56) | `cursor/t196-2d-host-preview-1430` | `cursor/vertical-slice-ch1-d81d` | OPEN | Procedural 2D host preview — **owner rejected (t202u)**; do not merge or rerender. |
| [#46](https://github.com/garum2008-netizen/punk-me-firebase/pull/46) | `cursor/safe-chat-worker` | `main` | OPEN, **draft** | Prepared-phrase chat — not accepted for release. |
| — | `cursor/emulator-guard-scripts-1430` | (slice) | merged via cherry-pick | Original `31e165b`; on slice as **`db3866f`** (equivalent guard fix, not same commit object on branch). |

## Key commits (verified)

| SHA | Role |
|---|---|
| `0badbab7ac1c726c578b3aeea580c63890a379a7` | **Slice HEAD** (11.11.2026): ordinary capture razor/wait + `ORDINARY_PORTRAIT_ONLY`. |
| `db3866f9c371dc958bad6b3b734d27d4ed2d9fac` | Emulator guard on Playwright diag scripts; **PORTAL_GATE_ONLY** PASS reported (08.11). |
| `31e165b98b4e00997d2ec8d631455a944c96e423` | Source commit for guard fix (cherry-picked to slice as `db3866f`). |
| `d2c0efc1c5ea3f298fa2647434dc428154725ad4` | t186 hybrid iter2 tooling (PR #55). |
| `f2c533cf17014d04937f8ed20549ae42d767476c` | t186 hybrid iter3 tooling (PR #55). |

## Shipped Angelina assets (verified on disk)

| Asset | SHA-256 |
|---|---|
| Shipped A portrait WebP | `32c087bab481062de9be824a30265b321ab65a118d7271ccd1cab26cf1ad3cb7` |

Build pipeline label `restore_ab6fa302` / `ab6fa302` in scripts = fail-closed restore decision name, not the WebP file hash.

## Game design (owner decisions, unchanged)

- Player **is** Angelina (teen 13–15). Approved 2D skins: **A** classic, **B** punk teen, **C-v2** angel rocker. Dialogues not addressed to “you”.
- Chapter 1 path: char select → room → street / Razor → travel → Life Ch1 / mirror / Mira → slice end. Cemetery + full ending not release-proven.
- Wider vision (later chapters, economy, premium, Roblox): **out of current Chapter 1 release scope**.

## Hard rules

- Every build/test: `FIREBASE_EMULATOR=1`, `FIREBASE_DATABASE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST` on localhost; never prod `punk-me-40605`.
- Release evidence: no skip/dev flags, injected progress, prepared saves, forced clicks, map shortcuts hiding portal.
- Production deploy, domain, Rules deploy, Stripe/live payments, real data, publication: **Inna's separate explicit GO** only.
- Secrets never in Git, docs or messages.

## Evidence locations (may be off-repo)

Paths reported by prior agents (`/workspace/…`, agent stores) — **not verified in this pass**; Cursor should confirm before citing in release packs.
