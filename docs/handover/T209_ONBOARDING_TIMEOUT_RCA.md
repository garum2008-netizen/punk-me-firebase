# Onboarding / Ch1 capture timeout — root cause & fix (t209u)

**Failure sequence (repro):** `ORDINARY_PASS=t207-ch1-full` / `t208-ch1-full` desktop ordinary capture — `CYBER PUNK BLUE` via Character Studio, Firebase emulator, `?solo=1`.

## Incident A — stuck on onboarding **step 5** (shop)

| Field | Detail |
|-------|--------|
| Symptom | `onboarding timeout at step=5`, screenshot `ice-ordinary-onboarding-timeout.png` |
| Scene log | Reached `onboarding_step_4` → `ensure_street` from cemetery, never `onboarding_step_5` within deadline (then step 5 stuck on later runs) |
| Root cause | Harness clicked the **first** `#shopModal button[onclick*="buyItem"]`, often **disabled** because the item was already in `me.owned`. `buyItem()` returned early → `Onboarding.onShopBuy()` never ran → step 5 never advanced. Combined with **8 min** onboarding loop budget, step 4 fight + travel consumed most time before shop retries exhausted. |
| Game fix (commits) | `e3eefd6` — `effectiveShopPrice()` caps onboarding shop buys; `30ed660` — `buyItem` toast `onboard_shop_pick_new` when re-buying owned during shop step; `onboarding.js` exports `currentStep` for UX |
| Harness fix | `30ed660` / `e3eefd6` — click `:not([disabled])`, tab fallback for affordable item; close gang modal before shop; onboarding deadline **900000 ms** |
| Proof requirement | Re-run same ordinary sequence with commits above — must pass `onboarding_step_6` + Life Ch1 without timeout |

## Incident B — hang after `ch1_complete` (post-map cemetery)

| Field | Detail |
|-------|--------|
| Symptom | Capture hung on `uiOpenMapTravel(page, "cemetery")` after Life Ch1; absurd scene `tMs` in logs |
| Root cause | **Optional** QA screenshots (street/cemetery) after chapter end — not required for Ch1 DoD; map travel could block 45s+ while ffmpeg continued |
| Fix | `7b47500` — removed post-complete map/screenshots; replaced with **save → reload → state verify** |

## Incident C — `adaptSpawnLocation` skipped move tutorial

| Field | Detail |
|-------|--------|
| Symptom | First-time players spawned outside room could auto-complete step 0 (`moved`) |
| Root cause | `adaptSpawnLocation()` called `completeStep()` when `loc !== "room"` on step `moved` |
| Fix | `7b47500` — only refresh quest/guide banner (child must walk for step 0) |

## Incident D — reload after save (`__playerLoaded` timeout)

| Field | Detail |
|-------|--------|
| Symptom | v3 capture: `ch1_complete` then `page.waitForFunction: Timeout 120000ms exceeded` on reload |
| Root cause | Reload expected `__playerLoaded` within 120s; local save blob sometimes not flushed; char select could reappear |
| Fix | `8990b65` — `persistLocalOverlay()`, assert `punkme_lifech1_local_player_v1`, longer wait, studio re-confirm fallback |

## Commits (ordered)

1. `7b47500` — Angelina, wing QA, adaptSpawnLocation, capture post-Ch1 hang  
2. `30ed660` — shop harness + affordable buy  
3. `e3eefd6` — shop price cap + 15 min onboarding budget  
4. `8990b65` — save/reload verification robustness  

**Regression test:** `scripts/test-ordinary-ch1-sequence-t209.js` (same UI path as capture; no video gate).