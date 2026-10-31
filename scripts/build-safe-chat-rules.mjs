#!/usr/bin/env node
/**
 * Apply safe-chat RTDB overlay to a rules JSON file (stdout or write).
 * Usage: node scripts/build-safe-chat-rules.mjs [--write] [path/to/database.rules.json]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { applySafeChatPatch, SAFE_CHAT_RULES_DELTA_MD } from "./lib/rtdb-safe-chat-patch.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const target = process.argv.find(a => a.endsWith(".json")) || path.join(root, "database.rules.json");
const write = process.argv.includes("--write");

const raw = JSON.parse(fs.readFileSync(target, "utf8"));
const patched = { rules: applySafeChatPatch(raw.rules) };

console.log(SAFE_CHAT_RULES_DELTA_MD);
console.log("\n### Apply order (owner, no auto-deploy in PR)\n");
console.log("1. Deploy **PR #45** hotfix rules to RTDB (or merge hotfix branch rules as baseline).");
console.log("2. Run this script on the **live-exported** `database.rules.json` backup, review diff.");
console.log("3. Merge **PR #46** — `database.rules.json` in-repo matches `applySafeChatPatch` (overlay script still used for live-export refresh).");
console.log("4. Publish merged rules once; deploy Worker + secrets; enable `__PUNK_SAFE_CHAT_URL` on site.\n");

if (write) {
  fs.writeFileSync(target, JSON.stringify(patched, null, 2) + "\n");
  console.log(`Wrote ${target}`);
} else {
  console.log("Dry run (pass --write to save). chat.messages.write:", patched.rules.chat.messages[".write"]);
}
