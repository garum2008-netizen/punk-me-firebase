import assert from "node:assert/strict";
import { shouldShowCrawl, ensureCityKit, ensureChapter1, guideKey, chapterObjectivesMet, CHAPTER1_OBJECTIVES, adoptChapterSave, CHAPTER1_PLAY_ID } from "../js/story/chapter1-flow.mjs";

const fresh = { onboarding: { step: 0, done: false, progress: {}, paid: {} } };
assert.equal(shouldShowCrawl(fresh), true);
ensureChapter1(fresh).crawlSeen = true;
assert.equal(shouldShowCrawl(fresh), false);

const mid = { onboarding: { step: 2, done: false }, chapter1: { crawlSeen: false, ended: false } };
assert.equal(shouldShowCrawl(mid), false);

const kit = { inventory: { materials: {} } };
assert.equal(ensureCityKit(kit), 1);
assert.equal(ensureCityKit(kit), 1);

globalThis.window = {
  Onboarding: { stepId: () => "city_build" }
};
const training = { onboarding: { done: false, step: 6 }, chapter1: { ended: false } };
assert.equal(guideKey(training), "angelina_plots");
const oldSave = {
  coins: 250,
  onboarding: { step: 7, done: true, paid: { move: true, city_build: true } },
  chapter1: { crawlSeen: true, finaleSeen: true, ended: true },
  story: { chapter: 2, flags: { joined_gang: true }, quest: { activeId: "q_hangout_build" } },
  gang_rank: "gang_member"
};
assert.equal(adoptChapterSave(oldSave), true);
assert.equal(oldSave.chapter1.playId, CHAPTER1_PLAY_ID);
assert.equal(oldSave.chapter1.crawlSeen, false);
assert.equal(oldSave.onboarding.done, false);
assert.equal(oldSave.story.flags.joined_gang, false);
assert.equal(oldSave.coins, 250);
oldSave.onboarding.done = true;
assert.equal(adoptChapterSave(oldSave), false);
assert.equal(oldSave.onboarding.done, true);
training.onboarding.done = true;
training.story = { flags: { joined_gang: true } };
training.onboarding.paid = {};
assert.equal(chapterObjectivesMet(training), false);
assert.equal(guideKey(training), "angelina_initiation");
CHAPTER1_OBJECTIVES.forEach(id => { training.onboarding.paid[id] = true; });
assert.equal(chapterObjectivesMet(training), true);
assert.equal(guideKey(training), "angelina_finale");
training.chapter1.ended = true;
assert.equal(guideKey(training), "angelina_closing");
const early = { onboarding: { done: false, paid: { move: true } }, story: { flags: { joined_gang: true } } };
assert.equal(chapterObjectivesMet(early), false);

console.log("chapter1 flow ok");
