import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const outDir = "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } }
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", err => errors.push(err.message));
await page.goto(`${base}/?solo=1&v=opening`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForFunction(() => document.querySelectorAll("#charSelectUi .char-pick").length >= 1 || !!window.me?.characterId);
if (await page.locator("#charSelectUi .char-pick").count()) {
  await page.click('.char-pick[data-id="cobalt"]');
  await page.click("#charSelectConfirm");
}
await page.waitForFunction(() => window.__playerLoaded === true && window.me?.characterId === "cobalt");
await page.waitForFunction(() => {
  const line = document.getElementById("angelinaLine")?.textContent || "";
  const chapter = document.getElementById("chapterStrip")?.textContent || "";
  const quest = document.getElementById("questBox")?.innerText || "";
  const guide = window.World3D?.getGuideCompanion?.();
  return line.includes("PUNK ME ANGEL") && /House 13|доме 13|hus 13/.test(chapter + quest) && guide?.visible;
}, { timeout: 25000 });
await page.screenshot({ path: path.join(outDir, "opening-desktop.png") });
await page.keyboard.down("d");
await page.waitForTimeout(1200);
await page.keyboard.up("d");
await page.screenshot({ path: path.join(outDir, "opening-walk.png") });
await page.click("#btnJournal");
await page.waitForSelector("#visionJournal.active");
await page.screenshot({ path: path.join(outDir, "opening-journal.png") });
await page.click("#visionJournalClose");
await page.click("#angelinaRepeat");
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
const overlap = await page.evaluate(() => {
  const joy = document.getElementById("touchJoystick")?.getBoundingClientRect();
  const bubble = document.getElementById("angelinaBubble")?.getBoundingClientRect();
  if (!joy || !bubble) return { ok: false };
  const w = Math.max(0, Math.min(joy.right, bubble.right) - Math.max(joy.left, bubble.left));
  const h = Math.max(0, Math.min(joy.bottom, bubble.bottom) - Math.max(joy.top, bubble.top));
  return { ok: w * h < joy.width * joy.height * 0.15, line: document.getElementById("angelinaLine")?.textContent?.slice(0, 80) };
});
await page.screenshot({ path: path.join(outDir, "opening-mobile.png") });
const video = page.video();
await context.close();
const src = await video.path();
fs.copyFileSync(src, path.join(outDir, "opening-play.webm"));
await browser.close();
const serious = errors.filter(e => !/WebGL|GL Driver/i.test(e));
const report = { overlap, serious };
fs.writeFileSync(path.join(outDir, "opening-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!overlap.ok || serious.length) process.exit(1);
