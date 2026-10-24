# MASTER AUDIT — PUNK ME WEB production & repository

**Date:** 2026-10-24 (UTC). **Governed by:** MASTER TZ «две платформы» (Inna).  
**Agent branch:** `cursor/docs-master-audit-4053` (docs only — no deploy, no rules publish).  
**Independent playthrough reference:** `PLAYTHROUGH_AUDIT.md` (uploaded 2026-10-24).

## Executive summary

- **Production** serves `GAME_VERSION = living3d-v22r5-accounts-r1` at `https://halloween.punk.contractbot.dk` (verified 2026-10-24).
- **Git `main`:** `a0e15b5` (merge PR #16 accounts + repo `database.rules.json` **not** live on RTDB).
- **Critical P0:** live RTDB allows **unauthenticated and anonymous read of entire `/players`** (~692 KB JSON) and **read of any player’s save by UID**; writes to other UIDs denied in spot check.
- **P1 gameplay:** onboarding street-E / mobile `questBump`, chapter 2 materials, HUD — documented in playthrough audit; fix in progress on **PR #17** (agent `bc-422beb6f`, TASK 03–05).
- **GitHub TASK issues:** #18–#27 (see §8).

---

## 1. Production vs repository

| Check | Result | Evidence |
|-------|--------|----------|
| Live version string | `living3d-v22r5-accounts-r1` | Playwright `page.evaluate(() => window.GAME_VERSION)` on production URL |
| `main` HEAD | `a0e15b5c2a9e344e6efd502e6addb012ecf64b49` | `git log -1 main` |
| `js/game.js` on `main` | Same `GAME_VERSION` | file at `a0e15b5` |
| Screenshots | Desktop 1280×800, mobile 390×844 | `qa/master-audit-2026-10-24/desktop-production-loading.png`, `mobile-production-loading.png` |

Commands:

```bash
git fetch origin main && git rev-parse origin/main
# a0e15b5c2a9e344e6efd502e6addb012ecf64b49

node -e "/* playwright snippet */"  # see qa/master-audit-2026-10-24/
```

---

## 2. §3 Component table (MASTER TZ)

| Компонент | Реализован | Проверен | Проблема | PR / Issue |
|-----------|------------|----------|----------|------------|
| **Google Login** | Да — UI на loading/char/HUD, link anonymous UID | Частично — `npm run test:accounts` PASS reload/sign-out; email link SKIP (provider off) | Email/Password отключён (`PASSWORD_LOGIN_DISABLED`); только Google по факту | #16 `a0e15b5`; #18, #20 |
| **Сохранения (RTDB)** | Да — `players/{uid}`, guard `__playerLoaded` | PASS локально test:loading + test:accounts | **Live rules:** утечка всех saves; запись чужого UID — deny; своя запись anon — allow в probe | #14 `0922e09`, #16; **TASK 02 #20** |
| **Обучение (гл. 0)** | Код есть, 6 шагов | PLAYTHROUGH: шаг 3 E→аркада; mobile шаг 5 questBump | Не проходимо без DEBUG / обходов | #17 (bc-422beb6f); #22 |
| **Глава 1 Прописка** | Authority 1–4 + посвящение в коде | PLAYTHROUGH: цепочку можно, UX плохой | Повтор дуэли +80, Razor «новичок», E/аркада | #12 open; #22 |
| **Глава 2** | Частично в ветках | PLAYTHROUGH: **тупик** (материалы, ларёк) | `shack` vs `story.materials`, Build 3D no-op | #13 open; #26; #17 |
| **Главы 3–4** | Нет (по TZ) | — | PLANNED | #25 |
| **Управление ПК** | WASD, камера, E | smoke-check + audit | Quest panel скрыта >900px; W/S инверсия? (audit) | #17, #22 |
| **Управление телефон** | Джойстик + touch | PLAYTHROUGH mobile | Джойстик срыв, E портал, нет монет в HUD | #24, #17 |
| **Модели и анимации** | Meshy GLB + CC0 fallback | Файлы в repo; GLB parse 2026-10-24 | 22k–63k tris; Jump не в GLB (процедурно); punk_pink без clip `Idle` | #19 TASK 06 |
| **Roblox prototype** | Нет | — | Только план | #23, `docs/roblox/ROBLOX_PLAN.md` |
| **Owner admin** | `owner.html` + client email gate | Guest UI PASS test:accounts | RTDB list не защищён live; admin не Custom Claims | #16; #20 |
| **PWA / tester** | В ветке PR #15 | Не на main | Конфликт с main | #15 |
| **Платежи** | UI subscribe (disabled) | Не включать без OK | — | #27 |

---

## 3. Pull requests (merged & open)

| PR | State | Branch | Merge / head SHA | Summary |
|----|-------|--------|------------------|---------|
| #16 | MERGED | `cursor/accounts-auth-4053` | **`a0e15b5`** | Google auth, owner.html, repo rules |
| #14 | MERGED | `cursor/hotfix-loading-save-d81d` | `0922e096` | Loading hang, `__playerLoaded` |
| #11 | MERGED | `cursor/living3d-v22r4-4053` | `05d1aa5a` | v22r4 lighting, mobile HUD |
| #10 | MERGED | `docs/punk-me-gameplay-story-voiceover` | `c4eb910f` | Game design docs |
| #17 | OPEN | `cursor/playability-fixes-d81d` | `c0105689` | TASK 03–05 fixes (bc-422beb6f) |
| #15 | OPEN | `cursor/pwa-test-audit-4053` | `be4677d0` | PWA, tester, audit (conflicts main) |
| #13 | OPEN | `cursor/story-chapter2-hangout-d81d` | `303bde03` | Chapter 2 hangout (base not main) |
| #12 | OPEN | `cursor/story-chapter1-propska-d81d` | (see PR) | Chapter 1 Прописка E2E |

---

## 4. Firebase security — live vs repository

### 4.1 Repository (`database.rules.json` on `main`, **not published** per owner)

- `players` root `.read`: only `garum2008@gmail.com` verified.
- `players/$uid`: read/write own UID; owner override write.

### 4.2 Live RTDB probe (2026-10-24)

Project: `punk-me-40605`, URL: `https://punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app`

Method: REST + Identity Toolkit anonymous `signUp` (same API key as public web client).

| Test | Live result |
|------|-------------|
| `GET /players.json` **no auth** | **HTTP 200**, ~692 KB — full player index |
| `GET /players.json` **anon token** | **HTTP 200**, same payload |
| `GET /players/{victimUid}.json` **anon token** | **HTTP 200**, full save (coins, location, etc.) |
| `PUT /players/{victimUid}/coins` **anon** | **Permission denied** |
| `PUT /players/{ownUid}.json` **anon** | **Allowed** (probe object written) |

**Conclusion:** published rules **do not** match #16 file. P0: TASK **#20** (emulator tests + staged publish after backup & Inna OK). Client-only `OWNER_EMAIL` in `js/game.js` is **not** sufficient for data confidentiality (TZ §4.7).

### 4.3 Authentication providers (owner-reported, not changed by this PR)

- Google: enabled.
- Email/Password: disabled — `test:accounts` reports `providers not enabled`.

---

## 5. GLB inventory (confirmed in repo)

Parsed via GLB JSON chunk (2026-10-24); sizes from `ls -lh`.

| Asset | Path | Size | Triangles | Materials | Rig (skins) | Animations in file | License / notes |
|-------|------|------|-----------|-----------|-------------|-------------------|-----------------|
| Razor | `assets/models/meshy/razor.glb` | 4.7 MB | 63 432 | 1 | 1 | Idle, Walking, Running | Meshy / Inna originals (`docs/CHARACTERS.md`) |
| Cobalt | `assets/models/meshy/cobalt.glb` | 4.3 MB | 56 297 | 1 | 1 | Idle, Walking, Running | Same |
| Mohawk | `assets/models/meshy/mohawk.glb` | 4.9 MB | 61 159 | 1 | 1 | Idle, Walking, Running | Same |
| Vienna (pink) | `assets/models/meshy/punk_pink.glb` | 4.8 MB | 21 698 | 1 | 1 | **Walking, Running only** | Neon Rebel canonical; WEB idle via `buildIdleStandClip` |
| Шнурок (dog) | `assets/models/pets/punk_dog.glb` | 719 KB | 5 994 | 1 | 0 | none | Pet; `meshy-dog.mjs` |
| CC0 teens | `assets/models/cc0/*.glb` | varies | varies | — | — | UAL retarget | Quaternius + UAL per CHARACTERS.md |

**Jump:** no dedicated Jump clip in Meshy GLBs; movement uses walk/run + engine procedural jump (see `js/world/meshy-punk.mjs`, `character-rig.mjs`).

**Other GLB:** `assets/models/punk-teen.glb`, `character.glb`, `dog.glb`, `fox.glb` — legacy/CC0; heroes use `meshy/` paths from `meshyGlbPathForHero()`.

**2D / posters:** `imagine_images/*.jpg` (60 files) — UI/posters only.

**Voice / audio:** `assets/voice/` (if present), Web Speech TTS per `docs/VOICE.md`.

**Shipped manifest:** `assets/models/meshy/shipped.json` (loaded by `meshy-punk.mjs`).

---

## 6. Chapters available to players (honest)

| Chapter | Production (`main`) | Notes |
|---------|---------------------|--------|
| 0 Onboarding | Partially | PLAYTHROUGH blockers |
| 1 Прописка | Partially | Reachable with workarounds; PR #12 not merged |
| 2 Своя точка | Broken on prod | PR #13 not on main |
| 3–4 | Not implemented | TZ §7 |

---

## 7. Automated tests (existence & last run this audit)

| Script | npm | Result 2026-10-24 (cloud VM) |
|--------|-----|------------------------------|
| `scripts/smoke-check.js` | `npm test` | **PASS** |
| `scripts/test-loading-recovery.js` | `npm run test:loading` | **PASS** (Chromium); WebKit SKIP (missing OS deps) |
| `scripts/test-loading-early-save.js` | `npm run test:loading-early-save` | Not re-run this session (exists on main) |
| `scripts/test-accounts-auth.js` | `npm run test:accounts` | **PASS** chromium paths; email link SKIP; WebKit SKIP |
| Playwright QA PNGs | — | `qa/hotfix-loading/`, `qa/accounts/`, `qa/master-audit-2026-10-24/` |

«Страница загрузилась» alone is **not** acceptance (TZ §16).

---

## 8. GitHub Issues (TASK 01–10)

| TASK | Issue | Priority |
|------|-------|----------|
| 01 Audit | [#18](https://github.com/garum2008-netizen/punk-me-firebase/issues/18) | P0 |
| 02 Secure Firebase | [#20](https://github.com/garum2008-netizen/punk-me-firebase/issues/20) | P0 |
| 03 Onboarding / quests | [#22](https://github.com/garum2008-netizen/punk-me-firebase/issues/22) | P1 |
| 04 Mobile controls | [#24](https://github.com/garum2008-netizen/punk-me-firebase/issues/24) | P1 |
| 05 Chapter 2 | [#26](https://github.com/garum2008-netizen/punk-me-firebase/issues/26) | P1 |
| 06 3D asset archive | [#19](https://github.com/garum2008-netizen/punk-me-firebase/issues/19) | P2 |
| 07 Dual-platform arch | [#21](https://github.com/garum2008-netizen/punk-me-firebase/issues/21) | P3 |
| 08 Roblox MVP | [#23](https://github.com/garum2008-netizen/punk-me-firebase/issues/23) | P3 |
| 09 Web ch. 3–4 plan | [#25](https://github.com/garum2008-netizen/punk-me-firebase/issues/25) | P2 |
| 10 Release readiness | [#27](https://github.com/garum2008-netizen/punk-me-firebase/issues/27) | P5 |

**Dependency graph (simplified):** #18 → #20, #22–#26; #21 → #23; P1 gameplay before #25; #27 last.

**Parallel agent:** PR [#17](https://github.com/garum2008-netizen/punk-me-firebase/pull/17) — onboarding, questBump, mobile, ch.2 materials (do not duplicate).

---

## 9. Estimates (engineering effort, not calendar)

| Workstream | Scope | Effort | Notes |
|------------|-------|--------|-------|
| TASK 02 Firebase | Emulator matrix + staged rules + owner QA | **M** | Blocker for trust; needs backup first |
| TASK 03–05 gameplay | Onboarding, mobile, ch.2 | **L** | Partially in #17; merge + regression tests |
| TASK 06 assets | Manifest + ZIP for Inna | **M** | Decimation for Roblox |
| TASK 08 Roblox MVP | Rojo + 6 locales blockout | **XL** | Studio time from owner |
| TASK 09 ch. 3–4 web | Design breakdown only | **M** | Implementation **XL** later |
| TASK 10 release | Checklists, staging | **S** | After P0/P1 |

Scale: S &lt; 1 agent-week, M 1–2, L 2–4, XL 4+ (parallelizable).

---

## 10. Main risks

1. **Data exposure** until TASK #20 publish — reputational + GDPR-style concern if saves contain PII.
2. **Rules publish breaks saves** if client still expects open reads — must ship client + rules together after emulator proof.
3. **Gameplay debt** blocks 13+ retention before any Roblox launch.
4. **Branch divergence** (#12, #13, #15, #17) — merge order conflicts with `main`.
5. **Roblox import** — high tri counts, manual rig QA.
6. **Email auth** — disabled; account linking limited to Google until owner enables provider.

---

## 11. Related documents

- `docs/architecture/DUAL_PLATFORM.md` (TASK 07)
- `docs/roblox/ROBLOX_PLAN.md`
- `docs/release/ACCOUNTS_SETUP.md` (deploy rules caution)
- Uploaded `PLAYTHROUGH_AUDIT.md` (playthrough evidence)

---

*This audit does not publish Firebase rules, deploy, or modify game logic.*
