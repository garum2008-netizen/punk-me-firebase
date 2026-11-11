#!/usr/bin/env node
/** Silhouette integrity for Angelina shipped WebPs (source-derived mask). */
const { spawnSync } = require("child_process");
const path = require("path");

const r = spawnSync("python3", [path.join(__dirname, "angelina-skin-silhouette-check.py")], {
  stdio: "inherit"
});
if (r.status !== 0) process.exit(r.status || 1);
console.log("angelina-skin-silhouette: PASS");
