#!/usr/bin/env node
import { buildCreateAgentPayload, loadRegistries, resolvePlacementForMission, resolvePlacementForTags } from '../lib/resolve-placement.mjs';
import { dispatchMission } from '../lib/dispatch-agent.mjs';
import { verifyLocalExecution } from '../lib/verify-local-execution.mjs';

function usage() {
  console.error(`Usage:
  node cursor-commander/bin/commander.mjs resolve --mission <id>
  node cursor-commander/bin/commander.mjs resolve --tags mac,emma
  node cursor-commander/bin/commander.mjs dispatch --mission <id> [--execute]
  node cursor-commander/bin/commander.mjs preflight --mission <id>
`);
  process.exit(2);
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const flags = { execute: false, mission: null, tags: null };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--execute') flags.execute = true;
    else if (a === '--mission') flags.mission = rest[++i];
    else if (a === '--tags') flags.tags = rest[++i].split(',').map((s) => s.trim());
  }
  return { cmd, flags };
}

const { cmd, flags } = parseArgs(process.argv.slice(2));
if (!cmd) usage();

const registries = loadRegistries();

if (cmd === 'resolve') {
  if (flags.mission) {
    const out = resolvePlacementForMission(flags.mission, registries);
    console.log(JSON.stringify(out, null, 2));
  } else if (flags.tags) {
    const out = resolvePlacementForTags(flags.tags, registries);
    console.log(JSON.stringify(out, null, 2));
  } else {
    usage();
  }
} else if (cmd === 'dispatch') {
  if (!flags.mission) usage();
  const payload = buildCreateAgentPayload(flags.mission);
  const result = await dispatchMission(payload, { execute: flags.execute });
  console.log(JSON.stringify(result, null, 2));
  if (!flags.execute) {
    console.error('\n(dry-run only — pass --execute with CURSOR_USER_API_KEY to create the agent on inna-mac)');
  }
} else if (cmd === 'preflight') {
  if (!flags.mission) usage();
  const { mission } = resolvePlacementForMission(flags.mission, registries);
  const result = verifyLocalExecution(mission.preflight || {});
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
} else {
  usage();
}
