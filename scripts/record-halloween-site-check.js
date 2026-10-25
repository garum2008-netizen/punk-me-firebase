#!/usr/bin/env node
/**
 * Halloween public site + local preview QA recording (1080p video + logs).
 * Usage:
 *   LIVE_URL=https://halloween.punk.contractbot.dk PREVIEW_URL=http://127.0.0.1:8765 node scripts/record-halloween-site-check.js
 */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const OUT = path.join("/workspace/qa/site-check");
const LIVE_URL = (process.env.LIVE_URL || "https://halloween.punk.contractbot.dk").replace(/\/$/, "");
const PREVIEW_URL = (process.env.PREVIEW_URL || "http://127.0.0.1:8765").replace(/\/$/, "");
const VIEWPORT = { width: 1920, height: 1080 };

fs.mkdirSync(OUT, { recursive: true });

function redactLogLine(line) {
  return String(line)
    .replace(/apiKey["']?\s*[:=]\s*["'][^"']+["']/gi, "apiKey=[REDACTED]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]");
}

async function probeEnv(browserType, label) {
  const browser = await browserType.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"]
  });
  const page = await browser.newPage();
  await page.goto("about:blank");
  const webgl = await page.evaluate(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      if (!gl) return { ok: false, renderer: "none" };
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const r = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";
      return { ok: true, renderer: String(r) };
    } catch (e) {
      return { ok: false, renderer: e.message };
    }
  });
  const ver = browser.version();
  await browser.close();
  return { label, browser: ver, webgl };
}

async function recordSession({ name, baseUrl, browserType, browserLabel }) {
  const videoDir = path.join(OUT, "videos", name);
  fs.mkdirSync(videoDir, { recursive: true });
  const logPath = path.join(OUT, "logs", `${name}-console.log`);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logLines = [];

  const browser = await browserType.launch({
    headless: false,
    args: [
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--autoplay-policy=no-user-gesture-required"
    ]
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: videoDir, size: VIEWPORT },
    locale: "ru-RU"
  });
  const page = await context.newPage();
  page.on("console", msg => logLines.push(`[${msg.type()}] ${redactLogLine(msg.text())}`));
  page.on("pageerror", err => logLines.push(`[pageerror] ${redactLogLine(err.message)}`));

  const steps = [];
  const mark = (id, note) => {
    const t = Date.now();
    steps.push({ id, note, t });
    console.log(`[${name}] ${id}: ${note}`);
  };

  try {
    mark("start", `open ${baseUrl}`);
    await page.goto(`${baseUrl}/?solo=1&v=site-check`, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForTimeout(3000);

    const boot = await page.evaluate(() => ({
      webglProbe: window.__punkProbeWebGL?.(),
      loadingVisible: document.getElementById("loading")?.style.display !== "none",
      bootTitle: document.querySelector(".loading-boot-title")?.textContent || "",
      version: window.GAME_VERSION || ""
    }));
    mark("boot", JSON.stringify(boot));

    if (boot.loadingVisible && boot.bootTitle && /запускается|won't start|ikke starter/i.test(boot.bootTitle)) {
      mark("blocked_webgl", "WebGL boot screen — route aborted");
      throw new Error("WebGL boot failure on this runner");
    }

    await page.waitForFunction(
      () => window.__punkApplyFirebaseSnapshot && window.CharSelect,
      { timeout: 120000 }
    );
    mark("harness", "test hooks ready");

    await page.evaluate(() => {
      try {
        localStorage.setItem("punkme_howto_seen", "1");
      } catch (e) {}
      window.__punkApplyFirebaseSnapshot?.({ exists: () => false, val: () => null });
      window.__punkFinishLoadMeFlow?.();
    });
    mark("new_player", "fresh save → char select");

    await page.waitForSelector("#charSelect.active", { timeout: 60000 });
    await page.waitForSelector("#charSelectConfirm:not([disabled])", { timeout: 90000 }).catch(() => {});
    await page.evaluate(() => {
      document.querySelector('.char-pick[data-id="cobalt"]')?.click();
      document.getElementById("charSelectConfirm")?.click();
    });
    mark("char_cobalt", "picked cobalt");

    await page.waitForFunction(() => window.me?.characterId && document.getElementById("loading")?.style.display === "none", {
      timeout: 120000
    });
    mark("in_game", `characterId=${await page.evaluate(() => window.me?.characterId)}`);

    await page.keyboard.press("w");
    await page.waitForTimeout(800);
    await page.keyboard.press("e");
    await page.waitForTimeout(1500);
    mark("move_talk", "W move + E interact");

    await page.evaluate(() => {
      if (window.saveMe) window.saveMe();
    });
    mark("save", "saveMe()");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);
    const after = await page.evaluate(() => ({
      characterId: window.me?.characterId,
      coins: window.me?.coins,
      loading: document.getElementById("loading")?.style.display
    }));
    mark("reload", JSON.stringify(after));
  } catch (e) {
    mark("error", e.message || String(e));
  }

  await context.close();
  await browser.close();

  const webm = fs.readdirSync(videoDir).find(f => f.endsWith(".webm"));
  const webmPath = webm ? path.join(videoDir, webm) : null;
  const mp4Path = path.join(OUT, `${name}.mp4`);
  if (webmPath && fs.existsSync(webmPath)) {
    await new Promise((resolve, reject) => {
      const ff = spawn(
        "ffmpeg",
        ["-y", "-i", webmPath, "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-c:a", "aac", "-b:a", "128k", mp4Path],
        { stdio: "inherit" }
      );
      ff.on("exit", c => (c === 0 ? resolve() : reject(new Error(`ffmpeg ${c}`))));
    });
  }

  fs.writeFileSync(logPath, logLines.join("\n"));
  return { name, baseUrl, steps, mp4Path: fs.existsSync(mp4Path) ? mp4Path : null, logPath, browserLabel };
}

function writeTimestamps(results) {
  const lines = ["# TIMECODES — Halloween site check", "", `Recorded: ${new Date().toISOString()}`, ""];
  for (const r of results) {
    lines.push(`## ${r.name} (${r.baseUrl})`);
    lines.push(`- Video: \`${path.basename(r.mp4Path || "missing")}\``);
    lines.push(`- Console: \`${path.basename(r.logPath)}\``);
    lines.push("");
    const t0 = r.steps[0]?.t || 0;
    r.steps.forEach(s => {
      const sec = ((s.t - t0) / 1000).toFixed(1);
      lines.push(`- **${sec}s** — \`${s.id}\` ${s.note}`);
    });
    lines.push("");
  }
  fs.writeFileSync(path.join(OUT, "TIMECODES.md"), lines.join("\n"));
}

function writeMatrix(envProbes, results) {
  const commit = require("child_process").execSync("git rev-parse --short HEAD", { cwd: "/workspace" }).toString().trim();
  const rows = [
    "| Check | Live | Preview | Notes |",
    "| --- | --- | --- | --- |",
    `| Env commit | — | \`${commit}\` | Live = deployed main |`,
    `| Browser | Chromium ${envProbes.chromium?.browser || "?"} | Chromium ${envProbes.chromium?.browser || "?"} | WebKit noted separately below |`,
    `| WebGL (probe) | ${envProbes.liveWebgl?.webgl?.ok ? "yes" : "no"} (${envProbes.liveWebgl?.webgl?.renderer || "n/a"}) | ${envProbes.previewWebgl?.webgl?.ok ? "yes" : "n/a"} | SwiftShader on runner |`,
    `| New player → char select | see video | see video | |`,
    `| Movement + E | see video | see video | |`,
    `| Save + reload | see video | see video | |`,
    `| Google sign-in | not tested | not tested | No shared credentials in agent |`,
    `| Multiplayer (2 contexts) | not tested | not tested | Follow-up |`,
    `| WebKit (Playwright) | — | — | Not real Safari; skipped unless webkit installed |`
  ];
  for (const r of results) {
    const ok = !r.steps.some(s => s.id === "error" || s.id === "blocked_webgl");
    rows.push(`| Recording \`${r.name}\` | ${r.name === "live" ? (ok ? "works" : "broken") : "—"} | ${r.name === "preview" ? (ok ? "works" : "broken") : "—"} | |`);
  }
  fs.writeFileSync(path.join(OUT, "SITE-CHECK-MATRIX.md"), rows.join("\n") + "\n");
}

async function main() {
  const envProbes = {
    chromium: await probeEnv(chromium, "chromium"),
    liveWebgl: null,
    previewWebgl: null
  };
  const results = [];
  results.push(await recordSession({ name: "live", baseUrl: LIVE_URL, browserType: chromium, browserLabel: envProbes.chromium.browser }));
  envProbes.liveWebgl = await pageWebglOnUrl(chromium, LIVE_URL);
  results.push(
    await recordSession({ name: "preview", baseUrl: PREVIEW_URL, browserType: chromium, browserLabel: envProbes.chromium.browser })
  );
  envProbes.previewWebgl = await pageWebglOnUrl(chromium, PREVIEW_URL);
  writeTimestamps(results);
  writeMatrix(envProbes, results);
  console.log("Done:", OUT);
}

async function pageWebglOnUrl(browserType, baseUrl) {
  const browser = await browserType.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/?solo=1`, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {});
  const webgl = await page.evaluate(() => window.__punkProbeWebGL?.() || { ok: false });
  await browser.close();
  return { webgl };
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
