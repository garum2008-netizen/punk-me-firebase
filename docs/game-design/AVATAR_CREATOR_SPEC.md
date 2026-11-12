# Avatar Creator — Product spec (t204u)

**Status:** Foundation implemented on `cursor/vertical-slice-ch1-d81d` · **not** production.

## Canon (t204u)

- **Player** creates a persistent **custom hero** (Character Studio at New Game).
- **Angelina** is a **separate companion/guide**; skins A/B/C-v2 are **companion** art, not the player mesh.

## Flow

New Game → **Character Studio** → 3D preview (rotate via idle sway) → **Use as test hero** → Chapter 1.

Wardrobe mid-game: Life Ch1 panel adjusts **companion Angelina** look; player edits via re-opening studio path (future wardrobe button).

## Config schema

```json
{
  "avatarVersion": 1,
  "name": "Player",
  "skinTone": "tone_08",
  "hairStyle": "hair_mohawk",
  "hairColor": "electric_blue",
  "facePreset": "face_04",
  "bodyPreset": "body_mohawk",
  "outfitStyle": "style_cyber_punk",
  "accessories": ["wings_01"],
  "companionAngelinaSkin": "A"
}
```

Validation: `js/avatar/avatar-catalog.mjs` · catalog: `data/story/avatar-catalog.json`.

## Technical

- **Skeleton:** existing Meshy punk heroes (`vienna`, `mohawk`, `cobalt`, `razor`) as body presets.
- **Look:** procedural tint/hair/jacket from catalog → `createCc0Actor` at runtime (`world3d.mjs` player path).
- **Persistence:** `me.avatarConfig`, `me.heroName`, `localStorage` `punkme_avatar_v1`.
- **Animations:** existing walk/run/idle on body mesh.

## Limits / missing (honest)

- No separate hair meshes per style ID (procedural `hairStyle` only).
- Wings/backpack are **emissive/flag** placeholders, not rigged attachments yet.
- Face/eyes sliders not implemented — **face preset** is metadata for future.
- Gender-neutral: no gender gates on catalog.

## Premium (proposal only)

See `COSMETIC_CATALOG.md` — not enabled.
