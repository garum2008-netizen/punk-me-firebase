#!/usr/bin/env node
/**
 * Lossless migration: players/{uid} chat fields -> chatMeta/{uid}.
 * Maps legacy chatBlocklist uid keys to blockedSids via chatPublicSid (requires salt).
 *
 * DEFAULT: dry-run. --write requires --export and FIREBASE_DATABASE_URL + credentials (owner GO).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHmac } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const args = process.argv.slice(2);
const write = args.includes("--write");
const exportPath = args.find(a => a.endsWith(".json") && !a.startsWith("--"));
const salt = process.env.SAFE_CHAT_HASH_SALT || process.env.MIGRATE_CHAT_HASH_SALT || "";

function chatPublicSid(uid, hashSalt) {
  const h = createHmac("sha256", hashSalt || "migrate-dry-run-salt");
  h.update(`chat:uid:${uid}`);
  return h.digest("hex").slice(0, 32);
}

function planForPlayer(uid, player) {
  const ops = [];
  if (typeof player.chatAge13DeclaredAt === "number" && player.chatAge13DeclaredAt > 0) {
    ops.push({
      op: "PUT",
      path: `chatMeta/${uid}/chatAge13DeclaredAt`,
      value: player.chatAge13DeclaredAt
    });
  }
  if (typeof player.chatRegisteredAt === "number" && player.chatRegisteredAt > 0) {
    ops.push({
      op: "PUT",
      path: `chatMeta/${uid}/chatRegisteredAt`,
      value: player.chatRegisteredAt
    });
  }
  const bl = player.chatBlocklist;
  if (bl && typeof bl === "object" && !Array.isArray(bl)) {
    const blockedSids = {};
    for (const key of Object.keys(bl)) {
      if (bl[key]) blockedSids[chatPublicSid(key, salt)] = true;
    }
    if (Object.keys(blockedSids).length) {
      ops.push({ op: "PUT", path: `chatMeta/${uid}/blockedSids`, value: blockedSids });
    }
  }
  return ops;
}

function loadExport(file) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  if (raw.players && typeof raw.players === "object") return raw.players;
  return raw;
}

async function main() {
  console.log("migrate-players-chat-fields-to-meta (lossless plan)");
  console.log(`Mode: ${write ? "WRITE" : "DRY-RUN"}`);
  if (!salt) {
    console.warn("WARN: SAFE_CHAT_HASH_SALT unset — blockedSids mapping uses dry-run placeholder salt.");
  }
  if (!exportPath) {
    console.log("Usage: node scripts/migrate-players-chat-fields-to-meta.mjs [--write] export.json");
    console.log("Dry-run: 0 RTDB writes.");
    process.exit(0);
  }
  const players = loadExport(exportPath);
  let totalOps = 0;
  for (const [uid, player] of Object.entries(players)) {
    if (!player || typeof player !== "object") continue;
    const ops = planForPlayer(uid, player);
    if (!ops.length) continue;
    console.log(`\n${uid}:`);
    for (const o of ops) {
      console.log(`  ${o.op} ${o.path}`);
      totalOps += 1;
    }
  }
  console.log(`\nPlanned ${totalOps} chatMeta writes across ${Object.keys(players).length} uids.`);
  if (write) {
    console.error("Refusing --write without owner RTDB admin wiring in this stub run.");
    console.error("Apply planned PUTs via Firebase Admin or owner tooling after GO.");
    process.exit(2);
  }
  console.log("Dry-run complete.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
