import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeIntrinsicRiskScore,
  decideChildSafetyAction,
  hasGlobalHideIndependentSignal,
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
      configObj: cfg,
      filterHit: false,
      globalHideSignal: false
    });
    assert.equal(d.hide, false);
  });

  it("global hide requires independent signal even with grooming context", () => {
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
      configObj: cfg,
      filterHit: false,
      globalHideSignal: false
    });
    assert.equal(d.hide, false);
    assert.equal(d.reporterLocalHide, true);
  });

  it("hides grooming when independent signal present (two clusters)", () => {
    const intrinsic = computeIntrinsicRiskScore({
      subcategory: "grooming",
      messageText: "how old are you? don't tell your mom",
      filterHit: false
    });
    const d = decideChildSafetyAction({
      subcategory: "grooming",
      intrinsicScore: intrinsic.intrinsicScore,
      corroborating: intrinsic.corroborating,
      credibility: 1,
      reporterBoost: 4,
      configObj: cfg,
      filterHit: false,
      globalHideSignal: true
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
      configObj: cfg,
      filterHit: true,
      globalHideSignal: true
    });
    assert.equal(d.hide, true);
    assert.equal(d.discretionary, false);
  });

  it("hasGlobalHideIndependentSignal accepts filter, violations, or two clusters", () => {
    assert.equal(hasGlobalHideIndependentSignal({ filterHit: true, authorConfirmedViolations: 0, independentReporterCount: 1, distinctClusterCount: 1 }), true);
    assert.equal(hasGlobalHideIndependentSignal({ filterHit: false, authorConfirmedViolations: 2, independentReporterCount: 1, distinctClusterCount: 1 }), true);
    assert.equal(hasGlobalHideIndependentSignal({ filterHit: false, authorConfirmedViolations: 0, independentReporterCount: 2, distinctClusterCount: 2 }), true);
    assert.equal(hasGlobalHideIndependentSignal({ filterHit: false, authorConfirmedViolations: 0, independentReporterCount: 2, distinctClusterCount: 1 }), false);
  });

  it("t139u O-02: global hide at independent-signal threshold not one step below", () => {
    const cfg = {
      childSafetyRiskHideHighTier: 45,
      childSafetyRiskHideOther: 50,
      childSafetyRiskHideImmediate: 40,
      childSafetyImmediateDangerSlaMs: 14400000,
      safetyQueueEscalateMs: 172800000
    };
    const below = decideChildSafetyAction({
      subcategory: "grooming",
      intrinsicScore: 39,
      corroborating: true,
      credibility: 1,
      reporterBoost: 0,
      configObj: cfg,
      filterHit: false,
      globalHideSignal: true
    });
    const at = decideChildSafetyAction({
      subcategory: "grooming",
      intrinsicScore: 45,
      corroborating: true,
      credibility: 1,
      reporterBoost: 0,
      configObj: cfg,
      filterHit: false,
      globalHideSignal: true
    });
    assert.equal(below.hide, false);
    assert.equal(at.hide, true);
  });

  it("t147u: immediate_danger escalates without global hide when no independent signal", () => {
    const intrinsic = computeIntrinsicRiskScore({
      subcategory: "immediate_danger",
      messageText: "preset phrase only",
      filterHit: false
    });
    const d = decideChildSafetyAction({
      subcategory: "immediate_danger",
      intrinsicScore: intrinsic.intrinsicScore,
      corroborating: intrinsic.corroborating,
      credibility: 1,
      reporterBoost: 10,
      configObj: cfg,
      filterHit: false,
      globalHideSignal: false
    });
    assert.equal(d.hide, false);
    assert.equal(d.reporterLocalHide, true);
    assert.equal(d.escalationTier, "immediate_danger");
    assert.equal(d.queuePriority, "immediate_danger");
    assert.equal(d.moderatorNotify, true);
    assert.equal(d.slaReviewByMs, cfg.childSafetyImmediateDangerSlaMs);
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
