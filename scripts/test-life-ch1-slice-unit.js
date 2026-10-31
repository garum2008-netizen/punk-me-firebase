#!/usr/bin/env node
/** Unit checks for life ch1 slice data + flag routing (no browser). */
const fs = require("fs");
const path = require("path");

const spec = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/story/life-ch1-slice.json"), "utf8")
);

function pickReflectNode(flags) {
  const nodes = spec.dialogues.dlg_life_ch1_reflect.nodes;
  if (flags.mystery_secret) return nodes.n_secret.text.ru;
  if (flags.mystery_open) return nodes.n_open.text.ru;
  if (flags.mystery_trust_angelina) return nodes.n_trust.text.ru;
  return nodes.n_fallback.text.ru;
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  }
}

assert(spec.steps.length === 4, "four steps");
assert(spec.dialogues.dlg_life_ch1_outfit.nodes.n0.choices.length === 3, "three outfit choices");
assert(pickReflectNode({ mystery_open: true }).includes("Мира"), "open flag consequence line");
assert(pickReflectNode({ mystery_secret: true }).includes("между"), "secret flag line");
assert(pickReflectNode({}).includes("выбор"), "fallback line");

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/story/angelina-skin-manifest.json"), "utf8")
);
assert(manifest.skins.A && manifest.skins.B && manifest.skins.C, "manifest skins");
assert(manifest.skins.C.finalArtSlot === "c-v2-only", "C slot");

if (failed) {
  console.error(`life-ch1-unit: ${failed} failed`);
  process.exit(1);
}
console.log("life-ch1-unit: PASS");
