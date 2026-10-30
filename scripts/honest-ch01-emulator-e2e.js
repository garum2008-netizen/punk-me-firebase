#!/usr/bin/env node
/**
 * AUTOMATED honest ch0→ch1 emulator e2e — player input only (no snapshot injection, no force clicks).
 * Real Firebase Auth + RTDB emulators; prod hosts blocked.
 * NOT a human playthrough.
 */
const fs = require("fs");
const path = require("path");
const net = require("net");
const { spawn } = require("child_process");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const Nav = require("./honest-player-nav");
const { assertSafeTestFirebaseTarget } = require("./lib/guard-no-prod-firebase");

const ART =
  process.env.HONEST_CH01_ART ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts/honest-ch01-emulator-e2e"
    : path.join(__dirname, "../artifacts/honest-ch01-emulator-e2e"));

const PROJECT = process.env.FIREBASE_EMULATOR_PROJECT || "punk-me-40605";
const errors = [];
const console404 = [];

function note(tag, msg, extra) {
  console.log(`[${tag}] ${msg}`, extra ? JSON.stringify(extra) : "");
}

async function snap(page, tag, name) {
  const dir = path.join(ART, tag);
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  return p;
}

async function waitEmulatorsReady(proc) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("emulator start timeout")), 120000);
    const onData = buf => {
      const s = buf.toString();
      process.stdout.write(s);
      if (s.includes("All emulators ready")) {
        clearTimeout(t);
        proc.stdout.off("data", onData);
        resolve();
      }
      if (/port taken|already in use|EADDRINUSE/i.test(s)) {
        clearTimeout(t);
        proc.stdout.off("data", onData);
        reject(new Error("emulator port taken"));
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", d => {
      process.stderr.write(d);
      const s = d.toString();
      if (/port taken|already in use|EADDRINUSE/i.test(s)) {
        clearTimeout(t);
        proc.stdout.off("data", onData);
        reject(new Error("emulator port taken"));
      }
    });
    proc.on("exit", c => {
      clearTimeout(t);
      reject(new Error(`emulator exit ${c}`));
    });
  });
}

function portFree(port) {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

async function withEmulators(run) {
  if (process.env.FIREBASE_EMULATOR === "1") return run(null);
  const canStart = await portFree(9099);
  let proc = null;
  if (canStart) {
    proc = spawn(
      "npx",
      ["firebase", "emulators:start", "--only", "auth,database", "--project", PROJECT],
      { cwd: path.join(__dirname, ".."), stdio: "pipe" }
    );
    try {
      await waitEmulatorsReady(proc);
    } catch (e) {
      try {
        proc.kill("SIGKILL");
      } catch (_) {}
      proc = null;
      if (!String(e.message || e).includes("port")) throw e;
      note("emulator", "reusing existing suite on 9099/9000");
    }
  } else {
    note("emulator", "reusing existing suite on 9099/9000");
  }
  process.env.FIREBASE_EMULATOR = "1";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
  try {
    return await run(proc);
  } finally {
    if (proc) {
      try {
        proc.kill("SIGKILL");
      } catch (_) {}
    }
  }
}

async function assertStepHealth(page, tag, label) {
  const text = await Nav.readDomText(page);
  const raw = Nav.findRawKeys(text);
  if (raw.length) errors.push(`${tag}@${label}: raw keys ${raw.join(", ")}`);
}

async function waitBoot(page) {
  await page.waitForFunction(() => window.__playerLoaded && window.World3D?.isReady?.(), {
    timeout: 180000
  });
  await page.waitForFunction(
    () => {
      const l = document.getElementById("loading");
      return !l || getComputedStyle(l).display === "none" || l.offsetParent === null;
    },
    undefined,
    { timeout: 180000 }
  );
}

async function pickCharacter(page) {
  await page.waitForFunction(
    () => {
      const ov = document.getElementById("charSelect");
      const btn = document.getElementById("charSelectConfirm");
      return ov?.classList.contains("active") && btn && !btn.disabled;
    },
    undefined,
    { timeout: 180000 }
  );
  await page.locator('.char-pick[data-id="cobalt"]').click({ timeout: 30000 });
  await page.locator("#charSelectConfirm").click({ timeout: 30000 });
}

async function maybeStartOverlay(page) {
  const start = page.locator("#startGameOverlay.active #btnStartGame");
  if (await start.count()) {
    await start.click({ timeout: 15000 });
    await page.waitForFunction(() => window.me?.tutorial?.episode1Started === true, undefined, {
      timeout: 30000
    });
  }
  await Nav.waitGameplayUnblocked(page, 20000);
}

async function runOnboarding(page, tag, mobile) {
  let guard = 0;
  let lastKey = "";
  let stuck = 0;
  while (guard++ < 160) {
    const st = await Nav.readGameState(page);
    if (st.onboardingDone) return;
    const key = st.stepKey;
    if (key === lastKey) stuck += 1;
    else {
      stuck = 0;
      lastKey = key;
    }
    if (stuck > 35) errors.push(`${tag}: stuck on onboarding ${key}`);
    if (stuck > 40) break;
    await assertStepHealth(page, tag, key || "unknown");
    note(tag, "onboarding step", { key, loc: st.location, coins: st.coins });

    if (key === "ch0_awake" || key === "ch0_move_done") {
      await Nav.waitGameplayUnblocked(page);
      await Nav.wanderMove(page, mobile);
      await Nav.walkTowardGuide(page, mobile, 40);
    } else if (key === "ch0_mom_talk") {
      await Nav.walkTowardGuide(page, mobile);
      await Nav.pressInteract(page, mobile);
    } else if (key === "ch0_feed_bowl") {
      if (st.location !== "kitchen") await Nav.clickNavLocation(page, "kitchen");
      await Nav.walkTowardGuide(page, mobile);
      await Nav.pressInteract(page, mobile);
    } else if (key === "ch0_journal_open") {
      await page.locator("#btnGameMenu").click({ timeout: 8000 });
      await Nav.sleep(600);
      await page.locator("#gameMenuClose").click({ timeout: 8000 }).catch(() => {});
    } else if (key === "ch0_pet_shnurok") {
      if (st.location !== "room") await Nav.clickNavLocation(page, "room");
      for (let i = 0; i < 6; i++) {
        await Nav.pressInteract(page, mobile);
        await Nav.sleep(500);
      }
    } else if (key === "ch0_avatar_chosen") {
      if (st.location !== "room") await Nav.clickNavLocation(page, "room");
      await Nav.walkTowardGuide(page, mobile);
      await Nav.pressInteract(page, mobile);
    } else if (key === "ch0_interact_done") {
      await Nav.walkTowardGuide(page, mobile);
      await Nav.pressInteract(page, mobile);
    } else if (key === "ch0_house_tour") {
      if (st.location !== "kitchen") await Nav.clickNavLocation(page, "kitchen");
      await Nav.sleep(400);
      if ((await Nav.readGameState(page)).location !== "elevator") {
        await Nav.clickNavLocation(page, "room");
        await Nav.sleep(300);
        await Nav.clickNavLocation(page, "elevator");
      }
    } else if (key === "ch0_enter_street") {
      if (st.location !== "elevator") await Nav.clickNavLocation(page, "elevator");
      await Nav.clickNavLocation(page, "street");
    } else if (key === "ch0_razor_talk") {
      if (st.location !== "street") await Nav.clickNavLocation(page, "street");
      await Nav.walkTowardGuide(page, mobile);
      await Nav.pressInteract(page, mobile);
      await Nav.advanceStoryDialog(page);
    } else {
      await Nav.walkTowardGuide(page, mobile, 20);
    }
    await Nav.sleep(350);
  }
  const done = await Nav.readGameState(page);
  if (!done.onboardingDone) errors.push(`${tag}: onboarding timeout`);
}

async function runCh1(page, tag, mobile) {
  await Nav.dismissChapterIntroUi(page);
  await Nav.dismissHowToUi(page);
  let st = await Nav.readGameState(page);
  if (st.location !== "street") await Nav.clickNavLocation(page, "street");

  await Nav.walkTowardGuide(page, mobile);
  await Nav.pressInteract(page, mobile);
  await Nav.advanceStoryDialog(page);
  await snap(page, tag, "razor-bridge");

  st = await Nav.readGameState(page);
  if (!st.razorBridge) errors.push(`${tag}: razor bridge flag missing`);

  await Nav.walkTowardGuide(page, mobile);
  await Nav.pressInteract(page, mobile);
  await Nav.advanceStoryDialog(page);

  st = await Nav.readGameState(page);
  if (st.coins >= 150 && !st.joined) {
    await Nav.pressInteract(page, mobile);
  }

  st = await Nav.readGameState(page);
  if (!st.joined && st.coins >= 150) errors.push(`${tag}: initiation fee not applied`);

  await Nav.walkTowardGuide(page, mobile);
  await Nav.pressInteract(page, mobile);
  const choice = page.locator("#storyDialog.active .story-choice").first();
  if (await choice.count()) await choice.click({ timeout: 10000 });
  await snap(page, tag, "mohawk-stage1");

  st = await Nav.readGameState(page);
  if (!st.s1Done) errors.push(`${tag}: stage1 s1Done false after mohawk talk`);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitBoot(page);
  await maybeStartOverlay(page);
  await Nav.dismissChapterIntroUi(page);
  await Nav.dismissHowToUi(page);
  st = await Nav.readGameState(page);
  if (!st.s1Done) errors.push(`${tag}: s1Done lost after F5`);
  if (st.chapter < 1) errors.push(`${tag}: chapter lost after F5`);
  const startBody = await page.locator("#startGameOverlay [data-i18n=start_game_body]").textContent().catch(() => "");
  if (startBody && /глава 0|chapter 0|kapitel 0/i.test(startBody)) {
    errors.push(`${tag}: Start overlay still shows chapter 0 copy after F5 in ch1`);
  }
  await snap(page, tag, "after-f5-ch1");
}

async function runViewport(tag, viewport, lang) {
  const mobile = viewport.width < 500;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    hasTouch: mobile,
    recordVideo: { dir: path.join(ART, tag), size: viewport }
  });
  const page = await context.newPage();
  page.on("console", msg => {
    const t = msg.text();
    if (/404|Failed to load|net::ERR/.test(t)) console404.push(`${tag}: ${t}`);
  });
  page.on("pageerror", e => errors.push(`${tag}: pageerror ${e.message}`));

  const base = await start();
  try {
    assertSafeTestFirebaseTarget();
    const url = `${base}/?solo=1&firebaseEmulator=1&v=honest-ch01-${tag}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.evaluate(l => {
      try {
        localStorage.removeItem("punkme_character_id");
        if (typeof setLanguage === "function") setLanguage(l, true);
      } catch (e) {}
    }, lang);
    await page.waitForFunction(() => typeof firebase !== "undefined" && firebase.auth, undefined, {
      timeout: 120000
    });
    await pickCharacter(page);
    await waitBoot(page);
    await maybeStartOverlay(page);
    await Nav.ensureOverlaysClear(page);
    await Nav.waitGameplayUnblocked(page, 25000);
    await snap(page, tag, "boot");

    await runOnboarding(page, tag, mobile);
    await snap(page, tag, "ch0-done");
    await runCh1(page, tag, mobile);
  } catch (e) {
    errors.push(`${tag}: ${e.message}`);
    await snap(page, tag, "failure").catch(() => {});
  } finally {
    await context.close();
    await browser.close();
    await stop();
  }
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  const only = process.env.HONEST_CH01_ONLY;
  await withEmulators(async () => {
    if (!only || only === "en1440") {
      await runViewport("en1440", { width: 1440, height: 900 }, "en");
    }
    if (!only || only === "ru390") {
      await runViewport("ru390", { width: 390, height: 844 }, "ru");
    }
  });
  if (console404.some(e => /ep1_intro|voice\/ru\/ep1/.test(e))) {
    errors.push("forbidden VO 404 in console");
  }
  const summary = {
    artifacts: ART,
    automated: true,
    note: "NOT a human playthrough",
    errors,
    console404: console404.slice(0, 40)
  };
  fs.writeFileSync(path.join(ART, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(errors.length ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
