#!/usr/bin/env node
/**
 * Lossless migration: players/{uid} chat fields -> chatMeta/{uid}.
 * Maps legacy chatBlocklist keys (raw peer uids) to blockedSids via chatPublicSid (same as Worker).
 *
 * DEFAULT: dry-run. --write applies via Admin REST (owner GO only; never run in CI/agents).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHmac } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const write = args.includes("--write");
const exportPath = args.find(a => a.endsWith(".json") && !a.startsWith("--"));
const salt = process.env.SAFE_CHAT_HASH_SALT || process.env.MIGRATE_CHAT_HASH_SALT || "";
const dbUrl = (process.env.FIREBASE_DATABASE_URL || "").replace(/\/$/, "");
const accessToken = process.env.FIREBASE_DATABASE_ACCESS_TOKEN || process.env.FIREBASE_ACCESS_TOKEN || "";
const emulatorNs = process.env.FIREBASE_EMULATOR_NS || "punk-me-40605-default-rtdb";
/** Reject forged ancient legacy chat timestamps (before chat launch). */
const LEGACY_CHAT_MIN_MS = Date.parse("2024-06-01T00:00:00.000Z");

function chatPublicSid(uid, hashSalt) {
  const h = createHmac("sha256", hashSalt);
  h.update(`chat:${uid}`);
  return h.digest("hex").slice(0, 32);
}

function planForPlayer(uid, player, existingMeta = {}) {
  const ops = [];
  if (typeof player.chatAge13DeclaredAt === "number" && player.chatAge13DeclaredAt > 0) {
    const nowMs = Date.now();
    if (player.chatAge13DeclaredAt > nowMs + 60_000) {
      /* reject forged future legacy dates */
    } else if (player.chatAge13DeclaredAt < LEGACY_CHAT_MIN_MS) {
      /* reject forged ancient legacy dates */
    } else {
      const cur = typeof existingMeta.chatAge13DeclaredAt === "number" ? existingMeta.chatAge13DeclaredAt : 0;
      const merged = Math.max(cur, player.chatAge13DeclaredAt);
      if (merged !== cur) {
        ops.push({
          op: "PUT",
          path: `chatMeta/${uid}/chatAge13DeclaredAt`,
          value: merged
        });
      }
    }
  }
  if (typeof player.chatRegisteredAt === "number" && player.chatRegisteredAt > 0) {
    if (player.chatRegisteredAt < LEGACY_CHAT_MIN_MS) {
      /* reject forged ancient legacy dates */
    } else {
    const cur = typeof existingMeta.chatRegisteredAt === "number" ? existingMeta.chatRegisteredAt : 0;
    const merged = Math.max(cur, player.chatRegisteredAt);
    if (merged !== cur) {
      ops.push({
        op: "PUT",
        path: `chatMeta/${uid}/chatRegisteredAt`,
        value: merged
      });
    }
    }
  }
  const bl = player.chatBlocklist;
  if (bl && typeof bl === "object" && !Array.isArray(bl)) {
    const blockedSids = { ...(existingMeta.blockedSids || {}) };
    for (const key of Object.keys(bl)) {
      if (bl[key]) blockedSids[chatPublicSid(key, salt)] = true;
    }
    const prevKeys = Object.keys(existingMeta.blockedSids || {})
      .filter(k => existingMeta.blockedSids[k])
      .sort()
      .join(",");
    const nextKeys = Object.keys(blockedSids)
      .filter(k => blockedSids[k])
      .sort()
      .join(",");
    if (prevKeys !== nextKeys) {
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

function rtdbUrl(pathSuffix) {
  let url = `${dbUrl}/${pathSuffix}.json?access_token=${encodeURIComponent(accessToken)}`;
  if (process.env.FIREBASE_EMULATOR_HOST) {
    url += `&ns=${encodeURIComponent(emulatorNs)}`;
  }
  return url;
}

async function rtdbGet(pathSuffix) {
  const res = await fetch(rtdbUrl(pathSuffix));
  const json = await res.json();
  return { status: res.status, json };
}

async function rtdbPut(pathSuffix, value) {
  const res = await fetch(rtdbUrl(pathSuffix), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value)
  });
  return { status: res.status };
}

function allowedMigrationDatabaseHostname(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

async function main() {
  console.log("migrate-players-chat-fields-to-meta (lossless plan)");
  console.log(`Mode: ${write ? "WRITE" : "DRY-RUN"}`);
  if (!salt) {
    console.error("FATAL: SAFE_CHAT_HASH_SALT (or MIGRATE_CHAT_HASH_SALT) is required.");
    process.exit(1);
  }
  if (write) {
    const emulator = Boolean(process.env.FIREBASE_EMULATOR_HOST);
    const prodOk =
      process.env.MIGRATE_ALLOW_PROD === "owner-go" && args.includes("--i-understand-prod");
    if (!emulator && !prodOk) {
      console.error(
        "FATAL: --write requires FIREBASE_EMULATOR_HOST (emulator) OR MIGRATE_ALLOW_PROD=owner-go with --i-understand-prod (owner GO only; agents must not use prod)."
      );
      process.exit(1);
    }
    if (!prodOk && emulator && dbUrl) {
      let host;
      try {
        host = new URL(dbUrl).hostname;
      } catch {
        console.error("FATAL: FIREBASE_DATABASE_URL is not a valid URL.");
        process.exit(1);
      }
      if (!allowedMigrationDatabaseHostname(host)) {
        console.error(
          "FATAL: with FIREBASE_EMULATOR_HOST set, FIREBASE_DATABASE_URL hostname must be localhost, 127.0.0.1, or ::1 (not production)."
        );
        process.exit(1);
      }
    }
  }
  if (!exportPath) {
    console.log("Usage: node scripts/migrate-players-chat-fields-to-meta.mjs [--write] export.json");
    console.log("Dry-run: 0 RTDB writes.");
    process.exit(0);
  }
  if (write && (!dbUrl || !accessToken)) {
    console.error("FATAL: --write requires FIREBASE_DATABASE_URL and FIREBASE_DATABASE_ACCESS_TOKEN.");
    process.exit(1);
  }
  const players = loadExport(exportPath);
  let totalOps = 0;
  for (const [uid, player] of Object.entries(players)) {
    if (!player || typeof player !== "object") continue;
    let existingMeta = {};
    if (write) {
      const snap = await rtdbGet(`chatMeta/${uid}`);
      if (snap.status === 200 && snap.json && typeof snap.json === "object") existingMeta = snap.json;
    }
    const ops = planForPlayer(uid, player, existingMeta);
    if (!ops.length) continue;
    console.log(`\n${uid}:`);
    for (const o of ops) {
      console.log(`  ${o.op} ${o.path}`);
      totalOps += 1;
      if (write) {
        const st = await rtdbPut(o.path, o.value);
        if (st.status >= 400) {
          console.error(`  FAILED HTTP ${st.status} on ${o.path}`);
          process.exit(1);
        }
      }
    }
  }
  console.log(`\nPlanned/applied ${totalOps} chatMeta writes across ${Object.keys(players).length} uids.`);
  if (!write) console.log("Dry-run complete.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
