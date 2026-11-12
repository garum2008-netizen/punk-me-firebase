/**
 * Separate browser recordings for chapter 1. Each case gets its own video.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const outDir = process.env.CH1_OUT || "/opt/cursor/artifacts/chapter1";
fs.mkdirSync(outDir, { recursive: true });

const results = [];
function log(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(pass ? "PASS" : "FAIL", id, detail);
}

async function runCase(name, viewport, fn) {
  const only = process.env.CH1_ONLY;
  if (only && !name.startsWith(only)) return;
  const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader"]
  });
  const context = await browser.newContext({
    viewport,
    hasTouch: viewport.width < 500,
    recordVideo: { dir: outDir, size: { width: viewport.width, height: viewport.height } }
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", err => errors.push(String(err.message || err)));
  try {
    await fn(page, errors);
  } catch (err) {
    log(name, false, err.message || String(err));
  }
  const video = page.video();
  await context.close();
  await browser.close();
  if (video) {
    const src = await video.path();
    const dest = path.join(outDir, `${name}.webm`);
    fs.copyFileSync(src, dest);
    log(name + "-video", fs.existsSync(dest) && fs.statSync(dest).size > 1000, dest);
  }
}

async function chooseHero(page) {
  await page.goto(`${base}/?solo=1&v=ch1-milestone`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => {
    const picks = document.querySelectorAll("#charSelectUi .char-pick").length;
    return picks >= 1 || !!window.me?.characterId;
  }, { timeout: 45000 });
  if (await page.locator("#charSelectUi .char-pick").count()) {
    await page.click('.char-pick[data-id="cobalt"]');
    await page.click("#charSelectConfirm");
  }
  await page.waitForFunction(() => window.__playerLoaded === true && !!window.me?.characterId, { timeout: 30000 });
}

async function dismissOverlays(page) {
  const skip = page.locator("#chapterCrawl.active #chapterCrawlSkip");
  try {
    await skip.waitFor({ state: "visible", timeout: 5000 });
    await skip.click();
    await page.waitForFunction(() => !document.getElementById("chapterCrawl").classList.contains("active"));
  } catch (_) {}
  const howto = page.locator("#howToOverlay.active .howto-close");
  try {
    await howto.waitFor({ state: "visible", timeout: 5000 });
    await howto.click();
    await page.waitForFunction(() => !document.getElementById("howToOverlay").classList.contains("active"));
  } catch (_) {}
}

async function boot(page) {
  await chooseHero(page);
  await dismissOverlays(page);
}

const desktop = { width: 1280, height: 720 };
const mobile = { width: 390, height: 844 };

await runCase("01-crawl", desktop, async (page) => {
  await chooseHero(page);
  await page.waitForSelector("#chapterCrawl.active", { timeout: 20000 });
  const text = await page.locator(".chapter-crawl-body").innerText();
  log("crawl-text", text.includes("Rusty Chains") || text.includes("Ржавые") || text.includes("house 13"), text.slice(0, 80));
  await page.waitForTimeout(1200);
  await page.click("#chapterCrawlSkip");
  await page.waitForFunction(() => !document.getElementById("chapterCrawl").classList.contains("active"));
  const guide = await page.locator("#angelinaGuide").innerText();
  log("angelina-after-crawl", guide.includes("Angelina") || guide.includes("Ангелина"), guide.slice(0, 80));
});

await runCase("02-desktop-move", desktop, async (page) => {
  await boot(page);
  await page.keyboard.down("d");
  await page.keyboard.down("w");
  try {
    await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 1, { timeout: 20000 });
    log("desktop-move", true, "step " + await page.evaluate(() => window.me.onboarding.step));
  } finally {
    await page.keyboard.up("d");
    await page.keyboard.up("w");
  }
});

await runCase("03-mobile-controls", mobile, async (page) => {
  await boot(page);
  const shown = await page.evaluate(() => {
    const el = document.getElementById("touchControls");
    const joy = document.getElementById("touchJoystick");
    const style = el ? getComputedStyle(el) : null;
    const joyStyle = joy ? getComputedStyle(joy) : null;
    return {
      hidden: el?.getAttribute("aria-hidden"),
      display: style?.display,
      joy: joyStyle?.pointerEvents
    };
  });
  const joy = page.locator("#touchJoystick");
  const box = await joy.boundingBox();
  if (!box) {
    log("mobile-joystick", false, JSON.stringify(shown));
    return;
  }
  const before = await page.evaluate(() => ({ x: window.me.x, y: window.me.y, step: window.me.onboarding.step }));
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 48, { steps: 6 });
  const samples = [];
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(cx, cy - 48);
    await page.waitForTimeout(500);
    samples.push(await page.evaluate(() => ({
      x: Math.round(window.me.x * 10) / 10,
      y: Math.round(window.me.y * 10) / 10,
      step: window.me.onboarding.step,
      howto: document.getElementById("howToOverlay")?.classList.contains("active") === true,
      crawl: document.getElementById("chapterCrawl")?.classList.contains("active") === true
    })));
  }
  await page.mouse.up();
  const after = samples[samples.length - 1];
  const moved = Math.hypot(after.x - before.x, after.y - before.y) > 1 && after.step > before.step;
  log("mobile-joystick", shown.hidden === "false" && shown.display === "block" && moved, JSON.stringify({ shown, before, after, samples }));
});

await runCase("04-voice", desktop, async (page) => {
  const voices = [];
  page.on("request", req => {
    if (req.url().includes("/assets/audio/voice/")) voices.push(req.url());
  });
  await chooseHero(page);
  await page.waitForTimeout(2000);
  const intro = voices.find(u => u.includes("intro_slide"));
  const step = voices.find(u => u.includes("narr_onboard"));
  log("voice-intro", !!intro && intro.includes("/ru/intro_slide"), intro || "none");
  await dismissOverlays(page);
  await page.waitForTimeout(800);
  log("voice-step", voices.some(u => u.includes("narr_onboard_move")), step || voices.filter(u => u.includes("narr_onboard")).join(" ") || "none");
});

await runCase("05-city-build", desktop, async (page) => {
  await boot(page);
  await page.waitForFunction(() => window.World3D?.isReady?.() === true, { timeout: 40000 });
  await page.evaluate(() => {
    window.me.onboarding.step = 6;
    window.me.onboarding.done = false;
    window.me.onboarding.progress = {};
    window.Chapter1.ensureCityKit(window.me);
    window.goLocation("city");
  });
  await page.waitForFunction(() => window.me?.location === "city" && getComputedStyle(document.getElementById("btnBuild")).display !== "none");
  await page.click("#btnBuild");
  const canvas = page.locator("#stage3d");
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);
  await page.waitForTimeout(600);
  const placed = await page.evaluate(() => ({
    stones: (window.me.cityStones || []).length,
    meshes: document.querySelectorAll("canvas").length,
    step: window.me.onboarding.step,
    done: window.me.onboarding.done,
    built: window.me.built,
    buildMode: window.__buildMode,
    crypt: window.me.inventory?.materials?.crypt
  }));
  log("city-stone", placed.stones >= 1 && placed.built >= 1, JSON.stringify(placed));
});

await runCase("06-save-resume", desktop, async (page) => {
  await boot(page);
  await page.waitForFunction(() => window.me?.chapter1?.crawlSeen === true, { timeout: 10000 });
  await page.evaluate(() => window.saveMe());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true && window.me?.chapter1?.crawlSeen === true, { timeout: 40000 });
  const crawl = await page.evaluate(() => document.getElementById("chapterCrawl").classList.contains("active"));
  log("save-resume", crawl === false, "crawlSeen kept, overlay " + crawl);
});

await runCase("07-navigation", desktop, async (page, errors) => {
  await boot(page);
  await page.evaluate(() => window.goLocation("street"));
  await page.waitForFunction(() => window.me?.location === "street");
  await page.evaluate(() => window.goLocation("city"));
  await page.waitForFunction(() => window.me?.location === "city");
  await page.evaluate(() => window.goLocation("room"));
  await page.waitForFunction(() => window.me?.location === "room");
  log("navigation", errors.length === 0, errors.join(" | ") || "room-street-city-room");
});

await runCase("08-errors-loading", desktop, async (page, errors) => {
  const t0 = Date.now();
  await chooseHero(page);
  const bootMs = Date.now() - t0;
  const loading = await page.evaluate(() => {
    const el = document.getElementById("loading");
    return { display: el ? getComputedStyle(el).display : "missing", text: (el?.innerText || "").slice(0, 80) };
  });
  log("boot-loading", bootMs < 45000 && loading.display === "none", JSON.stringify({ bootMs, loading, errors }));
});

fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.pass);
if (failed.length) process.exit(1);
