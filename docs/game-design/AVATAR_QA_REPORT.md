# Avatar QA report (t204u + t206u)

**Branch:** `cursor/vertical-slice-ch1-d81d`  
**Last automated run:** t206u CYBER PUNK BLUE gate

## Mandatory QA hero — CYBER PUNK BLUE (t206u)

| Requirement | Catalog / value | Verification |
|-------------|-----------------|--------------|
| Blue mohawk | `hair_mohawk` + `electric_blue` | `buildLookFromConfig` hair `44607`, meshyStyle `mohawk` |
| Warm skin | `tone_02` (Тёплый) | tint `16755234` |
| Cyber Punk outfit | `style_cyber_punk` | jacket `2752872`, emissive from wings |
| Wings | `wings_01` | `look.wings` + cosmetic wing meshes on player actor |
| Player ≠ Angelina | `playerCutout: false`, `life_ch1_proxy` | preview test |
| Companion | `companionAngelinaSkin: "A"` | unchanged |

**Config JSON (canonical):**

```json
{
  "avatarVersion": 1,
  "qaPresetId": "cyber_punk_blue",
  "name": "CyberBlueQA",
  "skinTone": "tone_02",
  "hairStyle": "hair_mohawk",
  "hairColor": "electric_blue",
  "facePreset": "face_04",
  "bodyPreset": "body_mohawk",
  "outfitStyle": "style_cyber_punk",
  "accessories": ["wings_01"],
  "companionAngelinaSkin": "A"
}
```

### Acceptance tests (t206u checklist)

| # | Test | Status |
|---|------|--------|
| 1 | Full Character Studio UI path | PASS — `configureCyberPunkBlueStudio` |
| 2 | Blue mohawk + warm skin render | PASS — catalog + in-game look |
| 3 | Cyber Punk + wings applied | PASS — accessories persist + `_wings` mesh |
| 4 | 3D preview rotation | PASS — `__charSelectPreviewYaw` delta |
| 5 | Save + restart | PASS — `sanitizePlayer` + `punkme_avatar_v1` |
| 6 | Parameters persist after reload | PASS — `test-avatar-qa-t206.js` |
| 7 | Chapter 1 ordinary path with this hero | Scripted — `capture-ice-ordinary-path-footage.js` uses QA preset |
| 8 | Walk/run/build/Angelina UI | PASS (partial automation) — preview-build + ordinary capture |
| 9 | Wing clipping | Mitigated — wings behind shoulders, polygonOffset; no automated clip metric |
| 10 | RU / EN / DA studio UI | PASS — language toggle in t206 test |

### Diversity (t206u)

Six validated configs: `scripts/avatar-qa-presets.js` (`DIVERSITY_QA_CONFIGS` + `assertDiversityDistinct`).

### Evidence paths

| Artifact | Path |
|----------|------|
| Studio screenshot | `/opt/cursor/artifacts/avatar-qa-t206/t206-character-studio-cyber-punk-blue.png` |
| Gameplay screenshot | `/opt/cursor/artifacts/avatar-qa-t206/t206-gameplay-room-cyber-punk-blue.png` |
| QA JSON | `/opt/cursor/artifacts/avatar-qa-t206/t206-qa-report.json` |
| Desktop UNCUT (Ch1 + QA hero) | Pending — ordinary capture `ORDINARY_PASS=t206-cyber-blue` |

### Automated commands

```bash
export FIREBASE_EMULATOR=1 FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
node scripts/test-avatar-qa-t206.js
node scripts/test-avatar-catalog.js
node scripts/test-preview-build.js
```

## Automated (t204 baseline)

| Test | Result |
|------|--------|
| `test-avatar-catalog.js` | PASS |
| `test-life-ch1-slice-unit.js` | PASS |
| `test-preview-build.js` | PASS (`prodAttempts: 0`) |

## Defects / limits

- Wings are **cosmetic planes**, not rigged UGC wings — clipping risk reduced, not eliminated for all animations.
- Hair style labels vs unique meshes — procedural only (`AVATAR_ASSET_INVENTORY.md`).
- Full desktop UNCUT with QA hero — schedule after ordinary capture completes.
