import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeIntrinsicRiskScore,
  decideChildSafetyAction,
  reporterBoostFromIndependence
} from "../workers/safe-chat/src/child-safety-risk.js";

const cfg = {
  childSafetyRiskHideHighTier: 45,
  childSafetyRiskHideOther: 50,
  childSafetyRiskHideImmediate: 40,
  childSafetyImmediateDangerSlaMs: 14400000,
  safetyQueueEscalateMs: 172800000
};

describe("child safety risk scoring", () => {
  it("does not hide benign other_child_safety without corroboration", () => {
    const intrinsic = computeIntrinsicRiskScore({
      subcategory: "other_child_safety",
      messageText: "Thanks!",
      filterHit: false
    });
    const d = decideChildSafetyAction({
      subcategory: "other_child_safety",
      intrinsicScore: intrinsic.intrinsicScore,
      corroborating: intrinsic.corroborating,
      credibility: 1,
      reporterBoost: 0,
      reporterBanned: false,
      configObj: cfg,
      filterHit: false
    });
    assert.equal(d.hide, false);
  });

  it("hides grooming when message context corroborates", () => {
    const intrinsic = computeIntrinsicRiskScore({
      subcategory: "grooming",
      messageText: "how old are you? don't tell your mom",
      filterHit: false
    });
    const d = decideChildSafetyAction({
      subcategory: "grooming",
      intrinsicScore: intrinsic.intrinsicScore,
      corroborating: intrinsic.corroborating,
      credibility: 0.55,
      reporterBoost: 2,
      reporterBanned: false,
      configObj: cfg,
      filterHit: false
    });
    assert.equal(d.hide, true);
  });

  it("filter hit is mandatory hide (non-discretionary)", () => {
    const d = decideChildSafetyAction({
      subcategory: "other_child_safety",
      intrinsicScore: 62,
      corroborating: true,
      credibility: 0.2,
      reporterBoost: 0,
      reporterBanned: true,
      configObj: cfg,
      filterHit: true
    });
    assert.equal(d.hide, true);
    assert.equal(d.discretionary, false);
  });

  it("coordinated mass reports add zero reporter boost", () => {
    const boost = reporterBoostFromIndependence({
      credibility: 1,
      independentReporterCount: 10,
      coordinated: true
    });
    assert.equal(boost, 0);
  });
});
