import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadJson(name) {
  return JSON.parse(readFileSync(join(ROOT, name), 'utf8'));
}

export function loadRegistries() {
  return {
    workers: loadJson('workers.registry.json'),
    missions: loadJson('missions.registry.json'),
  };
}

export function resolvePlacementForMission(missionId, { workers, missions }) {
  const mission = missions.missions[missionId];
  if (!mission) {
    throw new Error(`Unknown mission: ${missionId}`);
  }
  const placementKey = mission.placement || missions.defaultPlacement;
  const placement = workers.placements[placementKey];
  if (!placement) {
    throw new Error(`Unknown placement: ${placementKey}`);
  }
  const worker = workers.workers[placement.workerRef];
  if (!worker) {
    throw new Error(`Unknown worker ref: ${placement.workerRef}`);
  }
  return { mission, placement, worker, placementKey };
}

export function resolvePlacementForTags(tags, { workers, missions }) {
  const set = new Set((tags || []).map((t) => String(t).toLowerCase()));
  for (const rule of missions.tagRouting || []) {
    const any = rule.tagsAny || [];
    if (any.some((t) => set.has(String(t).toLowerCase()))) {
      const placementKey = rule.placement;
      const placement = workers.placements[placementKey];
      const worker = workers.workers[placement.workerRef];
      return { placement, worker, placementKey, matchedRule: rule };
    }
  }
  return null;
}

export function buildCreateAgentPayload(missionId, options = {}) {
  const registries = loadRegistries();
  const { mission, worker } = resolvePlacementForMission(missionId, registries);
  const promptPath = join(ROOT, mission.promptFile);
  const promptText = readFileSync(promptPath, 'utf8');
  const repo = mission.source?.repositoryUrl;
  if (!repo) {
    throw new Error(`Mission ${missionId} missing source.repositoryUrl`);
  }
  const env = { ...worker.cursorEnv };
  const placementCfg = registries.workers.placements[mission.placement || registries.missions.defaultPlacement];
  const forbidCloudFallback =
    options.forbidCloudFallback !== false && Boolean(placementCfg?.forbidCloudFallback);
  return {
    apiVersion: 'v1',
    name: options.name || mission.title || missionId,
    prompt: { text: promptText },
    repos: [
      {
        url: repo,
        startingRef: mission.source.startingRef || 'main',
      },
    ],
    env,
    _routing: {
      missionId,
      privateWorkerId: worker.privateWorkerId,
      usePrivateWorker: worker.usePrivateWorker,
      workerDisplayName: worker.displayName,
      forbidCloudFallback,
    },
  };
}
