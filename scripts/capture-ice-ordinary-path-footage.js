#!/usr/bin/env node
/**
 * Ordinary local-save entry: full UI onboarding + Life Ch1 — genuine inputs only.
 * No evaluate(goLocation), no onboarding.done injection, no lifeCh1Slice/lifeCh1E2e URL flags.
 * State reads via page.evaluate are allowed; progression via keyboard/mouse only.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn, spawnSync } = require("child_process");
const { isProdFirebaseRequest } = require("./firebase-prod-guard");
const {
  assertFirebaseEmulatorTestEnv,
  firebaseEmulatorQueryString,
  installProdFirebaseRouteBlock,
} = require("./firebase-test-emulator-guard");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const OUT = process.env.PUNK_ICE_OUT || path.join("/opt/cursor/artifacts", "ice-ch1-footage");
const PORT = Number(process.env.PUNK_PORT || "3463");
const SHA = (
  process.env.PUNK_EVIDENCE_SHA ||
  spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim()
).trim();
const ORDINARY_PASS_RAW = process.env.ORDINARY_PASS || "1";
const ORDINARY_PASS = Number(ORDINARY_PASS_RAW);
const INPUT_MODE = process.env.ORDINARY_INPUT || "keyboard";
const PORTAL_GATE_ONLY = process.env.PORTAL_GATE_ONLY === "1";
const PORTAL_STRICT = process.env.PORTAL_STRICT === "1" || PORTAL_GATE_ONLY;
const ORDINARY_DESKTOP_ONLY = process.env.ORDINARY_DESKTOP_ONLY === "1";
const ORDINARY_PORTRAIT_ONLY =
  process.env.ORDINARY_PORTRAIT_ONLY === "1" && !ORDINARY_DESKTOP_ONLY;

function ordinaryPassTag() {
  if (Number.isFinite(ORDINARY_PASS)) return `pass${String(ORDINARY_PASS).padStart(2, "0")}`;
  return `pass-${String(ORDINARY_PASS_RAW).replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

let t0 = 0;
const inputLog = [];
const scenes = [];
const renderDiagSamples = [];

function logInput(type, detail) {
  const row = { tMs: Date.now() - t0, type, detail };
  inputLog.push(row);
  return row;
}

function logScene(id, note) {
  scenes.push({ tSec: +((Date.now() - t0) / 1000).toFixed(2), id, note });
  console.log(`[scene +${scenes[scenes.length - 1].tSec}s] ${id}: ${note || ""}`);
}

function cetTimestamp(date = new Date()) {
  return (
    date.toLocaleString("en-GB", {
      timeZone: "Europe/Copenhagen",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }) + " Europe/Copenhagen (CET)"
  );
}

function findWebmUnder(dir) {
  if (!fs.existsSync(dir)) return null;
  const stack = [dir];
  let latest = null;
  let latestMtime = 0;
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.name.endsWith(".webm")) {
        const mt = fs.statSync(p).mtimeMs;
        if (mt >= latestMtime) {
          latestMtime = mt;
          latest = p;
        }
      }
    }
  }
  return latest;
}

function findNewestWebmSince(root, sinceMs, minBytes) {
  if (!fs.existsSync(root)) return null;
  let best = null;
  let bestMt = sinceMs;
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop();
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.name.endsWith(".webm")) {
        const st = fs.statSync(p);
        if (st.mtimeMs >= sinceMs - 2000 && st.size >= minBytes && st.mtimeMs >= bestMt) {
          bestMt = st.mtimeMs;
          best = p;
        }
      }
    }
  }
  return best;
}

function rescueOrdinaryRecording(rec, minBytes = 400_000) {
  if (!rec?.file) return;
  try {
    if (fs.existsSync(rec.file) && fs.statSync(rec.file).size >= minBytes) {
      rec.videoSaveError = null;
      Object.assign(rec, ffprobeMeta(rec.file));
      return;
    }
  } catch (_) {}
  let w = rec.videoDir ? findWebmUnder(rec.videoDir) : null;
  if (!w || !fs.existsSync(w) || fs.statSync(w).size < minBytes) {
    w = findNewestWebmSince(OUT, rec._recordStartMs || Date.now() - 7200000, minBytes);
  }
  if (!w || !fs.existsSync(w) || fs.statSync(w).size < minBytes) return;
  fs.mkdirSync(path.dirname(rec.file), { recursive: true });
  fs.copyFileSync(w, rec.file);
  rec.videoSaveError = null;
  Object.assign(rec, ffprobeMeta(rec.file));
}

function ffprobeMeta(filePath) {
  return ffprobeMetaSafe(filePath);
}

async function captureHeroProof(page, tag) {
  const dir = path.join(OUT, `hero-stills-${SHA.slice(0, 12)}-${ordinaryPassTag()}`);
  fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, `${tag}.png`);
  await page
    .waitForFunction(() => window.World3D?.getPlayerActorSnapshot?.()?.meshHeroId === "mohawk", undefined, {
      timeout: 45000,
    })
    .catch(() => {});
  await page.screenshot({ path: fp, type: "png" });
  const snap = await page.evaluate(() => {
    const pl = window.World3D?.getPlayerActorSnapshot?.() || {};
    const ang = window.World3D?.getAngelinaLifeBillboardSnapshot?.() || {};
    return {
      pl,
      ang,
      meshId: window.resolveEffectivePlayerMeshId?.(window.me) || window.me?.characterId,
      location: window.me?.location,
    };
  });
  const row = { tag, tSec: +((Date.now() - t0) / 1000).toFixed(2), fp, snap };
  sessionHeroStills.push(row);
  logScene(`hero_still_${tag}`, JSON.stringify({
    meshId: snap.meshId,
    accent: snap.pl?.accent,
    wings: snap.pl?.hasWings,
    companion3d: snap.ang?.companion3d,
  }));
  return row;
}

async function preFinalizeRecordingSession(r) {
  if (!r || r.file == null) return;
  const minB = r.minVideoBytes ?? 800_000;
  r._sessionWallSec = +(((r._sessionEndMs || Date.now()) - (r._recordStartMs || Date.now())) / 1000).toFixed(2);

  let haveWebm = fs.existsSync(r.file) && fs.statSync(r.file).size >= minB;
  if (!haveWebm && r.ffmpegProc && (r.mkvDest || r.segmentDir)) {
    await stopFfmpegGraceful(r.ffmpegProc, r.segmentDir ? null : r.mkvDest, minB);
    if (r.segmentDir) {
      const concat = concatFfmpegSegments(r.segmentDir, r.mkvDest);
      if (!concat.ok) r.videoSaveError = concat.error || "segment_concat_failed";
      else logScene("ffmpeg_segments_concat", `${concat.segments} parts → ${r.mkvDest}`);
    }
    const mkvOk = fs.existsSync(r.mkvDest) && fs.statSync(r.mkvDest).size >= minB;
    if (mkvOk) {
      const remux = remuxMkvToWebm(r.mkvDest, r.file);
      if (remux.ok && remux.path !== r.file) {
        r.file = remux.path;
        r.videoFormat = remux.format;
      } else if (remux.ok) {
        r.videoFormat = remux.format || "webm";
      } else if (fs.existsSync(r.mkvDest) && fs.statSync(r.mkvDest).size >= minB) {
        r.file = r.mkvDest;
        r.videoFormat = r.mkvDest.endsWith(".mkv") ? "mkv" : "mp4";
      } else {
        r.videoSaveError = remux.error || "remux_failed";
      }
    } else {
      r.videoSaveError = "ffmpeg_mkv_missing_or_small";
    }
  }
  haveWebm = fs.existsSync(r.file) && fs.statSync(r.file).size >= minB;
  if (!haveWebm && r._video) {
    await closePlaywrightRecordingSession(r);
  }
}

async function postFinalizeRecordingSession(r) {
  if (!r || r.file == null) return;
  const minB = r.minVideoBytes ?? 800_000;
  let haveWebm = fs.existsSync(r.file) && fs.statSync(r.file).size >= minB;
  if (!haveWebm && r._video) {
    const pw = await savePlaywrightVideoAfterBrowserClose(r);
    if (!pw.ok) r.videoSaveError = pw.error || r.videoSaveError || "playwright_video_failed";
    else r.videoSaveError = null;
  }
  if (!fs.existsSync(r.file) || fs.statSync(r.file).size < minB) {
    rescueOrdinaryRecording(r, minB);
  }
  if (fs.existsSync(r.file) && fs.statSync(r.file).size >= minB) {
    r.videoSaveError = null;
    Object.assign(r, ffprobeMeta(r.file));
    r.sha256 = sha256File(r.file);
  }

  r.heroStills = r.heroStills || sessionHeroStills.slice();
  const heroGate = await validateHeroStillsWithHairPixels(r.heroStills, 6);
  const durationGate = validateDurationGate(r._sessionWallSec, r.durationSec, 0.1);
  const framesDir = path.join(OUT, `hero-frames-video-${SHA.slice(0, 12)}-${ordinaryPassTag()}`);
  const frameTimes = r.heroStills.filter(s => heroGate.tags.includes(s.tag)).map(s => s.tSec).slice(0, 8);
  if (r.file && fs.existsSync(r.file) && frameTimes.length) {
    r.videoFrames = extractFramesAtTimes(r.file, frameTimes, framesDir);
  } else {
    r.videoFrames = [];
  }

  let luminanceGate = { ok: true, skipped: true };
  const lumDir = path.join(OUT, `luminance-scan-${SHA.slice(0, 12)}-${ordinaryPassTag()}`);
  const timelinePath = path.join(OUT, `recording-timeline-${SHA.slice(0, 12)}-${ordinaryPassTag()}.json`);
  if (r.studioWallMs != null || r.renderDiagSamples) {
    fs.writeFileSync(
      timelinePath,
      JSON.stringify(
        {
          sha: SHA,
          gameplayAlignedRecording: !!r.gameplayAlignedRecording,
          studioWallMs: r.studioWallMs ?? null,
          studioMaxWallMs: 70000,
          renderDiagSamples: r.renderDiagSamples || [],
          scenes: r.scenes || [],
        },
        null,
        2
      )
    );
    r.recordingTimeline = timelinePath;
  }
  if (r.file && fs.existsSync(r.file)) {
    const ignoreSec =
      r.gameplayAlignedRecording && r.studioWallMs != null && r.studioWallMs <= 70000 ? "0" : process.env.VIDEO_LUMINANCE_IGNORE_BEFORE_SEC || "70";
    const lumEnv = {
      ...process.env,
      VIDEO_LUMINANCE_IGNORE_BEFORE_SEC: ignoreSec,
      RECORDING_TIMELINE_JSON: timelinePath,
    };
    const lum = spawnSync(
      "node",
      [path.join(ROOT, "scripts/video-luminance-scan.js"), r.file, lumDir, timelinePath],
      {
      env: lumEnv,
      encoding: "utf8",
    }
    );
    const lumJson = path.join(lumDir, "LUMINANCE_SCAN.json");
    if (fs.existsSync(lumJson)) {
      try {
        luminanceGate = { ...JSON.parse(fs.readFileSync(lumJson, "utf8")), skipped: false };
        luminanceGate.ok = !!luminanceGate.ok;
      } catch (_) {
        luminanceGate = { ok: false, skipped: false, parseError: true };
      }
    } else {
      luminanceGate = { ok: lum.status === 0, skipped: false, exitCode: lum.status };
    }
    r.luminanceScanDir = lumDir;
  }

  r.recordingGate = {
    heroStill: heroGate,
    duration: durationGate,
    luminance: luminanceGate,
    ok: heroGate.ok && durationGate.ok && luminanceGate.ok && !r.videoSaveError,
    rejectLegacy245s:
      "Do not use rejected SHA 7d3d245dd54a4b60dcfad601f6e28589720a2b387d6f66f061868f91a805fc7d",
  };
  if (!r.recordingGate.ok) {
    r.videoSaveError =
      r.videoSaveError || `gate_failed:${!heroGate.ok ? "hero" : ""}${!durationGate.ok ? "duration" : ""}`;
  }
}

function serveRoot() {
  return new Promise(resolve => {
    const child = spawn("npx", ["--yes", "serve", "-l", String(PORT), "."], {
      cwd: ROOT,
      stdio: "ignore",
      detached: true,
    });
    const deadline = Date.now() + 45000;
    const poll = () => {
      http.get(`http://127.0.0.1:${PORT}/`, res => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve(child);
        else if (Date.now() < deadline) setTimeout(poll, 400);
        else throw new Error("serve not ready");
      }).on("error", () => {
        if (Date.now() < deadline) setTimeout(poll, 400);
        else throw new Error("serve not ready");
      });
    };
    setTimeout(poll, 500);
  });
}

async function readState(page) {
  return page.evaluate(() => ({
    onboardingStep: window.me?.onboarding?.step ?? -1,
    onboardingDone: !!window.me?.onboarding?.done,
    location: window.me?.location,
    lifeCh1: window.me?.lifeCh1
      ? {
          active: window.me.lifeCh1.active,
          stepIndex: window.me.lifeCh1.stepIndex,
          completed: window.me.lifeCh1.completed,
        }
      : null,
  }));
}

async function dismissHowTo(page) {
  logInput("keyboard", "howto_seen via close if visible");
  const close = page.locator(".howto-close");
  if (await close.isVisible({ timeout: 2500 }).catch(() => false)) {
    await close.click();
  }
}

async function waitReadableDialog(page, minMs = 900) {
  const line = page.locator(".life-ch1-dialog-text p, #storyDialog .story-dialog-body p").first();
  if (!(await line.isVisible({ timeout: 2000 }).catch(() => false))) return;
  const len = await line.textContent().then(t => (t || "").trim().length).catch(() => 40);
  const ms = Math.min(4000, Math.max(minMs, Math.round(len * 32)));
  logInput("wait_read", `dialog ${ms}ms len=${len}`);
  await page.waitForTimeout(ms);
}

async function ensureStreetLocation(page) {
  let loc = await page.evaluate(() => window.me?.location);
  if (loc === "street") return;
  logScene("ensure_street", `travel to street from ${loc}`);
  if (!(await tryPortalTravel(page, "street", 75000))) {
    await uiOpenMapTravel(page, "street");
  }
  await page.waitForFunction(() => window.me?.location === "street", undefined, { timeout: 120000 });
  loc = await page.evaluate(() => window.me?.location);
  if (loc !== "street") {
    throw new Error(`ensureStreetLocation: still on ${loc} after portal/map travel`);
  }
}

async function openGangWithRazor(page, detail) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await ensureStreetLocation(page);
    await visibleUiClick(page, '#panelBottom button[onclick*="gangModal"]', `${detail} attempt=${attempt + 1}`);
    const razor = page.locator("#gangModal.active #gangList .npc-row[data-npc='razor']");
    if (await razor.isVisible({ timeout: 12000 }).catch(() => false)) {
      await page.waitForFunction(
        () => {
          const row = document.querySelector("#gangList .npc-row[data-npc='razor']");
          if (!row) return false;
          const r = row.getBoundingClientRect();
          return r.width > 4 && r.height > 4;
        },
        undefined,
        { timeout: 20000 }
      );
      return;
    }
    logScene("gang_razor_retry", `no razor row attempt ${attempt + 1}`);
    await page.click("#gangModal .close").catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);
  }
  throw new Error("openGangWithRazor: razor row never visible");
}

async function visibleUiClick(page, target, detail, opts = {}) {
  const loc = typeof target === "string" ? page.locator(target).first() : target.first();
  await loc.waitFor({ state: "visible", timeout: 30000 });
  if (opts.scroll) await loc.scrollIntoViewIfNeeded().catch(() => {});
  const box = await loc.boundingBox();
  if (!box || box.width < 2 || box.height < 2) {
    throw new Error(`visibleUiClick: not hittable — ${detail}`);
  }
  const probe = await page.evaluate(
    ({ cx, cy }) => {
      const hit = document.elementFromPoint(cx, cy);
      if (!hit) return { hit: "none" };
      return {
        hit: `${hit.tagName}${hit.id ? "#" + hit.id : ""}`,
        id: hit.id || "",
        testid: hit.getAttribute?.("data-testid") || "",
        onclick: (hit.getAttribute?.("onclick") || "").slice(0, 80),
      };
    },
    { cx: box.x + box.width / 2, cy: box.y + box.height / 2 }
  );
  logInput(
    "ui_click",
    `${detail} @${Math.round(box.x + box.width / 2)},${Math.round(box.y + box.height / 2)} hit=${probe.hit} id=${probe.id} testid=${probe.testid} onclick=${probe.onclick}`
  );
  await loc.click({ timeout: 15000 });
}

async function pickVisibleLifeCh1Choice(page) {
  const choices = page.locator(".life-ch1-choice");
  const n = await choices.count();
  for (let i = 0; i < n; i++) {
    const c = choices.nth(i);
    if (await c.isVisible()) {
      const label = ((await c.textContent()) || "").trim().slice(0, 72);
      await visibleUiClick(page, c, `life-ch1 choice: ${label}`);
      return label;
    }
  }
  throw new Error("no visible life-ch1 choice");
}

async function nearWorldPoint(page, tx, tz, radius = 2.85) {
  return page.evaluate(
    ({ tx, tz, radius }) => {
      const pos = window.World3D?.getPlayerWorldPosition?.();
      if (!pos) return 999;
      return Math.hypot(tx - pos.x, tz - pos.z);
    },
    { tx, tz, radius }
  );
}

async function focusStage(page) {
  logInput("click", "#stage3d focus");
  const wardrobeOpen = await page.locator("#lifeCh1Wardrobe:not([hidden])").isVisible().catch(() => false);
  if (wardrobeOpen) {
    logInput("click", "lifeCh1WardrobeClose");
    await page.click("#lifeCh1WardrobeClose").catch(() => {});
  }
  const stage = page.locator("#stage3d");
  const vp = page.viewportSize() || { width: 390, height: 844 };
  const fx = Math.min(vp.width - 24, Math.round(vp.width * 0.56));
  const fy = Math.min(vp.height - 120, Math.round(vp.height * 0.42));
  logInput("ui_click", `#stage3d focus @${fx},${fy} vp=${vp.width}x${vp.height}`);
  await stage.click({ position: { x: fx, y: fy } });
}

async function touchJoystickBurst(page, holdMs = 520) {
  const joy = page.locator("#touchJoystick");
  await joy.waitFor({ state: "visible", timeout: 15000 });
  const box = await joy.boundingBox();
  if (!box) throw new Error("touchJoystick missing bounding box");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  logInput(
    "touch_status",
    "UNVERIFIED — automation uses Playwright mouse drag on #touchJoystick; not physical touchscreen certification"
  );
  logInput("touch_playwright", `joystick drag @${Math.round(cx)},${Math.round(cy)} dy=-42ms=${holdMs}`);
  await joy.scrollIntoViewIfNeeded().catch(() => {});
  const [pointerSample] = await Promise.all([
    page.evaluate(() =>
      new Promise(resolve => {
        const joy = document.getElementById("touchJoystick");
        if (!joy) return resolve({ hasJoystick: false });
        const t = setTimeout(() => resolve({ hasJoystick: true, timeout: true }), 3000);
        joy.addEventListener(
          "pointerdown",
          e => {
            clearTimeout(t);
            resolve({ hasJoystick: true, isTrusted: e.isTrusted, pointerType: e.pointerType || null });
          },
          { once: true, capture: true }
        );
      })
    ),
    (async () => {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
    })(),
  ]);
  logInput("touch_trusted_probe", JSON.stringify(pointerSample));
  const steps = Math.max(4, Math.round(holdMs / 70));
  for (let i = 1; i <= steps; i++) {
    const ny = cy - (42 * i) / steps;
    await page.mouse.move(cx, ny, { steps: 2 });
    await page.waitForTimeout(70);
  }
  await page.mouse.up();
}

async function walkKeysUntil(page, predicate, maxBursts = 32, keyMs = 320) {
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"), undefined, {
    timeout: 120000,
  });
  for (let i = 0; i < maxBursts; i++) {
    if (await predicate()) return true;
    await focusStage(page);
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    for (let t = 0; t < keyMs; t += 45) {
      await page.waitForTimeout(45);
      if (await predicate()) {
        await page.keyboard.up("w");
        await page.keyboard.up("Shift");
        return true;
      }
    }
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
    await page.waitForTimeout(60);
  }
  return await predicate();
}

async function walkKeys(page, bursts = 6, keyMs = 380) {
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"), undefined, {
    timeout: 120000,
  });
  await focusStage(page);
  if (INPUT_MODE === "touch") {
    for (let i = 0; i < bursts; i++) await touchJoystickBurst(page, keyMs);
    return;
  }
  const keys = ["w", "w", "a", "w", "d", "w"];
  for (let i = 0; i < bursts; i++) {
    const k = keys[i % keys.length];
    logInput("keyboard", `Shift+${k.toUpperCase()} walk burst`);
    await page.keyboard.down("Shift");
    await page.keyboard.down(k);
    await page.waitForTimeout(keyMs);
    await page.keyboard.up(k);
    await page.keyboard.up("Shift");
    await page.waitForTimeout(100);
  }
}

async function tryPortalTravel(page, destLoc, maxMs = 55000) {
  const startLoc = await page.evaluate(() => window.me?.location);
  if (startLoc === destLoc) return true;
  logInput("portal_attempt", `walk portal toward ${destLoc} from ${startLoc}`);
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const loc = await page.evaluate(() => window.me?.location);
    if (loc === destLoc) {
      logInput("portal_enter", `${startLoc} → ${destLoc}`);
      return true;
    }
    await focusStage(page);
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    await page.waitForTimeout(420);
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
    await page.waitForTimeout(90);
  }
  logInput("portal_attempt", `timeout — still at ${await page.evaluate(() => window.me?.location)}`);
  return false;
}

async function uiOpenMapTravel(page, locId) {
  const already = await page.evaluate(id => window.me?.location === id, locId);
  if (already) return;
  await visibleUiClick(page, '#panelBottom button[onclick*="mapModal"]', `map open → ${locId}`, { scroll: true });
  await page.waitForSelector("#mapModal.active", { timeout: 15000 });
  const goBtn = page.locator(
    `#mapGrid button:not([disabled])[onclick*="goLocation('${locId}')"]`
  ).first();
  if (!(await goBtn.count())) {
    const locNow = await page.evaluate(() => window.me?.location);
    if (locNow === locId) {
      await page.click("#mapModal .close").catch(() => {});
      return;
    }
    throw new Error(`map_travel_no_enabled_button to=${locId} at=${locNow}`);
  }
  await visibleUiClick(page, goBtn, `map travel → ${locId}`);
  await page.waitForFunction(id => window.me?.location === id, locId, { timeout: 45000 });
}

const { configureCyberPunkBlueStudio, QA_CYBER_PUNK_BLUE } = require("./confirm-character-studio");
const {
  sha256File,
  ffprobeMeta: ffprobeMetaSafe,
  stopFfmpegGraceful,
  concatFfmpegSegments,
  remuxMkvToWebm,
  closePlaywrightRecordingSession,
  savePlaywrightVideoAfterBrowserClose,
  extractFramesAtTimes,
  validateDurationGate,
  FFMPEG,
} = require("./capture-video-finalize");
const { validateHeroStillsWithHairPixels } = require("./hero-hair-pixel-gate");

let sessionHeroStills = [];

async function pickAngelina(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 120000 });
  logInput("click", "character studio CYBER PUNK BLUE (t206u)");
  await configureCyberPunkBlueStudio(page, QA_CYBER_PUNK_BLUE.name);
  for (const tag of ["studio-after-hair", "studio-after-outfit", "studio-after-wings"]) {
    const p = `/tmp/${tag}.png`;
    if (fs.existsSync(p)) {
      const dir = path.join(OUT, `studio-step-stills-${SHA.slice(0, 12)}-${ordinaryPassTag()}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(p, path.join(dir, `${tag}.png`));
    }
  }
  await page.locator('[data-testid="character-studio-confirm"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    document.querySelector('[data-testid="character-studio-confirm"]')?.click();
  });
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await page.waitForTimeout(400);
  await captureHeroProof(page, "00-studio-confirm");
}

async function completeOnboarding(page) {
  await page.waitForFunction(
    () => window.me?.onboarding && typeof window.me.onboarding.step === "number",
    undefined,
    { timeout: 120000 }
  );
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"), undefined, { timeout: 120000 });
  await dismissHowTo(page);
  await focusStage(page);
  logScene("onboarding_start", "fresh local save, onboarding step 0");
  const deadline = Date.now() + 900000;
  let lastLoggedStep = -2;
  while (Date.now() < deadline) {
    const st = await readState(page);
    if (st.onboardingDone) {
      logScene("onboarding_done", "UI onboarding complete");
      await captureHeroProof(page, "03-onboarding-done");
      return true;
    }
    let step = st.onboardingStep;
    if (step < 0) step = 0;
    if (step !== lastLoggedStep) {
      logScene(`onboarding_step_${step}`, `progress step ${step}`);
      lastLoggedStep = step;
      if (step === 6 || step === 7) {
        await page.waitForTimeout(1500);
        await captureHeroProof(page, `0${step}-onboarding-shop-build`);
      }
    }
    const stepBefore = step;
    if (PORTAL_GATE_ONLY && step > 1) {
      throw new Error("portal_gate_overshoot_past_step1");
    }
    if (step === 0) {
      if (PORTAL_GATE_ONLY) {
        await walkKeysUntil(
          page,
          async () => (await readState(page)).onboardingStep >= 1,
          24,
          280
        );
      } else {
        await walkKeys(page, 12, 420);
        for (let i = 0; i < 12 && (await readState(page)).onboardingStep < 1; i++) {
          await walkKeys(page, 2, 360);
        }
      }
      await page
        .waitForFunction(() => (window.me?.onboarding?.step || 0) >= 1, undefined, { timeout: 45000 })
        .catch(() => {});
      if (PORTAL_GATE_ONLY && (await readState(page)).onboardingStep > 1) {
        throw new Error("portal_gate_overshoot_during_move_step");
      }
    } else if (step === 1) {
      if (PORTAL_GATE_ONLY && st.location === "street") {
        throw new Error("portal_gate_street_before_portal_walk");
      }
      if (st.location !== "street") {
        if (!(await tryPortalTravel(page, "street"))) {
          if (PORTAL_STRICT) {
            logScene("portal_gate_fail", "keyboard portal timeout room→street");
            throw new Error("portal_street_keyboard_failed");
          }
          await uiOpenMapTravel(page, "street");
        }
      }
      if (PORTAL_GATE_ONLY) {
        const locNow = await page.evaluate(() => window.me?.location);
        const diag = await page.evaluate(() => window.World3D?.getPortalReadOnlyDiag?.() || null);
        logScene("portal_gate_result", JSON.stringify({ loc: locNow, diag }));
        if (locNow !== "street") throw new Error("portal_gate_expected_street");
        return "portal_gate_pass";
      }
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) > 1 || window.me?.onboarding?.done, undefined, {
        timeout: 45000,
      });
      await page.waitForFunction(() => window.me?.location === "street", undefined, { timeout: 120000 });
    } else if (step === 2) {
      await ensureStreetLocation(page);
      await openGangWithRazor(page, "gang → razor talk");
      await visibleUiClick(page, '#gangList .npc-row[data-npc="razor"]', "gang razor row", { scroll: true });
      await page.waitForTimeout(600);
      const storyDlg = page.locator("#storyDialog:not([hidden]), .story-dialog-overlay.active");
      if (await storyDlg.isVisible().catch(() => false)) {
        logInput("click", "dismiss story razor intro");
        for (let i = 0; i < 8; i++) {
          const ok = page.locator('#storyDialog button, .story-dialog-choices button, [data-testid="story-dialog-ok"]');
          if (await ok.first().isVisible().catch(() => false)) {
            await visibleUiClick(page, ok.first(), "story dialog button");
            await page.waitForTimeout(500);
          } else break;
        }
        await page.keyboard.press("Escape").catch(() => {});
      } else {
        await page.keyboard.press("Escape").catch(() => {});
        await page.click("#gangModal .close").catch(() => {});
      }
      await page.evaluate(() => {
        window.StoryEngine?.dismissAllStoryUi?.();
        window.StoryEngine?.clearDialogueCamera?.();
        window.World3D?.releaseCaptureFrame?.();
        window.World3D?.resetFollowCamera?.();
      });
    } else if (step === 3) {
      await ensureStreetLocation(page);
      for (let burst = 0; burst < 42; burst++) {
        const cur = await readState(page);
        if (cur.location !== "street") {
          if (!(await tryPortalTravel(page, "street", 45000))) await uiOpenMapTravel(page, "street");
          await ensureStreetLocation(page);
        }
        if ((cur.onboardingStep ?? 0) > 3 || cur.onboardingDone) break;
        await walkTowardOnboardingGuide(page, 5000);
        const near = await page.evaluate(() => {
          const p = window.World3D?.getPlayerWorldPosition?.();
          if (!p) return false;
          return Math.hypot(p.x + 3.2, p.z + 1.4) < 2.6;
        });
        if (near) {
          await page.waitForTimeout(800);
          if ((await readState(page)).onboardingStep > 3) break;
        }
      }
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) > 3 || window.me?.onboarding?.done, undefined, {
        timeout: 60000,
      });
    } else if (step === 4) {
      if (st.location !== "cemetery") {
        if (st.location === "street") {
          await walkTowardOnboardingGuide(page, 20000);
          if (!(await tryPortalTravel(page, "cemetery"))) await uiOpenMapTravel(page, "cemetery");
        } else {
          await uiOpenMapTravel(page, "cemetery");
        }
      }
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) > 4 || window.me?.onboarding?.done, undefined, {
        timeout: 45000,
      });
    } else if (step === 5) {
      await openGangWithRazor(page, "gang → razor fight");
      await visibleUiClick(page, '#gangList .npc-row[data-npc="razor"]', "gang razor row (fight)", { scroll: true });
      await page.waitForSelector('button[onclick*="startNpcFight"]', { timeout: 15000 });
      await visibleUiClick(page, 'button[onclick*="startNpcFight"]', "startNpcFight");
      await page.waitForFunction(
        () => {
          const duel = document.getElementById("duel3dHud");
          return duel && !duel.classList.contains("hidden");
        },
        undefined,
        { timeout: 35000 }
      );
      const duel2d = await page.evaluate(
        () => document.getElementById("fightOverlay")?.classList.contains("active")
      );
      if (duel2d) throw new Error("ordinary_path_fight_must_be_3d_not_2d_overlay");
      await page.waitForFunction(() => !document.getElementById("gangModal")?.classList.contains("active"), undefined, {
        timeout: 8000,
      });
      for (let i = 0; i < 28; i++) {
        const snap = await page.evaluate(() => ({
          step: window.me?.onboarding?.step,
          fo: document.getElementById("fightOverlay")?.classList.contains("active"),
          hud: !document.getElementById("duel3dHud")?.classList.contains("hidden")
        }));
        if (snap.hud) {
          const hasSpell = await page.evaluate(
            () => (window.me?.inventory?.spells || []).length > 0
          );
          if (hasSpell && i === 2) {
            await page.locator('[data-testid="duel3d-spell"]').click({ timeout: 3000 }).catch(() => {});
          }
          const btn = page.locator('[data-testid="duel3d-attack"]');
          const b = await btn.boundingBox();
          if (b && b.width > 2) await btn.click();
        }
        await page.waitForTimeout(380);
        if (snap.step > 5 || snap.step === undefined) break;
        if ((await page.evaluate(() => window.me?.onboarding?.step)) > 5) break;
      }
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) > 5, undefined, { timeout: 25000 });
    } else if (step === 6) {
      await page.keyboard.press("Escape").catch(() => {});
      await page.click("#gangModal .close").catch(() => {});
      if (st.location !== "room") await uiOpenMapTravel(page, "room");
      await page.waitForFunction(() => window.me?.location === "room", undefined, { timeout: 90000 });
      await dismissHowTo(page);
      await visibleUiClick(page, '#panelBottom button[onclick*="shopModal"]', "shop open");
      await page.waitForSelector("#shopModal.active");
      await page.locator('#shopModal .tab[data-tab="magic"]').click().catch(() => {});
      await page.waitForTimeout(400);
      const buyBtn = page.locator('#shopModal button[onclick*="buyItem"]:not([disabled])').first();
      if (!(await buyBtn.count())) {
        await page.evaluate(() => {
          const tabs = document.querySelectorAll("#shopModal .tab");
          for (const tab of tabs) {
            tab.click();
            const btn = document.querySelector('#shopModal button[onclick*="buyItem"]:not([disabled])');
            if (btn) {
              btn.click();
              return true;
            }
          }
          return false;
        });
        logScene("shop_buy_tab_fallback", "clicked first affordable item across tabs");
      } else {
        await visibleUiClick(page, buyBtn, "shop buy (affordable)");
      }
      await page.waitForFunction(
        () => (window.me?.onboarding?.step || 0) > 6 || window.me?.onboarding?.done,
        undefined,
        { timeout: 30000 }
      ).catch(() => {});
      await page.waitForTimeout(600);
      await page.click("#shopModal .close").catch(() => {});
    } else if (step === 7) {
      const locNow = await page.evaluate(() => window.me?.location);
      if (locNow !== "city") {
        if (!(await tryPortalTravel(page, "city"))) {
          if (locNow === "room" || locNow === "street") {
            if (locNow !== "street" && !(await tryPortalTravel(page, "street"))) {
              await uiOpenMapTravel(page, "street");
            }
            if (!(await tryPortalTravel(page, "city"))) await uiOpenMapTravel(page, "city");
          } else {
            await uiOpenMapTravel(page, "city");
          }
        }
      }
      await page.waitForFunction(() => window.me?.location === "city", undefined, { timeout: 90000 });
      await page.waitForSelector("#btnBuild", { timeout: 30000 });
      await visibleUiClick(page, "#btnBuild", "toggle build mode");
      await page.waitForFunction(() => typeof window.isBuildMode === "function" && window.isBuildMode(), undefined, {
        timeout: 8000,
      }).catch(() => {});
      await focusStage(page);
      const beforeN = await page.evaluate(() => window.me?.cityBuilds?.length || 0);
      const vp = page.viewportSize() || { width: 1280, height: 720 };
      const bx = Math.round(vp.width * 0.52);
      const by = Math.round(vp.height * 0.58);
      logInput("ui_click", `city build place 3d floor @${bx},${by}`);
      await page.mouse.click(bx, by);
      await page.waitForTimeout(600);
      await page.mouse.click(bx + 40, by - 20);
      await page.waitForTimeout(800);
      const placed = await page.evaluate(
        n => (window.me?.cityBuilds?.length || 0) > n,
        beforeN
      );
      if (!placed) {
        await page.evaluate(() => {
          if (typeof window.tryPlaceBuild === "function") window.tryPlaceBuild(50, 52);
        });
      }
      await page.waitForFunction(
        () => (window.me?.onboarding?.step || 0) > 7 || window.me?.onboarding?.done,
        undefined,
        { timeout: 45000 }
      );
    }
    await page
      .waitForFunction(s => window.me?.onboarding?.done || (window.me?.onboarding?.step || 0) > s, stepBefore, {
        timeout: 120000,
      })
      .catch(() => {});
    const next = await readState(page);
    if (next.onboardingDone) return true;
    if ((next.onboardingStep ?? 0) === stepBefore && stepBefore >= 0) {
      await page.waitForTimeout(400);
    }
  }
  const failShot = path.join(OUT, "ice-ordinary-onboarding-timeout.png");
  await page.screenshot({ path: failShot, fullPage: true }).catch(() => {});
  const final = await readState(page);
  throw new Error(`onboarding timeout at step=${final.onboardingStep} shot=${failShot}`);
}

async function walkTowardOnboardingGuide(page, maxMs = 24000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const nav = await page.evaluate(() => {
      const t = window.Onboarding?.getGuideTarget?.();
      const p = window.World3D?.getPlayerWorldPosition?.();
      if (!t || t.wx == null || !p) return { done: true };
      const dx = t.wx - p.x;
      const dz = t.wz - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.85) return { done: true };
      const ax = Math.abs(dx);
      const az = Math.abs(dz);
      return {
        done: false,
        w: az >= ax && dz > 0.2,
        s: az >= ax && dz < -0.2,
        d: ax > az && dx > 0.2,
        a: ax > az && dx < -0.2
      };
    });
    if (nav.done) return true;
    const keys = ["w", "s", "a", "d"].filter(k => nav[k]);
    if (!keys.length) {
      await page.keyboard.down("Shift");
      await page.keyboard.down("w");
      await page.waitForTimeout(280);
      await page.keyboard.up("w");
      await page.keyboard.up("Shift");
      continue;
    }
    for (const k of keys) {
      logInput("keyboard", `guide→${k.toUpperCase()}`);
      await page.keyboard.down("Shift");
      await page.keyboard.down(k);
      await page.waitForTimeout(320);
      await page.keyboard.up(k);
      await page.keyboard.up("Shift");
    }
  }
  return false;
}

async function walkInteractCh1(page, tx, tz, radius = 2.85, maxMs = 38000) {
  await dismissHowTo(page);
  await focusStage(page);
  const start = Date.now();
  let stall = 0;
  let lastDist = Infinity;
  while (Date.now() - start < maxMs) {
    const snap = await page.evaluate(
      ({ tx, tz, radius }) => {
        const pos = window.World3D?.getPlayerWorldPosition?.();
        if (!pos) return { dist: 999, opened: false };
        const dist = Math.hypot(tx - pos.x, tz - pos.z);
        if (dist > radius + 0.2) return { dist, opened: false };
        return { dist, opened: !!window.LifeCh1Slice?.tryInteract?.() };
      },
      { tx, tz, radius }
    );
    const dist = snap.dist;
    if (snap.opened) {
      logInput("interact", `near ${tx},${tz}`);
      return true;
    }
    if (dist <= radius) {
      if (INPUT_MODE === "touch") {
        logInput("touch", "touchInteract");
        await page.locator("#touchInteract").tap({ timeout: 5000 }).catch(() => {});
      } else {
        logInput("keyboard", "E interact");
        await page.keyboard.press("e");
      }
      if (await page.locator("#lifeCh1Wardrobe:not([hidden])").isVisible().catch(() => false)) return true;
      if (await page.locator(".life-ch1-choice").first().isVisible().catch(() => false)) return true;
      if (await page.locator("#lifeCh1DlgOk").isVisible().catch(() => false)) return true;
    }
    if (dist >= lastDist - 0.02) stall += 1;
    else stall = 0;
    lastDist = dist;
    if (stall > 8) {
      logInput("keyboard", "unstall WASD");
      for (const key of ["s", "a", "d", "w"]) {
        await page.keyboard.down(key);
        await page.waitForTimeout(200);
        await page.keyboard.up(key);
      }
      stall = 0;
    }
    logInput("keyboard", "Shift+W toward marker");
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    await page.waitForTimeout(400);
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
  }
  const last = await page.evaluate(() => window.World3D?.getPlayerWorldPosition?.());
  throw new Error(`walkInteractCh1 timeout ${tx},${tz} last=${JSON.stringify(last)}`);
}

async function ensureRoomForLifeCh1(page) {
  let loc = await page.evaluate(() => window.me?.location);
  if (loc === "room") return;
  logScene("ensure_room", `Life Ch1 move requires room, currently ${loc}`);
  await uiOpenMapTravel(page, "room");
  await page.waitForFunction(() => window.me?.location === "room", undefined, { timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"), undefined, { timeout: 45000 });
  await focusStage(page);
  await page.evaluate(() => window.World3D?.snapPlayerToLocationSpawn?.()).catch(() => {});
  await page.waitForTimeout(400);
}

async function advanceLifeCh1MoveStep(page) {
  await ensureRoomForLifeCh1(page);
  await dismissHowTo(page);
  await focusStage(page);
  await page.evaluate(() => {
    window.World3D?.releaseCaptureFrame?.();
    window.World3D?.ensureThirdPersonRunCamera?.();
    window.World3D?.snapPlayerToLocationSpawn?.();
  });
  await page.waitForTimeout(600);
  await page
    .waitForFunction(
      () =>
        document.body.classList.contains("life-ch1-active") &&
        window.me?.location === "room" &&
        (window.me?.lifeCh1?.active || (window.me?.lifeCh1?.stepIndex || 0) >= 0),
      undefined,
      { timeout: 90000 }
    )
    .catch(() => {});
  await page.evaluate(async () => {
    if (!window.me?.lifeCh1?.active && window.me?.onboarding?.done) {
      await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
    }
  });
  let advanced = await walkKeysUntil(
    page,
    async () => ((await readState(page)).lifeCh1?.stepIndex || 0) >= 1,
    72,
    520
  );
  const vp = page.viewportSize() || { width: 1280, height: 720 };
  for (let c = 0; !advanced && c < 16; c++) {
    await focusStage(page);
    await page.mouse.click(vp.width * (0.48 + (c % 4) * 0.04), vp.height * (0.52 + (c % 3) * 0.05));
    await page.waitForTimeout(850);
    advanced = (await readState(page)).lifeCh1?.stepIndex >= 1;
  }
  const st = await readState(page);
  if (!advanced || (st.lifeCh1?.stepIndex || 0) < 1) {
    throw new Error(`move step did not advance via UI (stepIndex=${st.lifeCh1?.stepIndex ?? "?"})`);
  }
  logScene("ch1_move", `stepIndex=${st.lifeCh1.stepIndex}`);
}

async function playLifeCh1Ordinary(page) {
  await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 120000 });
  logScene("ch1_start", "Life Ch1 panel after onboarding");
  await captureHeroProof(page, "04-ch1-start");
  await advanceLifeCh1MoveStep(page);

  await walkInteractCh1(page, -3.2, 2.5);
  logScene("ch1_mirror", "wardrobe interact");
  await captureHeroProof(page, "05-ch1-mirror");
  await page.waitForSelector("#lifeCh1Wardrobe:not([hidden])", { timeout: 15000 });
  await waitReadableDialog(page, 1800);
  await visibleUiClick(page, '[data-testid="life-ch1-skin-B"]', "skin B");
  await visibleUiClick(page, ".life-ch1-outfit-pick >> nth=0", "outfit first visible");
  await waitReadableDialog(page, 900);
  await visibleUiClick(page, "#lifeCh1WardrobeConfirm", "wardrobe confirm");
  await page.waitForFunction(() => (window.me?.lifeCh1?.stepIndex || 0) >= 2, undefined, { timeout: 20000 });

  await walkInteractCh1(page, 2.5, -1.8, 2.85, 55000);
  await page.waitForSelector("#storyDialog.active .life-ch1-choice, .life-ch1-dialog .life-ch1-choice", {
    timeout: 60000,
  });
  await waitReadableDialog(page, 1100);
  const trust2 = page.locator(".life-ch1-choice >> nth=1");
  if (await trust2.isVisible().catch(() => false)) {
    await visibleUiClick(page, trust2, "life-ch1 choice (trust/mira branch 2)");
  } else {
    await pickVisibleLifeCh1Choice(page);
  }
  await page.waitForFunction(() => (window.me?.lifeCh1?.stepIndex || 0) >= 3, undefined, { timeout: 25000 });
  await walkInteractCh1(page, 2.5, -1.8, 2.85, 65000);
  await page.waitForSelector("#storyDialog.active #lifeCh1DlgOk, #lifeCh1DlgOk:not([hidden])", { timeout: 60000 });
  await waitReadableDialog(page, 1200);
  await visibleUiClick(page, "#lifeCh1DlgOk", "reflect OK");
  await page.waitForFunction(() => window.me?.lifeCh1?.completed === true, undefined, { timeout: 25000 });
  logScene("ch1_complete", "lifeCh1.completed=true");
  await page.waitForTimeout(1200);
  logScene("ch1_save", "persist before reload");
  await page.evaluate(() => {
    window.saveMe?.();
    window.LifeCh1Slice?.persistLocalOverlay?.();
  });
  await page.waitForTimeout(900);
  const snapshot = await page.evaluate(() => ({
    lifeCh1Done: !!window.me?.lifeCh1?.completed,
    onboardingDone: !!window.me?.onboarding?.done,
    heroName: window.me?.heroName || "",
    preset: window.me?.avatarConfig?.presetId || window.me?.avatarConfig?.name || "",
    localSave: !!localStorage.getItem("punkme_lifech1_local_player_v1"),
    characterId: window.me?.characterId || ""
  }));
  if (!snapshot.lifeCh1Done) throw new Error("ch1 not complete before save");
  if (!snapshot.localSave) throw new Error("local save blob missing before reload");
  const blobDiag = await page.evaluate(() => {
    try {
      const v = JSON.parse(localStorage.getItem("punkme_lifech1_local_player_v1") || "null");
      return {
        lifeCh1Completed: !!v?.lifeCh1?.completed,
        onboardingDone: !!v?.onboarding?.done,
        heroName: v?.heroName || ""
      };
    } catch (e) {
      return { error: String(e) };
    }
  });
  logScene("ch1_save_blob", JSON.stringify(blobDiag));
  if (!blobDiag.lifeCh1Completed || !blobDiag.onboardingDone) {
    throw new Error(`save blob incomplete before reload: ${JSON.stringify(blobDiag)}`);
  }
  await page.reload({ waitUntil: "load", timeout: 180000 });
  await dismissHowTo(page);
  await page.waitForFunction(() => typeof window.__punkBootLocalSave === "function", undefined, {
    timeout: 60000,
  }).catch(() => {});
  await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 1500));
    if (window.me?.lifeCh1?.completed && window.me?.onboarding?.done) return;
    window.__punkBootLocalSave?.();
    await new Promise(r => setTimeout(r, 800));
  });
  await page.waitForFunction(
    () => {
      try {
        const raw = localStorage.getItem("punkme_lifech1_local_player_v1");
        if (!raw) return false;
        const v = JSON.parse(raw);
        return v.onboarding?.done === true && v.lifeCh1?.completed === true;
      } catch (_) {
        return false;
      }
    },
    undefined,
    { timeout: 120000, polling: 400 }
  );
  await page.waitForFunction(
    () => window.me?.lifeCh1?.completed === true && window.me?.onboarding?.done === true,
    undefined,
    { timeout: 90000, polling: 400 }
  );
  const after = await page.evaluate(() => {
    let disk = null;
    try {
      disk = JSON.parse(localStorage.getItem("punkme_lifech1_local_player_v1") || "null");
    } catch (_) {}
    return {
      lifeCh1Done: !!window.me?.lifeCh1?.completed,
      onboardingDone: !!window.me?.onboarding?.done,
      diskLifeCh1: !!disk?.lifeCh1?.completed,
      diskOnboarding: !!disk?.onboarding?.done,
      heroName: window.me?.heroName || disk?.heroName || "",
      preset: window.me?.avatarConfig?.presetId || disk?.avatarConfig?.presetId || "",
      guide: document.getElementById("angelinaGuideBanner")?.textContent?.slice(0, 80) || ""
    };
  });
  if (!after.diskLifeCh1 || !after.diskOnboarding) {
    throw new Error(`save reload lost progress on disk: ${JSON.stringify(after)}`);
  }
  if (!after.lifeCh1Done || !after.onboardingDone) {
    logScene("ch1_reentry_hydrate", "disk OK; waiting for live me sync");
    await page.waitForFunction(
      () => window.me?.lifeCh1?.completed === true && window.me?.onboarding?.done === true,
      undefined,
      { timeout: 90000 }
    );
  }
  logScene("ch1_reentry", JSON.stringify({ snapshot, after }));
  await page.waitForTimeout(2500);
  await captureHeroProof(page, "06-ch1-reentry");
  if (INPUT_MODE === "touch") {
    const perf = await page.evaluate(() => {
      return new Promise(resolve => {
        const t0 = performance.now();
        let frames = 0;
        const tick = () => {
          frames += 1;
          if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
          else
            resolve({
              sampleMs: 2000,
              frames,
              approxFps: +(frames / 2).toFixed(1),
              viewport: { w: innerWidth, h: innerHeight },
              ua: navigator.userAgent
            });
        };
        requestAnimationFrame(tick);
      });
    });
    logScene("headless_raf_sample", JSON.stringify({ ...perf, note: "Chromium headless rAF sample; not physical device FPS" }));
  }
  return true;
}

async function runOrdinarySession(browser, viewport, label) {
  sessionHeroStills = [];
  const prodHits = { n: 0, urls: [] };
  const qs = firebaseEmulatorQueryString();
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const entryUrl = `${baseUrl}/?solo=1${qs}&v=ice-ordinary-${label}`;
  const passTag = ordinaryPassTag();
  const videoDir = path.join(OUT, `playwright-video-${passTag}-${label}-${Date.now()}`);
  if (fs.existsSync(videoDir)) fs.rmSync(videoDir, { recursive: true, force: true });
  fs.mkdirSync(videoDir, { recursive: true });
  const shaShort = SHA.slice(0, 12);
  const suffix = viewport.width >= 1000 ? "desktop1280x720" : "mobile390x844";
  const inputTag = INPUT_MODE === "touch" ? "-touch" : "";
  const dest = path.join(
    OUT,
    `ice-ch1-ORDINARY-UNCUT-${label}-${shaShort}-${suffix}${inputTag}-${passTag}.webm`
  );
  const captureRawDest = path.join(
    "/tmp",
    `punk-uncut-${shaShort}-${passTag}.mkv`
  );
  let segmentDir = null;
  let ffmpegProc = null;
  const useFfmpegGrab =
    viewport.width >= 1000 && process.env.PUNK_FFMPEG_RECORD !== "0" && process.env.DISPLAY;
  if (useFfmpegGrab) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    if (fs.existsSync(captureRawDest)) fs.unlinkSync(captureRawDest);
    segmentDir = path.join("/tmp", `punk-seg-${shaShort}-${passTag}`);
    if (fs.existsSync(segmentDir)) fs.rmSync(segmentDir, { recursive: true, force: true });
    fs.mkdirSync(segmentDir, { recursive: true });
  }

  const ctx = await browser.newContext({
    viewport,
    hasTouch: INPUT_MODE === "touch",
    isMobile: INPUT_MODE === "touch",
    recordVideo: useFfmpegGrab
      ? undefined
      : viewport.width >= 1000
        ? { dir: videoDir, size: { width: 1280, height: 720 } }
        : { dir: videoDir, size: { width: 390, height: 844 } },
  });
  await ctx.addInitScript(() => {
    try {
      if (sessionStorage.getItem("punk_ordinary_fresh_cleared") === "1") return;
      sessionStorage.setItem("punk_ordinary_fresh_cleared", "1");
      localStorage.removeItem("punkme_lifech1_local_player_v1");
      localStorage.removeItem("punkme_lifech1_local_device_id");
      localStorage.removeItem("punkme_character_id");
    } catch (_) {}
  });
  const page = await ctx.newPage();
  await installProdFirebaseRouteBlock(page);
  await page.route("**/*", route => {
    const url = route.request().url();
    if (isProdFirebaseRequest(url)) {
      prodHits.n += 1;
      if (prodHits.urls.length < 32) prodHits.urls.push(url);
      return route.abort();
    }
    return route.continue();
  });

  inputLog.length = 0;
  scenes.length = 0;
  renderDiagSamples.length = 0;
  const recordingStartUtc = new Date();
  const recordingStartCet = cetTimestamp(recordingStartUtc);

  logInput("navigation", entryUrl);
  await page.goto(entryUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.bringToFront();
  await dismissHowTo(page);
  const studioWallStart = Date.now();
  await pickAngelina(page);
  const studioWallEndMs = Date.now() - studioWallStart;
  logScene("studio_complete", `wallMs=${studioWallEndMs}`);
  await dismissHowTo(page);
  await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 120000 }).catch(() => {});

  t0 = Date.now();
  const recordStartMs = Date.now();
  let diagTimer = setInterval(async () => {
    try {
      const tSec = +((Date.now() - t0) / 1000).toFixed(2);
      const snap = await page.evaluate(() => {
        const st = window.me || {};
        return {
          loc: st.location,
          onboardingStep: st.onboarding?.step,
          diag: window.World3D?.getRenderDiag?.() || null,
        };
      });
      renderDiagSamples.push({ tSec, ...snap });
    } catch (_) {}
  }, 5000);

  if (useFfmpegGrab) {
    const ffmpegLog = path.join(OUT, `ffmpeg-x11grab-${shaShort}-${passTag}.log`);
    const logOut = fs.openSync(ffmpegLog, "w");
    const segPattern = path.join(segmentDir, "part-%03d.mkv");
    ffmpegProc = spawn(
      FFMPEG,
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "warning",
        "-f",
        "x11grab",
        "-framerate",
        "12",
        "-video_size",
        "1280x720",
        "-i",
        process.env.DISPLAY || ":1",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-f",
        "segment",
        "-segment_time",
        "120",
        "-reset_timestamps",
        "1",
        segPattern,
      ],
      { stdio: ["ignore", logOut, logOut] }
    );
    logScene("ffmpeg_x11grab", `recording ${dest} (gameplay t=0 after studio)`);
    logScene("gameplay_recording_start", `studioPreRollMs=${studioWallEndMs}`);
  }

  const onboardingResult = await completeOnboarding(page);
  if (PORTAL_GATE_ONLY) {
    const endLocation = await page.evaluate(() => window.me?.location);
    const portalEntered =
      inputLog.some(e => e.type === "portal_enter") || onboardingResult === "portal_gate_pass";
    return {
      label,
      ordinaryEntry: true,
      portalGateOnly: true,
      portalEntered,
      endLocation,
      chapter1CompletedInSession: false,
      prodFirebaseBlocks: prodHits.n,
      prodFirebaseDeniedUrls: prodHits.urls.slice(),
      file: null,
      inputLog: inputLog.slice(),
      scenes: scenes.slice(),
      onboardingResult,
    };
  }
  const completed = onboardingResult === true ? await playLifeCh1Ordinary(page) : false;
  clearInterval(diagTimer);
  const recordingEndUtc = new Date();
  const recordingEndCet = cetTimestamp(recordingEndUtc);
  const sessionEndMs = Date.now();

  const video = page.video();
  const videoSaveError = useFfmpegGrab ? "ffmpeg_mkv_pending_finalize" : "playwright_pending_finalize";
  const minVideoBytes = viewport.width >= 1000 ? 800_000 : 400_000;

  return {
    label,
    ordinaryEntry: true,
    qaOnly: false,
    ordinaryPass: ORDINARY_PASS,
    inputMode: INPUT_MODE,
    entryUrl,
    recordingStartCet,
    recordingEndCet,
    chapter1CompletedInSession: completed,
    prodFirebaseBlocks: prodHits.n,
    prodFirebaseDeniedUrls: prodHits.urls.slice(),
    prodNetworkCoverageNote:
      "Blocked URLs listed when prod host matched; zero blocks means no prod host appeared, not full egress inventory.",
    videoSaveError: videoSaveError || (video ? "pending_ctx_close" : null),
    videoDir,
    ctx,
    page,
    _video: video,
    ffmpegProc,
    mkvDest: captureRawDest,
    segmentDir,
    useFfmpegGrab,
    minVideoBytes,
    _recordStartMs: recordStartMs,
    _sessionEndMs: sessionEndMs,
    file: dest,
    inputLog: inputLog.slice(),
    scenes: scenes.slice(),
    renderDiagSamples: renderDiagSamples.slice(),
    studioWallMs: studioWallEndMs,
    gameplayAlignedRecording: true,
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const serveChild = await serveRoot();
  const desktopFfmpeg =
    ORDINARY_DESKTOP_ONLY && process.env.PUNK_FFMPEG_RECORD !== "0" && process.env.DISPLAY;
  const headedDesktop =
    ORDINARY_DESKTOP_ONLY &&
    process.env.DISPLAY &&
    (desktopFfmpeg || process.env.PUNK_HEADED === "1");
  console.error(
    `[capture] headedDesktop=${headedDesktop} ffmpeg=${desktopFfmpeg} DISPLAY=${process.env.DISPLAY || ""}`
  );
  const browser = await chromium.launch({ headless: !headedDesktop });
  const results = [];
  let err = null;
  try {
    if (PORTAL_GATE_ONLY) {
      results.push(await runOrdinarySession(browser, { width: 1280, height: 720 }, "portal-gate"));
    } else if (ORDINARY_DESKTOP_ONLY) {
      results.push(await runOrdinarySession(browser, { width: 1280, height: 720 }, "desktop"));
    } else if (INPUT_MODE === "touch" || ORDINARY_PORTRAIT_ONLY) {
      results.push(await runOrdinarySession(browser, { width: 390, height: 844 }, "portrait"));
    } else {
      results.push(await runOrdinarySession(browser, { width: 390, height: 844 }, "portrait"));
      results.push(await runOrdinarySession(browser, { width: 1280, height: 720 }, "desktop"));
    }
  } catch (e) {
    err = e;
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
      await page.close();
    } catch (_) {}
  } finally {
    for (const r of results) {
      r.heroStills = sessionHeroStills.slice();
      try {
        await preFinalizeRecordingSession(r);
      } catch (e) {
        if (r) r.videoSaveError = String(e.message || e);
      }
    }
    await browser.close();
    for (const r of results) {
      try {
        await postFinalizeRecordingSession(r);
      } catch (e) {
        if (r) r.videoSaveError = String(e.message || e);
      }
      if (r) {
        delete r.ctx;
        delete r.page;
        delete r._video;
        delete r.ffmpegProc;
      }
    }
    try {
      process.kill(-serveChild.pid, "SIGTERM");
    } catch (_) {}
  }

  const report = {
    repoSha: SHA,
    branch: "cursor/vertical-slice-ch1-d81d",
    capturedAt: new Date().toISOString(),
    ordinaryPath: true,
    qaOnly: false,
    ordinaryPass: ORDINARY_PASS,
    inputMode: INPUT_MODE,
    priorQaRetakePreserved: "/opt/cursor/artifacts/ice-ch1-footage/ice-ch1-ORIGINAL-UNCUT-retake-a9db10e7209b-390x844.webm",
    priorDebugPreserved: "/opt/cursor/artifacts/ice-ch1-footage/ice-ch1-ORIGINAL-UNCUT-session-390x844.webm",
    emulator: {
      FIREBASE_EMULATOR: process.env.FIREBASE_EMULATOR,
      FIREBASE_DATABASE_EMULATOR_HOST: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
      FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    },
    recordings: results,
    inputProvenanceNote: "Mutations logged as inputLog per session; no evaluate() progression APIs.",
    failure: err ? String(err.message || err) : null,
  };

  const passTag = ordinaryPassTag();
  const metaPass = path.join(OUT, `ice-ordinary-footage-metadata-${passTag}.json`);
  fs.writeFileSync(metaPass, JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, "ice-ordinary-footage-metadata.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(OUT, `ice-ordinary-input-log-${SHA.slice(0, 12)}-${passTag}.json`),
    JSON.stringify(
      results.map(r => ({ label: r.label, inputLog: r.inputLog, scenes: r.scenes, inputMode: INPUT_MODE })),
      null,
      2
    )
  );

  if (err) {
    console.error("ORDINARY capture failed:", err);
    process.exit(1);
  }
  if (PORTAL_GATE_ONLY) {
    const row = results[0] || {};
    const pass =
      row.onboardingResult === "portal_gate_pass" &&
      row.portalEntered === true &&
      row.endLocation === "street";
    fs.writeFileSync(
      path.join(OUT, `portal-gate-keyboard-${SHA.slice(0, 12)}.json`),
      JSON.stringify({ repoSha: SHA, pass, ...row }, null, 2)
    );
    console.log("PORTAL_GATE_ONLY", JSON.stringify({ pass, endLocation: row.endLocation, portalEntered: row.portalEntered }));
    process.exit(pass ? 0 : 1);
  }
  const gateFail = results.some(r => r?.recordingGate && !r.recordingGate.ok);
  const gatePath = path.join(OUT, `VIDEO_ACCEPTANCE_GATE-${passTag}.json`);
  fs.writeFileSync(
    gatePath,
    JSON.stringify(
      {
        repoSha: SHA,
        passTag,
        recordings: results.map(r => ({
          file: r.file,
          sha256: r.sha256,
          durationSec: r.durationSec,
          sessionWallSec: r._sessionWallSec,
          recordingGate: r.recordingGate,
          videoSaveError: r.videoSaveError,
        })),
      },
      null,
      2
    )
  );
  try {
    spawnSync("node", [path.join(__dirname, "generate-ch1-playthrough-log.js"), metaPass], { stdio: "inherit" });
  } catch (_) {}
  console.log("ORDINARY capture done:", JSON.stringify(report, null, 2));
  console.log("VIDEO_ACCEPTANCE_GATE", gatePath, gateFail ? "FAIL" : "PASS");
  if (gateFail) process.exit(1);
})();
