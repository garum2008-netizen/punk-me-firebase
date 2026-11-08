# CURSOR EXECUTION QUEUE

Handover for direct Cursor work on **PUNK ME** (`garum2008-netizen/punk-me-firebase`).  
Snapshot: `main` @ `450d6da` (2026-11-08). Production site: `https://halloween.punk.contractbot.dk`.  
`GAME_VERSION` on this branch: `living3d-v22r6-task03`.

This file is a work queue, not a second quota. Grok and Cursor share one weekly pool. Savings come from fewer bot calls, not from moving the same loops into Cursor.

No production deploy, rules publish, payments, or deletions are authorized from this queue.

## How to execute

Open this repository in Cursor Agent and take the first row whose status is **NEXT**. Implement only that task, run the listed checks, then update this file in the same PR.

| # | Task | Repo / branch | Status | Next action | Cursor workflow |
| --- | --- | --- | --- | --- | --- |
| 01 | Audit repo and production ([#18](https://github.com/garum2008-netizen/punk-me-firebase/issues/18)) | this repo / `main` | DONE as baseline | Keep this queue current when a task lands | Read issues #18–#27 and `docs/game-design/` before coding |
| 02 | Secure RTDB ([#20](https://github.com/garum2008-netizen/punk-me-firebase/issues/20)) | `main` includes PR #33 | CODE ON MAIN / PUBLISH BLOCKED | Owner backup, then publish rules. Do not publish from an agent | `npm run test:rules` only in an emulator. Checklist: `docs/release/RULES_PUBLISH_CHECKLIST.md` |
| 03 | Onboarding and quests ([#22](https://github.com/garum2008-netizen/punk-me-firebase/issues/22)) | `cursor/task03-onboarding-interact-0f9d` | IN PROGRESS (code + tests) | Manual playthrough: new player reaches initiation without DEBUG | `npm run test:task03` then `npm test`. Headless Chrome: desktop quest panel stays visible; mobile starts hidden and the toggle reveals it |
| 04 | Mobile controls and HUD ([#24](https://github.com/garum2008-netizen/punk-me-firebase/issues/24)) | same branch, partial | PARTIAL | Add a jump control in the safe area and confirm portal tap on a phone | Joystick `pointercancel` no longer keeps a stale pointer id |
| 05 | Chapter 2 build and economy ([#26](https://github.com/garum2008-netizen/punk-me-firebase/issues/26)) | `main` | NEXT after 03 playthrough | One inventory for bricks/nails/boards; hangout stages 1–4 save; no double duel payout | Stay inside `js/story/` and `data/story/construction-hangout.json` |
| 06 | 3D asset audit ([#19](https://github.com/garum2008-netizen/punk-me-firebase/issues/19)) | `main` | QUEUED | Manifest of GLB sources and licenses. Do not replace owner models | `assets/models/` |
| 07 | Dual-platform doc ([#21](https://github.com/garum2008-netizen/punk-me-firebase/issues/21)) | `main` | QUEUED | `docs/architecture/DUAL_PLATFORM.md` only. No shared Roblox currency | Docs PR |
| 08 | Roblox MVP ([#23](https://github.com/garum2008-netizen/punk-me-firebase/issues/23)) | none | BLOCKED | Needs owner OK. No Robux, no public place | Cloud agents cannot drive Roblox Studio |
| 09 | Chapters 3–4 plan ([#25](https://github.com/garum2008-netizen/punk-me-firebase/issues/25)) | `main` | QUEUED | Design doc only. Mark crypt/castle/zombie house as not in production | After chapter 2 is playable |
| 10 | Release readiness ([#27](https://github.com/garum2008-netizen/punk-me-firebase/issues/27)) | `main` | BLOCKED | Staging checklist after 02 publish and 03–05 | No production deploy without a written OK from Inna |

## What this branch changes (TASK 03)

Verified by `node scripts/test-task03-progress.mjs`:

- `sanitizePlayer` now writes `players/{uid}/onboarding` (`step`, `progress`, `done`, `paid`). Reload keeps the step.
- The move step pays +20 coins once. `paid.move` blocks a second grant, including old saves that never stored onboarding but already left the room with extra coins or XP.
- Street **E** talks to the nearest NPC. The arcade does not run while Razor is in range, or while the step is `talk_razor` / `win_fight`.
- `questBump` / `bumpQuest` creates `quests.progress` when Firebase omitted it, so a duel win does not throw.
- After `joined_gang`, talking to Razor does not reopen `dlg_razor_initiation` («новенький»). Rank lines for `gang_member` are used instead.
- The desktop quest panel is visible without a toggle. Narrow viewports still start collapsed, and the toggle remains.
- Joystick `pointercancel` clears the active pointer (TASK 04 slice). A jump button is still missing.

Not done, and not claimed:

- A full new-player playthrough to gang initiation in the browser.
- Publishing Firebase rules or the static site.
- Chapter 2 hangout, chapters 3–4, Roblox, payments.

## Audit notes (repository)

| Area | Finding |
| --- | --- |
| Incomplete features | Chapters 3–4 locations (crypt, castle, zombie house) are spec only. Cinematic intro is spec only. Subscription button stays disabled («оплата ещё не подключена»). |
| Open tasks | GitHub issues #18–#27 are all still open. #20 is implemented on `main` and waiting for an owner publish. |
| Tests | `npm test` is a file smoke check. Rules and loading tests need the Firebase emulator or a local static server. No suite was red on `main` at audit time; they were not all re-run here. |
| Integrations | Firebase Auth + RTDB. Live rules are still the open snapshot in `scripts/rules-deploy-snapshots/live-published-open.json` until Inna publishes. Payments are not connected. |
| Deploy blockers | Rules publish needs a backup and a written OK. Static hosting is GitHub Pages from `main`. Do not deploy from an agent. |
| Prior handover docs | No `docs/audit/MASTER_AUDIT_2026-10-24.md` on `main`. Issue #18 says that audit lived on `cursor/docs-master-audit-4053`. This file replaces it as the Cursor queue. |

## Out of scope until Inna says otherwise

- Buying credits, changing the Grok/Cursor plan, or turning on paid on-demand usage.
- Creating more bots.
- Deleting bots, player data, or history.
- Production deploy, public publish, or real charges.
