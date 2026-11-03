# Proposed RTDB rules — `players/$uid/lifeCh1`

**Do not merge until Inna owner GO.** Production deploy of `database.rules.json` triggers `.github/workflows/deploy-database-rules.yml`.

## Branch

Open **Draft PR** from `cursor/life-ch1-database-rules-1430` → `main` (rules-only).

## Block added (same as former PR #52 snippet)

Under `players/$uid`, validate optional `lifeCh1` object: `v === 1`, boolean `active` / `completed`, `stepIndex` 0–12, optional `angelinaSkin` A|B|C, `playerCutout`, `flags`, `claimedSteps` with key patterns; reject unknown keys.

See `database.rules.json` on that branch for the full JSON.

## PR #52 (vertical slice)

Keeps **`database.rules.json` identical to `main`**. On production host, `?lifeCh1Slice=1` and `?lifeCh1E2e=1` are inert — clients must not write `lifeCh1` to RTDB until this rules PR merges.
