# ONE-SHOT Emma recovery on `inna-mac` (no launchd)

Controlled single run. No scheduled or recurring dispatch.

## Preconditions

- [PR #67](https://github.com/garum2008-netizen/punk-me-firebase/pull/67) merged to `main` (Commander on disk).
- `inna-mac` online in Cursor → My Machines.
- `CURSOR_USER_API_KEY` only in **Cursor Secrets** or macOS Keychain — never in shell history, repo, or chat.

## 1. Register worker from Emma project

```bash
cd ~/Developer/emma-mystical-stories
agent login
agent worker start --name "inna-mac"
```

Leave that terminal open while the mission runs.

## 2. Update Commander on Mac

```bash
cd ~/Developer/punk-me-firebase   # or your clone path
git pull origin main
```

## 3. Preflight (must exit 0)

```bash
node cursor-commander/bin/commander.mjs preflight --mission EMMA-RECOVERY-20261111
```

Expect Darwin and both paths present.

## 4. One-shot dispatch (creates a new Cloud Agent on the Mac)

```bash
node cursor-commander/bin/commander.mjs dispatch --mission EMMA-RECOVERY-20261111 --execute
```

Open the returned agent URL. Confirm metadata: **Darwin**, `privateWorkerId` = `d9254d28-f188-40bb-bd12-e5dd1104add2`.

## 5. Checkpoint (non-destructive mirror)

On that Mac agent session:

```bash
bash cursor-commander/scripts/mac-emma-recovery-checkpoint.sh
```

## 6. Private backup + SHA-256

```bash
# After verifying checkpoint manifest
cd ~/Developer/inna-ai-backend
git pull origin main
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DEST="private/emma-recovery-backup/drops/${STAMP}"
mkdir -p "${DEST}"
# Copy only authorized artifacts from checkpoint mirror (not raw overwrite of sources)
cp ~/Developer/emma-mystical-stories/.cursor-checkpoints/*/manifest.json "${DEST}/"
shasum -a 256 "${DEST}"/* > "${DEST}/SHA256SUMS.txt"
git add private/emma-recovery-backup/
git commit -m "chore(emma): verified recovery drop ${STAMP}"
git push origin main
```

## STOP (report BLOCKED)

- Linux execution target
- `privateWorkerId` null
- Worker offline
- Missing Emma paths
- Any step that would overwrite sources without a checkpoint
