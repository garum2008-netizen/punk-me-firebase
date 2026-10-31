#!/usr/bin/env node
const admin = require("firebase-admin");
const path = require("path");
const { pathToFileURL } = require("url");

const projectId = process.env.FIREBASE_DEMO_PROJECT || "demo-punk-life-ch1";

if (!admin.apps.length) {
  admin.initializeApp({ projectId, databaseURL: `https://${projectId}-default-rtdb.firebaseio.com` });
}
const db = admin.database();

(async () => {
  const mod = await import(pathToFileURL(path.join(__dirname, "..", "js/story/life-ch1-slice.mjs")).href);
  const { ensureLifeCh1, normalizeClaimedSteps } = mod;

  const uid = "life-ch1-claimed-test";
  const ref = db.ref(`players/${uid}/lifeCh1/claimedSteps`);
  await ref.set([null, true, true]);

  const snap = await ref.once("value");
  const raw = snap.val();
  if (!Array.isArray(raw)) throw new Error("expected array from RTDB write");

  const normalized = normalizeClaimedSteps(raw);
  if (!normalized.s1 || !normalized.s2) throw new Error("normalize failed: " + JSON.stringify(normalized));

  global.window = { me: { lifeCh1: { v: 1, active: true, stepIndex: 1, claimedSteps: raw, flags: {}, completed: false } } };
  const st = ensureLifeCh1(global.window.me);
  if (!st.claimedSteps.s1 || !st.claimedSteps.s2) {
    throw new Error("ensureLifeCh1 failed: " + JSON.stringify(st.claimedSteps));
  }

  await ref.remove();
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
