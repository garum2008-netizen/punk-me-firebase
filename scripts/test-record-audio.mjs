/**
 * Proves the playthrough recorder keeps Angelina's audio.
 * Plays one local espeak line and checks the mixed file is not silent.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { AUDIO_INIT, writeCapture, muxVideoAudio, audioMeanDb } from "./capture-page-audio.mjs";

const base = process.env.PUNK_BASE || "http://127.0.0.1:3466";
const outDir = process.env.CH1_AUDIO_OUT || "/tmp/ch1-audio-proof";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"]
});
const context = await browser.newContext({
  viewport: { width: 640, height: 480 },
  recordVideo: { dir: outDir, size: { width: 640, height: 480 } }
});
const page = await context.newPage();
await page.addInitScript({ content: AUDIO_INIT });
await page.route(`${base}/audio-proof.html`, route => {
  route.fulfill({ contentType: "text/html", body: "<!doctype html><button id=\"play\">Play</button>" });
});
await page.goto(`${base}/audio-proof.html`, { waitUntil: "domcontentloaded" });
await page.click("#play");
await page.evaluate((src) => new Audio(src).play(), "/assets/audio/voice/en/angelina_crawl_1.wav");
await page.waitForTimeout(2500);
const captured = await page.evaluate(() => window.__punkAudioStop?.() || null);
const audioFile = path.join(outDir, "clip.webm");
const saved = writeCapture(captured, audioFile);
const video = page.video();
await context.close();
await browser.close();
const silent = path.join(outDir, "silent.webm");
const mixed = path.join(outDir, "with-audio.webm");
fs.copyFileSync(await video.path(), silent);
const ok = saved && muxVideoAudio(silent, audioFile, mixed);
const mean = ok ? audioMeanDb(mixed) : null;
const probe = ok ? (await import("node:child_process")).spawnSync("ffprobe", [
  "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0", mixed
], { encoding: "utf8" }) : null;
const hasAudio = (probe?.stdout || "").includes("audio");
console.log(JSON.stringify({ saved, ok, mean, hasAudio, audioBytes: saved ? fs.statSync(audioFile).size : 0 }));
if (!hasAudio || mean == null || mean <= -45) process.exit(1);
console.log("record audio ok");
