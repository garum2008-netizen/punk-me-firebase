#!/usr/bin/env node
/** P0 ch0–ch1 unit checks (no browser). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const onboardingSrc = fs.readFileSync(path.join(root, "js/onboarding.js"), "utf8");
const castleSrc = fs.readFileSync(path.join(root, "js/story/castle-gameplay.mjs"), "utf8");
const dlg = JSON.parse(fs.readFileSync(path.join(root, "data/story/dialogues.json"), "utf8"));
const i18n = fs.readFileSync(path.join(root, "js/i18n.js"), "utf8");

function fail(msg) {
  console.error("FAIL test-ch0-p0:", msg);
  process.exit(1);
}

if (/visit_cemetery|win_fight|shop_buy/.test(onboardingSrc)) {
  fail("onboarding still references cemetery/duel/shop steps");
}
if (!/ch0_s_razor/.test(onboardingSrc) || !/onMomTalk/.test(onboardingSrc)) {
  fail("onboarding missing ch0 canon hooks");
}
if (!/bell_rim/.test(castleSrc) || !/ch4_album_drumsticks_ready/.test(castleSrc)) {
  fail("tryTongueQuest must gate on bell_rim + album branch");
}
const initDlg = dlg.dialogues.find(d => d.id === "dlg_razor_initiation");
if (!initDlg?.trigger?.conditions?.includes("flag:ch1_initiation_unlocked")) {
  fail("initiation dialog must wait for ch1_initiation_unlocked (choice before fight path)");
}
const ruBlock = i18n.split("ru: {")[1]?.split("en: {")[0] || "";
const ch0Count = (ruBlock.match(/chapter_0_title:/g) || []).length;
if (ch0Count > 1) fail("duplicate chapter_0_title in ru i18n");
if (/Купи что-нибудь/.test(ruBlock)) fail("obsolete shop onboarding copy in ru i18n");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
if (!/story-preview-p0-r\d+/.test(gameJs)) fail("GAME_VERSION must be story-preview-p0-r<N> (stable label, see docs/release/P0_PREVIEW_BUILD.md)");
if (!/onboarding\.progress \|\|/.test(onboardingSrc)) {
  fail("onboarding bump must default progress to {}");
}
if (!/me\.quests\.progress/.test(gameJs) || !/progress = \{\}/.test(gameJs)) {
  fail("questBump must default me.quests.progress to {}");
}
if (!/start-game-overlay/.test(fs.readFileSync(path.join(root, "css/game.css"), "utf8"))) {
  fail("start-game-overlay CSS must pin overlay to viewport");
}
if (/onboard_mom_voice/.test(ruBlock)) fail("do not claim mom voice without VO files");

const steps = [...onboardingSrc.matchAll(/qt:\s*"(ch0_s_[^"]+)"/g)].map(m => m[1]);
if (steps.length < 9) fail("expected >=9 ch0 qt steps");

console.log("PASS test-ch0-p0", JSON.stringify({ steps: steps.length }));
