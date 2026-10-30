#!/usr/bin/env node
/**
 * Copy legacy chat fields from players/$uid to chatMeta/$uid (admin SDK paths only).
 *
 * DEFAULT: dry-run. Pass --write only after owner review. NEVER run against production without GO.
 * Touches ONLY: chatAge13DeclaredAt, chatRegisteredAt, chatBlocklist (players + chatMeta).
 * Does not modify or delete any other game data.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const args = process.argv.slice(2);
const write = args.includes("--write");
const input =
  args.find(a => a.endsWith(".json") && !a.startsWith("--")) ||
  path.join(root, "database.rules.json");

console.log("migrate-players-chat-fields-to-meta");
console.log(`Mode: ${write ? "WRITE (destructive on RTDB when executed with credentials)" : "DRY-RUN"}`);
console.log("This script only plans copies for chatAge13DeclaredAt, chatRegisteredAt, chatBlocklist.");
console.log("Owner must run against staging/export with Firebase Admin — not wired to live prod in CI.\n");

if (!fs.existsSync(input)) {
  console.error(`Missing input ${input}`);
  process.exit(1);
}

console.log("Plan per uid (when players node contains legacy chat keys):");
console.log("  1) PUT chatMeta/{uid}/chatAge13DeclaredAt <= players value (if number)");
console.log("  2) PUT chatMeta/{uid}/chatRegisteredAt <= players value (if number)");
console.log("  3) PUT chatMeta/{uid}/blockedSids <= players.chatBlocklist keys (if object)");
console.log("  4) OPTIONAL owner step: DELETE legacy keys under players/{uid} after verification");
console.log("\nNo file changes in dry-run. Implement RTDB export scan before production GO.");

if (write) {
  console.error("Refusing --write without FIREBASE_SERVICE_ACCOUNT_JSON and explicit export path (owner tooling).");
  process.exit(2);
}

console.log("\nDry-run complete (0 RTDB writes).");
