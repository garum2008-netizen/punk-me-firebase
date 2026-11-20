# Implementation plan — after the screenplay is approved

This is the build order for a later GO. It is not a GO. Step 2 of the rejected tutorial is cancelled. Nothing in `docs/chapter1-story/` is the script.

The CEO is writing the screenplay and the character bible. Implementation starts when that screenplay validates against [DIALOGUE_SPEC.md](DIALOGUE_SPEC.md) and the owner says to build. Until then the only code change allowed by this plan is none.

Scope is described as systems and files. There is no day count.

## Order

The order is the order a player meets the gates. A later scene is not started while an earlier gate is still a button list.

1. Screenplay loader and flag values, with the slot empty and the game still on the tutorial. This is the only engineering that can land before the words exist, and only after a GO that names it.
2. Cold open, because the 30 second gate is the first thing a player sees.
3. Scene 1, because the tutorial has to be taught by the locked room.
4. Dialogue consequences, then scene 2 and scene 3, because the three Razor paths have to be visible before the cemetery.
5. Readable Razor encounter, in parallel with scene 3, because "beat" cannot be Chain mashed.
6. Scene 4 passage, symbols, and CCTV.
7. Scene 5 companion, including a hint that is allowed to be wrong.
8. Scene 6 generator, duel, screen, lights out, Chapter 2 card.
9. Closed-preview deploy of that SHA only, plus one uncut playthrough. Production stays closed.

Each step keeps the preview login, the `ch1` play id, and the reward-once guard. The play id changes only when the new chapter is the one being tested, so old tutorial saves do not silently become the mystery.

## Scene 1 — the room teaches the controls

**Player objective, the moment the door finishes opening:** one line supplied by the screenplay, pointing at the phone. The plan does not write that line.

**Reuse:** `room` in `js/world/locations.mjs` and `js/game.js`. Avatar studio `js/char-select.mjs`. E and the joystick. Lamp placement `js/story/chapter-build.mjs` and `placeRoomPiece`.

**Turn:** `ONBOARDING_STEPS` in `js/onboarding.js` stops being the chapter. The room runs a short chain of world events:

- The avatar studio is the first action inside the house, after the cold open has already said she is missing.
- The phone is an object in the room. Playing it is the video. The TV mesh in `room-furniture-catalog.mjs` can be the screen. The picture is a subtitle sequence from the screenplay, not a new filmed asset, until a GO buys or records one.
- Blackout is a light state on the room: hemisphere and lamp intensities drop, the objective names the lamp.
- The street portal in `PORTALS.room` checks a flag `door_unlocked`. Until the screenplay's escape beat sets it, the door does not travel.
- The lamp, when the player places or switches it, reveals the writing decal. That is its story job. Coins: if the screenplay keeps the 15 coin price, the chapter must already have handed the player those coins, or the story lamp is free once the phone has been watched. A real-money sku is not a legal effect.

**Hide:** `updateAngelinaFollow` does not spawn her body in scenes 1–4. Her voice in those scenes is a recording or the earpiece, from a screenplay node.

**Scope:** flags and a locked portal in the existing room. No new map.

**Risk:** the current `adoptChapterSave` resets any non-`ch1-child` save into the eight tutorial steps. The new play id has to be explicit, or every tester is thrown back onto the rejected route.

## Scene 2 — two stories about the same night

**Reuse:** `street`, `city`, Razor, the dialogue widget, `story.rel`.

**Turn:** two talk trees, one per gang. Each tree sets a string flag the other tree can read (`chains_version`, `sparks_version`, or whatever ids the screenplay uses). A later line has a `when` clause on that flag, so the player can hear the contradiction in a third conversation. The objective names the person still not heard.

**Missing work:** Black Sparks need a colour and a speaker only after the character bible names them. Tony and Bolt (`LOCATIONS.city.npcs`) are not recast by this plan. A new speaker id is cheaper than renaming a quest NPC the jobs still use.

**Scope:** data plus one faction marker in the city dressing. No new district.

**Risk:** `evalCondition` treats an unknown condition as true. A half-wired `when` would show every secret at once. The loader must fail closed.

## Scene 3 — three ways through Razor

**Reuse:** choice buttons, `start_duel`, the duel camera, the "training must not finish the chapter" guard.

**Turn:** one dialogue, three choices. Each choice writes `razor_path` to `beat`, `outwit`, or `negotiate` and starts a different beat:

- Beat: the readable encounter below. Winning sets `razor_path=beat` and a visible result (he drops the lead, the door he was blocking opens).
- Outwit: a short look-and-use in the street the player is already in. Success and failure both continue, with different lines.
- Negotiate: a second talk. He gives a different lead. No duel.

Scene 4's first line branches on `razor_path`. That is the observable consequence. A player who reloads still has the flag (`sanitizePlayer` already saves `story`).

**Scope:** new dialogue id, three effects, one street prop. The old `dlg_razor_initiation` stays in the file and is not the chapter trigger.

**Risk:** `onJoinedGang` in `story-engine.mjs` calls `tryFinishChapter`. The new paths must not set `joined_gang` until the screenplay's real ending, or the tutorial card will fire in the middle of the mystery.

## The encounter

Chain, Block, and Dodge already exist on `#duel3dHud`. The NPC swing is a timer. The change is a tell: a wind-up pose and a subtitle or flash at least half a second before the hit, long enough to Block or Dodge on a phone. A hit that lands during the tell is a clean hit. Mashing Chain during the tell is a punish, not the win condition. The finale still cannot end in under a few seconds, using the same kind of floor `razorFinale` already has, so a single tap cannot skip it.

Outwit and negotiate are available in the same conversation, so a player who does not want the fight still finishes the scene.

**Scope:** `tickDuel` in `js/world/gameplay-v21.mjs` plus HUD copy in `js/i18n.js`. No new combat system.

**Risk:** the cold-test script `scripts/test-chapter1-cold.mjs` drives the Chain button. It will need a new path for the tell, or it will keep blessing the mash.

## Scene 4 — under the cemetery

**Reuse:** the cemetery yard, the crypt prop, the gravedigger as a door guard if the screenplay wants him.

**New:** a passage the yard portal opens once the screenplay's clue is set. Three symbol meshes the player can turn. The CCTV is a subtitle-and-still playback on a screen mesh, same player as the phone in scene 1. The still shows Angelina and a figure in Razor's mask. The mask uses the existing Razor materials on a second body; it does not require a new scanned face. Watching the tape sets `cctv_seen`. Leaving without it keeps the objective on the screen.

**Scope:** one interior bolted to `cemetery`, three interactables, one playback. This is the first new geometry.

**Risk:** a dark passage and a mask read as horror. The age gate below limits how that shot is lit and cut. No body, no blood, no scream stinger.

## Scene 5 — she is in the room, and she can be wrong

**Reuse:** the follower, the subtitle strip, idle lines, three languages.

**Turn:** a comms node plays before her mesh is allowed to spawn. After that she walks with the player. Hint nodes carry `trust: "right"` or `trust: "wrong"`. A wrong hint that the player follows sets a visible flag (the marked door is a dead end, Razor quotes the bad advice). A right hint opens the next object. She also has argument and joke nodes that do not advance the plot, so she is not only a quest arrow.

**Scope:** spawn rule plus the `trust` field on nodes. Lines come from the screenplay.

**Risk:** if the old `#angelinaGuide` stays bound to `guideKey()`, she will talk over the companion and tell the player which button to press. The guide widget is replaced by the objective line plus her nodes.

## Scene 6 — 00:13

**Reuse:** city square, stall mesh, Razor duel, ending overlay.

**Turn:**

- The clock is a HUD beat the screenplay starts. It is a label, not a real-time wait the player can miss.
- The generator is one city plot interaction. Restarting it is the first build. The stall, if the screenplay uses it, is the radio cover: using the stall opens the radio, it does not "finish the city".
- Razor's duel uses the readable encounter. His post-fight lines, from the screenplay, say he was warning them. Which warning he gives can branch on `razor_path`.
- The ending shot places the real Angelina mesh beside the player and a screen texture of her face on the tower. The spoken line is the screenplay's twist line. Then the lights drop and the card reads the Chapter 2 question. `showEnding()` is the card renderer. Its current "first mark in the city" copy is not the card.

**Scope:** one screen material, one generator prop, the ending overlay. The highest staging risk in the chapter.

**Risk:** two Angelinas will be read as a bug unless the shot is framed on purpose and the subtitle names the screen. The cold open's "trust no one" has to be the line this shot pays off, which is the screenplay's job to check.

## Cold open

**Reuse:** `#chapterCrawl` as the letterbox host, roof geometry if a shot needs a real roof, bloom for the neon.

**New:** a shot player that reads `kind: "cinematic"` beats from the screenplay: image or camera id, subtitle, duration, audio id. The first playable frame is the House 13 door after the wall text. Skip is inactive until the missing-person card has been shown. Replaying from the how-to menu can skip immediately.

The 30 second gate: the card ANGELINA MISSING is inside the first 30 seconds of a fresh launch, measured from first pixel, on desktop and on a 390 px-wide viewport.

**Scope:** a small player and a shot list. No new city.

**Risk:** a flyover that loads every location will miss the 30 second gate on a phone. The cold open should be a few authored frames (skyline plate, roof runner, door, wall), then drop the player into the existing room. The plates can be rendered the same local way as `docs/chapter1-story/art/render.html`, with new shots, when a GO allows the art pass. Those old plates show the rejected tutorial and are not reused as the cold open.

## Coins, shop, and the story

Story-critical objects are the phone, the lamp's writing, the gang conversations, the symbols, the CCTV, the radio, and the generator. Each one is reachable with the coins the chapter gives, or it costs 0 after its clue. The shop can still sell jackets and chains for coins. Those are customization, not keys.

`data/story/jobs.json` already has coin jobs. A "not enough coins" miss can point at a job. It cannot point at a real card.

## Age-appropriate QA

The audience is teens. The outline is a missing-person mystery, a mask, a betrayal, and a lights-out. The QA bar for any later build:

- Nobody is shown hurt, dead, or bleeding. The chain fight is a contest with a tell, and Razor is standing afterwards.
- The disappearance is a signal and an empty room, not a depiction of an abduction the player could copy.
- YOU'RE NEXT is paint on a wall the player can walk up to. It is not a jump scare, a scream, or a face in the dark.
- The mask on the CCTV is a costume in a recording. The recording has no violence in frame.
- The underground is dim and marked, with the three symbols as the light. No strobe, no sudden audio spike.
- Angelina's twist is a line and a second image of her. She is standing next to the player when the lights go out. The card asks who she is. It does not punish the player with a death.
- Jokes and arguments in scene 5 stay at teen banter. No sexual content, no slur, no real-world address.
- Subtitles are on for the earpiece and the comms in all three languages. A player with the sound off still gets the mystery in the first 30 seconds.
- RU is the source line. EN and DA are translations of that line, stored beside it, never a shorter summary.
- A content pass reads every `text` field in the screenplay before a preview deploy. This plan does not contain those lines.

## Gates before anyone says the chapter is done

All of these on one SHA, on the closed preview, with an uncut recording from a fresh save:

1. By 30 seconds the player has seen that Angelina is missing and that the last signal was House 13.
2. The objective under that card is a single action inside the house.
3. Scenes 1 through 6 each add a fact, a conflict, and a flag that a reload still has.
4. Angelina is absent as a body until scene 5, and in scene 5 at least one hint is wrong and the world shows it.
5. The three Razor choices each produce a different line in a later scene.
6. The duel can be won by answering the tell. Mashing Chain without watching the tell does not trivially win.
7. Lamp writing and the radio are on the critical path. No story node requires real money.
8. The last card is the revelation and the Chapter 2 question.
9. RU, EN, and DA all show the same beats. Desktop keys and the phone joystick both finish the chapter.
10. Quitting and reloading keeps the flags and does not pay the ending twice.

Until that recording exists, the status of the chapter is in progress. This document is not the recording.

## Risks that can throw the project back onto the tutorial

| Risk | What keeps it from happening |
| --- | --- |
| Someone implements `docs/chapter1-story/` because it is already written. | That folder is the rejected route. The screenplay slot is the only script. |
| A deploy of `f70cac8` or `3f0f3d3` is treated as the new chapter. | The preview SHA stays `3f0f3d3` until a GO names a new SHA. `f70cac8` is docs on top of the tutorial. |
| `joined_gang` or the eight `paid` steps still call `tryFinishChapter`. | The new play id does not use those eight steps as the win condition. |
| Angelina's follower spawns in the bedroom. | Spawn is gated on the companion flag. |
| Unknown dialogue conditions pass. | The new loader rejects unknown `when` clauses. |
| The cold open is a wall of text with Skip. | Skip is dead until the missing-person card. |
| Voice work starts on the rejected 30 lines. | Those samples stay in `docs/chapter1-story/voice-samples/` as a record. A voice GO, if it ever exists, names the screenplay ids. |
| Paid art or a paid neural voice is bought to make the cold open. | Local geometry, existing GLBs, and subtitles are enough for the first playable. A purchase is a separate GO. |
| Black Sparks are invented in code before the bible names them. | The plan reserves a faction id. The bible fills the people. |
