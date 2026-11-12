# READY FOR OWNER ACCEPTANCE — Chapter 1 + Avatar Creator (t204u)

**Branch:** [`cursor/vertical-slice-ch1-d81d`](https://github.com/garum2008-netizen/punk-me-firebase/tree/cursor/vertical-slice-ch1-d81d)  
**Status:** `READY_FOR_OWNER_ACCEPTANCE` (t204u P0 Character Studio foundation + t203 Ch1 path).  
**Merge / production / App Store / payments:** **HOLD**

## Canon (t204u — owner 2026-11-12)

- **Player** = custom hero (Character Studio, persistent `avatarConfig`).
- **Angelina** = **companion** (skins A/B/C-v2, guide, wardrobe portraits only).
- See `docs/story/STORY_BIBLE.md`, `docs/game-design/AVATAR_CREATOR_SPEC.md`.

## Live preview (only)

| Item | Value |
|------|--------|
| URL | https://punk-me-preview-552740b.pages.dev |
| Update | New Agent Store tarball → Game Bot redeploys **same** project |
| Do not touch | `punk-me-ch1-preview` (empty by policy) |

## Acceptance gates

| Gate | Status | Evidence |
|------|--------|----------|
| Character Studio at new game | ✅ | `js/avatar/character-studio.mjs`, preview / Life Ch1 char select |
| Catalog + validation | ✅ | `data/story/avatar-catalog.json`, `scripts/test-avatar-catalog.js` |
| Save / reload avatar | ✅ | `me.avatarConfig`, `punkme_avatar_v1`, preview-build reload test |
| Companion vs player split | ✅ | `playerCutout: false`, wardrobe = Angelina look |
| Ch1 automated path | ✅ | `scripts/test-preview-build.js` (`prodAttempts: 0`) |
| Story bible t204u | ✅ | `STORY_BIBLE.md`, `CHAPTER_01_STORY_ARC.md` |
| Design docs | ✅ | `docs/game-design/AVATAR_*`, `COSMETIC_CATALOG.md` |
| Six sample configs | ✅ | `docs/game-design/sample-avatars-t204.json` |
| Desktop UNCUT (t203 baseline) | ✅ | `EVIDENCE_INTEGRITY.json` — **new UNCUT through Character Studio pending** |

## Missing assets (honest)

- Per-style hair meshes, rigged wings/backpacks, face morphs, 20 discrete clothing meshes (see `AVATAR_ASSET_INVENTORY.md`).
- Full Roblox-level creator UI density — foundation + procedural tint/body presets ship first.

## Owner playtest

1. Open preview → **Character Studio** (name hero, randomize, confirm).  
2. Complete onboarding step 7 (city + crypt).  
3. Life Ch1 wardrobe: changes **Angelina** portraits, not your 3D hero.  
4. Judge visual diversity vs default pink punk.

## Game Bot

After owner accepts candidate SHA: `scripts/package-preview-agent-store.sh` → store path + SHA in `PREVIEW_DEPLOY_FOR_GAME_BOT.md`.
