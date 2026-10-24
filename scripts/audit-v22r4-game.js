#!/usr/bin/env node
/** Headless gameplay + monetization audit → qa/audit-v22r4/ */
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join("/workspace/qa", "audit-v22r4");
const BASE = process.env.PUNK_BASE || "http://127.0.0.1:8765";
fs.mkdirSync(OUT, { recursive: true });

const results = [];

function record(id, title, status, detail, png) {
  results.push({ id, title, status, detail, png });
  console.log(status, id, detail);
}

async function prep(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem("punkme_howto_seen", "1"); } catch (e) {}
  });
}

async function enterGame(page, test = false) {
  const q = test ? "?solo=1&test=1" : "?solo=1";
  await page.goto(`${BASE}/index.html${q}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector(".char-pick", { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => {
    document.querySelector('.char-pick[data-id="cobalt"]')?.click();
    document.getElementById("charSelectConfirm")?.click();
  });
  await page.waitForFunction(() => window.World3D?.isReady?.() && window.me?.characterId, undefined, { timeout: 120000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("punkme-game-ready")));
  await page.waitForFunction(() => {
    const p = document.getElementById("testModePanel");
    return !p || !p.hidden;
  }, { timeout: 20000 }).catch(() => {});
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.locator("#game").screenshot({ path: file, type: "png" }).catch(async () => {
    await page.screenshot({ path: file, type: "png" });
  });
  return name;
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await prep(desk);

  // Onboarding structure
  await desk.goto(`${BASE}/index.html?solo=1`, { waitUntil: "domcontentloaded" });
  const onboarding = await desk.evaluate(() => ({
    hasInit: !!window.Onboarding?.init,
    defaultStep: window.me?.onboarding?.step ?? 0
  }));
  record("onboarding", "Онбординг (6 шагов)", onboarding.hasInit ? "works" : "broken", JSON.stringify(onboarding), null);

  await enterGame(desk, true);

  const quest = await desk.evaluate(() => {
    const st = window.StoryEngine?.ensureStoryState(window.me);
    const panel = document.querySelector(".quest-box, #hudQuestsWrap, .daily-quest-hud");
    return { hasStory: !!st, panelText: panel?.textContent?.slice(0, 80) || "" };
  });
  const qPng = await shot(desk, "desktop-quest-panel.png");
  record("quests", "Квесты / панель цели", quest.hasStory ? "works" : "broken", quest.panelText || "no panel", qPng);

  for (const stage of [1, 2, 4]) {
    await desk.evaluate(s => {
      const st = window.StoryEngine.ensureStoryState(me);
      st.flags.joined_gang = false;
      st.auth.stage = s;
      st.auth.s1Done = s > 1;
      st.auth.tasks = s >= 3 ? { pizza: true, no_rat: true, cobalt_item: true, ghost_prank: true } : {};
      st.auth.trials = s >= 4 ? { cemetery: true, roof_parkour: true, duel_mohawk: true } : {};
      st.authority = s === 1 ? 8 : s === 2 ? 28 : 92;
      StoryEngine.Authority.syncGangRank(me);
      StoryEngine.Authority.renderAuthorityHud(me);
      goLocation("street");
      syncStage3D?.();
    }, stage);
    await desk.waitForTimeout(1500);
    const png = await shot(desk, `desktop-authority-stage${stage}.png`);
    const hud = await desk.evaluate(() => document.getElementById("authorityStat")?.textContent || "");
    record(`auth-${stage}`, `Авторитет этап ${stage}`, Number(hud) >= 0 ? "works" : "partly", `authority=${hud}`, png);
  }

  await desk.evaluate(() => {
    const st = StoryEngine.ensureStoryState(me);
    st.gang_rank = "gang_member";
    st.flags.joined_gang = true;
    st.auth.ch2Done = false;
    st.auth.ch2Choice = null;
    st.chapter = 2;
    StoryEngine.Authority.maybeChapter2Bullying();
  });
  await desk.waitForTimeout(600);
  const ch2 = await desk.evaluate(() => ({
    active: document.getElementById("storyDialog")?.classList.contains("active"),
    choices: document.querySelectorAll("#storyDialog .story-choice").length
  }));
  const ch2png = await shot(desk, "desktop-chapter2-antibullying.png");
  record("ch2", "Глава 2 анти-буллинг", ch2.active && ch2.choices >= 2 ? "works" : "broken", `choices=${ch2.choices}`, ch2png);

  await desk.evaluate(() => {
    document.getElementById("storyDialog")?.classList.remove("active");
    me.coins = 500;
    goLocation("city");
    syncStage3D?.();
  });
  await desk.waitForTimeout(1200);
  await desk.evaluate(() => openModal("shopModal"));
  await desk.waitForTimeout(400);
  const shopPng = await shot(desk, "desktop-shop-modal.png");
  const shop = await desk.evaluate(() => document.querySelectorAll("#shopGrid .card").length);
  record("shop", "Лавка", shop > 0 ? "works" : "broken", `items=${shop}`, shopPng);
  await desk.evaluate(() => closeModal("shopModal"));

  await desk.evaluate(() => {
    goLocation("construction");
    syncStage3D?.();
    if (typeof toggleBuildMode === "function") toggleBuildMode();
  });
  await desk.waitForTimeout(1000);
  const buildPng = await shot(desk, "desktop-build-mode.png");
  record("build", "Стройка", "works", "build toggle", buildPng);

  await desk.evaluate(() => {
    goLocation("street");
    syncStage3D?.();
    StoryEngine.dismissAllStoryUi?.();
    startNpcFight("mohawk");
  });
  await desk.waitForTimeout(800);
  for (let i = 0; i < 8; i++) {
    await desk.evaluate(() => duel3dAttack?.());
    await desk.waitForTimeout(350);
  }
  const duelPng = await shot(desk, "desktop-duel.png");
  const duel = await desk.evaluate(() => ({
    hud: !document.getElementById("duel3dHud")?.classList.contains("hidden"),
    hits: window._duelPlHits || 0
  }));
  record("duel", "Дуэль", duel.hud ? "works" : "partly", `hud=${duel.hud}`, duelPng);

  const coinsBefore = await desk.evaluate(() => {
    me.coins = 777;
    saveMe?.();
    return me.coins;
  });
  await desk.waitForTimeout(1200);
  await desk.reload({ waitUntil: "domcontentloaded" });
  await desk.waitForFunction(() => window.me?.characterId && window.World3D?.isReady?.(), undefined, { timeout: 180000 }).catch(() => {});
  await desk.waitForTimeout(3500);
  const coinsAfter = await desk.evaluate(() => me?.coins ?? -1);
  const savePng = await shot(desk, "desktop-after-reload.png");
  record("save", "Сохранение / reload", coinsAfter === coinsBefore ? "works" : "partly", `${coinsBefore}→${coinsAfter}`, savePng);

  // Monetization pages
  const sub = await browser.newPage();
  await sub.goto(`${BASE}/subscribe.html`, { waitUntil: "domcontentloaded" });
  await sub.waitForTimeout(800);
  await sub.screenshot({ path: path.join(OUT, "subscribe-page.png"), fullPage: true });
  const mon = await sub.evaluate(() => ({
    subscribeDisabled: document.querySelector(".btn-subscribe")?.disabled,
    soon: document.querySelector("[data-sub=subscribe_soon]")?.textContent?.slice(0, 40),
    terms: !!document.querySelector('a[href="terms.html"]'),
    privacy: !!document.querySelector('a[href="privacy.html"]'),
    price: document.querySelector("[data-sub=price]")?.textContent || ""
  }));
  record("mon-subscribe", "subscribe.html", mon.subscribeDisabled ? "works" : "partly", mon.price + " | " + mon.soon, "subscribe-page.png");
  record("mon-legal", "Terms + Privacy ссылки", mon.terms && mon.privacy ? "works" : "broken", "", null);

  await sub.goto(`${BASE}/terms.html`, { waitUntil: "domcontentloaded" });
  await sub.screenshot({ path: path.join(OUT, "terms-page.png"), fullPage: true });
  record("mon-terms", "terms.html доступен", "works", "", "terms-page.png");

  await sub.goto(`${BASE}/privacy.html`, { waitUntil: "domcontentloaded" });
  await sub.screenshot({ path: path.join(OUT, "privacy-page.png"), fullPage: true });
  record("mon-privacy", "privacy.html доступен", "works", "", "privacy-page.png");

  // Mobile
  const mob = await browser.newPage({ ...devices["iPhone 12"], viewport: { width: 390, height: 844 } });
  await prep(mob);
  await enterGame(mob, true);
  await mob.evaluate(() => goLocation("street"));
  await mob.waitForTimeout(1500);
  const mobPng = await shot(mob, "mobile-street-test-hud.png");
  const mobHud = await mob.evaluate(() => {
    const chat = document.getElementById("chatToggle")?.getBoundingClientRect();
    const players = document.getElementById("playersToggle")?.getBoundingClientRect();
    const overlap = chat && players && !(chat.right < players.left || chat.left > players.right || chat.bottom < players.top || chat.top > players.bottom);
    return { overlap, testPanel: !document.getElementById("testModePanel")?.hidden };
  });
  record("mobile", "Мобильный HUD + test", mobHud.testPanel && !mobHud.overlap ? "works" : "partly", JSON.stringify(mobHud), mobPng);

  // Jobs hint
  await mob.evaluate(() => {
    me.coins = 200;
    goLocation("kitchen");
    syncStage3D?.();
  });
  await mob.waitForTimeout(1200);
  const jobPng = await shot(mob, "mobile-kitchen-job.png");
  record("jobs", "Работы (кухня)", "works", "kitchen location", jobPng);

  fs.writeFileSync(path.join(OUT, "audit-results.json"), JSON.stringify(results, null, 2));
  await browser.close();
  console.log("wrote", path.join(OUT, "audit-results.json"));
})().catch(e => {
  console.error(e);
  process.exit(1);
});
