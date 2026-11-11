# PUNK ME ROBLOX — MVP and platform plan

**MASTER TZ §10–§13, TASK 08 (#23).** Proposals only — no publish, no Robux spend, no canon changes without Inna.

## 1. MVP scope (P3)

Align with TZ §10 — prove core loop before building all 13 locations.

### In MVP

| Item | Notes |
|------|--------|
| Spawn / avatar | Player avatar or fixed PUNK ME skin template |
| Locations (blockout) | House 13, elevator, gang street, city hub, cemetery, parkour segment |
| NPCs | Razor, Vienna, Cobalt, Mohawk — dialogue + quest hooks |
| UX | ProximityPrompt labels: «Говорить», «Купить», «Работать», «Войти»; always-visible objective |
| Controls | Keyboard + gamepad + default mobile jump pad |
| Save | DataStoreService: chapter, quest step, authority, coins, inventory flags |
| Onboarding | Chapter 0 through gang initiation (chapter 1 end) — parity with **working** WEB flow, not broken street-E arcade path |
| Performance | Target ~10–15k tris per character on mobile after decimation |

### Out of MVP (P4+)

- Full chapter 2 construction economy, chapter 3–4, multiplayer activities, pet systems, paid cosmetics live on marketplace.

## 2. Technical stack

- **Rojo** project under proposed `roblox/` (see `docs/architecture/DUAL_PLATFORM.md`).
- **Luau** modules: `QuestService`, `SaveService`, `DialogueController`, `LocationLoader`.
- **DataStore:** single key `PlayerData_v1` with schema version field; reward ids dedupe server-side.
- **No Firebase** in Roblox client.

## 3. Meshy → Roblox import

| Constraint | Implication for PUNK ME |
|------------|-------------------------|
| WEB GLBs today | ~22k–63k tris per hero; 4–5 MB each — **above** mobile Roblox budget |
| Roblox import | FBX/OBJ/GLB via Studio or Asset Manager; rig often needs Humanoid retarget |
| Materials | PBR limited; expect to simplify to SurfaceAppearance / single texture |
| Animations | WEB uses Idle/Walking/Running in GLB; Jump often procedural on WEB — add Roblox jump animation or use default Humanoid |
| punk_dog | ~6k tris, no skin — suitable as static/motor6D pet with simple hop script |

**Pipeline proposal**

1. Decimate in Blender or `gltf-transform simplify` to ~12k tris.
2. Export FBX with armature; verify in Studio Animation Editor.
3. Record Roblox asset ids in `shared/assets-manifest.json` (future).

**punk_pink.glb note:** file lacks `Idle` clip name in glTF (only Running/Walking); WEB uses `buildIdleStandClip` fallback — Roblox needs explicit idle.

## 4. Age rating and content maturity (§12)

**Owner decision:** target audience stays **13+** (TZ). Do not auto-target 9+ / Kids catalog.

Current Roblox framework (2025–2026 docs; verify at publish time):

| Label | Who can play (typical) | PUNK ME relevance |
|-------|------------------------|-------------------|
| **Minimal** | Kids 5–8, Select 9–15 | Would require removing crude humor, gang tension, cemetery horror tone — **not recommended** without story changes |
| **Mild** | Select 9–15 | Still softens repeated “fear” and violence; chain fights may need stylized, non-graphic presentation |
| **Moderate** | Select 9+ / 16+ depending on account | Fits stylized gang fights, cemetery jobs, mild crude humor if questionnaire answered honestly |
| **Content May Vary** | 16+ age-checked in many regions | Default if full questionnaire skipped; less precise storefront label |
| **16+ sensitive themes** | 16+ | Only if narrative includes sensitive social/political/religious issues — **avoid** unless canon requires |
| **Restricted / 18+** | Age-verified adults | Strong language, alcohol, romance — **not** needed for current canon if toned to Moderate |

**Elements that may need adjustment for younger catalogs**

- Chain duels (violence frequency).
- Cemetery / ghosts / “NOT DEAD YET” horror-adjacent mood.
- Shop humor and insult banter (crude humor descriptor).
- User-generated chat (Roblox chat policies; no free-form UGC drawing in Kids/Select).

**Recommendation to Inna:** aim for **Moderate** maturity with stylized non-gory combat and no realistic blood; keep experience off Kids/Select catalogs to honor **13+** positioning. Final label = outcome of Studio **Maturity & Compliance** questionnaire, not this doc.

References:

- [Content maturity (Create)](https://create.roblox.com/docs/en-us/production/promotion/content-maturity)
- [Content Maturity Ratings (Support)](https://en.help.roblox.com/hc/en-us/articles/8862768451604)

## 5. Monetization proposals (§13) — not active

| Idea | Type | Notes |
|------|------|------|
| Cosmetic jackets / hair / dog accessories | Developer Products | No gameplay stats |
| Emote packs | Pass or product | Optional |
| Hangout decor | Product | Chapter 2+ |
| Battle pass | **Deferred** | Needs live ops approval |

**Explicitly off table for now:** selling in-game coins for Robux (pay-to-win), external payment links, shared WEB subscription entitlements.

**Financial doc checklist (future TASK 10):** Roblox 30% platform fee, DevEx requirements, regional tax, refund policy, experience analytics.

WEB subscription **4,99 €/month** — status: verify in `subscribe` UI / legal copy; **no new payment integration** in agent work without OK.

## 6. What a cloud agent can vs cannot do

| Can | Cannot |
|-----|--------|
| Author `roblox/src/**/*.luau`, Rojo config, unit-style TestService scripts | Click Roblox Studio UI, place parts visually, publish experience |
| Document import steps, decimation commands, manifest | Upload Meshy GLBs to Roblox without owner Studio session |
| Open PRs with Luau + docs; run `rojo build` if toolchain added to environment | Spend Robux, enable purchases, complete ID-verified publish pipeline |
| Research maturity/monetization policy | Change age rating or canon without Inna |

**Practical MVP path:** agent delivers Rojo scaffold + save/quest modules + README; Inna imports characters in Studio and runs closed playtest.

## 7. Dependencies and milestones

1. TASK 01 audit (#18) — done in docs PR.
2. TASK 07 architecture (#21) — this repo layout.
3. WEB P1 fixes (#22–#26, PR #17) — Roblox onboarding script should mirror **fixed** WEB, not audit failures.
4. TASK 06 asset archive (#19) — decimated meshes for import.
5. Owner OK for private place + optional Roblox Plus / verification if targeting under-16 catalogs later.

## 8. Risks (Roblox-specific)

- Import rig breakage (T-pose, foot slide) → schedule manual QA per character.
- DataStore throttling on burst saves → batch writes, debounce.
- Maturity mis-label → store visibility loss; complete questionnaire before marketing.
- Parallel canon drift — keep quest ids aligned with WEB spec JSON when introduced.
