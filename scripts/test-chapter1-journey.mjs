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
    await page.click("#charSelectConfirm");
  }
  await page.waitForFunction(() => window.__playerLoaded === true && window.me?.characterId === "cobalt");
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
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  activePage = page;
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  const errors = await boot(page);
  log("character-select", (await page.evaluate(() => window.me.characterId)) === "cobalt", "cobalt");
  log("not-owner", await page.evaluate(() => window.isOwner === false), "anonymous is not owner");

  const questVisible = await page.evaluate(() => {
    const box = document.getElementById("questBox");
    if (!box) return false;
    const style = getComputedStyle(box);
    return style.display !== "none" && box.textContent.trim().length > 0;
  });
  log("quest-visible", questVisible, await page.locator("#questBox").innerText().catch(() => ""));

  await page.waitForFunction(() => {
    const line = document.getElementById("angelinaLine")?.textContent || "";
    const quest = document.getElementById("questBox")?.innerText || "";
    const guide = window.World3D?.getGuideCompanion?.();
    return line.length > 40 && /PUNK ME ANGEL|дом 13|House 13|hus 13/i.test(line + " " + quest)
      && /WASD|джойстик|joystick/i.test(quest)
      && !!document.getElementById("btnWhere")
      && !!guide?.visible;
  }, { timeout: 25000 });
  const opening = await page.evaluate(() => ({
    line: document.getElementById("angelinaLine")?.textContent || "",
    hello: document.getElementById("angelinaLayer")?.dataset.hello || "",
    quest: document.getElementById("questBox")?.innerText || "",
    hero: window.me.characterId,
    guide: window.World3D?.getGuideCompanion?.() || null
  }));
  log(
    "opening-answers",
    opening.hero === "cobalt" && opening.guide?.id === "angelina"
      && (opening.line.includes("PUNK ME ANGEL") || opening.hello === "1"),
    opening.line.slice(0, 180)
  );
  await page.click("#btnJournal");
  const journal = await page.locator("#visionJournalBody").innerText();
  log("journal-build", /Декор|Decor|Dekor/.test(journal) && /склеп|crypt|krypt/i.test(journal), journal.slice(0, 180));
  await page.click("#visionJournalClose");
  await shot(page, "ch1-opening.png");

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
  const reloaded = await page.evaluate(() => ({
    step: window.me.onboarding?.step,
    coins: window.me.coins,
    paid: window.me.onboarding?.paid?.move,
    characterId: window.me.characterId
  }));
  log("save-reload-move", reloaded.characterId === "cobalt" && reloaded.step >= 1 && reloaded.coins === 120 && reloaded.paid === true, JSON.stringify(reloaded));
  await shot(page, "ch1-after-reload.png");

  await go(page, "street");
  await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 2, { timeout: 15000 });
  log("tutorial-street", true, "step " + await page.evaluate(() => window.me.onboarding.step));

  await talkRazor(page);
  await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 3, { timeout: 15000 });
  await page.locator("#gangModal .close").click().catch(() => {});
  log("tutorial-talk", true, "talked to razor");

  await go(page, "cemetery");
  await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 4, { timeout: 15000 });
  log("tutorial-cemetery", true, "cemetery");

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
    afterBuy.shack === beforeBuy.shack + 1 && afterBuy.coins === beforeBuy.coins - 45 + 25 && afterBuy.done === true,
    JSON.stringify({ beforeBuy, afterBuy })
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true);
  await dismissHowTo(page);
  const persisted = await page.evaluate(() => ({
    done: window.me.onboarding?.done,
    shack: window.me.inventory?.materials?.shack || 0,
    coins: window.me.coins,
    characterId: window.me.characterId
  }));
  log(
    "save-reload-progress",
    persisted.done === true && persisted.shack >= 1 && persisted.characterId === "cobalt" && persisted.coins === afterBuy.coins,
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
  await shot(page, "ch1-initiation.png");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true);
  await dismissHowTo(page);
  const joinPersist = await page.evaluate(() => ({
    joined: !!window.me?.story?.flags?.joined_gang,
    chapter: window.me?.story?.chapter,
    characterId: window.me.characterId
  }));
  log("initiation-persists", joinPersist.joined === true && joinPersist.characterId === "cobalt", JSON.stringify(joinPersist));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true);
  await dismissHowTo(page);
  const mobile = await page.evaluate(() => {
    const joy = document.getElementById("touchJoystick");
    const bubble = document.getElementById("angelinaBubble");
    const shown = joy && getComputedStyle(joy).display !== "none" && getComputedStyle(document.getElementById("touchControls")).display !== "none";
    let covers = false;
    if (joy && bubble && !bubble.hidden) {
      const a = joy.getBoundingClientRect();
      const b = bubble.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      covers = overlap > a.width * a.height * 0.15;
    }
    return {
      shown,
      covers,
      characterId: window.me?.characterId,
      joined: !!window.me?.story?.flags?.joined_gang,
      guide: !!window.World3D?.getGuideCompanion?.()?.visible
    };
  });
  const box = await page.locator("#touchJoystick").boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2);
    await page.mouse.up();
  }
  log("mobile-controls", mobile.shown === true && mobile.covers !== true && mobile.characterId === "cobalt" && mobile.joined === true && mobile.guide === true, JSON.stringify(mobile));
  await shot(page, "ch1-mobile.png");

  const serious = errors.filter(e => !/WebGL|GL Driver/i.test(e));
  log("no-pageerror", serious.length === 0, serious.join(" | ") || "none");

  await browser.close();
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
