#!/usr/bin/env node
/**
 * Cross-check quest canon: data/story/quest-table.json ↔ QUEST_TABLE.md ↔ Roblox QuestTable.lua
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const root = path.join(import.meta.dirname, "..");
const jsonPath = path.join(root, "data/story/quest-table.json");
const mdPath = path.join(root, "docs/release/QUEST_TABLE.md");
const luaRef = process.env.QUEST_LUA_REF || "origin/cursor/roblox-ep1-d99c";
const luaPath = "roblox/src/ReplicatedStorage/Config/QuestTable.lua";

function fail(msg) {
  console.error("FAIL test-quest-table-sync:", msg);
  process.exit(1);
}

function loadJson() {
  const j = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const questIds = j.quests.map(q => q.id);
  const endings = questIds.filter(id => id.startsWith("ending_"));
  const ch0 = j.quests.find(q => q.id === "q_ch0_newbie");
  const items = new Set(["bell_rim", "bell_tongue_zoya", "bell_tongue_zombie", "bell_crown"]);
  for (const q of j.quests) {
    (q.rewards || []).forEach(r => {
      if (r.unique) items.add(r.unique);
    });
  }
  return { questIds: new Set(questIds), endings, items, stepsCh0: ch0?.steps || [] };
}

function loadMd() {
  const md = fs.readFileSync(mdPath, "utf8");
  const tableSection = md.split("## Главная линия")[1]?.split("##")[0] || md;
  const ids = new Set();
  for (const line of tableSection.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map(c => c.trim());
    const id = cells[1];
    if (/^q_|^ending_/.test(id)) ids.add(id);
  }
  const itemSection = md.split("## Уникальные предметы")[1]?.split("##")[0] || "";
  const items = new Set();
  for (const line of itemSection.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map(c => c.trim());
    if (cells[1] && /^bell_/.test(cells[1])) items.add(cells[1]);
  }
  const stepSection = md.split("## Шаги q_ch0_newbie")[1]?.split("##")[0] || "";
  const ch0Steps = [];
  for (const line of stepSection.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map(c => c.trim());
    if (/^ch0_s_/.test(cells[1])) ch0Steps.push(cells[1]);
  }
  return { ids, items, ch0Steps };
}

function loadLua() {
  let src;
  try {
    src = execSync(`git show ${luaRef}:${luaPath}`, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  } catch (e) {
    fail(`Cannot read ${luaPath} from ${luaRef}: ${e.message}`);
  }
  const questIds = new Set();
  const reKey = /\b(q_ch\d+_\w+|q_initiation_\w+|ending_\w+)\s*=/g;
  let m;
  while ((m = reKey.exec(src))) questIds.add(m[1]);
  const reConst = /QuestTable\.(\w+)\s*=\s*"(q_[^"]+|ending_[^"]+)"/g;
  while ((m = reConst.exec(src))) questIds.add(m[2]);
  const ch0Steps = [];
  const stepRe = /id\s*=\s*"(ch0_s_[^"]+)"/g;
  while ((m = stepRe.exec(src))) ch0Steps.push(m[1]);
  const items = new Set();
  const itemRe = /bell_(?:rim|tongue_zoya|tongue_zombie|crown)/g;
  while ((m = itemRe.exec(src))) items.add(m[0]);
  return { questIds, ch0Steps, items };
}

function diffSets(name, a, b) {
  const onlyA = [...a].filter(x => !b.has(x)).sort();
  const onlyB = [...b].filter(x => !a.has(x)).sort();
  if (onlyA.length || onlyB.length) {
    fail(`${name}: only A ${onlyA.join(", ") || "—"} | only B ${onlyB.join(", ") || "—"}`);
  }
}

function diffLists(name, a, b) {
  if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
    fail(`${name}: [${a.join(",")}] vs [${b.join(",")}]`);
  }
}

const json = loadJson();
const md = loadMd();
const lua = loadLua();

diffSets("quest/ending ids (json vs md)", json.questIds, md.ids);
diffSets("quest/ending ids (json vs lua)", json.questIds, lua.questIds);
diffSets("bell items (json vs md)", json.items, md.items);
const luaItemsMissing = [...md.items].filter(x => !lua.items.has(x));
if (luaItemsMissing.length) {
  console.warn("WARN: Lua missing item ids (sync Roblox PR):", luaItemsMissing.join(", "));
}
if (!lua.items.has("bell_rim")) fail("lua must reference bell_rim");
diffLists("ch0 steps (json vs md)", json.stepsCh0, md.ch0Steps);
diffLists("ch0 steps (md vs lua)", md.ch0Steps, lua.ch0Steps);

console.log("PASS test-quest-table-sync");
console.log(JSON.stringify({ quests: json.questIds.size, endings: json.endings.length, luaRef }, null, 2));
