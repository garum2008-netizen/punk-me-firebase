#!/usr/bin/env node
/**
 * RTDB rules: safe chat denies direct client writes to chat/messages.
 */
const http = require("http");

const PROJECT_ID = process.env.FIREBASE_EMULATOR_PROJECT || "punk-me-40605";
const DB_HOST = "127.0.0.1";
const DB_PORT = 9000;
const AUTH_HOST = "127.0.0.1";
const AUTH_PORT = 9099;
const DB_NS = `${PROJECT_ID}-default-rtdb`;

function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: opts.method || "GET", headers: opts.headers || {} }, res => {
      let body = "";
      res.on("data", c => (body += c));
      res.on("end", () => {
        let json = null;
        try {
          json = body ? JSON.parse(body) : null;
        } catch {
          json = body;
        }
        resolve({ status: res.statusCode, json, body });
      });
    });
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function dbUrl(pathSuffix, idToken) {
  const q = `ns=${encodeURIComponent(DB_NS)}${idToken ? `&auth=${encodeURIComponent(idToken)}` : ""}`;
  return `http://${DB_HOST}:${DB_PORT}/${pathSuffix}.json?${q}`;
}

async function signUp() {
  const url = `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`;
  const res = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  if (!res.json?.idToken) throw new Error("signUp failed");
  return res.json;
}

async function run() {
  const cases = [];
  const { idToken, localId } = await signUp();

  const readMsg = await fetchJson(dbUrl("chat/messages", idToken));
  cases.push({
    name: "auth read chat/messages",
    pass: readMsg.status === 200
  });

  const writeMsg = await fetchJson(dbUrl("chat/messages", idToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: localId, name: "A", text: "hi", time: Date.now() })
  });
  cases.push({
    name: "client POST chat/messages denied",
    pass: writeMsg.status === 403 || writeMsg.status === 401
  });

  const legacyWrite = await fetchJson(dbUrl("chat", idToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: localId, name: "A", text: "hi", time: Date.now() })
  });
  cases.push({
    name: "legacy client POST chat/ denied",
    pass: legacyWrite.status === 403 || legacyWrite.status === 401
  });

  const blocklist = await fetchJson(dbUrl(`players/${localId}/chatBlocklist/other-uid`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "true"
  });
  cases.push({
    name: "player can save chatBlocklist",
    pass: blocklist.status === 200
  });

  const writeReport = await fetchJson(dbUrl("chat/reports", idToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msgId: "x", time: Date.now() })
  });
  cases.push({
    name: "client POST chat/reports denied",
    pass: writeReport.status === 403 || writeReport.status === 401
  });

  const writeMute = await fetchJson(dbUrl(`chat/modState/${localId}/mute`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ until: Date.now() + 99999 })
  });
  cases.push({
    name: "client PUT chat/modState/mute denied",
    pass: writeMute.status === 403 || writeMute.status === 401
  });

  const writeInternal = await fetchJson(dbUrl("chat/internal/reportCounts/foo", idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "1"
  });
  cases.push({
    name: "client PUT chat/internal denied",
    pass: writeInternal.status === 403 || writeInternal.status === 401
  });

  let failed = 0;
  for (const c of cases) {
    const mark = c.pass ? "PASS" : "FAIL";
    if (!c.pass) failed += 1;
    console.log(`${mark}  ${c.name}`);
  }
  if (failed) process.exit(1);
  console.log(`\n${cases.length} PASS, 0 FAIL`);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
