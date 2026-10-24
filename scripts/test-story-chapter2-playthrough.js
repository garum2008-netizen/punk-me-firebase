#!/usr/bin/env node
/** Chapter 2 hangout build playthrough (headless). */
const { chromium } = require("playwright");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${base}/?solo=1&v=ch2test`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.StoryEngine?.loadStoryData, { timeout: 120000 });

  const result = await page.evaluate(async () => {
    await window.StoryEngine.loadStoryData();
    window.me = {
      characterId: "cobalt",
      name: "Ch2Test",
      coins: 5000,
      energy: 100,
      location: "construction",
      onboarding: { done: true },
      story: {
        chapter: 2,
        flags: { joined_gang: true },
        materials: { brick: 20, nails: 10, board: 30, chain: 5, spray: 10, neon_tube: 5 },
        hangoutStage: 0,
        quest: { activeId: "q_hangout_build", step: 0, completed: {} },
        events: {},
        rel: {},
        energy: 100,
        mood: 100,
        auth: { stage: 5, s1Done: true, tasks: {}, trials: {}, ch2Done: true }
      }
    };
    window.StoryEngine.ensureStoryState(window.me);
    for (let i = 0; i < 4; i++) {
      window.StoryEngine.buildHangoutStage();
      if (window.me.story.hangoutStage !== i + 1) {
        return { ok: false, reason: "stage " + (i + 1), hangoutStage: window.me.story.hangoutStage };
      }
    }
    if (!window.me.story.quest.completed.q_hangout_build) {
      return { ok: false, reason: "quest not complete", completed: window.me.story.quest.completed };
    }
    const boltOk = window.StoryEngine.purchaseStoryMaterial("brick", 1);
    return { ok: true, hangoutStage: window.me.story.hangoutStage, chapter: window.me.story.chapter, boltOk };
  });

  await browser.close();
  if (!result.ok) {
    console.error("Chapter 2 FAIL", result);
    process.exit(1);
  }
  console.log("Chapter 2 hangout playthrough PASS", result);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
