/**
 * Acceptance gates for PR 66 at the current working tree.
 * Fresh browser profile. Does not merge or deploy.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { chromium } from "playwright";

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const outDir = process.env.ACCEPT_OUT || "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });
const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: outDir, size: { width: 1280, height: 800 } }
});
await context.addInitScript(() => {
  const calls = [];
  window.__speechCalls = calls;
  const noteSpeak = u => calls.push("speak:" + (u?.lang || "") + ":" + String(u?.text || "").slice(0, 80));
  const orig = window.speechSynthesis;
  if (orig && typeof orig.speak === "function") {
    const speak = orig.speak.bind(orig);
    const cancel = orig.cancel.bind(orig);
    orig.speak = u => { noteSpeak(u); try { speak(u); } catch { /* headless voice */ } };
    orig.cancel = () => { calls.push("cancel"); try { cancel(); } catch { /* ignore */ } };
    return;
  }
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      cancel() { calls.push("cancel"); },
      speak(u) { noteSpeak(u); },
      getVoices() { return []; },
      addEventListener() {},
      removeEventListener() {}
    }
  });
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", err => errors.push(err.message));

async function boot(lang) {
  await page.goto(`${base}/?solo=1&v=accept-${lang || "en"}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(code => localStorage.setItem("punkme_lang", code), lang || "en");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll("#charSelectUi .char-pick").length >= 1 || !!window.me?.characterId);
  if (await page.locator("#charSelectUi .char-pick").count()) {
    await page.click('.char-pick[data-id="cobalt"]');
    await page.click("#charSelectConfirm");
  }
  await page.waitForFunction(() => window.__playerLoaded === true && window.me?.characterId === "cobalt");
}

await boot("en");
await page.waitForFunction(() => {
  const line = document.getElementById("angelinaLine")?.textContent || "";
  const frame = window.World3D?.getGuideFrame?.();
  const guide = window.World3D?.getGuideCompanion?.();
  return line.includes("PUNK ME ANGEL") && guide?.id === "angelina" && guide.visible && frame?.inFrame;
}, { timeout: 30000 });

const visual = await page.evaluate(() => {
  const g = window.World3D.getGuideCompanion();
  const frame = window.World3D.getGuideFrame();
  return { id: g.id, visible: g.visible, ...frame };
});
await page.screenshot({ path: path.join(outDir, "accept-desktop-hello.png") });

const before = await page.evaluate(() => ({
  step: window.me.onboarding.step,
  done: !!window.me.onboarding.done
}));
  const placed = await page.evaluate(() => {
  const ok = window.World3D?.placeDecorAt?.(-2.2, -1.4, "lamp");
  return {
    ok: !!ok,
    count: (window.me.story?.roomDecor || []).length,
    step: window.me.onboarding.step,
    done: !!window.me.onboarding.done,
    type: window.me.story?.roomDecor?.[0]?.type || null
  };
});
await page.screenshot({ path: path.join(outDir, "accept-decor.png") });

await page.click("#stage3d", { position: { x: 640, y: 400 } });
await page.waitForTimeout(400);
const voice = await page.evaluate(() => ({
  calls: window.__speechCalls || [],
  subtitle: document.getElementById("voiceSubtitle")?.textContent || "",
  subtitleOn: document.getElementById("voiceSubtitle")?.classList.contains("visible")
}));
await page.click("#angelinaMute");
await page.waitForTimeout(200);
const muted = await page.evaluate(() => ({
  calls: window.__speechCalls || [],
  pressed: document.getElementById("angelinaMute")?.getAttribute("aria-pressed")
}));

const langs = {};
for (const code of ["ru", "uk", "en", "da"]) {
  await page.evaluate(c => window.setLanguage(c, true), code);
  await page.waitForTimeout(250);
  langs[code] = await page.evaluate(() => ({
    chapter: document.getElementById("chapterStrip")?.textContent || "",
    line: document.getElementById("angelinaLine")?.textContent || "",
    quest: (document.getElementById("questBox")?.innerText || "").slice(0, 180)
  }));
  await page.screenshot({ path: path.join(outDir, `accept-lang-${code}.png`) });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const mobile = await page.evaluate(() => {
  const joy = document.getElementById("touchJoystick")?.getBoundingClientRect();
  const bubble = document.getElementById("angelinaBubble")?.getBoundingClientRect();
  const touch = document.getElementById("touchControls");
  const shown = !!(joy && touch && getComputedStyle(touch).display !== "none");
  let covers = false;
  if (joy && bubble) {
    const w = Math.max(0, Math.min(joy.right, bubble.right) - Math.max(joy.left, bubble.left));
    const h = Math.max(0, Math.min(joy.bottom, bubble.bottom) - Math.max(joy.top, bubble.top));
    covers = w * h > joy.width * joy.height * 0.15;
  }
  const frame = window.World3D?.getGuideFrame?.();
  return { shown, covers, guide: !!window.World3D?.getGuideCompanion?.()?.visible, inFrame: !!frame?.inFrame, heightPx: frame?.heightPx || 0, head: frame?.head || null };
});
await page.screenshot({ path: path.join(outDir, "accept-mobile.png") });

const video = page.video();
await context.close();
const src = await video.path();
const videoOut = path.join(outDir, "accept-play.webm");
fs.copyFileSync(src, videoOut);
await browser.close();

const distinct = new Set(Object.values(langs).map(x => x.chapter)).size;
const report = {
  sha,
  dirty: dirty ? dirty.split("\n") : [],
  visual,
  decor: { before, placed, storyUnblocked: placed.ok && placed.step === before.step && placed.done === before.done && placed.count >= 1 },
  voice: {
    spoke: voice.calls.some(c => String(c).startsWith("speak:")),
    subtitle: voice.subtitle.slice(0, 120),
    muted: muted.calls.includes("cancel") || muted.pressed === "false"
  },
  langs,
  langChaptersDiffer: distinct >= 3,
  lineTranslated: {
    ru: /[А-Яа-я]/.test(langs.ru.line),
    uk: /[А-Яа-яІіЇїЄє]/.test(langs.uk.line),
    da: /[æøåÆØÅ]/.test(langs.da.line) || langs.da.line.includes("Græskarby") || langs.da.line.includes("værels")
  },
  mobile,
  serious: errors.filter(e => !/WebGL|GL Driver/i.test(e))
};
const pass = report.visual.visible
  && report.visual.inFrame
  && report.decor.storyUnblocked
  && report.voice.spoke
  && report.voice.subtitle.includes("Angelina")
  && report.langChaptersDiffer
  && report.lineTranslated.ru
  && report.lineTranslated.uk
  && report.lineTranslated.da
  && report.mobile.shown
  && report.mobile.covers === false
  && report.mobile.guide
  && report.mobile.inFrame
  && report.serious.length === 0;
report.pass = pass;
fs.writeFileSync(path.join(outDir, "accept-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!pass) process.exit(1);
