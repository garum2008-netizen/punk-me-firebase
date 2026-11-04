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
    "semiExteriorDecontam": false
  },
  "alpha255Share": {
    "A_portrait": 0.9339,
    "A_world": 0.9251,
    "B_portrait": 0.929,
    "B_world": 0.9082,
    "C_portrait": 0.934,
    "C_world": 0.9145
  },
  "minAlpha255Share": 0.9082,
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
      "browser": 3,
      "lanczos": 17
    },
    "A_world": {
      "browser": 3,
      "lanczos": 7
    },
    "B_portrait": {
      "browser": 0,
      "lanczos": 0
    },
    "B_world": {
      "browser": 0,
      "lanczos": 0
    },
    "C_portrait": {
      "browser": 0,
      "lanczos": 0
    },
    "C_world": {
      "browser": 0,
      "lanczos": 6
    }
  },
  "haloZeroGate": false,
  "passesAllGates": false
}
```

**Ship decision:** KEEP ab6fa302 (one or more gates fail)
