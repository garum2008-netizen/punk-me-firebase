#!/usr/bin/env node
/**
 * Deploy dist-preview + functions to Cloudflare Pages when credentials exist in env.
 * Requires: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT (name).
 * PREVIEW_USER/PREVIEW_PASS must be set on the Pages project (not passed on CLI).
 * Never logs secret values.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
const project = process.env.CLOUDFLARE_PAGES_PROJECT || process.env.CF_PAGES_PROJECT;

function fail(msg, code = 1) {
  console.error("deploy-preview-cloudflare:", msg);
  process.exit(code);
}

if (!token || !accountId || !project) {
  fail(
    "SKIP (not configured): set CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT in environment or GitHub Actions secrets",
    2
  );
}

const build = spawnSync("node", [path.join(__dirname, "build-preview.js")], {
  cwd: ROOT,
  stdio: "inherit",
});
if (build.status !== 0) fail("build-preview failed", build.status || 1);

const deploy = spawnSync(
  "npx",
  [
    "--yes",
    "wrangler@4.156.2",
    "pages",
    "deploy",
    "dist-preview",
    "--project-name",
    project,
    "--branch",
    process.env.CLOUDFLARE_PREVIEW_BRANCH || "preview-ch1",
    "--commit-dirty=true",
  ],
  {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: accountId,
    },
  }
);
if (deploy.status !== 0) fail("wrangler pages deploy failed", deploy.status || 1);

console.log("deploy-preview-cloudflare: PASS (see wrangler output for preview URL)");
