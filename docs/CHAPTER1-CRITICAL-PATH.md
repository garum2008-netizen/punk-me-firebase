# Chapter 1 critical path

12 Nov 2026. Base is `origin/main` (tutorial, save, gang initiation from #65). PR #52 stays unmerged. PR #61’s one-shot rewards and dialogue movement lock are on this branch. The life-chapter slice stays off this path: it is a separate room scene and is not the chapter.

## What already plays

Room, street, cemetery, shop, city build mode, Razor’s initiation (fee, duel, or flyers), and save of `onboarding` plus `story`. A new player can walk, talk, fight, and buy. Joining the gang raises the chapter and starts the hangout quest.

## What this branch adds

1. Opening crawl using the four approved intro lines, then the existing 3D world. Skip is always available. A resumed game with `onboarding.step > 0` does not replay it.
2. Angelina stays on screen with the current step. The crawl plays the approved Russian intro recordings, because those are the only intro files. The six training steps play the narrator clip for the current language when that file exists. The city step and the ending have no approved clip, so they stay text. Danish lines still need a native pass before a public release. The joystick is read together with the keyboard, so a finger on the stick moves the character.
3. After the shop, the training sends the player to the city and gives one crypt stone if the pack is empty. Build mode places a visible piece. That completes the step.
4. After training, the existing initiation remains the objective. Joining the gang opens the chapter ending once and saves `chapter1.ended`.
5. `chapter1.crawlSeen` and `chapter1.ended` are part of the player save.

## Not in this pass

No merge to `main`, no production deploy, no new paid service, no new story beats, no deletion of assets. A Firebase preview channel needs the hosting credentials for project `punk-me-40605`.

## Check

`node scripts/test-chapter1-guards.js` and `node scripts/test-chapter1-flow.mjs`. A browser playthrough is separate from those unit checks.
