#!/usr/bin/env node
/** M1 «не стыдно показать» static + unit gates (no browser). */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const root = path.join(__dirname, "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  }
}

function dirBytes(dir, filterFn) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) total += dirBytes(abs, filterFn);
    else if (!filterFn || filterFn(abs, name)) total += st.size;
  }
  return total;
}

function runtimeModelsPayloadBytes() {
  const shipped = JSON.parse(
    fs.readFileSync(path.join(root, "assets/models/meshy/shipped.json"), "utf8")
  );
  const files = new Set([
    "assets/models/pets/punk_dog.glb",
    ...shipped.map(id => `assets/models/meshy/${id === "vienna" ? "punk_pink" : id}.glb`)
  ]);
  if (shipped.includes("razor")) files.add("assets/models/meshy/razor.glb");
  let total = 0;
  for (const rel of files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      console.error("FAIL: missing runtime model", rel);
      return -1;
    }
    total += fs.statSync(abs).size;
  }
  return total;
}

async function main() {
  const modelsBytes = runtimeModelsPayloadBytes();
  assert(modelsBytes > 0, "runtime models payload missing files");
  assert(modelsBytes < 20 * 1000 * 1000, `runtime models must be <20MB decimal (got ${(modelsBytes / 1e6).toFixed(3)} MB)`);
  assert(20 * 1000 * 1000 - modelsBytes >= 4000, `runtime models need ≥4KB headroom under 20MB (got ${((20e6 - modelsBytes) / 1024).toFixed(1)} KiB)`);

  for (const dead of [
    "assets/models/cc0/cesium-man.glb",
    "assets/models/cc0/michelle.glb",
    "assets/models/punk-teen.glb",
    "assets/models/character.glb"
  ]) {
    assert(!fs.existsSync(path.join(root, dead)), `removed demo model still present: ${dead}`);
  }

  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert(html.includes('id="touchJump"'), "touch jump button in index");
  assert(html.includes('data-testid="mobile-nav-fab"'), "mobile travel nav fab");
  assert(html.includes("mobile-nav-grid"), "mobile travel nav sheet grid");
  assert(html.includes("char-select-portraits"), "char select portrait container");
  assert(html.includes("Razor") || html.includes("razor") || html.includes("Рейзор"), "razor meshy credit");

  const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
  assert(css.includes(".touch-jump"), "touch jump styles");
  assert(css.includes("punk-preview-solo"), "hide solo players panel in preview");

  const touch = fs.readFileSync(path.join(root, "js/touch-controls.mjs"), "utf8");
  assert(touch.includes("touchJump"), "touch jump wired");

  const dlgRoot = JSON.parse(fs.readFileSync(path.join(root, "data/story/dialogues.json"), "utf8"));
  const city = (dlgRoot.dialogues || []).find(d => d.id === "dlg_city_enter");
  const cityNode = city?.nodes?.[0];
  if (cityNode?.text?.ru) {
    assert(!/^Тони:/i.test(cityNode.text.ru.trim()), "Tony line must not embed speaker prefix");
  }

  const spec = JSON.parse(fs.readFileSync(path.join(root, "data/story/life-ch1-slice.json"), "utf8"));
  const xpSum = (spec.steps || []).reduce((s, st) => s + (st.rewardXp || 0), 0);
  assert(xpSum > 0, "chapter 1 must award XP in spec");

  const mod = await import(pathToFileURL(path.join(root, "js/story/life-ch1-slice.mjs")).href);
  const { claimStepReward, ensureLifeCh1 } = mod;
  const xpMe = { coins: 100, xp: 0, lifeCh1: { v: 1, active: true, stepIndex: 1, flags: {}, claimedSteps: {} } };
  global.window = { me: xpMe, isOwner: false };
  global.levelFromXp = xp => Math.floor((xp || 0) / 100) + 1;
  ensureLifeCh1(xpMe);
  claimStepReward(xpMe.lifeCh1, 1, 10, 12);
  claimStepReward(xpMe.lifeCh1, 1, 10, 12);
  assert(xpMe.xp === 12, "XP grant idempotent");
  delete global.window;
  delete global.levelFromXp;

  const voice = fs.readFileSync(path.join(root, "js/voice.js"), "utf8");
  assert(voice.includes("formatSubtitleLine"), "subtitle dedupe helper present");

  const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
  assert(gameJs.includes("effectiveShopPrice"), "preview slice shop pricing");
  assert(gameJs.includes("imagine_images/LTPb8.jpg"), "prod shop icons use imagine_images");
  assert(gameJs.includes("placeBuildAt(x, y)"), "2D city build uses placeBuildAt");
  assert(gameJs.includes("exposePreviewBuildHooks"), "preview-only tryPlaceBuild export");
  assert(gameJs.includes("delete window.tryPlaceBuild"), "prod strips tryPlaceBuild from window");
  assert(!gameJs.includes("angelina-skins/shipped/angelina-teen-A-portrait.webp"), "shop must not use Angelina portraits");

  if (failed) {
    console.error(`test-m1-gates: ${failed} failed`);
    process.exit(1);
  }
  console.log("test-m1-gates: PASS", { modelsMb: (modelsBytes / 1e6).toFixed(2) });
}

main().catch(e => {
  console.error("test-m1-gates: FAIL", e);
  process.exit(1);
});
