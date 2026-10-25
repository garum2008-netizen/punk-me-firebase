# PR B proposal — building layer (Roblox / Avatar World style)

**Status:** proposal only (not implemented in PR A).  
**Canon:** chapters 0–4 unchanged; mechanics overlay existing quests.

## Chapter 2 — «Своя точка»

- **Hangout editor:** catalog of furniture/decor, drag-place, grid snap, rotate, move, delete, undo, color swatches.
- **Input:** mouse + touch (same HUD as mobile dock).
- **Persistence:** `me.hangout.placements[]` with migration from existing `hangoutStage` progress.

## City plots

- Purchasable plots (`me.cityPlots[]`) for shop, punk club, garage archetypes.
- Visible in 3D city zone; costs in-game coins only.

## Chapter 3 — cemetery

- Paid mini-jobs: clean paths, lamps, night watch (existing job hooks extended).
- **Crypt editor:** same placement engine as hangout, themed props.

## Quest integration

- Story steps point to editor entry (`ui: "decor"`, beacons on construction/cemetery).
- No duplicate rewards on reload (idempotent `grantRewardOnce` pattern).

## Firebase rules

Separate review-only PR if RTDB shape changes; **not published** until owner approves.

## Suggested PR split

1. `cursor/pr-b-hangout-editor-d81d` — placement engine + chapter 2 quests  
2. `cursor/pr-b-city-plots-d81d` — city builds  
3. `cursor/pr-b-cemetery-jobs-d81d` — chapter 3 jobs + crypt decor  
