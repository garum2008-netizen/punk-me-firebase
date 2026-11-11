import assert from "node:assert/strict";
import { claimOnce } from "../js/story/reward-guard.mjs";

const record = {};
assert.equal(claimOnce(record, "q_initiation_pay", "pay"), true);
assert.equal(record.q_initiation_pay, "pay");
assert.equal(claimOnce(record, "q_initiation_pay", "duel"), false);
assert.equal(record.q_initiation_pay, "pay");
assert.equal(claimOnce(record, ""), false);

globalThis.document = {
  getElementById(id) {
    if (id === "storyDialog") return { classList: { contains: (name) => name === "active" } };
    return null;
  },
  querySelector() {
    return null;
  }
};

const controls = await import("../js/controls-3d.mjs");
controls.applyKeyDown({ key: "w", repeat: false });
controls.applyKeyDown({ key: "e", repeat: false });
const blocked = controls.getInputState();
assert.equal(blocked.moveZ, 0);
assert.equal(blocked.interact, false);

globalThis.document = {
  getElementById() {
    return null;
  },
  querySelector() {
    return null;
  }
};
controls.applyKeyDown({ key: "w", repeat: false });
controls.applyKeyDown({ key: "e", repeat: true });
const moving = controls.getInputState();
assert.equal(moving.moveZ, 1);
assert.equal(moving.interact, false);
controls.applyKeyDown({ key: "e", repeat: false });
assert.equal(controls.getInputState().interact, true);

console.log("chapter1 guards ok");
