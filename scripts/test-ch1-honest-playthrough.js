#!/usr/bin/env node
/**
 * Chapter 1 playthrough with keyboard and on-screen buttons.
 * Local save only — no production Firebase.
 */
const { chromium, webkit } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PUNK_PORT || 3471);
const OUT = process.env.PUNK_ARTIFACTS || "/opt/cursor/artifacts/ch1-playable";
const base = `http://127.0.0.1:${PORT}`;

function serve() {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".glb": "model/gltf-binary",
    ".txt": "text/plain"
  };
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let urlPath = req.url.split("?")[0];
      if (urlPath === "/") urlPath = "/index.html";
      const file = path.join(ROOT, decodeURIComponent(urlPath.replace(/^\//, "")));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(PORT, "127.0.0.1", () => resolve(srv));
  });
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, name) });
}

async function dismissHowTo(page) {
  const close = page.locator(".howto-close");
  if (await close.isVisible({ timeout: 800 }).catch(() => false)) await close.click();
}

async function stateOf(page) {
  return page.evaluate(() => {
    const box = document.getElementById("questBox");
    const rect = box?.getBoundingClientRect();
    const guide = window.World3D?.getPortalReadOnlyDiag?.()?.guideTarget || null;
    return {
      loc: window.me?.location,
      step: window.me?.onboarding?.step ?? null,
      done: !!window.me?.onboarding?.done,
      stepId: window.Onboarding?.currentStepId?.() || null,
      paid: window.me?.onboarding?.paid || null,
      coins: window.me?.coins,
      lifeStep: window.me?.lifeCh1?.stepIndex ?? null,
      lifeActive: !!window.me?.lifeCh1?.active,
      lifeDone: !!window.me?.lifeCh1?.completed,
      quest: (box?.innerText || "").replace(/\s+/g, " ").slice(0, 180),
      questVisible: !!(rect && rect.width > 40 && rect.height > 20),
      near: window.World3D?.getNearestNpc?.() || null,
      guide
    };
  });
}

async function holdW(page, ms = 450) {
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await page.waitForTimeout(ms);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
}

async function closeModals(page) {
  await page.evaluate(() => {
    document.querySelectorAll(".modal.active").forEach(el => el.classList.remove("active"));
    const dlg = document.getElementById("storyDialog");
    if (dlg && !dlg.classList.contains("life-ch1-dialog")) dlg.classList.remove("active");
  });
}

async function buyCheap(page) {
  await page.click("button[onclick=\"openModal('shopModal')\"]");
  await page.waitForTimeout(250);
  const mat = page.locator("#shopModal .tab[data-tab='materials']");
  if (await mat.count()) await mat.click();
  await page.locator("#shopGrid button").first().click();
  await page.waitForTimeout(200);
  await page.click("#shopModal .close");
}

async function winDuel(page) {
  await closeModals(page);
  await page.click("#btnFight");
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const st = await stateOf(page);
    if (st.stepId !== "win_fight") return st;
    if (await page.locator('[data-testid="duel3d-attack"]').isVisible().catch(() => false)) {
      await page.click('[data-testid="duel3d-attack"]', { timeout: 2500 }).catch(() => {});
    } else if (await page.locator("#fightOverlay.active button").first().isVisible().catch(() => false)) {
      await page.locator("#fightOverlay.active button").first().click();
    } else {
      await page.click("#btnFight").catch(() => {});
    }
    await page.waitForTimeout(160);
  }
  throw new Error("duel timeout " + JSON.stringify(await stateOf(page)));
}

async function finishLife(page) {
  for (let i = 0; i < 14; i++) {
    const st = await stateOf(page);
    if ((st.lifeStep || 0) >= 1) break;
    await holdW(page, 350);
  }
  const walkTo = async (tx, tz) => {
    const start = Date.now();
    while (Date.now() - start < 35000) {
      const pos = await page.evaluate(() => window.World3D?.getPlayerWorldPosition?.());
      if (pos && Math.hypot(tx - pos.x, tz - pos.z) <= 2.2) return;
      await page.evaluate(({ tx, tz }) => window.World3D?.faceWorldTargetForE2e?.(tx, tz), { tx, tz });
      await holdW(page, 280);
    }
    throw new Error("life walk timeout");
  };
  const chooseLife = async (sel) => {
    const start = Date.now();
    while (Date.now() - start < 20000) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        return;
      }
      await page.keyboard.press("e");
      await page.waitForTimeout(250);
    }
    throw new Error("life choice missing " + sel);
  };
  await walkTo(-3.2, 2.5);
  await chooseLife("[data-testid='life-ch1-skin-B']");
  await page.locator(".life-ch1-outfit-pick").first().click({ timeout: 8000 });
  await page.locator("#lifeCh1WardrobeConfirm").click({ timeout: 8000 });
  await page.waitForFunction(() => (window.me?.lifeCh1?.stepIndex || 0) >= 2, undefined, { timeout: 15000 });
  await walkTo(2.5, -1.8);
  await chooseLife(".life-ch1-choice");
  await page.waitForFunction(() => (window.me?.lifeCh1?.stepIndex || 0) >= 3, undefined, { timeout: 15000 });
  await walkTo(2.5, -1.8);
  await chooseLife("#lifeCh1DlgOk");
  await page.waitForFunction(() => window.me?.lifeCh1?.completed === true, undefined, { timeout: 15000 });
}

async function runProfile(browserType, label, viewport) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ viewport, recordVideo: { dir: OUT, size: viewport } });
  const page = await context.newPage();
  const errors = [];
  const failedReqs = [];
  page.on("pageerror", err => errors.push(String(err)));
  page.on("requestfailed", req => failedReqs.push(`${req.failure()?.errorText || "failed"} ${req.url()}`));
  const log = [];
  try {
    await page.goto(`${base}/?solo=1&v=${label}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#charSelectConfirm", { timeout: 90000 });
    await shot(page, `${label}-select.png`);
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await dismissHowTo(page);
    await shot(page, `${label}-start.png`);
    const deadline = Date.now() + 150000;
    let lifeStarted = false;
    while (Date.now() < deadline) {
      await dismissHowTo(page);
      const st = await stateOf(page);
      log.push(st);
      if (st.lifeDone) break;
      if (!st.done) {
        if (st.stepId === "shop_buy") {
          await closeModals(page);
          await buyCheap(page);
        } else if (st.stepId === "win_fight" && st.near === "razor") {
          await winDuel(page);
        } else if (st.stepId === "talk_razor" && st.near === "razor") {
          await page.keyboard.press("e");
          await page.waitForTimeout(300);
          await closeModals(page);
        } else {
          await holdW(page, st.stepId === "move" ? 700 : 500);
        }
      } else {
        lifeStarted = true;
        await finishLife(page);
      }
    }
    const mid = await stateOf(page);
    if (!mid.lifeDone) throw new Error("not complete " + JSON.stringify(mid));
    if (!mid.questVisible) throw new Error("quest panel hidden");
    if (!mid.paid?.move || !mid.paid?.win_fight) throw new Error("rewards not marked paid " + JSON.stringify(mid.paid));
    await shot(page, `${label}-complete.png`);
    const coins = mid.coins;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__playerLoaded === true && window.me?.lifeCh1?.completed === true, undefined, { timeout: 90000 });
    const after = await stateOf(page);
    if (after.coins !== coins) throw new Error(`coins ${coins} -> ${after.coins}`);
    if (!after.questVisible) throw new Error("quest hidden after resume");
    await shot(page, `${label}-resume.png`);
    const fatal = errors.filter(e => !/favicon|audio device|access control checks|Load failed/i.test(e));
    if (fatal.length) throw new Error("console " + fatal.join(" | "));
    fs.writeFileSync(path.join(OUT, `${label}.json`), JSON.stringify({ mid, after, lifeStarted, failedReqs, tail: log.slice(-8) }, null, 2));
    console.log(label, "PASS", after.quest);
    return { label, pass: true };
  } catch (err) {
    await shot(page, `${label}-fail.png`).catch(() => {});
    fs.writeFileSync(path.join(OUT, `${label}-fail.json`), JSON.stringify({ error: String(err), errors, failedReqs, tail: log.slice(-8) }, null, 2));
    console.error(label, "FAIL", err.message || err);
    return { label, pass: false, error: String(err) };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const results = [];
  try {
    const only = process.env.ONLY || "";
    const profiles = [
      ["desktop-chrome", chromium, { width: 1280, height: 800 }],
      ["mobile-chrome", chromium, { width: 390, height: 844, isMobile: true, hasTouch: true }],
      ["desktop-webkit", webkit, { width: 1280, height: 800 }]
    ];
    for (const [label, type, viewport] of profiles) {
      if (only && label !== only) continue;
      try {
        results.push(await runProfile(type, label, viewport));
      } catch (e) {
        results.push({ label, pass: false, error: String(e) });
      }
    }
    fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(results, null, 2));
    if (results.some(r => !r.pass)) process.exitCode = 1;
  } finally {
    srv.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
