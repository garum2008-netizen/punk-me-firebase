#!/usr/bin/env node
/** Unit checks for life ch1 slice — imports real module + data. */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const root = path.join(__dirname, "..");
const spec = JSON.parse(fs.readFileSync(path.join(root, "data/story/life-ch1-slice.json"), "utf8"));

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  }
}

async function main() {
  const mod = await import(pathToFileURL(path.join(root, "js/story/life-ch1-slice.mjs")).href);
  const { ensureLifeCh1, defaultLifeCh1State, pickReflectNode, claimStepReward } = mod;

  assert(spec.steps.length === 4, "four steps");
  assert(spec.dialogues.dlg_life_ch1_outfit.nodes.n0.choices.length === 3, "three outfit choices");

  const dlgReflect = spec.dialogues.dlg_life_ch1_reflect;
  assert(pickReflectNode(dlgReflect, { mystery_open: true }).text.ru.includes("Мира"), "open flag consequence line");
  assert(pickReflectNode(dlgReflect, { mystery_secret: true }).text.ru.includes("между"), "secret flag line");
  assert(pickReflectNode(dlgReflect, {}).text.ru.includes("выбор"), "fallback line");

  const p = { lifeCh1: { v: 1, active: true, stepIndex: 1, angelinaSkin: "B" } };
  const st = ensureLifeCh1(p);
  assert(st.flags && typeof st.flags === "object", "flags normalized after Firebase empty drop");
  assert(st.claimedSteps && typeof st.claimedSteps === "object", "claimedSteps normalized");
  st.flags.outfit_bold = true;
  assert(p.lifeCh1.flags.outfit_bold === true, "can set outfit flag after reload shape");

  const d = defaultLifeCh1State();
  assert(d.claimedSteps && d.flags, "default state has sub-objects");

  const coinMe = { coins: 50, lifeCh1: { v: 1, active: true, stepIndex: 1, flags: {}, claimedSteps: {} } };
  global.window = { me: coinMe, isOwner: false };
  ensureLifeCh1(coinMe);
  claimStepReward(coinMe.lifeCh1, 1, 25);
  claimStepReward(coinMe.lifeCh1, 1, 25);
  assert(coinMe.coins === 75, "step coin grant idempotent");
  const pNoSlice = { lifeCh1: null };
  assert(ensureLifeCh1(pNoSlice) === null && pNoSlice.lifeCh1 === null, "slice off must not create lifeCh1");

  const engineSrc = fs.readFileSync(path.join(root, "js/story/story-engine.mjs"), "utf8");
  assert(!engineSrc.includes("startingCoins + 50"), "story engine must not clamp coins");

  delete global.window;

  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "data/story/angelina-skin-manifest.json"), "utf8")
  );
  assert(manifest.skins.A && manifest.skins.B && manifest.skins.C, "manifest skins");
  assert(
    manifest.skins.C.source.sha256 === "c454454a00dfa74bde62ffbc7405b4eca0da0a49e718f5bdf68fb509b12aa2db",
    "C source sha"
  );
  assert(manifest.sliceOnly === true, "slice only flag");

  if (failed) {
    console.error(`life-ch1-unit: ${failed} failed`);
    process.exit(1);
  }
  console.log("life-ch1-unit: PASS");
}

main().catch(e => {
  console.error("life-ch1-unit: FAIL", e);
  process.exit(1);
});
