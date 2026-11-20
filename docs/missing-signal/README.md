# PUNK ME — House 13: The Missing Signal

Russian title: **Дом, которого нет**.

Status of this folder: the plan below is the record of the 20 Nov outline. The later takeover told Cursor to write the script and a playable chapter on this branch. That playable build is local. The closed preview still serves the rejected tutorial. Production stays on hold. This folder is not an acceptance.

## What the owner decided

On 20 Nov 2026, 23:48 Europe/Copenhagen, Inna rejected the Chapter 1 story on `f70cac8` / PR #76. That package is a tutorial route: make an avatar, leave the room, talk to Razor, train, take a badge, buy a lamp and a stall, beat Razor, receive the patch. About 30 Angelina lines, mostly button instructions. It has no mystery, danger, betrayal, twist, or choice. There is no release GO. Do not build Step 2 from `docs/chapter1-story/`.

The new direction is a cinematic 3D punk mystery for teens. Keep Pumpkingrad, House 13, Angelina, Razor, the Rusty Chains, the cemetery, avatar customization, the shop, room personalization, and duels. The outline below is the direction these documents plan against. The full screenplay and character bible are being written separately. This folder does not replace them.

## Outline the plan follows

Cold open, then six scenes:

0. Black screen, guitar, rainy neon city, someone running on the roofs. Angelina in the earpiece: if you can hear this, they already found her; trust no one, especially people with the chain patch. The signal cuts. Card: ANGELINA MISSING. LAST SIGNAL — HOUSE 13. The camera flies to House 13. The door opens by itself. The wall says YOU'RE NEXT. Only then does gameplay start.
1. House 13. Avatar. Angelina's phone video. Blackout. The door locks. Getting out is the tutorial, taught by the room, not by a button list.
2. Pumpkingrad. Two gangs: Rusty Chains and Black Sparks. Each blames the other for the disappearances. Their stories conflict.
3. Razor knows where she is. The player can beat him, outwit him, or negotiate. Each path changes later dialogue.
4. Cemetery. An underground passage. Three symbols. A CCTV recording: Angelina walks into the forbidden zone on her own, beside someone wearing Razor's mask.
5. Angelina comes back on the comms. She left the clues on purpose. She is investigating why districts vanish at night. She becomes a companion: hints, arguments, jokes, and sometimes she is wrong.
6. Finale at 00:13. A tower. Restarting an old generator is the first city build. A duel with Razor. The reveal: he was warning them. Twist: Angelina's face is on the giant city screen while the real Angelina stands next to the player and says the city is now hers, because the player opened the door. Lights out. Card: CHAPTER 2 — WHO IS THE REAL ANGELINA?

The lamp exists to reveal hidden writing. The stall is cover for a secret radio. The story does not require a real-money purchase.

## Documents

| File | What it is |
| --- | --- |
| [AUDIT.md](AUDIT.md) | What the current game already has, what can be turned, and what the outline still needs. File paths included. |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Scene-by-scene build order, scope, risks, and the age-appropriate QA gates. |
| [DIALOGUE_SPEC.md](DIALOGUE_SPEC.md) | The data format the screenplay will load into. |
| [screenplay.slot.json](screenplay.slot.json) | Empty contract. The game does not load it. |
| [CHARACTER_BIBLE.md](CHARACTER_BIBLE.md) | Who is already approved, who is new, and which mesh is not replaced. |
| [CONTINUITY.md](CONTINUITY.md) | Lines, flags, and facts the chapter is not allowed to contradict. |
| [CINEMATICS.md](CINEMATICS.md) | What the cold open actually draws, and what is still only in the outline. |
| [CHAPTERS_2_5.md](CHAPTERS_2_5.md) | Setup for later chapters. Not a playable script and not a build GO. |

## Quality gates

A later build may be called complete only when all of these are true on one tested SHA, with a recording:

- The mystery is on screen inside the first 30 seconds, before any shop or duel.
- The player always has one clear objective for the scene they are in.
- Every scene adds information, a conflict, and a stored consequence.
- Angelina is a character: absent, then a recording, then a companion who can be wrong. She is not a button coach.
- Choices change a later line or a visible object.
- No story beat requires real money.
- The main challenges are readable. Chain-button mashing is not the chapter.
- The ending is the screen revelation plus the Chapter 2 question.
- Evidence is a playable build and a playthrough, not this folder.

## Holds

Do not merge. Do not deploy production. Do not buy assets or a voice. Do not delete the rejected story docs, the preview, saves, models, or espeak files. `f70cac8` stays in history and is not rewritten. A preview update of `punk-me-ch1-preview` is allowed only when an upload credential is already on the machine. This machine does not have one.

The closed preview `https://punk-me-ch1-preview.pages.dev` still serves `3f0f3d367f862a2baa2d32e21dc859eddf6e67da` (checked 20 Nov 2026, 23:49 Europe/Copenhagen). That deployment is the rejected tutorial. It is not this plan.
