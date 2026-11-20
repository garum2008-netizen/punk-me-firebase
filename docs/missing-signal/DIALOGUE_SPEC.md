# Dialogue spec — slot for the screenplay

The CEO is writing the screenplay and the character bible. This file is the format those documents must fit so a later loader can run them. It does not contain the story. Every sample sentence below is the token `[PLACEHOLDER]` and is not a line of the game.

The empty contract is [screenplay.slot.json](screenplay.slot.json). The game does not fetch it. `js/story/story-engine.mjs` loads only the files named in `loadStoryData()`. When a GO adds a loader, the real file path is:

`data/story/missing-signal/screenplay.json`

Until that GO, do not put a screenplay under `data/`.

## What the current engine can already load

`data/story/dialogues.json` is the live format. A node can carry `text` in `ru`, `en`, and `da`, a `speaker`, a `next`, and `choices` with `effects`. That shape is the part worth keeping.

What it cannot do, and the new file must do:

| Need | Live engine | Screenplay file |
| --- | --- | --- |
| Boolean flag | `effects: [{ "type": "flag", "value": "joined_gang" }]` sets true | `set_flag` with a string value, so `razor_path` can be `beat`, `outwit`, or `negotiate` |
| Read a choice later | Conditions cannot see `story.choices` | `when` can require `flag:razor_path=outwit` |
| Unknown condition | `evalCondition` returns true | Unknown `when` fails the file at load |
| Cinematic before gameplay | `#chapterCrawl` is four paragraphs | `kind: "cinematic"` beats with a duration |
| A hint that is wrong | Guide text is always the next step | `trust: "right"` or `trust: "wrong"` on a node |
| Companion vs recording | One follower from the first frame | `presence: "absent"`, `"voice"`, `"comms"`, or `"body"` |
| Real-money gate | Not in the effect list | `require` may not use a real-money sku. The loader rejects that type. |

Boolean flags and `start_duel` stay valid effects so existing calls can be wrapped. `joined_gang` is not set by any placeholder and is not the chapter's win flag.

## File shape

```json
{
  "id": "missing-signal-ch1",
  "version": 1,
  "primary": "ru",
  "locales": ["ru", "en", "da"],
  "title": {
    "ru": "Дом, которого нет",
    "en": "House 13: The Missing Signal",
    "da": "[PLACEHOLDER]"
  },
  "characters": [],
  "flags": [],
  "scenes": [],
  "dialogues": [],
  "cinematics": [],
  "encounters": []
}
```

`primary` is `ru`. Every player-facing string is an object with all three locale keys. English and Danish are full lines, not summaries. A missing locale fails the file.

`title.da` stays `[PLACEHOLDER]` until the screenplay names it. The owner supplied the Russian and English titles only.

## Characters

Ids the outline already uses. The bible can add people. This list does not invent a Black Sparks roster.

| id | Role in the format | Body the game already has |
| --- | --- | --- |
| `player` | The teen in House 13. Avatar look is `avatarLook`, not a screenplay line. | `js/char-select.mjs` |
| `angelina` | The person on the comms and, from scene 5, the body beside the player. | `punk_pink.glb` follower, hidden until `presence: "body"` |
| `angelina_screen` | The face on the tower at the ending. A different speaker id, so subtitles can say the screen is talking. | A texture on a city screen. Not a second gameplay NPC. |
| `razor` | Rusty Chains. Beat, outwit, or negotiate. | `razor.glb` |
| `rusty_chains` | Faction id for testimony. | The street and the patch |
| `black_sparks` | Faction id. Speakers are added by the bible as their own ids. | No model yet |

A character entry:

```json
{
  "id": "angelina",
  "name": { "ru": "[PLACEHOLDER]", "en": "[PLACEHOLDER]", "da": "[PLACEHOLDER]" },
  "faction": "[PLACEHOLDER]",
  "body": "punk_pink",
  "presence_default": "absent"
}
```

## Flags

Flags are the memory of the chapter. The screenplay declares every flag it writes. The loader rejects an effect that sets an undeclared flag.

Proposed ids, for the bible to keep or rename. They are keys, not plot text.

| id | Values | Set when |
| --- | --- | --- |
| `signal_heard` | `true` / unset | The cold open finishes the earpiece |
| `missing_card_seen` | `true` / unset | The missing-person card has been on screen |
| `phone_watched` | `true` / unset | Scene 1 video ends |
| `door_unlocked` | `true` / unset | The escape beat opens the street door |
| `writing_seen` | `true` / unset | The lamp reveals the writing |
| `chains_version` | string id of the testimony node | Scene 2, Rusty Chains |
| `sparks_version` | string id of the testimony node | Scene 2, Black Sparks |
| `razor_path` | `beat`, `outwit`, `negotiate` | Scene 3 choice |
| `symbols` | `0`–`3` | Each cemetery symbol |
| `cctv_seen` | `true` / unset | The recording finishes |
| `companion` | `true` / unset | Scene 5 allows her body |
| `hint_wrong_followed` | `true` / unset | The player acted on a `trust: "wrong"` hint |
| `generator_on` | `true` / unset | The tower build |
| `radio_found` | `true` / unset | The stall is used as the radio |
| `twist_seen` | `true` / unset | The ending card |

`story.flags` today stores booleans. The loader stores strings in the same object. `flag:!name` remains "unset or false". `flag:razor_path=outwit` is the new comparison. Both are saved inside `player.story`, which `sanitizePlayer` already persists.

## Scenes

One scene per outline beat. `objective` is the single line the HUD shows. The words are the screenplay's.

```json
{
  "id": "s1_house",
  "order": 1,
  "location": "room",
  "objective": { "ru": "[PLACEHOLDER]", "en": "[PLACEHOLDER]", "da": "[PLACEHOLDER]" },
  "entry": "cin_arrive_house",
  "complete_when": ["flag:door_unlocked"],
  "on_complete_set": []
}
```

`location` must be an existing id (`room`, `street`, `cemetery`, `city`, `roof`, `parkour`) or an id this chapter adds (`passage`, `tower`). Adding `passage` or `tower` is a geometry task in the implementation plan, not a line of dialogue.

`complete_when` uses the same `when` grammar as nodes. A scene with an empty `complete_when` fails validation, so a scene cannot be "done" by walking in.

Outline ids reserved:

| id | location | What has to become true |
| --- | --- | --- |
| `s0_cold_open` | cinematic, then `room` | `missing_card_seen` |
| `s1_house` | `room` | `door_unlocked` |
| `s2_gangs` | `street` and `city` | both version flags set |
| `s3_razor` | `street` | `razor_path` set |
| `s4_cemetery` | `cemetery`, then `passage` | `cctv_seen` and `symbols` at 3 |
| `s5_companion` | wherever the screenplay sends her | `companion` |
| `s6_finale` | `city` / `tower` | `twist_seen` |

## Nodes and choices

```json
{
  "id": "dlg_PLACEHOLDER",
  "scene": "s3_razor",
  "location": "street",
  "speaker": "razor",
  "when": ["flag:phone_watched", "flag:!twist_seen"],
  "priority": 10,
  "nodes": [
    {
      "id": "n1",
      "speaker": "razor",
      "presence": "body",
      "text": { "ru": "[PLACEHOLDER]", "en": "[PLACEHOLDER]", "da": "[PLACEHOLDER]" },
      "choices": [
        {
          "id": "beat",
          "text": { "ru": "[PLACEHOLDER]", "en": "[PLACEHOLDER]", "da": "[PLACEHOLDER]" },
          "when": [],
          "effects": [
            { "type": "set_flag", "id": "razor_path", "value": "beat" },
            { "type": "start_encounter", "id": "enc_razor" }
          ],
          "next": "END"
        },
        {
          "id": "outwit",
          "text": { "ru": "[PLACEHOLDER]", "en": "[PLACEHOLDER]", "da": "[PLACEHOLDER]" },
          "effects": [
            { "type": "set_flag", "id": "razor_path", "value": "outwit" },
            { "type": "reveal", "id": "PLACEHOLDER_prop" }
          ],
          "next": "END"
        },
        {
          "id": "negotiate",
          "text": { "ru": "[PLACEHOLDER]", "en": "[PLACEHOLDER]", "da": "[PLACEHOLDER]" },
          "effects": [
            { "type": "set_flag", "id": "razor_path", "value": "negotiate" }
          ],
          "next": "n_negotiate"
        }
      ]
    }
  ]
}
```

`when` is AND. `flag:!name` means the flag is unset. `flag:id=value` matches a string. `scene:s3_razor` is allowed once scenes exist. Coins and energy requirements stay `coins>=N` and `energy>=N`.

`presence` tells the spawn code what to show during the line: `absent` (subtitle only), `voice` (earpiece, no body), `comms` (the comms widget, no body), `body` (the mesh).

`trust` on a hint node is `right` or `wrong`. Following a wrong node fires `hint_wrong_followed` and the effects listed. The player still continues. A wrong hint is not a fail-the-chapter state.

`next: "END"` closes the widget. Any other `next` must be a node id in the same dialogue.

## Effects

Allowed types:

| type | fields | Result the player can see |
| --- | --- | --- |
| `set_flag` | `id`, `value` | Stored. A later `when` can read it. |
| `clear_flag` | `id` | Removed. |
| `start_encounter` | `id` | Opens an encounter declared in `encounters`. |
| `start_cinematic` | `id` | Plays a cinematic. |
| `reveal` | `id` | Shows a prop id that already exists in the scene data (writing, radio, symbol, screen). |
| `unlock_portal` | `from`, `to` | Opens one portal. Scene 1 uses this for the street door. |
| `set_presence` | `character`, `presence` | Shows or hides a body. |
| `objective` | `text` | Replaces the single HUD objective. |
| `coins` | `value` | Game coins only. Negative values are spends. |
| `start_duel` | `id` | Existing duel, only from an encounter, not from a mash prompt. |

Rejected types, file fails to load:

- any sku, card, or real-money field
- `joined_gang` as a scene-1 or scene-3 effect
- an effect type the loader does not list

## Cinematics

The cold open and the ending are cinematics. Beats play in order. The game drops the player into `then_location` only after the last beat.

```json
{
  "id": "cin_cold_open",
  "skippable_after": "beat_missing_card",
  "then_location": "room",
  "then_set": [{ "type": "set_flag", "id": "signal_heard", "value": true }],
  "beats": [
    {
      "id": "beat_black",
      "visual": "black",
      "audio": "[PLACEHOLDER_or_empty]",
      "text": { "ru": "[PLACEHOLDER]", "en": "[PLACEHOLDER]", "da": "[PLACEHOLDER]" },
      "speaker": "angelina",
      "channel": "earpiece",
      "duration_ms": 4000
    },
    {
      "id": "beat_missing_card",
      "visual": "card",
      "card": { "ru": "[PLACEHOLDER]", "en": "[PLACEHOLDER]", "da": "[PLACEHOLDER]" },
      "duration_ms": 3500
    }
  ]
}
```

`skippable_after` is a beat id. Skip does nothing before that beat. For the cold open that beat is the missing-person card, so the 30 second gate cannot be skipped away. `duration_ms` is the authoring length, not a difficulty timer.

`visual` is one of `black`, `card`, `camera`, `still`. `camera` names a shot id a later art pass binds to a frame. `still` names an image path under `docs/missing-signal/` or `assets/` that already exists. The loader does not call an image API.

`audio` is empty, an espeak id, or a file the voice GO has already approved. Empty means subtitles only. This spec does not approve a new voice.

## Encounters

```json
{
  "id": "enc_razor",
  "opponent": "razor",
  "location": "street",
  "tell_ms": 600,
  "actions": ["chain", "block", "dodge"],
  "win_when": "tell_answered",
  "on_win": [{ "type": "set_flag", "id": "razor_path", "value": "beat" }],
  "on_lose": [{ "type": "objective", "text": { "ru": "[PLACEHOLDER]", "en": "[PLACEHOLDER]", "da": "[PLACEHOLDER]" } }]
}
```

`tell_ms` is the wind-up before the hit. `win_when: "tell_answered"` means the win condition is answering that wind-up, not a count of Chain presses. `on_lose` returns the player to the same choice, including outwit and negotiate. Losing does not end the chapter.

## Items that carry plot

Declared next to scenes so a purchase cannot be "just decor":

```json
{
  "id": "lamp",
  "scene": "s1_house",
  "story_job": "reveal_writing",
  "coins": 0,
  "real_money": false,
  "reveal": "writing_decal"
}
```

```json
{
  "id": "stall",
  "scene": "s6_finale",
  "story_job": "cover_radio",
  "coins": 0,
  "real_money": false,
  "reveal": "radio"
}
```

`real_money` must be false. `coins` may be 0, or a number the scene has already granted. The implementation plan's coin rule is the check.

## Validation, when a loader exists

A screenplay is loadable when:

- `version` is 1 and `primary` is `ru`
- every `text` and `card` and `objective` has `ru`, `en`, and `da`, and none of them is empty
- no player-facing string is exactly `[PLACEHOLDER]`
- every `speaker` and `character` id is declared
- every `set_flag` id is declared, and the value is one of the declared values
- every `when` clause is a known grammar
- every `next` exists
- every scene has a non-empty `complete_when`
- `s0_cold_open` exists, its skip beat is the missing-person card, and the sum of beat durations before that card is 30 seconds or less
- no effect contains a real-money field
- `razor_path` is written by three different choices
- at least one node has `trust: "wrong"`
- the last scene sets `twist_seen` and its cinematic ends on a Chapter 2 card id

The current `[PLACEHOLDER]` slot fails this on purpose. Filling it is the screenplay, not this document.

## How a later loader should sit in the code

Not now. When a GO says to wire it:

- Read `data/story/missing-signal/screenplay.json` from a new function beside `loadStoryData` in `js/story/story-engine.mjs`.
- Keep `findNpcDialogue` in `js/story/npc-dialogue.mjs` for old trees. The new chapter queries the screenplay first and does not open `dlg_razor_initiation`.
- Extend `applyEffects` with `set_flag` value support, fail closed on unknown `when`.
- Teach `#chapterCrawl` to play `cinematics` instead of the four tutorial paragraphs in `openCrawl()`.
- Teach `guideKey()` in `js/story/chapter1-flow.mjs` to show `objective` and to stay quiet when a dialogue is open.
- Map `start_encounter` onto `startDuel3D` only for `actions` that include a fight, and only with the tell.
- Map `set_presence` onto the Angelina spawn in `js/world3d.mjs`.

The tutorial JSON stays on disk so the old preview SHA still makes sense in git history. The new play id does not start those quests.
