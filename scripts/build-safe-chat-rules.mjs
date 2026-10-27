#!/usr/bin/env node
/**
 * Document safe-chat rules overlay (does not deploy).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { applySafeChatPatch, SAFE_CHAT_RULES_DELTA_MD } from "./lib/rtdb-safe-chat-patch.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const rulesPath = path.join(root, "database.rules.json");

const raw = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
const patched = { rules: applySafeChatPatch(raw.rules) };
console.log(SAFE_CHAT_RULES_DELTA_MD);
console.log("\nCurrent repo database.rules.json already contains safe-chat chat subtree.");
console.log("chat.messages.write:", patched.rules.chat.messages[".write"]);
