#!/usr/bin/env node
/**
 * RTDB rules: safe chat denies direct client writes; auth-only chat read.
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

function dbUrl(pathSuffix, idToken, admin) {
  let q = `ns=${encodeURIComponent(DB_NS)}`;
  if (admin) q += "&access_token=owner";
  else if (idToken) q += `&auth=${encodeURIComponent(idToken)}`;
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

  const unauthRead = await fetchJson(dbUrl("chat/messages", null));
  cases.push({
    name: "unauthenticated read chat/messages denied",
    pass: unauthRead.status === 401 || unauthRead.status === 403
  });

  const readMsg = await fetchJson(dbUrl("chat/messages", idToken));
  cases.push({
    name: "auth read chat/messages",
    pass: readMsg.status === 200
  });

  const writeMsg = await fetchJson(dbUrl("chat/messages", idToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sid: "abc", name: "A", text: "hi", time: Date.now() })
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

  const adminWrite = await fetchJson(dbUrl("chat/messages", null, true), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sid: "deadbeefdeadbeefdeadbeefdeadbeef", name: "W", text: "ok", time: Date.now() })
  });
  cases.push({
    name: "admin SDK POST chat/messages allowed",
    pass: adminWrite.status === 200
  });

  const forgeAge = await fetchJson(dbUrl(`players/${localId}/chatAge13DeclaredAt`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "1"
  });
  cases.push({
    name: "client cannot set players chatAge13DeclaredAt",
    pass: forgeAge.status === 403 || forgeAge.status === 401
  });

  const forgeReg = await fetchJson(dbUrl(`players/${localId}/chatRegisteredAt`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "1"
  });
  cases.push({
    name: "client cannot set players chatRegisteredAt",
    pass: forgeReg.status === 403 || forgeReg.status === 401
  });

  const forgeLevel = await fetchJson(dbUrl(`chatMeta/${localId}/rateLimitLevel`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "9999"
  });
  cases.push({
    name: "client cannot write chatMeta rateLimitLevel",
    pass: forgeLevel.status === 403 || forgeLevel.status === 401
  });

  const metaForge = await fetchJson(dbUrl(`chatMeta/${localId}/chatAge13DeclaredAt`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "1"
  });
  cases.push({
    name: "client cannot write chatMeta",
    pass: metaForge.status === 403 || metaForge.status === 401
  });

  const saveName = await fetchJson(dbUrl(`players/${localId}/name`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify("Hero")
  });
  const saveCoins = await fetchJson(dbUrl(`players/${localId}/coins`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "10"
  });
  cases.push({
    name: "player save name/coins still works",
    pass: saveName.status === 200 && saveCoins.status === 200
  });

  await fetchJson(dbUrl(`players/${localId}/chatBlocklist`, null, true), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ peerSid: true })
  });
  await fetchJson(dbUrl(`players/${localId}/chatAge13DeclaredAt`, null, true), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "999"
  });
  const legacyCoinsPut = await fetchJson(dbUrl(`players/${localId}/coins`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "42"
  });
  const legacyCoinsPatch = await fetchJson(dbUrl(`players/${localId}`, idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coins: 43 })
  });
  const legacyNamePut = await fetchJson(dbUrl(`players/${localId}/name`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify("LegacyHero")
  });
  const playerSnap = await fetchJson(dbUrl(`players/${localId}`, idToken));
  const fullSave = await fetchJson(dbUrl(`players/${localId}`, idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coins: 44 })
  });
  cases.push({
    name: "legacy chatBlocklist object + age does not block coins/name/full save",
    pass:
      legacyCoinsPut.status === 200 &&
      legacyCoinsPatch.status === 200 &&
      legacyNamePut.status === 200 &&
      fullSave.status === 200
  });

  await fetchJson(dbUrl(`players/${localId}/chatAge13DeclaredAt`, null, true), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "999"
  });
  const delAge = await fetchJson(dbUrl(`players/${localId}/chatAge13DeclaredAt`, idToken), {
    method: "DELETE"
  });
  cases.push({
    name: "client cannot delete players chatAge13DeclaredAt",
    pass: delAge.status === 403 || delAge.status === 401
  });

  const badBlocklist = await fetchJson(dbUrl(`players/${localId}/chatBlocklist/extra`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "true"
  });
  cases.push({
    name: "client cannot write players chatBlocklist children",
    pass: badBlocklist.status === 403 || badBlocklist.status === 401
  });

  await fetchJson(dbUrl(`players/${localId}/chatBlocklist`, null, true), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ peerA: true, peerB: true })
  });
  const delOnePeer = await fetchJson(dbUrl(`players/${localId}/chatBlocklist/peerA`, idToken), {
    method: "DELETE"
  });
  cases.push({
    name: "P0-bl: client cannot delete one chatBlocklist peer while another remains",
    pass: delOnePeer.status === 403 || delOnePeer.status === 401
  });
  const replacePrimitive = await fetchJson(dbUrl(`players/${localId}/chatBlocklist`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify("x")
  });
  cases.push({
    name: "P0-bl: client cannot replace chatBlocklist object with primitive",
    pass: replacePrimitive.status === 403 || replacePrimitive.status === 401
  });
  const subsetBlock = await fetchJson(dbUrl(`players/${localId}/chatBlocklist`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ peerB: true })
  });
  cases.push({
    name: "P0-bl: client cannot PUT chatBlocklist subset (drop peer)",
    pass: subsetBlock.status === 403 || subsetBlock.status === 401
  });
  const snapBlock = await fetchJson(dbUrl(`players/${localId}`, idToken));
  const dropPeerFullSave = await fetchJson(dbUrl(`players/${localId}`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...(snapBlock.json || {}), chatBlocklist: { peerB: true } })
  });
  cases.push({
    name: "P0-bl: full player save cannot drop chatBlocklist peer",
    pass: dropPeerFullSave.status === 403 || dropPeerFullSave.status === 401
  });

  const objUser = await signUp();
  const objPeerId = objUser.localId;
  const objToken = objUser.idToken;
  await fetchJson(dbUrl(`players/${objPeerId}`, null, true), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Obj",
      coins: 1,
      chatBlocklist: { peerObj: true }
    })
  });
  const objPatch = await fetchJson(dbUrl(`players/${objPeerId}`, objToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coins: 2 })
  });
  cases.push({
    name: "P0-objpeer: save with legacy object map peer (boolean value) succeeds",
    pass: objPatch.status === 200
  });

  const blankUser = await signUp();
  const createBlockX = await fetchJson(dbUrl(`players/${blankUser.localId}/chatBlocklist`, blankUser.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify("x")
  });
  cases.push({
    name: "LOW R4-L2: client cannot create chatBlocklist as primitive string",
    pass: createBlockX.status === 403 || createBlockX.status === 401
  });

  const fullPutBlock = await fetchJson(dbUrl(`players/${objPeerId}`, objToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Obj",
      coins: 3,
      chatBlocklist: { peerObj: true }
    })
  });
  cases.push({
    name: "LOW R4-L1: full player PUT carrying chatBlocklist denied (client uses PATCH without chat keys)",
    pass: fullPutBlock.status === 403 || fullPutBlock.status === 401
  });

  await fetchJson(dbUrl(`players/${localId}/chatBlocklist`, null, true), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ peer: true })
  });
  const delBlock = await fetchJson(dbUrl(`players/${localId}/chatBlocklist`, idToken), {
    method: "DELETE"
  });
  cases.push({
    name: "client cannot delete players chatBlocklist",
    pass: delBlock.status === 403 || delBlock.status === 401
  });

  const delPlayer = await fetchJson(dbUrl(`players/${localId}`, idToken), { method: "DELETE" });
  cases.push({
    name: "P0-node: whole players node delete allowed (accepted residual: chat keys removed with node)",
    pass: delPlayer.status === 200
  });
  const regAfterDel = await fetchJson(dbUrl(`players/${localId}/chatRegisteredAt`, idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "1"
  });
  cases.push({
    name: "P0-node: client cannot recreate players chatRegisteredAt after whole-node delete",
    pass: regAfterDel.status === 403 || regAfterDel.status === 401
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

  const readEvidence = await fetchJson(dbUrl("chat/internal/safetyEvidence", idToken));
  cases.push({
    name: "client read chat/internal/safetyEvidence denied",
    pass: readEvidence.status === 401 || readEvidence.status === 403
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
