/**
 * The character studio must show the whole body, including wings, before Play.
 */
import { chromium } from "playwright";

const base = process.env.PUNK_BASE || "http://127.0.0.1:3466";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"]
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(`${base}/?solo=1&v=preview-fit`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.querySelectorAll("#charSelectUi .char-pick").length >= 1, undefined, { timeout: 60000 });
await page.click("#avatarCyberBlue");
await page.waitForTimeout(400);
const cyber = await page.evaluate(() => window.CharSelect?.previewFit?.() || null);
await page.click("#avatarWarmCrew");
await page.waitForTimeout(400);
const warm = await page.evaluate(() => window.CharSelect?.previewFit?.() || null);
const chip = await page.locator("#gameVersion").evaluate(el => getComputedStyle(el).display === "none" || el.hidden);
console.log(JSON.stringify({ cyber, warm, chip }));
await browser.close();
if (!cyber?.pass || !warm?.pass || !chip) process.exit(1);
console.log("char preview ok");
