#!/usr/bin/env node
import { buildEarnState, resolveReturnBeacon, resolveReturnLabel } from "../js/story/earn-state.mjs";

const st = { beacon: "npc_razor" };
const ctx = {};
const beacon = resolveReturnBeacon(ctx, st);
if (beacon !== "npc_razor") throw new Error("beacon fallback failed: " + beacon);
const shop = resolveReturnBeacon({}, {});
if (shop !== "obj_shop") throw new Error("shop default: " + shop);
const earn = buildEarnState({ mode: "snack", needTotal: 100, returnBeacon: undefined, x: 1 });
if ("returnBeacon" in earn) throw new Error("undefined key leaked");
if (earn.x !== 1) throw new Error("earn build");
console.log("PASS test-earn-state");
