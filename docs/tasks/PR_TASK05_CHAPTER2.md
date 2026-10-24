# TASK 05 — Chapter 2 construction

## Goal
MASTER TZ §5.4 / TASK 05: hangout «Тусовка» playable — materials, unified inventory, real Bolt / foreman sources.

## Changed files (incremental on TASK 04)
- `data/story/jobs.json`, `data/story/quests.json`
- `js/story/story-engine.mjs` (Bolt stall, `syncUnifiedMaterials`, hangout HUD)
- `js/game.js` (shop brick → story materials)

## Features
- Uncle Bolt hardware stall in City (NPC `bolt`)
- Foreman `q_construction_sign` (no dead reward loop)
- Construction helper grants brick/nails
- `syncUnifiedMaterials` merges legacy `inventory.materials` into `story.materials`
- Missing-material toasts name real sources only

## Automated tests
- `npm run test:story-ch2` (when stacked on story branch)
- `npm run test:playthrough` — PASS

## Manual check
Joined gang → Construction → buy brick at Bolt → build stage 1 → progress saves on reload.

## Screenshots
`qa/story-stage2/*.png` (stacked story PR)

## Known limits
- City 3D build mode remains hidden until 3D placement exists.

## Rollback
Revert TASK 05 commit; player saves keep `story.materials` (no deletion).

## PR link + commit SHA
- Branch: `cursor/task-05-chapter2-construction-d81d` → base `cursor/task-04-mobile-controls-d81d`
- Tip commit: `e9b2596`
