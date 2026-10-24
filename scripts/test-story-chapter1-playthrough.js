#!/usr/bin/env node
/**
 * Headless playthrough tests for story chapter 1 «Прописка».
 * Run: node scripts/test-story-chapter1-playthrough.js
 * Needs: npx serve on PUNK_BASE (default http://127.0.0.1:8765)
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outLog = path.join("/workspace/qa/story-stage1", "chapter1-playthrough.log");

async function boot(page) {
  await page.goto(`${base}/?solo=1&v=ch1test`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.StoryEngine?.ensureStoryState && window.StoryEngine?.loadStoryData, {
    timeout: 120000
  });
  await page.evaluate(async () => {
    await window.StoryEngine.loadStoryData();
    window.me = window.me || {};
    Object.assign(window.me, {
      characterId: "cobalt",
      name: "Ch1Test",
      coins: 100,
      energy: 100,
      location: "street",
      onboarding: { step: 6, progress: {}, done: true },
      story: {
        chapter: 1,
        flags: {},
        rel: { gang_rust: 0, zombie: 0 },
        energy: 100,
        mood: 100,
        materials: {},
        hangoutStage: 0,
        quest: { activeId: null, step: 0, completed: {} },
        earn: null,
        calloutAt: {},
        choices: {},
        events: {},
        idleHintLevel: 0,
        authority: 0,
        gang_rank: "newbie",
        auth: { stage: 1, s1Done: false, tasks: {}, trials: {}, ch2Done: false }
      }
    });
    window.StoryEngine.ensureStoryState(window.me);
    window.StoryEngine.onOnboardingComplete?.();
  });
}

async function runPath(page, name, fn) {
  const result = await page.evaluate(async ({ name, fnBody }) => {
    const logs = [];
    try {
      const reset = () => {
        const me = window.me;
        me.coins = 100;
        me.energy = 100;
        me.location = "street";
        me.story = {
          chapter: 1,
          flags: {},
          rel: { gang_rust: 0, zombie: 0 },
          energy: 100,
          mood: 100,
          materials: {},
          hangoutStage: 0,
          quest: { activeId: null, step: 0, completed: {} },
          earn: null,
          calloutAt: {},
          choices: {},
          events: {},
          idleHintLevel: 0,
          authority: 0,
          gang_rank: "newbie",
          auth: { stage: 1, s1Done: false, tasks: {}, trials: {}, ch2Done: false }
        };
        window.StoryEngine.ensureStoryState(me);
      };
      reset();
      const fn = new Function("logs", fnBody);
      const ok = fn(logs);
      const st = window.StoryEngine.ensureStoryState(window.me);
      return {
        name,
        ok: !!ok,
        logs,
        joined: !!st.flags.joined_gang,
        completed: st.quest.completed,
        coins: window.me.coins
      };
    } catch (e) {
      return { name, ok: false, error: e.message, stack: e.stack };
    }
  }, { name, fnBody: fn.toString() });
  return result;
}

const paths = {
  pay_fee: `
    window.StoryEngine.startQuest("q_initiation_pay");
    if (window.me.story.quest.activeId !== "q_initiation_pay") return false;
    window.me.coins = 50;
    window.StoryEngine.beginEarnCoins(100, { returnBeacon: "npc_tony", returnLabel: "Razor" });
    const eg = window.me.story.earn;
    if (!eg || eg.jobId !== "pizza_delivery") { logs.push("earn job not pizza"); return false; }
    window.me.location = "city";
    while (window.me.coins < 150 && window.me.energy >= 10) {
      window.PlayV21.startPizzaJob(window.me, { toast: () => {}, save: () => {} });
    }
    if (window.me.coins < 150) { logs.push("coins after job"); return false; }
    if (window.me.story.quest.step !== 1) { logs.push("step not advanced to pay"); return false; }
    window.me.location = "street";
    window.StoryEngine.tryStoryNpc("razor");
    if (!window.me.story.flags.joined_gang) { logs.push("not joined after pay"); return false; }
    if (!window.me.story.quest.completed.q_initiation_pay) { logs.push("quest not completed"); return false; }
    return true;
  `,
  duel: `
    window.StoryEngine.startQuest("q_initiation_duel");
    window.StoryEngine.fireStoryEvent("duel_razor_win");
    if (!window.me.story.flags.joined_gang) return false;
    if (!window.me.story.quest.completed.q_initiation_duel) return false;
    return true;
  `,
  graffiti: `
    window.StoryEngine.startQuest("q_initiation_graffiti");
    window.me.location = "street";
    for (let i = 0; i < 8; i++) {
      window.PlayV21.startStoryJob(window.me, "flyer_post", { toast: () => {}, save: () => {} });
    }
    if ((window.me.story.events.flyers_count || 0) < 8) { logs.push("flyers count"); return false; }
    if (!window.me.story.quest.completed.q_initiation_graffiti) { logs.push("graffiti quest"); return false; }
    if (!window.me.story.flags.joined_gang) return false;
    return true;
  `,
  firebase_completed: `
    window.me.story.quest = { activeId: null, step: 0 };
    window.StoryEngine.ensureStoryState(window.me);
    if (!window.me.story.quest.completed || typeof window.me.story.quest.completed !== "object") return false;
    window.StoryEngine.onOnboardingComplete();
    const saved = window.StoryEngine.storyQuestCompletedForSave({});
    if (!saved.__) return false;
    return true;
  `
};

async function main() {
  fs.mkdirSync(path.dirname(outLog), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const lines = [];
  page.on("console", msg => lines.push(`[console] ${msg.text()}`));
  page.on("pageerror", err => lines.push(`[pageerror] ${err.message}`));

  await boot(page);

  const results = [];
  for (const [key, body] of Object.entries(paths)) {
    const r = await runPath(page, key, body);
    results.push(r);
    lines.push(`[${key}] ${JSON.stringify(r)}`);
    console.log(key, r.ok ? "PASS" : "FAIL", r.error || "");
  }

  fs.writeFileSync(outLog, lines.join("\n") + "\n");
  await browser.close();

  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.error("Chapter 1 playthrough FAILED:", failed.map(f => f.name).join(", "));
    console.error("Log:", outLog);
    process.exit(1);
  }
  console.log("Chapter 1 playthrough: all PASS (" + results.length + " cases)");
  console.log("Log:", outLog);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
