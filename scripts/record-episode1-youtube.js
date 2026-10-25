#!/usr/bin/env node
/**
 * Full Episode 1 capture for YouTube (1080p, game-only framing).
 * Output: qa/episode1/episode1-youtube.webm + TIMECODES.md
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");

const outDir = path.join(__dirname, "../qa/episode1");
fs.mkdirSync(outDir, { recursive: true });

const marks = [];
let t0 = 0;
function mark(label, extra = "") {
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  marks.push({ sec, label, extra });
}

function fmt(sec) {
  const s = Number(sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

async function main() {
  const base = process.env.PUNK_BASE || await start();
  const videoDir = path.join(outDir, "youtube-capture-raw");
  fs.mkdirSync(videoDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
    locale: "ru-RU"
  });
  await context.addInitScript(() => {
    document.documentElement.classList.add("episode-capture");
  });
  const page = await context.newPage();
  t0 = Date.now();
  mark("boot", "solo new player");
  await H.bootSolo(page, base, "yt-ep1");
  await H.pickCobaltUi(page);
  mark("char_select", "Cobalt");
  await page.locator("#btnStartGame").click({ force: true, timeout: 20000 });
  mark("start_game", "audio unlock");
  await page.waitForTimeout(1500);
  if (!process.env.SKIP_WALK) await H.walkDesktop(page, 1400);
  mark("tutorial_move", "room movement");
  await H.navGo(page, "street");
  mark("tutorial_street", "portal street");
  await H.openGangNpc(page, "razor");
  mark("razor_talk_e", "E / gang UI dialog");
  await H.advanceStoryNext(page).catch(() => {});
  await H.dismissStoryDialog(page);
  await H.closeGangModal(page);
  mark("quest_journal", "onboarding step talk_razor");
  await page.locator("#btnGameMenu").click({ timeout: 8000 });
  mark("menu_open", "journal visible");
  await page.locator("#gameMenuClose").click();
  const coinsBefore = await page.evaluate(() => window.me?.coins ?? 0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  await page.evaluate(() => {
    window.__force2dFight = true;
    document.documentElement.classList.add("episode-capture");
  });
  const after = await page.evaluate(() => ({
    step: window.me?.onboarding?.step,
    coins: window.me?.coins
  }));
  mark("reload_continue", `step ${after.step} coins ${after.coins} (was ${coinsBefore})`);
  await page.waitForTimeout(1200);
  await context.close();
  await browser.close();
  const webm = fs.readdirSync(videoDir).find(f => f.endsWith(".webm"));
  const dest = path.join(outDir, "episode1-youtube.webm");
  if (webm) fs.copyFileSync(path.join(videoDir, webm), dest);
  const sizeMb = webm ? fs.statSync(dest).size / (1024 * 1024) : 0;
  const md = [
    "# Episode 1 — YouTube capture timecodes",
    "",
    `Recorded: Playwright Chromium 1920×1080, game viewport only (HUD accounts hidden via \`episode-capture\`).`,
    `File: \`qa/episode1/episode1-youtube.webm\` (${sizeMb.toFixed(2)} MB)`,
    "",
    "| Time | Moment | Notes |",
    "| --- | --- | --- |"
  ];
  marks.forEach(m => {
    const purchase = /shop|coins|buy|лавк/i.test(m.label + m.extra) ? " **prices/coins on screen**" : "";
    md.push(`| ${fmt(m.sec)} | ${m.label} | ${m.extra}${purchase} |`);
  });
  md.push("", "## Purchases / prices", "- Shop buy step not run in this capture slice; coin rewards visible after onboarding steps (see reload line).");
  fs.writeFileSync(path.join(outDir, "TIMECODES.md"), md.join("\n"));
  console.log("Wrote", dest, sizeMb.toFixed(2), "MB");
  if (!process.env.PUNK_BASE) stop();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
