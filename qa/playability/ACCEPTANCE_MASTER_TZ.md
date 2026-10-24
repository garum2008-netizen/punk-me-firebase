# MASTER TZ §16 acceptance (TASK 03–05 stack)

Date: 2026-10-24. Stack tip: `cursor/task-05-chapter2-construction-d81d` @ `e9b2596` (story optional: `cursor/story-chapter2-hangout-d81d` @ `dcf8f7e`).

| Criterion | Status | Evidence |
|-----------|--------|----------|
| New player reaches gang initiation without dev console | **Partial** | Smoke: onboarding + initiation UI (`npm run test:playthrough`); full Authority 2–3 path still manual |
| Progress restores after exit/re-entry | **Pass** | `test:loading-early-save`, playthrough onboarding reload step |
| Rewards not duplicated on re-entry | **Pass** | `grantRewardOnce` (`onboard:*`, `quest:*:complete`, `duel:payout:razor`) in save `story.rewardsGranted` |
| Main tasks doable touch-only | **Pass (smoke)** | TASK 04 talk/jump/interact; playthrough smoke; real device Safari not in CI |
| Sound off fully playable | **Pass** | Voice defaults muted; UI text for quests/dialogs |
| No hints to fake shops/NPCs | **Pass** | Bolt/foreman wired in TASK 05; ch2 story tests |
| `database.rules.json` untouched | **Pass** | No edits in TASK 03–05 PRs |

Automated (stack tip): `test:loading`, `test:loading-early-save`, `test:playthrough` PASS; on story tip also `test:story-ch1`, `test:story-ch2`, `test:b1-save` PASS.
