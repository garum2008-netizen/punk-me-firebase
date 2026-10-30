#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "../workers/safe-chat/src");
const prodFiles = ["auth-prod.js", "firebase-jwt.js", "index.js", "config.js"];

const forbidden = [/skipAuth/i, /SAFE_CHAT_SKIP_AUTH/i, /SAFE_CHAT_TEST_MODE/i, /verifyViaAuthEmulator/];

let failed = 0;
for (const file of prodFiles) {
  const text = fs.readFileSync(path.join(srcDir, file), "utf8");
  for (const re of forbidden) {
    if (re.test(text)) {
      console.log(`FAIL  ${file} matches ${re}`);
      failed += 1;
    }
  }
}
if (failed) process.exit(1);
console.log(`PASS  production worker sources contain no test-auth bypass strings (${prodFiles.length} files)`);
