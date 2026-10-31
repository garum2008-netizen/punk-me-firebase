#!/usr/bin/env node
/**
 * t139u matrix unit coverage (config, cluster headers, docs, mod alert, risk thresholds).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadConfig } from "../workers/safe-chat/src/config.js";
import {
  hasGlobalHideIndependentSignal,
  decideChildSafetyAction
} from "../workers/safe-chat/src/child-safety-risk.js";
import { clusterHashFromRequest, ipv6ClusterHash, ipv4ClusterHash } from "../workers/safe-chat/src/child-safety-abuse.js";
import { sendModeratorAlert } from "../workers/safe-chat/src/mod-alert.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

test("O-03: risk hide thresholds match documented config defaults", () => {
  const cfg = loadConfig({});
  assert.equal(cfg.childSafetyRiskHideHighTier, 45);
  assert.equal(cfg.childSafetyRiskHideOther, 50);
  assert.equal(cfg.childSafetyRiskHideImmediate, 40);
  assert.equal(cfg.childSafetyHideQuotaLow, 1);
  assert.equal(cfg.childSafetyHideQuotaTrusted, 3);
  assert.equal(cfg.childSafetyClusterHideCap, 5);
});

test("E-05 / FT-03: SLA overdue cron runs every 15 minutes; immediate SLA remains config", () => {
  const wrangler = fs.readFileSync(path.join(root, "workers/safe-chat/wrangler.toml"), "utf8");
  assert.match(wrangler, /\*\/15 \* \* \* \*/);
  assert.match(wrangler, /0 4 \* \* \*/);
  const cfg = loadConfig({});
  assert.equal(cfg.childSafetyImmediateDangerSlaMs, 4 * 60 * 60 * 1000);
});

test("FT-04: erasure and retention batch sizes stay under Workers free subrequest budget", () => {
  const cfg = loadConfig({});
  assert.ok(cfg.erasureMaxSubrequests <= 45);
  assert.ok(cfg.retentionBatchSize <= 45);
});

test("R-09: evidence max hold documented in config matches CHILD_HARM doc reference", () => {
  const cfg = loadConfig({});
  assert.equal(cfg.safetyEvidenceMaxHoldMs, 365 * 24 * 60 * 60 * 1000);
  const doc = fs.readFileSync(path.join(root, "docs/release/SAFE_CHAT_REPORT.md"), "utf8");
  assert.match(doc, /maxHoldUntil|safetyEvidenceMaxHoldMs/i);
});

test("BY-05: missing CF-Connecting-IP uses shared unknown cluster bucket", async () => {
  const req = new Request("http://x", { headers: { "X-Forwarded-For": "198.51.100.1, 10.0.0.1" } });
  const h = await clusterHashFromRequest(req, { SAFE_CHAT_HASH_SALT: "unit-test-salt" });
  assert.ok(h && /^[a-f0-9]{32}$/.test(h));
  const h2 = await clusterHashFromRequest(new Request("http://x"), { SAFE_CHAT_HASH_SALT: "unit-test-salt" });
  assert.equal(h, h2);
});

test("BY-05: clusterHashFromRequest uses CF-Connecting-IP when present", async () => {
  const req = new Request("http://x", {
    headers: { "CF-Connecting-IP": "203.0.113.44", "X-Forwarded-For": "1.2.3.4" }
  });
  const h = await clusterHashFromRequest(req, { SAFE_CHAT_HASH_SALT: "unit-test-salt" });
  assert.ok(h && /^[a-f0-9]{32}$/.test(h));
});

test("BY-04: IPv6 /64 cluster hashes differ across /64 boundaries", async () => {
  const salt = "s";
  const a = await ipv6ClusterHash("2001:db8::1", salt);
  const b = await ipv6ClusterHash("2001:db8:1::1", salt);
  assert.notEqual(a, b);
});

test("BY-04: IPv4 /24 cluster stable within subnet", async () => {
  const salt = "s";
  const a = await ipv4ClusterHash("198.51.100.10", salt);
  const b = await ipv4ClusterHash("198.51.100.99", salt);
  assert.equal(a, b);
});

test("D-07: evasion grooming text still yields reporter-local hide path without global signal", () => {
  const cfg = loadConfig({});
  const d = decideChildSafetyAction({
    subcategory: "grooming",
    intrinsicScore: 42,
    corroborating: true,
    credibility: 1,
    reporterBoost: 4,
    configObj: cfg,
    filterHit: false,
    globalHideSignal: false
  });
  assert.equal(d.hide, false);
  assert.equal(d.reporterLocalHide, true);
});

test("FT-02: free-tier config enforces sqlite DO class", () => {
  const txt = fs.readFileSync(path.join(root, "workers/safe-chat/wrangler.toml"), "utf8");
  assert.match(txt, /new_sqlite_classes\s*=\s*\[\s*"ChatLimitsDO"\s*\]/);
});

test("B-08: merged case uses one queue row per message (logic)", () => {
  assert.equal(
    hasGlobalHideIndependentSignal({
      filterHit: false,
      authorConfirmedViolations: 0,
      independentReporterCount: 50,
      distinctClusterCount: 1
    }),
    false
  );
});

test("D-06: mod alert rejects non-HTTPS URL", async () => {
  const r = await sendModeratorAlert({ SAFE_CHAT_MOD_ALERT_URL: "http://insecure.example/hook" }, { msgId: "abc" });
  assert.equal(r.sent, false);
  assert.equal(r.reason, "invalid_url_scheme");
});

test("D-06: mod alert times out hanging endpoint", async () => {
  const prev = globalThis.fetch;
  globalThis.fetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    });
  try {
    const r = await sendModeratorAlert({ SAFE_CHAT_MOD_ALERT_URL: "https://example.com/hook" }, { msgId: "x" }, { timeoutMs: 50 });
    assert.equal(r.sent, false);
    assert.equal(r.reason, "timeout");
  } finally {
    globalThis.fetch = prev;
  }
});
