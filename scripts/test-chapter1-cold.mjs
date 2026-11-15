#!/usr/bin/env node
/**
 * Cold first launch. No dev commands. Asserts the chapter a child can see.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const outDir = process.env.CH1_OUT || "/opt/cursor/artifacts/ch1-child-playthrough";
fs.mkdirSync(outDir, { recursive: true });

const results = [];
function log(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(pass ? "PASS" : "FAIL", id, detail);
}

async function dismissHowTo(page) {
  const howto = page.locator("#howToOverlay.active .howto-close");
  try {
    await howto.waitFor({ state: "visible", timeout: 2500 });
    await howto.click({ force: true });
  } catch (_) {}
}

async function go(page, loc) {
  await dismissHowTo(page);
  await page.locator(`#navQuick button[onclick*="goLocation('${loc}')"]`).click();
  await page.waitForFunction(id => window.me?.location === id, loc, { timeout: 20000 });
}

async function attackUntil(page, pred, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await page.evaluate(pred)) return true;
    await page.evaluate(() => {
      if (typeof window.duel3dAttack === "function") window.duel3dAttack();
      document.querySelector("#fightOverlay.active button.btn.danger")?.click();
    });
    await page.waitForTimeout(200);
  }
  return page.evaluate(pred);
}

async function oldSaveRestarts(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("punkme_preview_player_v1", JSON.stringify({
      name: "Old",
      coins: 250,
      characterId: "cobalt",
      avatarLook: { hair: "cyan", hairStyle: "spikes", skin: "cyber", jacket: "cyber", accessory: "wings" },
      onboarding: { step: 7, done: true, progress: {}, paid: { move: true, city_build: true } },
      chapter1: { crawlSeen: true, finaleSeen: true, ended: true },
      story: { chapter: 2, flags: { joined_gang: true }, quest: { activeId: "q_hangout_build" } },
      gang_rank: "gang_member",
      location: "room",
      x: 40,
      y: 50,
      inventory: { materials: {}, spells: [] }
    }));
  });
  await page.goto(`${base}/?solo=1&v=old-save`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true && document.getElementById("chapterCrawl")?.classList.contains("active") === true, { timeout: 30000 });
  const state = await page.evaluate(() => ({
    coins: window.me.coins,
    done: window.me.onboarding.done,
    playId: window.me.chapter1.playId,
    joined: !!window.me.story?.flags?.joined_gang,
    crawl: document.getElementById("chapterCrawl").classList.contains("active")
  }));
  log(
    "old-save-restarts-chapter",
    state.coins === 250 && state.done === false && state.playId === "ch1-child" && state.joined === false && state.crawl === true,
    JSON.stringify(state)
  );
  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
  await oldSaveRestarts(browser);

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
    httpCredentials: process.env.PUNK_PREVIEW_USER
      ? { username: process.env.PUNK_PREVIEW_USER, password: process.env.PUNK_PREVIEW_PASS || "" }
      : undefined
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  await page.goto(`${base}/?solo=1&v=cold`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.setLanguage === "function" && document.querySelectorAll("#charSelectUi .char-pick").length >= 1);
  await page.evaluate(() => setLanguage("en", true));
  await page.click('.char-pick[data-id="cobalt"]');
  await page.click("#avatarCyberBlue");
  await page.screenshot({ path: path.join(outDir, "01-avatar.png") });
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => document.getElementById("chapterCrawl")?.classList.contains("active") === true, { timeout: 30000 });
  const crawl = await page.evaluate(() => ({
    text: document.querySelector(".chapter-crawl-body")?.innerText || "",
    heard: window.__angelinaHeard || []
  }));
  log(
    "intro-crawl-voice",
    /Rusty Chains|house 13|house thirteen/i.test(crawl.text) && crawl.heard.some(id => id === "en/angelina_crawl_1"),
    JSON.stringify(crawl)
  );
  await page.click("#chapterCrawlSkip");
  await dismissHowTo(page);
  await page.waitForFunction(() => {
    const mark = window.World3D?.angelinaMark?.();
    return mark?.present === true && mark.mesh === true && mark.named === true && mark.following === true;
  }, { timeout: 30000 });
  const guide = await page.evaluate(() => ({
    mark: window.World3D.angelinaMark(),
    line: document.querySelector("#angelinaGuide .angelina-line")?.textContent || ""
  }));
  log("angelina-3d-follows", guide.mark.following === true && guide.mark.mesh === true && guide.mark.named === true && /I'm Angelina/.test(guide.line), JSON.stringify(guide));
  await page.screenshot({ path: path.join(outDir, "02-angelina-room.png") });

  await page.waitForFunction(() => (window.__angelinaHeard || []).includes("en/angelina_idle"), undefined, { timeout: 20000 });
  const idle = await page.locator("#angelinaHint").innerText();
  log("idle-hint", /next step/i.test(idle), idle);

  const beforeMistake = await page.evaluate(() => ({ coins: window.me.coins, pieces: (window.me.roomPieces || []).length }));
  await page.click("#buy-lamp");
  const mistake = await page.evaluate(() => ({
    coins: window.me.coins,
    pieces: (window.me.roomPieces || []).length,
    heard: (window.__angelinaHeard || []).includes("en/angelina_mistake"),
    hint: document.getElementById("angelinaHint")?.textContent || ""
  }));
  log(
    "mistake-hint",
    mistake.heard && mistake.pieces === beforeMistake.pieces && mistake.coins === beforeMistake.coins && /Not that/i.test(mistake.hint),
    JSON.stringify(mistake)
  );

  const quest = await page.locator("#questBox").innerText();
  log("tutorial-visible", /mission|Step 1|шаг/i.test(quest), quest.slice(0, 120));

  await page.keyboard.down("d");
  await page.keyboard.down("w");
  try {
    await page.waitForFunction(() => window.me?.onboarding?.paid?.move === true, { timeout: 20000 });
  } finally {
    await page.keyboard.up("d");
    await page.keyboard.up("w");
  }
  log("tutorial-move", true, "moved");

  await page.evaluate(() => setLanguage("ru", true));
  await page.waitForFunction(() => (document.querySelector("#angelinaGuide b")?.textContent || "").includes("Ангелина") && (document.querySelector("#angelinaGuide .angelina-line")?.textContent || "").includes("Рейзор"));
  await page.evaluate(() => setLanguage("da", true));
  await page.waitForFunction(() => (document.querySelector("#angelinaGuide .angelina-line")?.textContent || "").includes("Razor er prøven"));
  await page.evaluate(() => setLanguage("en", true));
  await page.waitForFunction(() => (document.querySelector("#angelinaGuide .angelina-line")?.textContent || "").includes("Razor is the test"));
  log("voice-languages", true, "ru da en conflict lines");

  await go(page, "street");
  await page.waitForFunction(() => /Conflict/i.test(document.getElementById("chapterScene")?.textContent || ""));
  const conflict = await page.evaluate(() => document.getElementById("chapterScene")?.textContent || "");
  log("conflict-scene", /Conflict/i.test(conflict), conflict);
  await page.locator("#panelBottom button[onclick*=\"gangModal\"]").click();
  await page.click('#gangList .npc-row[data-npc="razor"]');
  await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 3);
  await page.locator("#gangModal .close").click().catch(() => {});

  await go(page, "cemetery");
  await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 4);
  const climax = await page.evaluate(() => document.getElementById("chapterScene")?.textContent || "");
  log("climax-scene", /Climax/i.test(climax), climax);
  await page.locator("#btnFight").click();
  const won = await attackUntil(page, () => (window.me?.onboarding?.step || 0) >= 5, 90000);
  log("climax-duel", won === true, String(won));

  await page.locator("#panelBottom button[onclick*=\"shopModal\"]").click();
  await page.click("#shopModal .tab[data-tab='materials']");
  const coinsBefore = await page.evaluate(() => window.me.coins);
  await page.click("button[onclick=\"buyItem('mat_sticker')\"]");
  await page.waitForFunction(() => (window.me.inventory?.materials?.sticker || 0) >= 1);
  const free = await page.evaluate(before => ({ coins: window.me.coins, sticker: window.me.inventory?.materials?.sticker || 0, before }), coinsBefore);
  log("shop-free", free.sticker >= 1 && free.coins === free.before + 25, JSON.stringify(free));
  await page.locator("#shopModal .close").click().catch(() => {});

  await go(page, "room");
  const coinsBeforeLamp = await page.evaluate(() => window.me.coins);
  await page.click("#buy-lamp");
  await page.waitForFunction(() => (window.me.roomPieces || []).length >= 1);
  const room = await page.evaluate(before => ({
    coins: window.me.coins,
    mesh: window.World3D.angelinaMark().roomPieces,
    type: window.me.roomPieces[0]?.type
  }), coinsBeforeLamp);
  log("room-mesh", room.mesh >= 1 && room.type === "lamp" && room.coins === coinsBeforeLamp - 15 + 20, JSON.stringify(room));
  await page.screenshot({ path: path.join(outDir, "03-room-lamp.png") });

  await go(page, "city");
  await page.waitForFunction(() => (window.World3D?.angelinaMark?.().plotPads || 0) >= 1, { timeout: 20000 });
  const coinsBeforePlot = await page.evaluate(() => window.me.coins);
  await page.click("#buyPlot-stall");
  await page.waitForFunction(() => (window.me.cityPlots || []).length >= 1 && window.me.onboarding.done === true);
  const city = await page.evaluate(before => ({
    coins: window.me.coins,
    mesh: window.World3D.angelinaMark().plots,
    pads: window.World3D.angelinaMark().plotPads,
    id: window.me.cityPlots[0]?.id
  }), coinsBeforePlot);
  log("pumpkingrad-plot", city.mesh >= 1 && city.pads >= 3 && city.id === "stall" && city.coins === coinsBeforePlot - 45 + 55, JSON.stringify(city));
  await page.screenshot({ path: path.join(outDir, "04-pumpkingrad.png") });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true && (window.me.cityPlots || []).length >= 1);
  await dismissHowTo(page);
  const saved = await page.evaluate(() => ({
    plots: window.me.cityPlots.length,
    pieces: (window.me.roomPieces || []).length,
    playId: window.me.chapter1.playId,
    crawl: document.getElementById("chapterCrawl")?.classList.contains("active") === true
  }));
  log("save-keeps-progress", saved.plots >= 1 && saved.pieces >= 1 && saved.playId === "ch1-child" && saved.crawl === false, JSON.stringify(saved));

  await go(page, "street");
  await page.locator("#panelBottom button[onclick*=\"gangModal\"]").click();
  await page.click('#gangList .npc-row[data-npc="razor"]');
  await page.waitForSelector("#storyDialog.active", { timeout: 15000 });
  for (let i = 0; i < 4; i++) {
    const choice = page.locator("#storyDialog.active [data-choice='c_duel']");
    if (await choice.count()) {
      await choice.click();
      break;
    }
    const next = page.locator("#storyDlgNext");
    if (await next.count()) await next.click();
    else break;
    await page.waitForTimeout(200);
  }
  const initiated = await attackUntil(page, () => window.me?.story?.flags?.joined_gang === true, 60000);
  await page.waitForFunction(() => (document.querySelector("#chapterFinaleLine")?.textContent || "").includes("The patch is yours"), { timeout: 15000 });
  log("finale", initiated === true, "patch line visible");
  await page.screenshot({ path: path.join(outDir, "05-finale.png") });
  for (let i = 0; i < 3; i++) await page.locator("#storyDialog.chapter-finale #storyDlgNext").click();
  await page.waitForFunction(() => document.getElementById("chapterEnding")?.classList.contains("active") === true);
  const ending = await page.locator(".chapter-ending-body").innerText();
  log("ending-card", /first mark, not a finished city/i.test(ending), ending.slice(0, 180));

  const serious = errors.filter(e => !/WebGL|GL Driver/i.test(e));
  log("no-pageerror", serious.length === 0, serious.join(" | ") || "none");

  const video = page.video();
  await context.close();
  await browser.close();
  if (video) {
    const src = await video.path();
    const dest = path.join(outDir, "09-desktop-playthrough.webm");
    fs.copyFileSync(src, dest);
    log("playthrough-video", fs.statSync(dest).size > 1000, dest);
  }
  const summary = { pass: results.every(row => row.pass), results };
  fs.writeFileSync(path.join(outDir, "ch1-results.json"), JSON.stringify(summary, null, 2));
  console.log(summary.pass ? "COLD PLAYTHROUGH PASS" : "COLD PLAYTHROUGH FAIL");
  if (!summary.pass) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
