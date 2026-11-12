import assert from "node:assert/strict";
import { shouldShowCrawl, ensureCityKit, ensureChapter1, guideKey } from "../js/story/chapter1-flow.mjs";

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
assert.equal(guideKey(training), "onboard_city_build_text");
training.onboarding.done = true;
training.story = { flags: { joined_gang: true } };
assert.equal(guideKey(training), "angelina_closing");
training.chapter1.ended = true;
assert.equal(guideKey(training), "angelina_closing");

console.log("chapter1 flow ok");
