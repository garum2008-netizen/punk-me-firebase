import assert from "node:assert/strict";
import { normalizeAvatarLook, presetFor } from "../js/avatar-look.mjs";

const made = normalizeAvatarLook({ hair: "pink", jacket: "ink", accessory: "chain" });
assert.deepEqual(made, { hair: "pink", jacket: "ink", accessory: "chain" });
assert.equal(normalizeAvatarLook({ hair: "pink", jacket: "ink" }), null);
assert.equal(normalizeAvatarLook({ hair: "wings", jacket: "ink", accessory: "chain" }), null);
assert.deepEqual(presetFor("cobalt"), { hair: "cyan", jacket: "night", accessory: "spikes" });
console.log("avatar look ok");
