#!/usr/bin/env node
/**
 * B1: Firebase drops empty quest.completed — ensure onOnboardingComplete does not throw.
 * Run: node scripts/test-b1-story-reload.js
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outLog = process.env.B1_LOG || path.join("/workspace/qa", "b1-reload-console.log");

async function main() {
  const logs = [];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", msg => {
    const line = `[${msg.type()}] ${msg.text()}`;
    logs.push(line);
  });
  page.on("pageerror", err => logs.push(`[pageerror] ${err.message}`));

  await page.goto(`${base}/?solo=1&v=b1test`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.StoryEngine?.ensureStoryState, { timeout: 120000 });

  const result = await page.evaluate(async () => {
    const uid = "b1-test-" + Date.now();
    const firebaseShape = {
      story: {
        chapter: 1,
        flags: {},
        quest: { activeId: null, step: 0 },
        auth: { stage: 1, s1Done: false, tasks: {}, trials: {}, ch2Done: false }
      },
      onboarding: { step: 5, progress: {}, done: false },
      location: "room",
      name: "B1Test",
      coins: 50
    };
    window.me = { ...window.me, ...firebaseShape, characterId: "cobalt" };
    window.StoryEngine.ensureStoryState(window.me);
    const completed = window.me.story.quest.completed;
    if (!completed || typeof completed !== "object") {
      return { ok: false, reason: "completed not backfilled", completed };
    }
    window.me.onboarding.done = true;
    try {
      window.StoryEngine.onOnboardingComplete();
      return { ok: true, completedKeys: Object.keys(window.me.story.quest.completed) };
    } catch (e) {
      return { ok: false, reason: e.message, stack: e.stack };
    }
  });

  logs.push(`[result] ${JSON.stringify(result)}`);
  fs.mkdirSync(path.dirname(outLog), { recursive: true });
  fs.writeFileSync(outLog, logs.join("\n") + "\n");
  await browser.close();

  if (!result.ok) {
    console.error("B1 test FAILED:", result);
    console.error("Log:", outLog);
    process.exit(1);
  }
  console.log("B1 test OK — onOnboardingComplete with missing quest.completed");
  console.log("Log written to", outLog);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
