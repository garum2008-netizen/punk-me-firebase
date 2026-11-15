#!/usr/bin/env node
/**
 * Chapter 1 journey against the local static server.
 * Character select, movement, tutorial, shop inventory, duel initiation, reload, mobile joystick.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const outDir = process.env.CH1_OUT || "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });

let activePage = null;
const results = [];
function log(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(pass ? "PASS" : "FAIL", id, detail);
}

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function dismissHowTo(page) {
  const howto = page.locator("#howToOverlay.active .howto-close");
  try {
    await howto.waitFor({ state: "visible", timeout: 2500 });
    await howto.click({ force: true });
    await page.waitForFunction(() => !document.getElementById("howToOverlay")?.classList.contains("active"));
  } catch (_) {}
}

async function boot(page) {
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  await page.goto(`${base}/?solo=1&v=ch1-journey`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => {
    const picks = document.querySelectorAll("#charSelectUi .char-pick").length;
    return picks >= 1 || !!window.me?.characterId;
  });
  if (await page.locator("#charSelectUi .char-pick").count()) {
    await page.click('.char-pick[data-id="cobalt"]');
    await page.click('[data-avatar-hairstyle="mohawk"]');
    await page.click('[data-avatar-skin="tan"]');
    await page.click("#avatarCyberBlue");
    await shot(page, "ch1-avatar-creator.png");
    await page.click("#charSelectConfirm");
  }
  await page.waitForFunction(() => window.__playerLoaded === true && window.me?.characterId === "cobalt");
  await page.waitForFunction(() => {
    const mark = window.World3D?.playerAvatarMark?.();
    return mark?.attached === true && mark.wings === true && mark.skinMesh === true
      && mark.hair === "cyan" && mark.hairStyle === "spikes" && mark.skin === "cyber"
      && mark.jacket === "cyber" && mark.accessory === "wings";
  }, { timeout: 20000 });
  const skip = page.locator("#chapterCrawlSkip");
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await dismissHowTo(page);
  return errors;
}

async function walkUntilMoved(page) {
  await page.locator("#stage3d").click({ position: { x: 200, y: 180 }, force: true }).catch(() => {});
  await page.keyboard.down("d");
  await page.keyboard.down("w");
  try {
    await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 1 && window.me.onboarding.paid?.move === true, { timeout: 20000 });
  } finally {
    await page.keyboard.up("d");
    await page.keyboard.up("w");
  }
}

async function go(page, loc) {
  await dismissHowTo(page);
  await page.locator(`#navQuick button[onclick*="goLocation('${loc}')"]`).click();
  await page.waitForFunction(id => window.me?.location === id, loc, { timeout: 20000 });
}

async function talkRazor(page) {
  await page.locator("#panelBottom button[onclick*=\"gangModal\"]").click();
  await page.waitForSelector('#gangList .npc-row[data-npc="razor"]', { timeout: 15000 });
  await page.click('#gangList .npc-row[data-npc="razor"]');
}

async function attackUntil(page, pred, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await page.evaluate(pred)) return true;
    await page.evaluate(() => {
      if (typeof window.duel3dAttack === "function") window.duel3dAttack();
      const overlay = document.querySelector("#fightOverlay.active button.btn.danger");
      overlay?.click();
    });
    await page.waitForTimeout(200);
  }
  return page.evaluate(pred);
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 800 } },
    httpCredentials: process.env.PUNK_PREVIEW_USER
      ? { username: process.env.PUNK_PREVIEW_USER, password: process.env.PUNK_PREVIEW_PASS || "" }
      : undefined
  });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  const errors = await boot(page);
  const created = await page.evaluate(() => ({
    id: window.me.characterId,
    look: window.me.avatarLook,
    mark: window.World3D.playerAvatarMark()
  }));
  log(
    "avatar-create",
    created.id === "cobalt" && created.look?.accessory === "wings" && created.look?.skin === "cyber" && created.look?.jacket === "cyber" && created.mark?.wings === true,
    JSON.stringify(created)
  );
  log("not-owner", await page.evaluate(() => window.isOwner === false), "anonymous is not owner");

  const questVisible = await page.evaluate(() => {
    const box = document.getElementById("questBox");
    if (!box) return false;
    const style = getComputedStyle(box);
    return style.display !== "none" && box.textContent.trim().length > 0;
  });
  log("quest-visible", questVisible, await page.locator("#questBox").innerText().catch(() => ""));

  await page.evaluate(() => setLanguage("ru", true));
  await page.waitForFunction(() => (document.getElementById("angelinaGuide")?.textContent || "").includes("Я Ангелина"));
  await page.evaluate(() => setLanguage("da", true));
  await page.waitForFunction(() => (document.getElementById("angelinaGuide")?.textContent || "").includes("Jeg er Angelina"));
  await page.evaluate(() => setLanguage("en", true));
  await page.waitForFunction(() => (document.getElementById("angelinaGuide")?.textContent || "").includes("I'm Angelina"));
  log("angelina-languages", true, "ru da en beginning");

  await page.click("button[onclick=\"openModal('shopModal')\"]");
  await page.click("#shopModal .tab[data-tab='materials']");
  const coinsBeforeFree = await page.evaluate(() => window.me.coins);
  await page.click("button[onclick=\"buyItem('mat_sticker')\"]");
  await page.waitForFunction(() => (window.me.inventory?.materials?.sticker || 0) >= 1);
  const freeShop = await page.evaluate(() => ({
    coins: window.me.coins,
    sticker: window.me.inventory?.materials?.sticker || 0,
    card: !!document.querySelector("iframe[src*='stripe'], [data-stripe], #checkout")
  }));
  log("shop-free", freeShop.sticker >= 1 && freeShop.coins === coinsBeforeFree && freeShop.card === false, JSON.stringify(freeShop));
  await page.locator("#shopModal .close").click();

  await walkUntilMoved(page);
  const afterMove = await page.evaluate(() => ({
    step: window.me.onboarding.step,
    coins: window.me.coins,
    paid: window.me.onboarding.paid?.move
  }));
  log("move-reward-once", afterMove.step >= 1 && afterMove.coins === 120 && afterMove.paid === true, JSON.stringify(afterMove));
  await shot(page, "ch1-room.png");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true && window.me?.characterId === "cobalt");
  await dismissHowTo(page);
  await page.waitForFunction(() => window.World3D?.playerAvatarMark?.()?.attached === true, { timeout: 20000 });
  const reloaded = await page.evaluate(() => ({
    step: window.me.onboarding?.step,
    coins: window.me.coins,
    paid: window.me.onboarding?.paid?.move,
    characterId: window.me.characterId,
    look: window.me.avatarLook,
    mark: window.World3D.playerAvatarMark()
  }));
  log(
    "save-reload-move",
    reloaded.characterId === "cobalt" && reloaded.step >= 1 && reloaded.coins === 120 && reloaded.paid === true && reloaded.look?.accessory === "wings" && reloaded.mark?.wings === true,
    JSON.stringify(reloaded)
  );
  await shot(page, "ch1-after-reload.png");

  await go(page, "street");
  await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 2, { timeout: 15000 });
  const conflict = await page.locator("#angelinaGuide").innerText();
  log("angelina-conflict", /Razor is the test/i.test(conflict), conflict);

  await talkRazor(page);
  await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 3, { timeout: 15000 });
  await page.locator("#gangModal .close").click().catch(() => {});
  log("tutorial-talk", true, "talked to razor");

  await go(page, "cemetery");
  await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 4, { timeout: 15000 });
  const climax = await page.locator("#angelinaGuide").innerText();
  log("angelina-climax", /chain duel/i.test(climax), climax);

  const coinsBeforeFight = await page.evaluate(() => window.me.coins);
  await page.locator("#btnFight").click();
  const wonTutorial = await attackUntil(page, () => (window.me?.onboarding?.step || 0) >= 5, 90000);
  const coinsAfterFight = await page.evaluate(() => window.me.coins);
  log("tutorial-duel", wonTutorial && coinsAfterFight > coinsBeforeFight, `coins ${coinsBeforeFight} -> ${coinsAfterFight}`);
  await shot(page, "ch1-duel.png");

  await page.locator("#panelBottom button[onclick*=\"shopModal\"]").click();
  await page.click('.tab[data-tab="materials"]');
  const beforeBuy = await page.evaluate(() => ({
    coins: window.me.coins,
    shack: window.me.inventory?.materials?.shack || 0
  }));
  const shopLine = await page.locator("#angelinaGuide").innerText();
  log("angelina-shop", /coins, not a card/i.test(shopLine), shopLine);
  await page.click("button[onclick=\"buyItem('mat_brick')\"]");
  await page.waitForFunction(prev => (window.me.inventory?.materials?.shack || 0) > prev, beforeBuy.shack, { timeout: 10000 });
  const afterBuy = await page.evaluate(() => ({
    coins: window.me.coins,
    shack: window.me.inventory.materials.shack,
    step: window.me.onboarding.step,
    done: window.me.onboarding.done
  }));
  log(
    "shop-inventory",
    afterBuy.shack === beforeBuy.shack + 1 && afterBuy.coins === beforeBuy.coins - 45 + 25 && afterBuy.step === 6 && afterBuy.done === false,
    JSON.stringify({ beforeBuy, afterBuy })
  );
  await page.locator("#shopModal .close").click().catch(() => {});

  await go(page, "city");
  await page.waitForFunction(() => window.World3D?.isReady?.() === true, { timeout: 40000 });
  const crypt = await page.evaluate(() => window.me.inventory?.materials?.crypt || 0);
  if (crypt < 1) await page.evaluate(() => window.Chapter1.ensureCityKit(window.me));
  const cityLine = await page.locator("#angelinaGuide").innerText();
  log("angelina-city", /not a finished city/i.test(cityLine), cityLine);
  await page.click("#btnBuild");
  const cityCanvas = await page.locator("#stage3d").boundingBox();
  await page.mouse.click(cityCanvas.x + cityCanvas.width * 0.5, cityCanvas.y + cityCanvas.height * 0.55);
  await page.waitForFunction(() => window.me?.onboarding?.done === true && (window.me.cityStones || []).length >= 1, { timeout: 10000 });
  const city = await page.evaluate(() => ({
    stones: (window.me.cityStones || []).length,
    built: window.me.built,
    done: window.me.onboarding.done
  }));
  log("city-build", city.stones >= 1 && city.built >= 1 && city.done === true, JSON.stringify(city));
  const beforeJoin = await page.evaluate(() => ({
    ended: window.me?.chapter1?.ended === true,
    joined: !!window.me?.story?.flags?.joined_gang
  }));
  log("ending-waits-for-initiation", beforeJoin.ended === false && beforeJoin.joined === false, JSON.stringify(beforeJoin));

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true);
  await dismissHowTo(page);
  const persisted = await page.evaluate(() => ({
    done: window.me.onboarding?.done,
    shack: window.me.inventory?.materials?.shack || 0,
    coins: window.me.coins,
    characterId: window.me.characterId,
    stones: (window.me.cityStones || []).length
  }));
  log(
    "save-reload-progress",
    persisted.done === true && persisted.shack >= 1 && persisted.characterId === "cobalt" && persisted.coins === afterBuy.coins + 55 && persisted.stones >= 1,
    JSON.stringify(persisted)
  );

  await go(page, "street");
  await talkRazor(page);
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
  const initiated = await attackUntil(
    page,
    () => window.me?.story?.flags?.joined_gang === true || window.me?.story?.quest?.completed?.q_initiation_duel === true,
    60000
  );
  const joinState = await page.evaluate(() => ({
    joined: !!window.me?.story?.flags?.joined_gang,
    quest: window.me?.story?.quest?.activeId || null,
    completed: !!window.me?.story?.quest?.completed?.q_initiation_duel,
    chapter: window.me?.story?.chapter,
    authority: window.me?.story?.authority || 0,
    rank: window.me?.story?.gang_rank || null,
    priorDuel: !!window.me?.story?.events?.duel_razor_win
  }));
  log("initiation", initiated && joinState.joined === true && joinState.authority >= 100 && joinState.rank === "gang_member", JSON.stringify(joinState));
  await dismissHowTo(page);
  await page.waitForFunction(() => {
    const line = document.querySelector("#chapterFinaleLine")?.textContent || "";
    const gate = document.getElementById("chapterEnding")?.classList.contains("active") === true;
    return line.includes("The patch is yours") && gate === false && window.me?.chapter1?.ended !== true;
  }, { timeout: 15000 });
  const finale = await page.evaluate(() => ({
    line: document.querySelector("#chapterFinaleLine")?.textContent || "",
    ended: window.me?.chapter1?.ended === true,
    gate: document.getElementById("chapterEnding")?.classList.contains("active") === true,
    chapter: window.me?.story?.chapter
  }));
  log(
    "finale-scene",
    /patch is yours/i.test(finale.line) && finale.ended === false && finale.gate === false && finale.chapter === 1,
    JSON.stringify(finale)
  );
  await shot(page, "ch1-finale.png");
  for (let i = 0; i < 3; i++) {
    await page.locator("#storyDialog.chapter-finale #storyDlgNext").click();
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => document.getElementById("chapterEnding")?.classList.contains("active") === true, { timeout: 10000 });
  const ending = await page.evaluate(() => ({
    ended: window.me?.chapter1?.ended === true,
    overlay: document.getElementById("chapterEnding")?.classList.contains("active") === true
  }));
  const endingCopy = await page.evaluate(() => ({
    title: document.querySelector("#chapterEnding .chapter-ending-title")?.textContent || "",
    body: document.querySelector("#chapterEnding .chapter-ending-body")?.textContent || "",
    chapter: window.me?.story?.chapter,
    hangout: window.me?.story?.quest?.activeId || null,
    paid: window.me?.onboarding?.paid || {}
  }));
  const cityHonest = /first mark, not a finished city/i.test(endingCopy.body)
    && !/four stages|hangout|четыре этапа|fire etaper/i.test(endingCopy.body);
  log(
    "chapter-ending",
    ending.ended && ending.overlay && endingCopy.chapter === 1 && endingCopy.hangout !== "q_hangout_build" && cityHonest,
    JSON.stringify({ ending, endingCopy })
  );
  await shot(page, "ch1-initiation.png");

  await page.goto("about:blank");
  await page.goto(`${base}/?solo=1&v=ch1-reentry`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true && window.me?.characterId === "cobalt");
  await page.waitForFunction(() => window.World3D?.playerAvatarMark?.()?.wings === true, undefined, { timeout: 30000 });
  await dismissHowTo(page);
  const joinPersist = await page.evaluate(() => ({
    joined: !!window.me?.story?.flags?.joined_gang,
    chapter: window.me?.story?.chapter,
    characterId: window.me.characterId,
    ended: window.me?.chapter1?.ended === true,
    stones: (window.me?.cityStones || []).length
  }));
  const objectives = await page.evaluate(() => {
    const paid = window.me?.onboarding?.paid || {};
    const ids = ["move", "go_street", "talk_razor", "visit_cemetery", "win_fight", "shop_buy", "city_build"];
    return {
      training: ids.filter(id => paid[id] === true),
      joined: !!window.me?.story?.flags?.joined_gang,
      ended: window.me?.chapter1?.ended === true,
      finaleSeen: window.me?.chapter1?.finaleSeen === true,
      cityStones: (window.me?.cityStones || []).length,
      chapter: window.me?.story?.chapter,
      look: window.me?.avatarLook || null,
      mark: window.World3D?.playerAvatarMark?.() || null
    };
  });
  fs.writeFileSync(path.join(outDir, "ch1-objectives.json"), JSON.stringify(objectives, null, 2));
  log(
    "initiation-persists",
    joinPersist.joined === true && joinPersist.characterId === "cobalt" && joinPersist.ended === true && joinPersist.stones >= 1 && objectives.training.length === 7 && objectives.finaleSeen === true && objectives.look?.accessory === "wings" && objectives.mark?.wings === true,
    JSON.stringify({ joinPersist, objectives })
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true);
  await dismissHowTo(page);
  const mobile = await page.evaluate(() => {
    const joy = document.getElementById("touchJoystick");
    const shown = joy && getComputedStyle(joy).display !== "none" && getComputedStyle(document.getElementById("touchControls")).display !== "none";
    return {
      shown,
      characterId: window.me?.characterId,
      joined: !!window.me?.story?.flags?.joined_gang
    };
  });
  const box = await page.locator("#touchJoystick").boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2);
    await page.mouse.up();
  }
  log("mobile-controls", mobile.shown === true && mobile.characterId === "cobalt" && mobile.joined === true, JSON.stringify(mobile));
  await shot(page, "ch1-mobile.png");

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
  const summary = { pass: results.every(r => r.pass), results };
  fs.writeFileSync(path.join(outDir, "ch1-results.json"), JSON.stringify(summary, null, 2));
  console.log(summary.pass ? "CHAPTER 1 JOURNEY PASS" : "CHAPTER 1 JOURNEY FAIL");
  if (!summary.pass) process.exit(1);
}

main().catch(async err => {
  console.error(err);
  if (activePage) {
    await activePage.screenshot({ path: path.join(outDir, "ch1-failure.png") }).catch(() => {});
    const state = await activePage.evaluate(() => ({
      loading: document.getElementById("loadingStatus")?.textContent,
      loaded: window.__playerLoaded,
      characterId: window.me?.characterId,
      step: window.me?.onboarding?.step,
      done: window.me?.onboarding?.done,
      loc: window.me?.location,
      coins: window.me?.coins,
      quest: document.getElementById("questBox")?.innerText,
      dialog: document.getElementById("storyDialog")?.className
    })).catch(() => null);
    console.error("STATE", JSON.stringify(state));
  }
  process.exit(1);
});
