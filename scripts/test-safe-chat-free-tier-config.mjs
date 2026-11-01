#!/usr/bin/env node
/**
 * Fail if wrangler.toml declares paid / non–Free-tier bindings.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wranglerToml = fs.readFileSync(path.join(__dirname, "../workers/safe-chat/wrangler.toml"), "utf8");

const forbidden = [
  { name: "no Workers KV namespace binding", re: /\[\[kv_namespaces\]\]/ },
  { name: "no R2 bucket binding", re: /\[\[r2_buckets\]\]/ },
  { name: "no D1 database binding", re: /\[\[d1_databases\]\]/ },
  { name: "no Queues producer/consumer", re: /\[\[queues\.(producers|consumers)\]\]/ },
  { name: "no Hyperdrive binding", re: /\[\[hyperdrive\]\]/ },
  { name: "no Analytics Engine binding", re: /\[\[analytics_engine_datasets\]\]/ },
  { name: "no legacy new_classes DO migration", re: /^\s*new_classes\s*=/m }
];

const required = [
  {
    name: "uses new_sqlite_classes for ChatLimitsDO",
    pass: /new_sqlite_classes\s*=\s*\[\s*"ChatLimitsDO"\s*\]/i.test(wranglerToml)
  },
  {
    name: "SAFE_CHAT_FREE_TEXT is false in wrangler.toml",
    pass: /SAFE_CHAT_FREE_TEXT\s*=\s*["']false["']/i.test(wranglerToml)
  }
];

let failed = 0;
for (const f of forbidden) {
  const hit = f.re.test(wranglerToml);
  console.log(`${hit ? "FAIL" : "PASS"}  ${f.name}`);
  if (hit) failed += 1;
}
for (const r of required) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  if (!r.pass) failed += 1;
}
if (failed) process.exit(1);
console.log(`\n${forbidden.length + required.length} checks, 0 FAIL`);
