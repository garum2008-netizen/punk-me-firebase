#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../workers/safe-chat/src/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wranglerToml = fs.readFileSync(path.join(__dirname, "../workers/safe-chat/wrangler.toml"), "utf8");
const srcDir = path.join(__dirname, "../workers/safe-chat/src");

const forbiddenInToml = [
  "SAFE_CHAT_TEST_MODE",
  "SAFE_CHAT_SKIP_AUTH",
  "SAFE_CHAT_INTEGRATION",
  "SAFE_CHAT_TEST_DISABLE",
  "test-mutation-flags"
];

const cases = [
  {
    name: "wrangler.toml has no SAFE_CHAT_TEST_MODE",
    pass: !wranglerToml.includes("SAFE_CHAT_TEST_MODE")
  },
  {
    name: "wrangler.toml has no SAFE_CHAT_SKIP_AUTH",
    pass: !wranglerToml.includes("SAFE_CHAT_SKIP_AUTH")
  },
  {
    name: "loadConfig freeText false by default",
    pass: loadConfig({}).freeTextEnabled === false
  },
  {
    name: "wrangler.toml uses new_sqlite_classes for ChatLimitsDO",
    pass: /new_sqlite_classes\s*=\s*\[\s*"ChatLimitsDO"\s*\]/i.test(wranglerToml)
  },
  {
    name: "wrangler.toml has no new_classes (KV-backed) migration",
    pass: !/^\s*new_classes\s*=/m.test(wranglerToml)
  },
  ...forbiddenInToml.map(key => ({
    name: `wrangler.toml has no ${key}`,
    pass: !wranglerToml.includes(key)
  })),
  {
    name: "worker src has no SAFE_CHAT_TEST_DISABLE strings",
    pass: !fs.readFileSync(path.join(srcDir, "index.js"), "utf8").includes("SAFE_CHAT_TEST_DISABLE")
  }
];

let failed = 0;
for (const c of cases) {
  console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  if (!c.pass) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${cases.length} PASS, 0 FAIL`);
