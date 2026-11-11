#!/usr/bin/env node
/** Unit checks for devCoinsEnabled gate (must match js/game.js). */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const gameSrc = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const fnMatch = gameSrc.match(/function devCoinsEnabled\(\)\s*\{[\s\S]*?\n\}/);
if (!fnMatch) {
  console.error("test-dev-coins-gate: could not extract devCoinsEnabled from game.js");
  process.exit(1);
}

function devCoinsEnabled(env) {
  const sandbox = {
    window: { __PUNK_PREVIEW__: env.preview === true },
    location: {
      search: env.search || "",
      hostname: env.hostname || "example.com"
    },
    localStorage: {
      getItem(k) {
        return k === "punkme_dev" ? env.storageDev || null : null;
      }
    },
    URLSearchParams
  };
  return vm.runInNewContext(`${fnMatch[0]}\ndevCoinsEnabled();`, sandbox);
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  }
}

assert(
  !devCoinsEnabled({ search: "?dev=1", hostname: "punk-me.web.app", preview: false }),
  "production host must ignore ?dev"
);
assert(
  !devCoinsEnabled({ search: "", hostname: "punk-me.firebaseapp.com", preview: false, storageDev: "1" }),
  "production host must ignore punkme_dev localStorage"
);
assert(
  devCoinsEnabled({ search: "?dev=1", hostname: "127.0.0.1", preview: false }),
  "localhost allows ?dev"
);
assert(
  devCoinsEnabled({ search: "", hostname: "localhost", preview: false, storageDev: "1" }),
  "localhost allows punkme_dev"
);
assert(
  devCoinsEnabled({ search: "?dev=1", hostname: "evil.com", preview: true }),
  "preview build allows ?dev on any host"
);
assert(!devCoinsEnabled({ search: "", hostname: "localhost", preview: false }), "no flag -> off on localhost");

if (failed) {
  console.error(`test-dev-coins-gate: ${failed} failed`);
  process.exit(1);
}
console.log("test-dev-coins-gate: PASS");
