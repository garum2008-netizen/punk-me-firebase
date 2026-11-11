#!/usr/bin/env node
/**
 * Chapter 1 state playthrough: tutorial → street → party materials →
 * one Razor reward → initiation, then save/reload.
 * Does not sign in and does not write production RTDB.
 */
import assert from "assert";
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
import { getInputState, setKey, setTouchMove, consumeInteract } from "../js/controls-3d.mjs";
import { claimRazorDuelReward } from "../js/story/duel-reward.mjs";
import { unifyPartyMaterials, partyNeedsMet, spendPartyMaterials } from "../js/story/party-inventory.mjs";
import { resolvePrimaryInteract, allowLocationProp } from "../js/interact-priority.mjs";
import { findNpcDialogue } from "../js/story/npc-dialogue.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function testControlsDoNotClobber() {
  setTouchMove(0.8, 0.35, true);
  const joy = getInputState();
  assert.equal(joy.source, "touch");
  assert.ok(joy.moveX > 0.5);
  setKey("d", true);
  const keyed = getInputState();
  assert.equal(keyed.source, "keyboard");
  assert.equal(keyed.moveX, 1);
  setKey("d", false);
  const restored = getInputState();
  assert.equal(restored.source, "touch", "releasing the key restores the joystick");
  assert.ok(restored.moveX > 0.5);
  setKey("e", true);
  assert.equal(consumeInteract(), true);
  setKey("e", true, { repeat: true });
  assert.equal(consumeInteract(), false, "E key repeat does not fire another interact");
  setTouchMove(0, 0, false);
  assert.equal(getInputState().source, "idle");
}

function testStreetEPrefersNpc() {
  const primary = resolvePrimaryInteract({ location: "street", nearestNpcId: "razor" });
  assert.equal(primary.type, "npc");
  assert.equal(primary.npcId, "razor");
  assert.equal(allowLocationProp("street", {
    nearestNpcId: "razor",
    onboarding: { step: 2, done: false }
  }), false);
  const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
  const interact = game.slice(game.indexOf("onInteract:"), game.indexOf("onHints:"));
  assert.ok(interact.indexOf("getNearPortal") < interact.indexOf("tryInteract"), "portal E runs before the arcade");
  assert.ok(!/const reward = 70 \+ Math\.floor/.test(game.slice(game.indexOf("function endFight"))));
}

function installDom() {
  const buttons = [];
  const authBtn = { id: "authInitBtn", onclick: null };
  const nodes = {};
  function el(id) {
    if (!nodes[id]) {
      nodes[id] = {
        id,
        classList: { add() {}, remove() {}, contains() { return false; } },
        style: {},
        textContent: "",
        innerHTML: "",
        appendChild(n) { buttons.push(n); },
        querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
        querySelectorAll(sel) {
          if (sel === ".story-dialog-title") return [nodes.title || (nodes.title = { textContent: "" })];
          if (sel === ".story-dialog-body") return [nodes.body || (nodes.body = bodyEl())];
          if (sel === ".story-choice" || sel === "[data-mat]") return buttons;
          if (sel === "#authInitBtn" && String(nodes.body?._html || "").includes("authInitBtn")) return [authBtn];
          return [];
        }
      };
    }
    return nodes[id];
  }
  function bodyEl() {
    const body = {
      _html: "",
      appendChild(n) { buttons.push(n); },
      querySelectorAll(sel) {
        if (sel === "[data-mat]" || sel === ".story-choice") return buttons;
        return [];
      }
    };
    Object.defineProperty(body, "innerHTML", {
      set(v) { this._html = String(v); buttons.length = 0; },
      get() { return this._html; }
    });
    return body;
  }
  globalThis.requestAnimationFrame = fn => fn();
  globalThis.window = globalThis;
  globalThis.document = {
    getElementById: id => el(id),
    createElement: () => ({ type: "", className: "", innerHTML: "", onclick: null }),
    querySelector: () => null,
    querySelectorAll: () => [],
    documentElement: { lang: "en" },
    addEventListener() {}
  };
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  globalThis.getLanguage = () => "en";
  globalThis.toast = () => {};
  globalThis.escapeHtml = s => String(s ?? "");
  globalThis.dispatchEvent = () => true;
  globalThis.Event = function Event() {};
  globalThis.isOwner = false;
  globalThis.AudioContext = function AudioContext() {
    this.createOscillator = () => ({ connect() {}, start() {}, frequency: { value: 0 } });
    this.createGain = () => ({ connect() {}, gain: { value: 0 } });
    this.destination = {};
  };
  nodes.authBtn = authBtn;
  nodes.el = el;
}

async function testChapter1() {
  installDom();
  vm.runInThisContext(fs.readFileSync(path.join(root, "js/onboarding.js"), "utf8"));
  globalThis.fetch = async url => {
    const rel = String(url).replace(/^\//, "");
    const file = path.join(root, rel);
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(file, "utf8")) };
  };
  const story = await import("../js/story/story-engine.mjs?chapter1=" + Date.now());
  const player = {
    coins: 100,
    xp: 0,
    rep: 0,
    location: "room",
    energy: 100,
    mood: 100,
    isOwner: false,
    inventory: { materials: { crypt: 1, brick: 3 }, spells: [] },
    onboarding: { step: 0, progress: {}, done: false, paid: {} },
    quests: { active: "intro", progress: { talk_razor: 1 } },
    story: null
  };
  globalThis.me = player;
  window.me = player;
  window.isOwner = false;
  window.saveMe = () => { player._saves = (player._saves || 0) + 1; };
  await story.initStoryEngine({ toast() {}, save: window.saveMe });
  story.ensureStoryState(player);
  assert.equal(player.story.materials.brick, 3, "old shop bricks fold into the party stack once");
  assert.equal(player.inventory.materials.crypt, 1, "city prop stacks stay");
  assert.equal(player.inventory.materials.brick, 3);

  window.Onboarding.onMove(0, 0);
  window.Onboarding.onMove(30, 0);
  window.Onboarding.onEnterLocation("street");
  player.location = "street";
  window.Onboarding.onTalkRazor();
  player.location = "cemetery";
  window.Onboarding.onVisitCemetery();
  assert.equal(window.Onboarding.currentStepId(), "win_fight");
  assert.equal(player.coins, 240);

  const questText = document.getElementById("questBox").innerHTML;
  assert.ok(questText.includes("onboard") || questText.length > 10, "tutorial objective is written to the quest box");

  const bought = story.buyStoryMaterial("brick", 7);
  assert.equal(bought.ok, true);
  story.buyStoryMaterial("nails", 2);
  assert.equal(player.story.materials.brick, 10);
  assert.equal(player.inventory.materials.brick, 10);
  assert.equal(player.inventory.materials.crypt, 1);
  const savedMid = JSON.parse(JSON.stringify(player));

  const beforeDuel = player.coins;
  const claim = claimRazorDuelReward(player, {
    npcId: "razor",
    baseRoll: 99,
    onboardingCoins: 80,
    questCoins: 100
  });
  assert.equal(claim.granted, true);
  assert.equal(claim.coins, 80);
  assert.equal(claim.source, "onboarding");
  player.coins += claim.coins;
  player.onboarding.paid.win_fight = true;
  window.Onboarding.onWinFight();
  assert.equal(player.coins - beforeDuel, 80, "Razor duel pays the onboarding reward once");
  assert.equal(window.Onboarding.currentStepId(), "shop_buy");
  const again = claimRazorDuelReward(player, { npcId: "razor", baseRoll: 99, onboardingCoins: 80, questCoins: 100 });
  assert.equal(again.granted, false);
  assert.equal(again.coins, 0);
  const training = claimRazorDuelReward(player, { training: true, npcId: "mohawk", baseRoll: 90, onboardingCoins: 80 });
  assert.equal(training.coins, 0);
  assert.equal(training.reason, "training");
  window.Onboarding.onShopBuy();
  assert.equal(player.onboarding.done, true);

  player.location = "street";
  const Authority = await import("../js/story/authority.mjs");
  Authority.startAuthorityPath(player);
  const stage1 = Authority.getAuthorityObjective(player);
  assert.ok(stage1?.objective, "stage 1 objective is visible");
  Authority.addAuthority(15, player);
  player.story.auth.s1Done = true;
  player.story.auth.stage = 2;
  for (const name of ["auth_pizza_done", "auth_no_rat", "auth_cobalt_item", "auth_ghost_prank"]) {
    Authority.onAuthStoryEvent(name, player);
  }
  assert.equal(player.story.auth.stage, 3);
  const stage3 = Authority.getAuthorityObjective(player);
  assert.ok(stage3?.objective);
  Authority.onAuthStoryEvent("job_cemetery_done", player);
  Authority.onAuthStoryEvent("parkour_win", player);
  Authority.onAuthStoryEvent("auth_trial_duel", player);
  assert.equal(player.story.auth.stage, 4);
  assert.ok(player.story.authority >= 80);
  Authority.runInitiationCeremony({ force: true });
  const dlg = document.getElementById("storyDialog");
  const btn = dlg.querySelector("#authInitBtn");
  assert.ok(btn?.onclick, "initiation ceremony is offered");
  btn.onclick();
  assert.equal(player.story.flags.joined_gang, true);
  assert.equal(player.gang_rank, "gang_member");

  const reloaded = JSON.parse(JSON.stringify(player));
  reloaded.inventory.materials.brick = 99;
  story.ensureStoryState(reloaded);
  assert.equal(reloaded.story.materials.brick, player.story.materials.brick, "reload does not refund spent or duplicate bricks");
  assert.equal(reloaded.inventory.materials.crypt, 1);
  assert.equal(reloaded.story.flags.joined_gang, true);
  const replay = claimRazorDuelReward(reloaded, { npcId: "razor", baseRoll: 90, onboardingCoins: 80 });
  assert.equal(replay.coins, 0);
  assert.equal(reloaded.coins, player.coins);

  const dialogues = JSON.parse(fs.readFileSync(path.join(root, "data/story/dialogues.json"), "utf8")).dialogues;
  const newbie = findNpcDialogue(dialogues, "razor", "street", conds =>
    conds.every(c => c === "onboarding:done" || c === "flag:!joined_gang")
  );
  assert.equal(newbie?.id, "dlg_razor_initiation");
  const joined = findNpcDialogue(dialogues, "razor", "street", conds =>
    conds.every(c => c !== "flag:!joined_gang")
  );
  assert.equal(joined, null);

  assert.equal(partyNeedsMet(savedMid.story.materials, { brick: 10, nails: 2 }), true);
  const spent = spendPartyMaterials(player.story.materials, { brick: 10, nails: 2 });
  assert.equal(spent.ok, true);
  player.story.materials = spent.materials;
  story.syncPartyInventory(player);
  const after = JSON.parse(JSON.stringify(player));
  after.inventory.materials.brick = 10;
  story.ensureStoryState(after);
  assert.equal(after.story.materials.brick, spent.materials.brick);
  assert.ok(after.story.materials.brick < 10);
}

testControlsDoNotClobber();
testStreetEPrefersNpc();
await testChapter1();
console.log("chapter 1 playthrough OK");
