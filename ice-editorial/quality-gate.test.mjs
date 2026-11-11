import test from "node:test";
import assert from "node:assert/strict";
import { reviewPackage } from "./quality-gate.mjs";

const LINKEDIN = "6a9d9227cd8b9c702c197a40";
const FACEBOOK = "6a9d9398cd8b9c702c1981cd";
const NDA = "https://pub-2cf3acbd41594638a1855b3db79b5fad.r2.dev/ice-media/5414ee68f38990d7507b0ebf82e48fc3-2026-09-30-nda-consultancy-1080x1350.jpg";

function base(overrides) {
  return {
    topic: "eudi-signature",
    teachingExample: true,
    realClient: false,
    audience: "business",
    approval: "pending_owner",
    language: "en",
    channelId: LINKEDIN,
    service: "linkedin",
    visual: false,
    idempotencyKey: "ice-eudi-20261120-teach",
    scenario: "A typed name in an email is treated as a signed change to a liability cap.",
    risk: "A typed name is not automatically a qualified electronic signature.",
    lesson: "Record who signed, which document, and which signature level the contract requires.",
    framework: "Article 25 of Regulation (EU) No 910/2014 gives a qualified electronic signature the effect of a handwritten signature.",
    cta: "Check the signing method before relying on it.",
    sources: ["Regulation (EU) No 910/2014, Article 25"],
    text: "Teaching example. A typed name is not automatically a qualified electronic signature.",
    collisions: [],
    ...overrides
  };
}

test("a labelled teaching note can become an unpublished text draft", () => {
  const result = reviewPackage(base());
  assert.equal(result.decision, "create_draft");
  assert.equal(result.publish, false);
  assert.equal(result.draft.request.saveToDraft, true);
  assert.equal(result.draft.request.assets, undefined);
  assert.equal(result.draft.request.mode, undefined);
});

test("a client file and a children's channel never enter the legal desk", () => {
  assert.equal(reviewPackage(base({ realClient: true, text: "Clarges contract" })).decision, "block");
  assert.ok(reviewPackage(base({ text: "The Clarges file shows this." })).reasons.includes("confidential_marker"));
  assert.equal(reviewPackage(base({ audience: "children", channelId: "6ad64323778b240e2f5abcb6" })).decision, "block");
});

test("an existing queue item and a mismatched picture are not submitted again", () => {
  assert.equal(reviewPackage(base({
    approval: "existing_queue",
    collisions: ["6ad3c780769b4579348f5968"]
  })).decision, "hold");
  const mismatch = reviewPackage(base({
    visual: true,
    service: "facebook",
    channelId: FACEBOOK,
    topic: "nda-definition",
    mediaTopic: "consultancy-fee",
    imageUrl: NDA,
    altText: "NDA and consultancy fee"
  }));
  assert.equal(mismatch.decision, "block");
  assert.ok(mismatch.reasons.includes("media_topic_mismatch"));
});
