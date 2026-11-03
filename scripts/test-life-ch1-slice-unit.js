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
  const { ensureLifeCh1, defaultLifeCh1State, pickReflectNode, claimStepReward, normalizeClaimedSteps, clampStepIndex, rewardClaimKey, isLifeCh1SliceEnabled, isLifeCh1TestMode } = mod;

  assert(spec.steps.length === 4, "four steps");
  assert(spec.dialogues.dlg_life_ch1_outfit.nodes.n0.choices.length === 3, "three outfit choices");

  const dlgReflect = spec.dialogues.dlg_life_ch1_reflect;
  assert(pickReflectNode(dlgReflect, { mystery_open: true }).speaker === "player", "open flag is player thought");
  assert(pickReflectNode(dlgReflect, { mystery_secret: true }).text.ru.includes("Никому"), "secret flag player line");
  assert(pickReflectNode(dlgReflect, {}).text.ru.includes("держу"), "fallback line");
  assert(pickReflectNode(dlgReflect, { mystery_trust_angelina: true }).speaker === "mira", "trust reflect is Mira");
  assert(pickReflectNode(dlgReflect, { mystery_trust_angelina: true }).text.ru.includes("на связи"), "Mira message wording");

  global.window = { __PUNK_PREVIEW__: false };
  global.location = { hostname: "halloween.punk.contractbot.dk", search: "?lifeCh1E2e=1" };
  assert(!isLifeCh1SliceEnabled(), "production host ignores lifeCh1E2e=1");
  assert(!isLifeCh1TestMode(), "production host ignores lifeCh1E2e test mode");
  global.location = { hostname: "halloween.punk.contractbot.dk", search: "?lifeCh1Slice=1" };
  assert(!isLifeCh1SliceEnabled(), "production host ignores lifeCh1Slice=1");
  global.location = { hostname: "127.0.0.1", search: "?lifeCh1E2e=1" };
  assert(isLifeCh1SliceEnabled(), "localhost allows lifeCh1E2e=1");
  delete global.window;
  delete global.location;

  const ruBlob = JSON.stringify(spec);
  assert(!/Поговори с Ангелиной/i.test(ruBlob), "no talk-to-Angelina objective");
  assert(!/Довериться Ангелине/i.test(ruBlob), "no trust Angelina choice");
  assert(!/"speaker"\s*:\s*"angelina"/.test(ruBlob), "no angelina NPC speaker in slice JSON");

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
  assert(coinMe.lifeCh1.claimedSteps.s1 === true, "claimedSteps uses s1 key");

  const fromArray = normalizeClaimedSteps([false, true, true]);
  assert(fromArray.s1 && fromArray.s2, "RTDB array maps to s1/s2");

  const clamped = { v: 1, active: false, completed: true, stepIndex: 14, flags: {}, claimedSteps: {} };
  clampStepIndex(clamped);
  assert(clamped.stepIndex <= 3, "completed stepIndex clamped to chapter max");

  assert(rewardClaimKey(2, "trust_bonus") === "s2_trust_bonus", "reward key format");

  const pNoSlice = { lifeCh1: null };
  assert(ensureLifeCh1(pNoSlice) === null && pNoSlice.lifeCh1 === null, "slice off must not create lifeCh1");

  const engineSrc = fs.readFileSync(path.join(root, "js/story/story-engine.mjs"), "utf8");
  assert(engineSrc.includes("startingCoins + 50"), "production coin anti-cheat restored for non-preview");

  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "data/story/angelina-skin-manifest.json"), "utf8")
  );
  assert(manifest.skins.A && manifest.skins.B && manifest.skins.C, "manifest skins");
  assert(
    manifest.skins.C.source.sha256 === "c454454a00dfa74bde62ffbc7405b4eca0da0a49e718f5bdf68fb509b12aa2db",
    "C source sha"
  );
  assert(manifest.sliceOnly === true, "slice only flag");

  const sliceJson = JSON.parse(fs.readFileSync(path.join(root, "data/story/life-ch1-slice.json"), "utf8"));
  const walk = obj => {
    if (!obj || typeof obj !== "object") return;
    if (obj.ru && typeof obj.ru === "string" && /\bAngelina\b/.test(obj.ru)) {
      assert(false, "Latin Angelina in ru string: " + obj.ru.slice(0, 60));
    }
    for (const v of Object.values(obj)) walk(v);
  };
  walk(sliceJson.dialogues);

  const sliceSrc = fs.readFileSync(path.join(root, "js/story/life-ch1-slice.mjs"), "utf8");
  assert(!sliceSrc.includes("Owner PNG"), "wardrobe hint must not mention Owner PNG");
  assert(!/lifeCh1 save namespace/.test(sliceSrc), "quest subline must not expose lifeCh1 id");

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
