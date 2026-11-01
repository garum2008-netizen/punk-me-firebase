#!/usr/bin/env node
/**
 * Dry-run backfill for chat/clientMessages from chat/messages (public fields only).
 * Default: dry-run. Pass --apply only after owner GO.
 */
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: { apply: { type: "boolean", default: false } }
});

console.log(values.apply ? "APPLY mode (not implemented in CI — run against emulator with credentials)" : "DRY-RUN: would copy whitelisted mirror fields for each chat/messages row");
console.log("See docs/RELEASE_PRECONDITIONS.md for deployment order.");
