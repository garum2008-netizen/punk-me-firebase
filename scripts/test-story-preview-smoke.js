/**
 * Smoke: quest table ids + story modules load (no browser).
 */
const fs = require("fs");
const path = require("path");

const table = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/story/quest-table.json"), "utf8"));
const quests = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/story/quests.json"), "utf8"));

const required = [
  "q_ch0_newbie",
  "q_initiation_pay",
  "q_initiation_duel",
  "q_ch2_hangout",
  "q_ch3_cemetery_night",
  "q_ch4_castle",
  "ending_break_curse",
  "ending_zombie_style",
  "ending_count_deal"
];

const ids = new Set(table.quests.map(q => q.id));
for (const id of required) {
  if (!ids.has(id)) {
    console.error("FAIL missing quest-table id", id);
    process.exit(1);
  }
}

const qjson = new Set(quests.quests.map(q => q.id));
for (const id of ["q_ch2_hangout", "q_ch3_cemetery_night", "q_ch4_castle"]) {
  if (!qjson.has(id)) {
    console.error("FAIL missing quests.json id", id);
    process.exit(1);
  }
}

console.log("PASS test-story-preview-smoke");
