# Audit — current Chapter 1 against The Missing Signal

Read date: 20 Nov 2026, Europe/Copenhagen. Source tree: branch `cursor/missing-signal-plan-c480`, parent commit `f70cac8f5ac4c47cdd478a4a44f4bf153033f331`.

Two builds are in play. They are not the same SHA.

| Build | SHA | What a player gets |
| --- | --- | --- |
| Closed preview `punk-me-ch1-preview.pages.dev` | `3f0f3d367f862a2baa2d32e21dc859eddf6e67da` | The tutorial route the CEO already played. `PREVIEW_SHA.txt` and the page meta `punk-preview-sha` both return this SHA. HTTP 200 with the preview login. |
| This branch, not deployed | `f70cac8f5ac4c47cdd478a4a44f4bf153033f331` | That same tutorial code, plus the undeployed camera and studio polish in `d61c0e5`, plus the rejected story documents. |

`js/game.js` reports `GAME_VERSION` as `living3d-v22r6-ch1`. That string is a label, not the git SHA. Production was not updated for this audit. The preview is the live Chapter 1 a player can open.

The rejected script lives in `docs/chapter1-story/`. It describes the tutorial. It is not the source for the new chapter.

Verdict for the outline: the game can host the mystery inside rooms it already has. It cannot tell the mystery yet. The flow, the guide, the ending, and the win condition are the tutorial.

## What the preview and the branch already do

Chapter id `ch1-child` in `js/story/chapter1-flow.mjs`. A new save, or an old save with a different play id, is reset to step 0. Coins and the avatar stay (`adoptChapterSave`). Completion requires `onboarding.done`, the flag `joined_gang`, and these eight paid steps:

`move`, `go_street`, `talk_razor`, `visit_cemetery`, `win_fight`, `shop_buy`, `room_decor`, `city_build`.

Those steps are defined in `js/onboarding.js` (`ONBOARDING_STEPS`). Each one pays coins and XP when the player hits a marker, talks, wins a fight, buys from the shop, places room decor, or places a city plot. The guide line in `refreshGuide()` is one of a handful of Angelina keys, and it tells the player the next control.

Opening card: `openCrawl()` fills `#chapterCrawl` in `index.html` with four i18n paragraphs and plays four espeak clips on a 7 second timer. Skip is immediate. There is no camera move.

Ending: `playFinale()` shows three Razor lines in `#storyDialog`, then `showEnding()` fills `#chapterEnding`. The card names whatever plot the player bought. It does not play the screen twist.

## Systems, with paths

### Places

`js/game.js` `LOCATIONS` and `js/world/locations.mjs` `buildLocationScene` / `PORTALS` / `LOCATION_BOUNDS`.

| Place | Id | 3D scene | Who stands there | Outline use |
| --- | --- | --- | --- | --- |
| House 13 room | `room` | Yes. Bounds about 14×12. Posters, furniture colliders, portals to kitchen, toilet, elevator, and a direct street door. | No story NPCs. Angelina is spawned as a follower, not as a roommate. | Reuse as S1. |
| Kitchen, toilet, elevator | `kitchen`, `toilet`, `elevator` | Yes. | Zoya, Plukh. | Extra interiors. The outline does not require them. |
| Roof and roof parkour | `roof`, `parkour` | Yes. `locations.mjs` builds both. Roof NPCs in `LOCATIONS` are mohawk and cobalt. | Walkable roofs, not a rainy skyline flyover. | Adapt for the cold-open roofs and for movement practice. The flyover camera does not exist. |
| Gang street | `street` | Yes. Razor at `NPC_WORLD.street.razor` (−4.6, −3.4). Portals home, cemetery, city. | Razor only (`LOCATIONS.street.npcs`). | Reuse as Razor's yard and as one gang's street. |
| Cemetery | `cemetery` | Yes. Dressing, stones, a crypt prop (`cemetery_crypt` in `js/world/location-showcase-props.mjs`), gravedigger. | Gravedigger. | Reuse the yard. The underground passage, the three symbols, and the CCTV set are missing. |
| Pumpkingrad square | `city` | Yes. Tony and Bolt. Plot pads. | Two city NPCs, not a second gang. | Reuse as the square and the tower district. |
| Construction | `construction` | Yes. Foreman, Vintik, hangout stages. | Outside the outline. | Leave in the world. Do not make it the generator. |

There is no location id for an underground passage, a generator room, or a tower interior. City towers in the live scene are the existing city dressing, not a climbable 00:13 tower.

### Angelina

She is a 3D follower: `js/world3d.mjs` `ensureActor("angelina")`, name sprite, follow update. Her mesh is the pink Meshy body (`assets/models/meshy/punk_pink.glb`, CC BY 4.0, `assets/models/meshy/LICENSE.txt`).

Her mouth is local audio, not a runtime service. `js/angelina-voice-config.mjs` sets `provider: "espeak"` and `candidate: ""`. Clips resolve through `js/story/angelina-voice.mjs`. The spoken set for the tutorial is the short list in `data/angelina-lines.json` plus i18n keys such as `angelina_beginning`. The guide DOM is `#angelinaGuide`.

She is in the room from the start. For the new outline she has to be gone until scene 5, or the cold open is spoiled the moment the door opens.

### Razor and the duel

Model: `assets/models/meshy/razor.glb` (about 4.8 MB, already in the repo). `LICENSE.txt` names pink, cobalt, and mohawk. It does not repeat a separate licence line for Razor. The preview already uses this file. Do not replace it for the plan.

Talk: `data/story/dialogues.json` `dlg_razor_initiation`. Three choices — pay 150, start a chain duel, or tag graffiti. The duel choice effect is `start_duel` / `q_initiation_duel`. Greet range is in `NPC_QUEST_GREET`. E priority is `js/interact-priority.mjs`.

Fight: `js/world/gameplay-v21.mjs` `startDuel3D`. HUD `#duel3dHud` in `index.html` has Chain, Block, and Dodge. Chain lunges and draws a trail. Block and dodge set short timers. The NPC swings on a timer (`npcCd` 1.15 s) with no wind-up the player is told to read. Training ends at 3 hits. The Razor finale refuses to end before 4 swings and 2.5 s (`razorFinale`). `js/game.js` `endFight` grants `joined_gang` only when the active quest is `q_initiation_duel` and the opponent is Razor. That guard is the fix for the old "training skipped the finale" bug. Keep the guard. Point it at the new finale id when the screenplay exists.

This duel is a timed button exchange. It does not meet the "readable encounter" gate until the NPC's attack is telegraphed and Chain is one tool among Block, Dodge, and a non-combat path.

### Dialogue

Loader: `js/story/story-engine.mjs` `loadStoryData()` fetches `data/story/dialogues.json`, `quests.json`, `balance.json`, `jobs.json`, `construction-hangout.json`, `authority-path.json`.

A dialogue has `id`, `location`, `trigger` (`proximity` or `enter`, plus condition strings), `nodes[]` with `speaker`, `text.{ru,en,da}`, `next`, and optional `choices`. A choice has `text`, `hint`, `requires`, `effects`, `next`.

Effects the engine actually applies (`applyEffects`): coins, xp, rep, energy, mood, rel, boolean `flag` (sets `story.flags[value] = true`), quest_start, beacon, unlock_location, material, start_duel, authority, gang_rank. Unknown effect types are ignored.

Conditions (`evalCondition`): `onboarding:done`, `flag:name`, `flag:!name`, `chapter>=N`, `quest:id=done|active`, `energy>=`, `coins>=`. Anything else returns true. The engine does not read `story.choices` from a condition. Choices are stored as `story.choices[questId:choiceId]` from quest-end choices, and dialogue choices fire effects immediately.

So: branching text exists. A later scene cannot ask "which of the three Razor paths did the player take?" unless that path also set a boolean flag. Flags cannot store a string. There is no companion-argument node and no "this hint is wrong" flag.

`js/story/npc-dialogue.mjs` picks the first dialogue in the current location whose nodes mention the NPC and whose conditions pass.

### Avatar, shop, room, city

Avatar: `js/char-select.mjs`, `js/avatar-look.mjs`, `js/avatar-mesh.mjs`. Hair colours cyan / pink / lime / violet. Styles bob / mohawk / pigtails / spikes. Skins porcelain / tan / brown / cyber. Jackets night / magenta / olive / ink / cyber. Accessories chain / choker / spikes / wings. Cyber-blue wings are the `CYBER_BLUE` preset. The studio frames the full body, including wing tips (`previewFit`). Saved on the player as `avatarLook` (`sanitizePlayer` in `js/game.js`).

Shop: `js/game.js` item tables. Clothes, chains, spells, pets, materials. Prices are game coins. The gang pin `mat_sticker` is price 0. Nothing in the shop table asks for a card. Several item `img` paths point at `imagine_images/LTPb8.jpg`, which is an Adopt Me poster. Do not use that image in the new chapter's art.

Room: `js/story/chapter-build.mjs` `ROOM_ITEMS` — lamp 15 coins at (2.35, −1.6), poster 20, neon arch 500. `js/world/room-furniture-catalog.mjs` lists sofa, beanbag, lamp, poster, rug, plant, bookshelf, guitar, TV, bed, neon sign, skull lamp. Placed pieces persist as `roomPieces` (max 12). The lamp is a mesh. It does not reveal writing.

City: `CITY_PLOTS` — arch 30, stall 45 at (0.2, 3.1), crypt 35. Meshes in `js/world3d.mjs` `plotMesh`. The stall is a wooden counter with a striped cloth. It has no radio. There is no generator object and no "restart" interaction. `chapter1-flow.mjs` `ensureCityKit` drops one crypt material into inventory so the old "three crypts" quest can move. That is not the tower generator.

### Language and controls

`js/i18n.js` has full `ru`, `en`, and `da` tables, including doors, duel words, and the tutorial crawl. Dialogue JSON uses the same three keys. `js/subscribe-i18n.js` exists beside it. Language buttons are in the page chrome. The preview playthrough already showed UI and voice following the language. Keep that.

Desktop: WASD / arrows, E, jump, orbit. `js/controls-3d.mjs`. While `#storyDialog`, `#chapterCrawl`, `#chapterEnding`, the how-to, or a modal is open, movement is zeroed.

Mobile: `js/touch-controls.mjs`. Joystick and E show under 900 px. The right half of the stage orbits the camera. The preview playthrough already used the joystick.

### Audio and picture

Bloom only: `js/world/atmosphere.mjs` (`UnrealBloomPass`). No rain particles, no weather state, no letterbox player, no shot list.

Voice samples under `docs/chapter1-story/voice-samples/` are five `ru-RU-SvetlanaNeural` Edge TTS files for the rejected lines. They are approval samples for that rejected script. They are not a licence to ship, and they are the wrong lines for this outline. Game default remains espeak until a separate voice GO.

## Outline, row by row

| Beat | Reuse | Adapt | Missing |
| --- | --- | --- | --- |
| Cold open, first 30 s | Black overlay pattern in `#chapterCrawl`. Roof geometry. Bloom. Guitar is not in the game audio. | The crawl must become a shot list: black, rain city, roof runner, earpiece line, cut, title card, fly to House 13, door, wall text. Skip stays disabled until the missing-person card has been on screen. | Camera path tool. Rain. A runner that is not the player. Earpiece mix. Self-opening door. Wall decal YOU'RE NEXT. |
| S1 House 13, escape tutorial | Room, avatar studio, E, joystick, lamp catalog, phone-sized props can be a TV from the furniture list. | Avatar creation is "you are in her room", then the phone, then the blackout, then the locked door. Movement and E are taught by those objects. | Phone video player. Blackout light state. A door that can lock (`PORTALS` are always open). Hidden writing on the lamp. Angelina hidden. |
| S2 two gangs | Street, city, Razor, Tony, Bolt, dialogue choices, `story.rel.gang_rust`. | Tony and Bolt stay city workers unless the screenplay recasts them. Add a second testimony that contradicts Razor's, and store which version the player heard. | Black Sparks as a faction: no name, no colours, no speaker, no `rel` key. Conflicting versions that change a later line. |
| S3 Razor: beat / outwit / negotiate | `dlg_razor_initiation` shape. `start_duel`. Boolean flags. Duel HUD. | New dialogue id. Three endings set `razor_path` and change a later scene. Keep the initiation-quest guard so a practice swing cannot finish the chapter. | String (or enum) flags. An outwit beat and a negotiate beat with a visible result. A duel the player can read. |
| S4 cemetery, CCTV, three symbols | Cemetery yard, crypt prop, gravedigger, chain duel if the screenplay still wants a fight here. | The yard is the mouth of the passage, not the practice-reward step. | Passage geometry. Three interactable symbols. A playback surface. A second figure in Razor's mask. The "she walked in on her own" fact stored as a flag. |
| S5 companion | Follower mesh, subtitle line, idle watch, RU/EN/DA text. | She returns on a comms channel, then appears. Hints can be wrong. Wrong hints set a flag the player can see (a bad door, a wasted coin, a line Razor throws back). | Comms UI. Argument nodes. A "hint was wrong" effect. She currently cannot be wrong: the guide always names the next button. |
| S6 00:13, generator, twist | City square, stall mesh, Razor duel, `#chapterEnding`, letterbox-sized overlays. | Stall purchase becomes uncovering the radio. One city build becomes "generator turns". Ending card becomes the screen line plus the Chapter 2 question. | Clock. Generator mesh and switch. Giant screen with her face. Two Angelinas in one shot (screen texture vs the body beside the player). Lights-out cue. |
| Lamp and stall have a story job | Both already spend coins and leave a mesh. Starting coins are 100. Lamp is 15. Stall is 45. The free pin is 0. | Lamp, once placed, turns on and shows the writing. Stall cloth hides the radio. Coins stay game coins. | Writing decal. Radio mesh. A rule that a player who is short on coins can still finish (earn beat already in `data/story/jobs.json`, or the story copies are free once the clue is found). |
| No real-money story gate | Shop prices are coins. Preview has no card form. | Keep it that way in the screenplay schema: an effect may not require a real-money sku. | A test that fails the build if a story-critical node has a real-money require. |

## What must stay

- The duel skip guard in `endFight` / `startQuest` (`js/game.js`, `js/story/story-engine.mjs`). A cemetery or practice swing must not set the finale flag.
- Language buttons, and UI plus subtitles following `ru` / `en` / `da`.
- E reaching Razor, with a marker.
- One reward per chapter ending. `js/story/reward-guard.mjs` `claimOnce`.
- Preview saves in `js/preview-save.js`. Production Firebase stays off the preview (`isPreviewBuild`).
- Meshy attribution for pink, cobalt, and mohawk.
- The rejected documents under `docs/chapter1-story/`. They are the record of what was rejected.

## What this audit does not do

It does not change gameplay, deploy the preview, or fill the screenplay. The next file is the build order. The dialogue file is the slot the screenplay drops into.
