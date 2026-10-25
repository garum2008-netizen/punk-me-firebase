#!/usr/bin/env node
/**
 * PR B full playthrough capture (1080p webm → mp4, episodeCapture HUD, TIMECODES).
 */
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");
const { validateEpisode1Recording, probeDuration } = require("./validate-episode1-recording");

const outDir = path.join(__dirname, "../qa/pr-b-full");
const artifactDir = "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(artifactDir, { recursive: true });

const marks = [];
let t0 = 0;
function mark(label, extra = "") {
  const sec = (Date.now() - t0) / 1000;
  marks.push({ sec, label, extra });
  fs.appendFileSync(path.join(outDir, "marks.jsonl"), JSON.stringify({ sec, label, extra }) + "\n");
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function writeTimecodes(finalMp4) {
  const dur = probeDuration(finalMp4);
  const lines = [
    "# PUNK ME — PR B playthrough (build includes PR A + B)",
    "",
    `**File:** \`qa/pr-b-full/punk-me-pr-b-1080p.mp4\``,
    `**Duration:** ${fmt(dur)} (${dur.toFixed(1)}s)`,
    "",
    "| Time | Event |",
    "|------|-------|"
  ];
  marks.forEach(m => {
    lines.push(`| ${fmt(m.sec)} | ${m.label}${m.extra ? ` — ${m.extra}` : ""} |`);
  });
  fs.writeFileSync(path.join(outDir, "TIMECODES.md"), lines.join("\n") + "\n");
}

async function boot(page, base) {
  await page.goto(`${base}/?solo=1&episodeCapture=1&v=pr-b-cap`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.locator('.char-pick[data-id="cobalt"]').click();
  await page.locator("#charSelectConfirm").click();
  await page.waitForFunction(() => window.__playerLoaded && window.World3D?.isReady?.(), { timeout: 120000 });
  await page.locator("#howToOverlay .close, #howToOverlay button").first().click({ timeout: 4000 }).catch(() => {});
  await page.evaluate(() => {
    window.AudioManager?.unlockAudio?.();
    window.AudioManager?.setLocationMusic?.("room");
    window.AudioManager?.setChannelVolume?.("music", 0.78);
  });
}

async function runFlow(page) {
  mark("intro", "character + room");
  await H.sleep(2500);

  mark("story_goals", "objective HUD");
  await page.evaluate(() => {
    window.StoryEngine?.renderObjectivePanel?.();
    document.getElementById("storyGoalBar")?.classList.add("visible");
  });
  await H.sleep(2000);

  mark("duel_start", "street vs Razor");
  await page.evaluate(() => {
    window.me.onboarding = { step: 6, progress: {}, done: true };
    window.goLocation("street");
    window.syncStage3D?.();
    window.World3D?.startDuel3D?.("razor", { training: false, firstTo: 3 });
    window.World3D?.armDuelCaptureSpam?.();
  });
  await page.waitForSelector("#duel3dHud:not(.hidden)", { timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("f");
    await H.sleep(120);
    const won = await page.evaluate(() => document.getElementById("duel3dResult")?.classList.contains("active"));
    if (won) break;
  }
  mark("duel_win");
  await H.sleep(2000);
  await page.evaluate(() => {
    window.World3D?.stopDuel3D?.(true);
    window.PlayV21?.endAllActivities?.();
  });

  mark("decor_room", "apartment editor");
  await page.evaluate(async () => {
    window.me.location = "room";
    await window.World3D?.setLocation?.("room");
    window.World3D?.setDecorMode?.(true);
    window.World3D?.placeDecorAt?.(0.5, 0.5, "neon_sign");
    window.World3D?.setDecorMode?.(false);
  });
  await H.sleep(2500);

  mark("decor_construction", "hangout site");
  await page.evaluate(async () => {
    window.me.location = "construction";
    await window.World3D?.setLocation?.("construction");
    window.World3D?.setDecorMode?.(true);
    window.World3D?.placeDecorAt?.(-1, 1, "guitar");
    window.World3D?.setDecorMode?.(false);
  });
  await H.sleep(2500);

  mark("city_plot", "purchase shop plot");
  await page.evaluate(async () => {
    window.me.coins = 800;
    window.me.location = "city";
    await window.World3D?.setLocation?.("city");
    window.purchaseCityPlot?.("plot_shop");
  });
  await H.sleep(3000);

  mark("cemetery_job", "clean paths mini-game");
  await page.evaluate(async () => {
    window.me.location = "cemetery";
    await window.World3D?.setLocation?.("cemetery");
    window.World3D?.startCemeteryJobVariant?.("paths");
  });
  await H.sleep(12000);

  mark("crypt_decor", "cemetery placements");
  await page.evaluate(async () => {
    window.PlayV21?.endAllActivities?.();
    window.World3D?.setDecorMode?.(true);
    window.World3D?.placeDecorAt?.(2, -1, "urn");
    window.World3D?.setDecorMode?.(false);
  });
  await H.sleep(3000);

  mark("outro", "map branding");
  await page.evaluate(() => window.openModal("mapModal"));
  await H.sleep(2500);
}

async function main() {
  const base = process.env.PUNK_BASE || await start();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } }
  });
  const page = await context.newPage();
  t0 = Date.now();
  try {
    await boot(page, base);
    await runFlow(page);
  } finally {
    await context.close();
    await browser.close();
    if (!process.env.PUNK_BASE) stop();
  }

  const webms = fs.readdirSync(outDir).filter(f => f.endsWith(".webm"));
  if (!webms.length) throw new Error("no webm recorded");
  const webm = path.join(outDir, webms.sort().pop());
  const mp4 = path.join(outDir, "punk-me-pr-b-1080p.mp4");
  const mp4Silent = path.join(outDir, "punk-me-pr-b-1080p-silent.mp4");
  execSync(
    `ffmpeg -y -i "${webm}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -an "${mp4Silent}"`,
    { stdio: "inherit" }
  );
  const vDur = probeDuration(mp4Silent);
  const bgmSrc = path.join(__dirname, "../assets/audio/music/music_street.mp3");
  if (!fs.existsSync(bgmSrc)) throw new Error("missing music_street.mp3 for mux");
  execSync(
    `ffmpeg -y -i "${mp4Silent}" -stream_loop -1 -i "${bgmSrc}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -t ${vDur.toFixed(2)} "${mp4}"`,
    { stdio: "inherit" }
  );
  const contact = path.join(outDir, "contact-sheet.jpg");
  const dur = probeDuration(mp4);
  const frames = [0, dur * 0.15, dur * 0.35, dur * 0.55, dur * 0.75, dur * 0.9].map(t => Math.max(0, t));
  const tmpFrames = frames.map((t, i) => {
    const p = path.join(outDir, `_frame_${i}.png`);
    execSync(`ffmpeg -y -ss ${t.toFixed(2)} -i "${mp4}" -frames:v 1 "${p}"`, { stdio: "ignore" });
    return p;
  });
  spawnSync(
    "ffmpeg",
    ["-y", ...tmpFrames.flatMap(p => ["-i", p]), "-filter_complex", `tile=3x2`, contact],
    { stdio: "ignore" }
  );
  writeTimecodes(mp4);
  fs.copyFileSync(mp4, path.join(artifactDir, "punk-me-pr-b-1080p.mp4"));
  fs.copyFileSync(contact, path.join(artifactDir, "pr-b-contact-sheet.jpg"));

  const vol = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-i", mp4, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const mean = (vol.stderr || "").match(/mean_volume:\s*([-\d.]+)/);
  console.log(
    JSON.stringify({
      mp4,
      duration: dur,
      meanVolumeDb: mean ? parseFloat(mean[1]) : null,
      marks: marks.length,
      contact
    }, null, 2)
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
