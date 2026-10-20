# Meshy character GLBs

| Hero ID | File | Notes |
|---------|------|--------|
| `vienna` | `punk_pink.glb` | **Neon Rebel** — canonical Vienna (original texture, no tint) |
| `razor` | `razor.glb` → fallback `punk_pink.glb` + orange tint |
| `cobalt` | `cobalt.glb` → fallback `punk_pink.glb` + green tint |
| `mohawk` | `mohawk.glb` | **Inna Meshy** — green-haired punk (original texture, no tint) |

Drop a new `assets/models/meshy/<heroId>.glb`, then add `"<heroId>"` to `shipped.json` (avoids 404 probes for stand-ins).

License: see `LICENSE.txt` (Meshy, CC BY 4.0).
