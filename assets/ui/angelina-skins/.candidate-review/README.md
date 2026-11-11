# Angelina skin candidate review (not shipped)

WebPs are **not** in `angelina-skin-manifest.json` or the game.

## Ablation (review config: thresh 0.80, inset 1, semi band, CC fix)

### R1 — Reference: straight RGBA Lanczos; no clamp; no lum≥60 nearest-core

| Variant | α=255 share | Sil NW | Halo browser | Halo lanczos |
|---------|-------------|--------|--------------|--------------|
| A_portrait | 93.39% | 0 | 3 | 17 |
| A_world | 92.51% | 0 | 3 | 7 |
| B_portrait | 92.90% | 0 | 0 | 0 |
| B_world | 90.82% | 0 | 0 | 0 |
| C_portrait | 93.40% | 0 | 0 | 0 |
| C_world | 91.45% | 0 | 0 | 6 |

Gates: minα=0.9082 (PASS), silhouette (PASS), haloZero (FAIL), **all (FAIL)** (haloTotal=36)

### R2 — Premultiplied Lanczos only

| Variant | α=255 share | Sil NW | Halo browser | Halo lanczos |
|---------|-------------|--------|--------------|--------------|
| A_portrait | 93.71% | 0 | 21 | 7 |
| A_world | 92.60% | 0 | 16 | 14 |
| B_portrait | 93.00% | 0 | 1 | 0 |
| B_world | 90.91% | 0 | 2 | 0 |
| C_portrait | 93.51% | 0 | 6 | 5 |
| C_world | 91.49% | 0 | 1 | 20 |

Gates: minα=0.9091 (PASS), silhouette (PASS), haloZero (FAIL), **all (FAIL)** (haloTotal=93)

### R3 — R2 + nearest-core lum≥60 filter

| Variant | α=255 share | Sil NW | Halo browser | Halo lanczos |
|---------|-------------|--------|--------------|--------------|
| A_portrait | 93.71% | 0 | 21 | 7 |
| A_world | 92.60% | 0 | 16 | 14 |
| B_portrait | 93.00% | 0 | 1 | 0 |
| B_world | 90.91% | 0 | 1 | 0 |
| C_portrait | 93.51% | 0 | 6 | 5 |
| C_world | 91.49% | 0 | 1 | 16 |

Gates: minα=0.9091 (PASS), silhouette (PASS), haloZero (FAIL), **all (FAIL)** (haloTotal=88)

### R4 — R2 + clamp semi only (no opaque ring)

| Variant | α=255 share | Sil NW | Halo browser | Halo lanczos |
|---------|-------------|--------|--------------|--------------|
| A_portrait | 93.03% | 0 | 8 | 1 |
| A_world | 91.38% | 0 | 15 | 13 |
| B_portrait | 93.14% | 0 | 1 | 0 |
| B_world | 91.07% | 0 | 1 | 0 |
| C_portrait | 93.52% | 0 | 2 | 2 |
| C_world | 91.37% | 0 | 2 | 2 |

Gates: minα=0.9107 (PASS), silhouette (PASS), haloZero (FAIL), **all (FAIL)** (haloTotal=47)

## Selected for `.candidate-review/` bundle: **R1**

```json
{
  "row": "R1",
  "description": "Reference: straight RGBA Lanczos; no clamp; no lum\u226560 nearest-core",
  "minAlpha255Share": 0.9082,
  "alpha255ShareGate": true,
  "silhouetteGate": true,
  "haloZeroGate": false,
  "passesAllGates": false,
  "haloTotalBadPx": 36,
  "alpha255Share": {
    "A_portrait": 0.9339,
    "A_world": 0.9251,
    "B_portrait": 0.929,
    "B_world": 0.9082,
    "C_portrait": 0.934,
    "C_world": 0.9145
  },
  "silhouetteNearWhite": {
    "A_portrait": 0,
    "A_world": 0,
    "B_portrait": 0,
    "B_world": 0,
    "C_portrait": 0,
    "C_world": 0
  },
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
  "resize": {
    "premultipliedLanczos": false,
    "clamp": "none"
  },
  "nearestCoreFilterLum60": false,
  "ablationBestRow": "R1",
  "ablationRows": [
    "R1",
    "R2",
    "R3",
    "R4"
  ]
}
```

**Ship decision:** KEEP ab6fa302
