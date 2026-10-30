#!/usr/bin/env node
/** P1 economy/gameplay guards (no browser). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fail(msg) {
  console.error("FAIL test-p1-gameplay-economy:", msg);
  process.exit(1);
}

const gameJs = read("js/game.js");
const gameplay = read("js/world/gameplay-v21.mjs");
const playV21 = read("js/play-features-v21.mjs");
const story = read("js/story/story-engine.mjs");
const lifeJs = read("js/life.js");
const controls = read("js/controls-3d.mjs");
const i18n = read("js/i18n.js");

if (!/PET_DOG_COOLDOWN_MS/.test(gameJs) || !/lastPetDogAt/.test(gameJs)) {
  fail("petDog must use cooldown timestamp");
}
if (!/__punkExplicitInteract/.test(gameJs) || !/opts\.explicit/.test(gameJs)) {
  fail("petDog must require explicit interact flag");
}
if (/petDog\(true\)\s*;/.test(gameJs.replace(/onPetDog:[^\n]+/g, ""))) {
  fail("avoid unconditional petDog(true) outside onPetDog hook");
}
if (!/barkAndPet\(false\)/.test(lifeJs) || !/rewardPlayer/.test(lifeJs)) {
  fail("life.js chase must not reward player on auto bark");
}
if (!/KeyE.*!e\.repeat/.test(controls) || !/KeyE.*interact = false/.test(controls)) {
  fail("KeyE interact must ignore key repeat and clear on keyup");
}

if (/q_ch3_cemetery_night.*success\s*=\s*true/.test(gameplay)) {
  fail("cemetery job must not force success for story quest");
}
if (!/_cemeteryJobDone\?\.\(result\)/.test(gameplay) && !/_cemeteryJobDone\?\.\(\{/.test(gameplay)) {
  fail("endCemeteryJob must pass result object to payout hook");
}
if (!/Math\.round\(65 \* frac\)/.test(playV21)) {
  fail("cemetery payout must scale with completion fraction");
}
if (/\_cemeteryJobDone\?\.\(true\)/.test(playV21)) {
  fail("fallback cemetery timer must not grant full success payout");
}

if (!/hangoutStage >= 4[\s\S]{0,120}Построено/.test(story) && !/Built \(4\/4\)/.test(story)) {
  fail("objective panel must show built state when hangoutStage >= 4");
}
if (!/updateConstructionHud[\s\S]*hangoutStage >= 4/.test(story)) {
  fail("construction HUD must handle hangoutStage >= 4");
}

if (/petHappy:.*\+6/.test(i18n)) {
  fail("petHappy copy must match +3 coin reward");
}

/** Payout math spot-check (night shift, 1/3 ghosts, all candles). */
function cemeteryPay(success, prog) {
  const frac = success ? 1 : Math.min(1, Number(prog) || 0);
  return 15 + Math.round(65 * frac);
}
const oneThirdGhosts = cemeteryPay(false, (1 + 1 / 3) / 2);
if (oneThirdGhosts >= 80) fail(`1/3 ghosts must not pay 80 (got ${oneThirdGhosts})`);
if (cemeteryPay(true, 1) !== 80) fail("full cemetery success must pay 80");

console.log(
  "PASS test-p1-gameplay-economy",
  JSON.stringify({ oneThirdGhostsPay: oneThirdGhosts, fullPay: cemeteryPay(true, 1) })
);
