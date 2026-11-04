# Angelina skin candidate review (not shipped)

These WebPs are **not** referenced by `angelina-skin-manifest.json` or the game.

## Parameters

- `thresh` = 0.8
- `inset` = 1
- Semi lock: `alpha_ref ∈ [0.75, 0.80)` and `dist_in ≥ 2` → α=255 + Lanczos RGB
- Component-local greyMatt recolor (nearest core, α unchanged): A portrait/world (browser+lanczos clusters); C world (lanczos only)
- Semi exterior decontam: **off**

## Gate results

```json
{
  "parameters": {
    "thresh": 0.8,
    "inset": 1,
    "semiLockBand": "alpha_ref in [0.75,0.80) and dist_in>=2",
    "componentHaloFix": "A portrait/world browser+lanczos; C world lanczos greyMatt CC recolor",
    "semiExteriorDecontam": false,
    "nearestCoreMinLum": 60
  },
  "resizePipeline": {
    "portraitWorldRgbBeforeThisIteration": "straight RGBA Lanczos via PIL (not premultiplied)",
    "portraitWorldRgbNow": "premultiplied \u03b1 Lanczos on R,G,B and separate \u03b1, unpremultiply; then clamp semi + 2px opaque ring to source 3\u00d73 min/max per channel",
    "sixd21AlphaMatteResizeInCompose": "single-channel \u03b1 Lanczos to match variant size (premult N/A)"
  },
  "alpha255Share": {
    "A_portrait": 0.9301,
    "A_world": 0.9136,
    "B_portrait": 0.9314,
    "B_world": 0.9107,
    "C_portrait": 0.9351,
    "C_world": 0.9138
  },
  "minAlpha255Share": 0.9107,
  "alpha255ShareGate": true,
  "silhouetteNearWhite": {
    "A_portrait": 0,
    "A_world": 0,
    "B_portrait": 0,
    "B_world": 0,
    "C_portrait": 0,
    "C_world": 0
  },
  "silhouetteGate": true,
  "haloBadPx": {
    "A_portrait": {
      "browser": 8,
      "lanczos": 1
    },
    "A_world": {
      "browser": 15,
      "lanczos": 14
    },
    "B_portrait": {
      "browser": 1,
      "lanczos": 0
    },
    "B_world": {
      "browser": 1,
      "lanczos": 0
    },
    "C_portrait": {
      "browser": 2,
      "lanczos": 2
    },
    "C_world": {
      "browser": 2,
      "lanczos": 6
    }
  },
  "haloZeroGate": false,
  "passesAllGates": false
}
```

**Ship decision:** KEEP ab6fa302 (one or more gates fail)

**npm ci && npm run test:life-ch1** (shipped ab6fa302): exit **1** (angelina-skin-halo.js on baseline).
