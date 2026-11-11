#!/usr/bin/env node
/**
 * Onboarding persistence, street interact vs arcade, quest bump, post-join Razor dialogue.
 */
import assert from "assert";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
import { allowLocationProp, resolvePrimaryInteract } from "../js/interact-priority.mjs";
import { bumpQuest } from "../js/quest-progress.mjs";
import { findNpcDialogue } from "../js/story/npc-dialogue.mjs";
import * as Authority from "../js/story/authority.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadOnboarding() {
  const sandbox = {
    console,
    document: { getElementById: () => ({ innerHTML: "" }) },
    escapeHtml: s => String(s ?? ""),
    toast() {},
    saves: 0
  };
  sandbox.window = sandbox;
  sandbox.saveMe = () => {
    sandbox.saves += 1;
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, "js/onboarding.js"), "utf8"), sandbox);
  return sandbox;
}

function testOnboardingRewards() {
  const sb = loadOnboarding();
  sb.isOwner = false;
  sb.me = {
    coins: 100,
    xp: 0,
    location: "room",
    onboarding: { step: 0, progress: {}, done: false, paid: {} }
  };
  sb.Onboarding.onMove(0, 0);
  sb.Onboarding.onMove(20, 0);
  assert.equal(sb.me.coins, 120, "first move pays +20");
  assert.equal(sb.me.xp, 15);
  assert.equal(sb.me.onboarding.step, 1);
  assert.equal(sb.me.onboarding.paid.move, true);
  assert.ok(sb.saves >= 1, "step is saved");

  const stored = JSON.parse(JSON.stringify(sb.me.onboarding));
  const restored = sb.Onboarding.normalizeFromSave(
    { coins: 120, xp: 15, location: "street" },
    stored
  );
  assert.equal(restored.step, 1);
  assert.equal(restored.paid.move, true);
  assert.equal(restored.done, false);

  const legacy = sb.Onboarding.normalizeFromSave(
    { coins: 120, xp: 15, location: "street" },
    undefined
  );
  assert.equal(legacy.paid.move, true, "legacy save marks move reward already paid");
  assert.equal(legacy.step, 1, "legacy street save does not restart the move step");

  sb.me = {
    coins: 120,
    xp: 15,
    location: "street",
    onboarding: { step: 0, progress: {}, done: false, paid: { move: true } },
    _onboardOrigin: null
  };
  sb.Onboarding.onMove(0, 0);
  sb.Onboarding.onMove(40, 0);
  assert.equal(sb.me.coins, 120, "move reward is not paid twice");
  assert.equal(sb.me.onboarding.step, 1);

  const joined = sb.Onboarding.normalizeFromSave(
    { coins: 400, xp: 80, location: "street", gang_rank: "gang_member" },
    undefined
  );
  assert.equal(joined.done, true);
}

function testStreetInteract() {
  const talk = { step: 5, done: false, progress: {}, paid: {} };
  assert.deepEqual(resolvePrimaryInteract({ location: "street", nearestNpcId: "razor" }), {
    type: "npc",
    npcId: "razor"
  });
  assert.equal(allowLocationProp("street", { nearestNpcId: "razor", onboarding: talk }), false);
  assert.equal(allowLocationProp("street", { nearestNpcId: null, onboarding: talk }), false);
  assert.equal(
    allowLocationProp("street", { nearestNpcId: null, onboarding: { step: 1, done: false } }),
    true
  );
  assert.equal(resolvePrimaryInteract({ location: "room", nearestNpcId: "zoya" }).type, "continue");
  assert.equal(allowLocationProp("kitchen", { nearestNpcId: "zoya", onboarding: talk }), true);
}

function testQuestBump() {
  const defs = { intro: { need: { talk_razor: 1, win_fight: 1 }, reward: { coins: 100 } } };
  const quests = { active: "intro", progress: null };
  const first = bumpQuest(quests, defs, "win_fight");
  assert.equal(first.changed, true);
  assert.equal(first.completed, false);
  assert.equal(quests.progress.win_fight, 1);
  const second = bumpQuest(quests, defs, "talk_razor");
  assert.equal(second.completed, true);
  const ignored = bumpQuest({ active: "intro" }, defs, "not_a_step");
  assert.equal(ignored.changed, false);
  assert.equal(bumpQuest(null, defs, "win_fight").changed, false);
}

function testRazorDialogueAfterJoin() {
  const dialogues = JSON.parse(fs.readFileSync(path.join(root, "data/story/dialogues.json"), "utf8")).dialogues;
  const before = findNpcDialogue(dialogues, "razor", "street", conds =>
    conds.every(c => c === "onboarding:done" || c === "flag:!joined_gang")
  );
  assert.equal(before?.id, "dlg_razor_initiation");

  const after = findNpcDialogue(dialogues, "razor", "street", conds =>
    conds.every(c => {
      if (c === "onboarding:done") return true;
      if (c === "flag:!joined_gang") return false;
      return true;
    })
  );
  assert.equal(after, null, "joined player must not reopen the newbie initiation tree");

  const pathData = JSON.parse(fs.readFileSync(path.join(root, "data/story/authority-path.json"), "utf8"));
  globalThis.window = { getLanguage: () => "ru", toast() {}, saveMe() {} };
  Authority.setAuthorityPathData(pathData);
  const player = {
    story: {
      gang_rank: "gang_member",
      flags: { joined_gang: true },
      authority: 100,
      auth: { stage: 4, s1Done: true, tasks: {}, trials: {}, ch2Done: true }
    }
  };
  const lines = Authority.getNpcLinesForRank("razor", player);
  assert.ok(lines?.length, "gang member razor lines exist");
  assert.ok(lines.some(l => l.includes("Братва") || l.includes("Тусовка")));
  assert.ok(!lines.some(l => /новеньк/i.test(l)));
}

function testSourceContracts() {
  const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
  assert.match(game, /function sanitizePlayer[\s\S]*?onboarding:/);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(!html.includes("hud-quests-wrap collapsed"), "desktop quest panel is not collapsed in markup");
  const touch = fs.readFileSync(path.join(root, "js/touch-controls.mjs"), "utf8");
  assert.match(touch, /pointercancel", endJoy\)/);
  assert.match(touch, /joyId = null/);
}

testOnboardingRewards();
testStreetInteract();
testQuestBump();
testRazorDialogueAfterJoin();
testSourceContracts();
console.log("task03 progress tests OK");
