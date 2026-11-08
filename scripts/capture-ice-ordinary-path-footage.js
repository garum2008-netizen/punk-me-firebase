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
const SHA = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
const ORDINARY_PASS_RAW = process.env.ORDINARY_PASS || "1";
const ORDINARY_PASS = Number(ORDINARY_PASS_RAW);
const INPUT_MODE = process.env.ORDINARY_INPUT || "keyboard";

function ordinaryPassTag() {
  if (Number.isFinite(ORDINARY_PASS)) return `pass${String(ORDINARY_PASS).padStart(2, "0")}`;
  return `pass-${String(ORDINARY_PASS_RAW).replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

let t0 = 0;
const inputLog = [];
const scenes = [];

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

function ffprobeMeta(filePath) {
  try {
    const r = spawnSync(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { encoding: "utf8" }
    );
    if (r.status !== 0) return { error: r.stderr || "ffprobe failed", path: filePath };
    const j = JSON.parse(r.stdout);
    const v = (j.streams || []).find(s => s.codec_type === "video");
    const a = (j.streams || []).find(s => s.codec_type === "audio");
    return {
      path: filePath,
      durationSec: j.format?.duration ? +j.format.duration : null,
      sizeBytes: fs.existsSync(filePath) ? fs.statSync(filePath).size : null,
      video: v ? { codec: v.codec_name, width: v.width, height: v.height, fps: v.avg_frame_rate } : null,
      audio: a ? { codec: a.codec_name, channels: a.channels } : null,
      audioStatus: a ? "HAS_AUDIO_TRACK" : "SILENT_NO_AUDIO_TRACK",
    };
  } catch (e) {
    return { path: filePath, error: String(e.message || e) };
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
  await visibleUiClick(page, '#panelBottom button[onclick*="mapModal"]', `map open → ${locId}`, { scroll: true });
  await page.waitForSelector("#mapModal.active", { timeout: 15000 });
  const goBtn = page.locator(`#mapGrid button[onclick*="goLocation('${locId}')"]`).first();
  await visibleUiClick(page, goBtn, `map travel → ${locId}`);
  await page.waitForFunction(id => window.me?.location === id, locId, { timeout: 45000 });
}

async function pickAngelina(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 120000 });
  logInput("click", "char select Angelina");
  await page.waitForSelector('[data-testid="char-select-angelina"]', { timeout: 120000 });
  await page.waitForSelector("#charSelectPortraits .char-portrait-pick", { timeout: 120000 });
  await page.click("#charSelectPortraits .char-portrait-pick >> nth=0");
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
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
  const deadline = Date.now() + 480000;
  let lastLoggedStep = -2;
  while (Date.now() < deadline) {
    const st = await readState(page);
    if (st.onboardingDone) {
      logScene("onboarding_done", "UI onboarding complete");
      return true;
    }
    let step = st.onboardingStep;
    if (step < 0) step = 0;
    if (step !== lastLoggedStep) {
      logScene(`onboarding_step_${step}`, `progress step ${step}`);
      lastLoggedStep = step;
    }
    const stepBefore = step;
    if (step === 0) {
      await walkKeys(page, 28, 420);
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 1, undefined, { timeout: 30000 }).catch(
        () => {}
      );
    } else if (step === 1) {
      if (st.location !== "street") {
        if (!(await tryPortalTravel(page, "street"))) await uiOpenMapTravel(page, "street");
      }
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) > 1 || window.me?.onboarding?.done, undefined, {
        timeout: 45000,
      });
    } else if (step === 2) {
      if (st.location !== "street") await uiOpenMapTravel(page, "street");
      await visibleUiClick(page, '#panelBottom button[onclick*="gangModal"]', "gang → razor talk");
      await page.waitForSelector("#gangModal.active");
      await visibleUiClick(page, '.npc-row[data-npc="razor"]', "gang razor row");
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
    } else if (step === 3) {
      if (st.location !== "cemetery") {
        if (st.location === "street") {
          if (!(await tryPortalTravel(page, "cemetery"))) await uiOpenMapTravel(page, "cemetery");
        } else {
          await uiOpenMapTravel(page, "cemetery");
        }
      }
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) > 3 || window.me?.onboarding?.done, undefined, {
        timeout: 45000,
      });
    } else if (step === 4) {
      if (st.location !== "street") await uiOpenMapTravel(page, "street");
      await visibleUiClick(page, '#panelBottom button[onclick*="gangModal"]', "gang → razor fight");
      await page.waitForSelector("#gangModal.active");
      await visibleUiClick(page, '.npc-row[data-npc="razor"]', "gang razor row (fight)");
      await page.waitForSelector('button[onclick*="startNpcFight"]', { timeout: 15000 });
      await visibleUiClick(page, 'button[onclick*="startNpcFight"]', "startNpcFight");
      await page.waitForFunction(
        () => {
          const duel = document.getElementById("duel3dHud");
          const overlay = document.getElementById("fightOverlay");
          return (duel && !duel.classList.contains("hidden")) || overlay?.classList.contains("active");
        },
        undefined,
        { timeout: 20000 }
      );
      await page.waitForFunction(() => !document.getElementById("gangModal")?.classList.contains("active"), undefined, {
        timeout: 8000,
      });
      for (let i = 0; i < 28; i++) {
        const snap = await page.evaluate(() => ({
          step: window.me?.onboarding?.step,
          fo: document.getElementById("fightOverlay")?.classList.contains("active"),
          hud: !document.getElementById("duel3dHud")?.classList.contains("hidden")
        }));
        if (snap.fo) {
          const btn = page.locator('#fightOverlay.active button[onclick*="fightAttack"]').first();
          if (await btn.isVisible().catch(() => false)) {
            await visibleUiClick(page, btn, "fightAttack");
          }
        } else if (snap.hud) {
          const btn = page.locator('[data-testid="duel3d-attack"]');
          const b = await btn.boundingBox();
          if (b && b.width > 2) await btn.click();
        }
        await page.waitForTimeout(380);
        if (snap.step > 4 || snap.step === undefined) break;
        if ((await page.evaluate(() => window.me?.onboarding?.step)) > 4) break;
      }
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) > 4, undefined, { timeout: 25000 });
    } else if (step === 5) {
      if (st.location !== "room") await uiOpenMapTravel(page, "room");
      await visibleUiClick(page, '#panelBottom button[onclick*="shopModal"]', "shop open");
      await page.waitForSelector("#shopModal.active");
      await visibleUiClick(page, '#shopModal button[onclick*="buyItem"]', "shop buy");
      await page.waitForTimeout(600);
      await page.click("#shopModal .close").catch(() => {});
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

async function playLifeCh1Ordinary(page) {
  await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 120000 });
  logScene("ch1_start", "Life Ch1 panel after onboarding");
  await walkKeys(page, 12, 350);
  const st = await readState(page);
  if ((st.lifeCh1?.stepIndex || 0) < 1) throw new Error("move step did not advance via UI");
  logScene("ch1_move", `stepIndex=${st.lifeCh1.stepIndex}`);

  await walkInteractCh1(page, -3.2, 2.5);
  logScene("ch1_mirror", "wardrobe interact");
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
  await page.waitForTimeout(400);
  const shaShort = SHA.slice(0, 12);
  const passTag = ordinaryPassTag();
  await uiOpenMapTravel(page, "street");
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"), undefined, { timeout: 20000 });
  await page.waitForTimeout(280);
  await page.screenshot({
    path: path.join(OUT, `ordinary-street-cutout-${shaShort}-${passTag}.png`),
    fullPage: false
  });
  logScene("visual_street", "outdoor cutout screenshot");
  await uiOpenMapTravel(page, "cemetery");
  await page.waitForTimeout(280);
  await page.screenshot({
    path: path.join(OUT, `ordinary-cemetery-cutout-${shaShort}-${passTag}.png`),
    fullPage: false
  });
  logScene("visual_cemetery", "cemetery cutout screenshot");
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
  const prodHits = { n: 0, urls: [] };
  const qs = firebaseEmulatorQueryString();
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const entryUrl = `${baseUrl}/?solo=1${qs}&v=ice-ordinary-${label}`;

  const ctx = await browser.newContext({
    viewport,
    hasTouch: INPUT_MODE === "touch",
    isMobile: INPUT_MODE === "touch",
    recordVideo: viewport.width >= 1000 ? { dir: OUT, size: { width: 1280, height: 720 } } : { dir: OUT, size: { width: 390, height: 844 } },
  });
  await ctx.addInitScript(() => {
    try {
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

  t0 = Date.now();
  inputLog.length = 0;
  scenes.length = 0;
  const recordingStartUtc = new Date();
  const recordingStartCet = cetTimestamp(recordingStartUtc);

  logInput("navigation", entryUrl);
  await page.goto(entryUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.bringToFront();
  await dismissHowTo(page);
  await pickAngelina(page);
  await dismissHowTo(page);
  await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 120000 }).catch(() => {});

  await completeOnboarding(page);
  const completed = await playLifeCh1Ordinary(page);
  const recordingEndUtc = new Date();
  const recordingEndCet = cetTimestamp(recordingEndUtc);

  const video = page.video();
  await page.close();
  await ctx.close();

  const shaShort = SHA.slice(0, 12);
  const suffix = viewport.width >= 1000 ? "desktop1280x720" : "mobile390x844";
  const passTag = ordinaryPassTag();
  const inputTag = INPUT_MODE === "touch" ? "-touch" : "";
  const dest = path.join(
    OUT,
    `ice-ch1-ORDINARY-UNCUT-${label}-${shaShort}-${suffix}${inputTag}-${passTag}.webm`
  );
  let videoSaveError = null;
  if (video) {
    try {
      await video.saveAs(dest);
    } catch (e) {
      videoSaveError = String(e.message || e);
      try {
        const vidTmp = await video.path();
        if (vidTmp && fs.existsSync(vidTmp)) fs.copyFileSync(vidTmp, dest);
      } catch (_e) {}
    }
  }

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
    videoSaveError,
    file: dest,
    inputLog: inputLog.slice(),
    scenes: scenes.slice(),
    ...ffprobeMeta(dest),
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const serveChild = await serveRoot();
  const browser = await chromium.launch();
  const results = [];
  let err = null;
  try {
    if (INPUT_MODE === "touch") {
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
    await browser.close();
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
  console.log("ORDINARY capture done:", JSON.stringify(report, null, 2));
})();
