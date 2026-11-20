#!/usr/bin/env node
/**
 * Cold first launch. No dev commands. Asserts the chapter a child can see.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { AUDIO_INIT, writeCapture, muxVideoAudio, audioMeanDb } from "./capture-page-audio.mjs";

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
    const chain = page.locator("#duel3dHud:not(.hidden) button.btn.danger");
    if (await chain.count()) await chain.click({ force: true });
    else await page.locator("#fightOverlay.active button.btn.danger").click({ force: true }).catch(() => {});
    await page.waitForTimeout(180);
  }
  return page.evaluate(pred);
}

async function walkToGuide(page, near) {
  const start = Date.now();
  while (Date.now() - start < 28000) {
    const steer = await page.evaluate(limit => {
      const g = window.World3D?.guideOffset?.();
      return g && g.dist <= limit ? { done: true, ...g } : g;
    }, near);
    if (steer?.done) return steer;
    if (!steer) {
      await page.keyboard.down("w");
      await page.waitForTimeout(250);
      await page.keyboard.up("w");
      continue;
    }
    const key = Math.abs(steer.right) > Math.abs(steer.forward)
      ? (steer.right > 0 ? "d" : "a")
      : (steer.forward > 0 ? "w" : "s");
    await page.keyboard.down(key);
    if (steer.forward > 0.4 && key !== "w") await page.keyboard.down("w");
    await page.waitForTimeout(280);
    await page.keyboard.up(key);
    await page.keyboard.up("w");
  }
  return page.evaluate(() => window.World3D?.guideOffset?.() || null);
}

async function clickLanguage(page, code) {
  const btn = page.locator(`#langSwitch button[data-lang="${code}"]`);
  const box = await btn.boundingBox();
  if (!box) throw new Error("language button missing: " + code);
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest?.("button[data-lang]")?.dataset?.lang || "";
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  if (hit !== code) throw new Error(`language button ${code} covered by ${hit}`);
  await btn.click();
}

function previewCredentials() {
  if (!process.env.PUNK_PREVIEW_USER) return undefined;
  return { username: process.env.PUNK_PREVIEW_USER, password: process.env.PUNK_PREVIEW_PASS || "" };
}

async function oldSaveRestarts(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    httpCredentials: previewCredentials()
  });
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
  await page.goto(`${base}/?solo=1&tutorial=1&v=old-save`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true && document.getElementById("chapterCrawl")?.classList.contains("active") === true, { timeout: 60000 });
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
    httpCredentials: previewCredentials()
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  await page.addInitScript({ content: AUDIO_INIT });
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  await page.goto(`${base}/?solo=1&tutorial=1&v=cold`, { waitUntil: "domcontentloaded" });
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

  await clickLanguage(page, "ru");
  await page.waitForFunction(() => (document.querySelector("#angelinaGuide b")?.textContent || "").includes("Ангелина") && (document.querySelector("#angelinaGuide .angelina-line")?.textContent || "").includes("Рейзор"));
  await clickLanguage(page, "da");
  await page.waitForFunction(() => {
    const line = document.querySelector("#angelinaGuide .angelina-line")?.textContent || "";
    const heard = window.__angelinaHeard || [];
    const nav = document.getElementById("navQuick")?.innerText || "";
    return line.includes("Razor er prøven") && heard.some(id => String(id).startsWith("da/")) && /Gade|Kirkegård|By/.test(nav) && !/\bStreet\b/.test(nav);
  });
  const navHit = await page.evaluate(() => {
    const btn = document.querySelector("#navQuick button");
    if (!btn) return "";
    const r = btn.getBoundingClientRect();
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return el?.closest?.("#navQuick button") ? "nav" : (el?.id || el?.className || "");
  });
  if (navHit !== "nav") throw new Error("location button covered: " + navHit);
  await clickLanguage(page, "en");
  await page.waitForFunction(() => (document.querySelector("#angelinaGuide .angelina-line")?.textContent || "").includes("Razor is the test"));
  log("voice-languages", true, "clicked ru da en, danish voice heard");

  await go(page, "street");
  await page.waitForFunction(() => /Conflict/i.test(document.getElementById("chapterScene")?.textContent || ""));
  const conflict = await page.evaluate(() => document.getElementById("chapterScene")?.textContent || "");
  log("conflict-scene", /Conflict/i.test(conflict), conflict);
  await page.waitForFunction(() => window.World3D?.guideOffset?.()?.arrow === true, undefined, { timeout: 8000 });
  log("razor-marker", true, "arrow visible");
  const walked = await walkToGuide(page, 6.5);
  await page.keyboard.press("e");
  await page.waitForTimeout(400);
  const talked = await page.evaluate(() => (window.me?.onboarding?.step || 0) >= 3);
  log("razor-e-talk", talked === true, JSON.stringify(walked));
  if (!talked) throw new Error("E did not talk to Razor");
  await page.locator("#gangModal.active .close").click().catch(() => {});
  await page.locator("#storyDialog.active #storyDlgNext").click().catch(() => {});

  await go(page, "cemetery");
  await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 4);
  const climax = await page.evaluate(() => document.getElementById("chapterScene")?.textContent || "");
  log("climax-scene", /Climax/i.test(climax), climax);
  await page.locator("#btnFight").click();
  await page.waitForFunction(() => {
    const hud = document.getElementById("duel3dHud");
    return hud && !hud.classList.contains("hidden") && window.World3D?.measureDuelFraming?.()?.pass === true;
  }, undefined, { timeout: 10000 });
  const trainFrame = await page.evaluate(() => window.World3D?.measureDuelFraming?.() || null);
  log("duel-both-in-frame", trainFrame?.pass === true, JSON.stringify(trainFrame));
  const won = await attackUntil(page, () => (window.me?.onboarding?.step || 0) >= 5, 90000);
  log("climax-duel", won === true, String(won));
  const afterTrain = await page.evaluate(() => ({
    joined: window.me?.story?.flags?.joined_gang === true,
    event: window.me?.story?.events?.duel_razor_win === true,
    finale: (document.querySelector("#chapterFinaleLine")?.textContent || "").length > 0,
    quest: window.me?.story?.quest?.activeId || ""
  }));
  log(
    "training-does-not-finish-initiation",
    afterTrain.joined === false && afterTrain.event === false && afterTrain.finale === false && afterTrain.quest !== "q_initiation_duel",
    JSON.stringify(afterTrain)
  );

  await page.locator("#panelBottom button[onclick*=\"shopModal\"]").click();
  await page.click("#shopModal .tab[data-tab='materials']");
  const coinsBefore = await page.evaluate(() => window.me.coins);
  await page.click("button[onclick=\"buyItem('mat_sticker')\"]");
  await page.waitForFunction(() => (window.me.inventory?.materials?.sticker || 0) >= 1);
  const free = await page.evaluate(before => ({ coins: window.me.coins, sticker: window.me.inventory?.materials?.sticker || 0, before }), coinsBefore);
  log("shop-free", free.sticker >= 1 && free.coins === free.before + 25, JSON.stringify(free));
  await page.locator("#shopModal .close").click().catch(() => {});

  await go(page, "room");
  await clickLanguage(page, "da");
  await page.waitForFunction(() => /Lampe/.test(document.querySelector("#buy-lamp")?.textContent || ""));
  await clickLanguage(page, "en");
  await page.waitForFunction(() => /Lamp/.test(document.querySelector("#buy-lamp")?.textContent || ""));
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
    crawl: document.getElementById("chapterCrawl")?.classList.contains("active") === true,
    daily: (window.me.dailyQuests || []).find(q => q.id === "win_duel")?.prog || 0
  }));
  log("save-keeps-progress", saved.plots >= 1 && saved.pieces >= 1 && saved.playId === "ch1-child" && saved.crawl === false && saved.daily >= 1, JSON.stringify(saved));

  await go(page, "street");
  const chain = await page.locator("#questBox").innerText();
  log("one-quest-chain", /Razor/i.test(chain) && !/pizza/i.test(chain), chain.slice(0, 180));
  await page.waitForFunction(() => window.World3D?.guideOffset?.()?.arrow === true, undefined, { timeout: 8000 });
  await walkToGuide(page, 6.5);
  await page.keyboard.press("e");
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
  await page.waitForFunction(() => {
    const hud = document.getElementById("duel3dHud");
    return hud && !hud.classList.contains("hidden") && window.me?.story?.flags?.joined_gang !== true;
  }, { timeout: 10000 });
  log("finale-duel-starts", true, "3d chain duel before the patch");
  await page.waitForTimeout(2200);
  const stillFighting = await page.evaluate(() => {
    const hud = document.getElementById("duel3dHud");
    return !!hud && !hud.classList.contains("hidden") && window.me?.story?.flags?.joined_gang !== true
      && !(document.querySelector("#chapterFinaleLine")?.textContent || "").includes("patch");
  });
  const finaleFrame = await page.evaluate(() => window.World3D?.measureDuelFraming?.() || null);
  log("finale-both-in-frame", finaleFrame?.pass === true, JSON.stringify(finaleFrame));
  log("finale-duel-needs-input", stillFighting === true, "still fighting after 2s with no chain press");
  if (!stillFighting) throw new Error("finale duel ended without player input");
  const fightStarted = Date.now();
  const initiated = await attackUntil(page, () => window.me?.story?.flags?.joined_gang === true, 60000);
  log("finale-duel-duration", Date.now() - fightStarted > 2000, `${Date.now() - fightStarted}ms`);
  await page.waitForFunction(() => (document.querySelector("#chapterFinaleLine")?.textContent || "").includes("The patch is yours"), { timeout: 15000 });
  log("finale", initiated === true, "patch line visible");
  await page.screenshot({ path: path.join(outDir, "05-finale.png") });
  for (let i = 0; i < 3; i++) await page.locator("#storyDialog.chapter-finale #storyDlgNext").click();
  await page.waitForFunction(() => document.getElementById("chapterEnding")?.classList.contains("active") === true);
  const ending = await page.locator(".chapter-ending-body").innerText();
  log("ending-card", /stall you built/i.test(ending) && /not a finished city/i.test(ending) && !/crypt stone/i.test(ending), ending.slice(0, 180));

  const serious = errors.filter(e => !/WebGL|GL Driver/i.test(e));
  log("no-pageerror", serious.length === 0, serious.join(" | ") || "none");

  const captured = await page.evaluate(() => window.__punkAudioStop?.() || null);
  const audioFile = path.join(outDir, "playthrough-audio.webm");
  const audioSaved = writeCapture(captured, audioFile);
  const video = page.video();
  await context.close();
  await browser.close();
  if (video) {
    const src = await video.path();
    const silent = path.join(outDir, "09-desktop-playthrough-silent.webm");
    const dest = path.join(outDir, "09-desktop-playthrough.webm");
    fs.copyFileSync(src, silent);
    const mixed = audioSaved && muxVideoAudio(silent, audioFile, dest);
    const mean = mixed ? audioMeanDb(dest) : null;
    if (!mixed) fs.copyFileSync(silent, dest);
    log("playthrough-video", fs.statSync(dest).size > 1000, dest);
    log("playthrough-audio", mixed === true && mean != null && mean > -45, `mean ${mean} dB`);
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
