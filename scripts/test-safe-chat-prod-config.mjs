#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../workers/safe-chat/src/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wranglerToml = fs.readFileSync(path.join(__dirname, "../workers/safe-chat/wrangler.toml"), "utf8");

const cases = [
  {
    name: "wrangler.toml has no SAFE_CHAT_TEST_MODE",
    pass: !wranglerToml.includes("SAFE_CHAT_TEST_MODE")
  },
  {
    name: "wrangler.toml SAFE_CHAT_SKIP_AUTH is false",
    pass: /SAFE_CHAT_SKIP_AUTH\s*=\s*["']false["']/i.test(wranglerToml)
  },
  {
    name: "loadConfig testMode false without test flag",
    pass: loadConfig({ SAFE_CHAT_SKIP_AUTH: "false" }).testMode === false
  }
];

let failed = 0;
for (const c of cases) {
  console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  if (!c.pass) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${cases.length} PASS, 0 FAIL`);
