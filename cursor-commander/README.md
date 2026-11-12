# Cursor Commander (worker-aware dispatch)

Routes Mac-only missions (for example **EMMA-RECOVERY-20261111**) to the registered My Machines worker **`inna-mac`**, never to the default Linux cloud VM.

## Why this exists

Web and automation launches often omit worker placement. Cursor then sets `usePrivateWorker: false` and `privateWorkerId: null`. Commander builds the supported **Cloud Agents API v1** body:

```json
{
  "env": { "type": "machine", "name": "inna-mac" },
  "repos": [{ "url": "https://github.com/garum2008-netizen/punk-me-firebase", "startingRef": "main" }]
}
```

Internal metadata maps `privateWorkerId` `d9254d28-f188-40bb-bd12-e5dd1104add2` for verification only — **v1 create does not accept `privateWorkerId` in the request body**; use `env.name`.

## Registries

| File | Purpose |
|------|---------|
| `workers.registry.json` | Workers, `cursorEnv`, `forbidCloudFallback` |
| `missions.registry.json` | Mission → placement, preflight paths, backup target |
| `missions/*.prompt.md` | Prompt text dispatched to the agent |

**Autopilot:** `tagRouting` sends any mission tagged `mac`, `darwin`, `emma`, or `audiobook` to `inna-mac`.

## CLI

```bash
# Show resolved worker for a mission
node cursor-commander/bin/commander.mjs resolve --mission EMMA-RECOVERY-20261111

# Dry-run API payload (default)
node cursor-commander/bin/commander.mjs dispatch --mission EMMA-RECOVERY-20261111

# Create agent on inna-mac (requires CURSOR_USER_API_KEY on your Mac or in Cursor secrets)
node cursor-commander/bin/commander.mjs dispatch --mission EMMA-RECOVERY-20261111 --execute

# Local preflight on the machine where the command runs (exit 1 on Linux cloud)
node cursor-commander/bin/commander.mjs preflight --mission EMMA-RECOVERY-20261111
```

npm: `npm run commander:dispatch -- --mission EMMA-RECOVERY-20261111`

## Mac worker registration

`inna-mac` must stay connected with a repo that matches dispatch:

```bash
cd ~/Developer/emma-mystical-stories   # or a punk-me-firebase clone
agent login
agent worker start --name "inna-mac"
```

Team dashboard: **Allow self-hosted machines** and **Remote control** enabled.

## Automations

In the Cursor automation editor, choose **My Machines → inna-mac**, or wire this CLI in a scheduled Mac `launchd` job / git hook with `CURSOR_USER_API_KEY`.

Slack/GitHub triggers: `@Cursor worker=inna-mac <prompt>`.

## Verify a run

After `--execute`, open the returned agent URL and confirm run metadata shows a self-hosted worker (not Linux cloud). On the worker:

```bash
uname -s   # Darwin
```

Preflight paths for Emma recovery are listed in `missions.registry.json`.
