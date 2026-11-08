#!/usr/bin/env node
/** One short Playwright record — verify saveAs path, ffprobe, SHA stamp. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn, spawnSync } = require("child_process");
const {
  assertFirebaseEmulatorTestEnv,
  firebaseEmulatorQueryString,
  installProdFirebaseRouteBlock,
} = require("./firebase-test-emulator-guard");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const OUT = process.env.PUNK_ICE_OUT || path.join("/opt/cursor/artifacts", "ice-ch1-footage");
const PORT = Number(process.env.PUNK_PORT || "3470");
const SHA = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
const sha12 = SHA.slice(0, 12);

function serveRoot() {
  return new Promise(resolve => {
    const child = spawn("npx", ["--yes", "serve", "-l", String(PORT), "."], {
      cwd: ROOT,
      stdio: "ignore",
      detached: true,
    });
    const deadline = Date.now() + 45000;
    const poll = () => {
      http
        .get(`http://127.0.0.1:${PORT}/`, res => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve(child);
          else if (Date.now() < deadline) setTimeout(poll, 400);
          else throw new Error("serve not ready");
        })
        .on("error", () => {
          if (Date.now() < deadline) setTimeout(poll, 400);
          else throw new Error("serve not ready");
        });
    };
    setTimeout(poll, 500);
  });
}

function ffprobeMeta(file) {
  if (!file || !fs.existsSync(file)) return { error: "missing", path: file };
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "json", file], {
    encoding: "utf8",
  });
  if (r.status !== 0) return { error: "ffprobe failed", path: file, stderr: (r.stderr || "").slice(0, 200) };
  try {
    const j = JSON.parse(r.stdout);
    const durationSec = Number(j.format?.duration);
    const sizeBytes = Number(j.format?.size);
    return { path: file, durationSec, sizeBytes, error: null };
  } catch (e) {
    return { error: String(e.message), path: file };
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const serveChild = await serveRoot();
  const videoDir = path.join(OUT, `playwright-video-smoke-${sha12}`);
  fs.mkdirSync(videoDir, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 640, height: 360 },
    recordVideo: { dir: videoDir, size: { width: 640, height: 360 } },
  });
  const page = await ctx.newPage();
  await installProdFirebaseRouteBlock(page);
  const qs = firebaseEmulatorQueryString();
  await page.goto(`http://127.0.0.1:${PORT}/?solo=1${qs}&v=video-smoke`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  const dest = path.join(OUT, `video-record-smoke-${sha12}.webm`);
  const video = page.video();
  let saveErr = null;
  await ctx.close();
  try {
    await video.saveAs(dest);
  } catch (e) {
    saveErr = String(e.message || e);
    try {
      const p = await video.path();
      if (p && fs.existsSync(p)) fs.copyFileSync(p, dest);
    } catch (e2) {
      saveErr = `${saveErr}; ${e2.message || e2}`;
    }
  }
  await browser.close();
  try {
    process.kill(-serveChild.pid, "SIGTERM");
  } catch (_) {}
  const meta = ffprobeMeta(dest);
  const report = { repoSha: SHA, dest, saveErr, ...meta, pass: !meta.error && !saveErr };
  const outJson = path.join(OUT, `video-record-smoke-${sha12}.json`);
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
})();
