import { punkSignOut, onGoogleSignInClick, authErrorMessage } from "./account-auth.mjs";
import {
  connectFirebaseEmulatorsIfRequested,
  isFirebaseEmulatorQueryRequested,
  isLocalFirebaseTestHost
} from "./firebase-emulator.mjs";
import { ownerSessionAllowed } from "./owner-session.mjs";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyACAXPV9H4vfWNUoRYEWzXi6CSX0kpCaho",
  authDomain: "punk-me-40605.firebaseapp.com",
  databaseURL: "https://punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "punk-me-40605",
  messagingSenderId: "761070335468",
  appId: "1:761070335468:web:4bffd5120ef98e79f47cc9",
  storageBucket: "punk-me-40605.firebasestorage.app"
};
const GAME_VERSION = "living3d-v22r5-accounts-r1";

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function ownerToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}

if (!window.toast) {
  window.toast = ownerToast;
}

async function confirmOwnerSession(user, db) {
  if (!user || user.isAnonymous) return false;
  let adminClaim = false;
  try {
    const token = await user.getIdTokenResult(true);
    adminClaim = token.claims.admin === true;
  } catch (_) {
    return false;
  }
  if (!adminClaim) return false;
  try {
    await db.ref("players").limitToFirst(1).once("value");
  } catch (_) {
    return false;
  }
  return ownerSessionAllowed({
    signedIn: true,
    anonymous: false,
    adminClaim: true,
    databaseConfirmed: true
  });
}

async function loadStats(db) {
  const snap = await db.ref("players").once("value");
  const all = snap.val() || {};
  const entries = Object.entries(all).map(([id, p]) => ({ id, ...p }));
  document.getElementById("ownerPlayerCount").textContent = String(entries.length);
  const recent = entries
    .filter(p => p.lastSeen)
    .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
    .slice(0, 25);
  const body = document.getElementById("ownerRecentBody");
  if (body) {
    body.innerHTML = recent
      .map(
        p =>
          `<tr><td>${p.id.slice(0, 8)}…</td><td>${escapeHtml(p.name || "—")}</td><td>${p.coins ?? "—"}</td><td>${escapeHtml(p.location || "—")}</td><td>${p.lastSeen ? new Date(p.lastSeen).toISOString().slice(0, 16) : "—"}</td></tr>`
      )
      .join("");
  }
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setUi({ user, denied, admin }) {
  document.getElementById("ownerGameVersion").textContent = GAME_VERSION;
  document.getElementById("ownerSignIn").hidden = !!user;
  document.getElementById("ownerPanel").hidden = !user || denied || !admin;
  document.getElementById("ownerDenied").hidden = !user || !denied;
  const st = document.getElementById("ownerStatus");
  if (!user) st.textContent = t("owner_sign_in_prompt");
  else if (denied) st.textContent = t("owner_admin_claim_hint");
  else if (!admin) st.textContent = t("owner_admin_claim_hint");
  else st.textContent = t("owner_welcome");
}

export async function initOwnerAdmin() {
  if (typeof initLanguage === "function") initLanguage();
  if (typeof applyI18nDom === "function") applyI18nDom();
  const statusEl = document.getElementById("ownerStatus");
  const emulatorRequested = isFirebaseEmulatorQueryRequested();
  const localTestHost = isLocalFirebaseTestHost();

  if (localTestHost && !emulatorRequested) {
    if (statusEl) {
      statusEl.textContent =
        "Owner admin tests require ?firebaseEmulator=1 (query must not be stripped by the static server).";
    }
    document.getElementById("ownerSignIn").hidden = false;
    document.getElementById("ownerPanel").hidden = true;
    document.getElementById("ownerDenied").hidden = true;
    return;
  }

  if (!window.firebase?.apps?.length) firebase.initializeApp(FIREBASE_CONFIG);
  const emulatorConnected = connectFirebaseEmulatorsIfRequested(firebase);
  if (emulatorRequested && localTestHost && !emulatorConnected) {
    if (statusEl) statusEl.textContent = t("owner_rules_hint");
    document.getElementById("ownerSignIn").hidden = false;
    document.getElementById("ownerPanel").hidden = true;
    document.getElementById("ownerDenied").hidden = true;
    return;
  }

  const auth = window.firebase.auth();
  if (emulatorConnected && localTestHost && auth.setPersistence) {
    await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
  }
  const db = window.firebase.database();

  document.getElementById("ownerBtnGoogle")?.addEventListener("click", () => onGoogleSignInClick());
  document.getElementById("ownerBtnEmail")?.addEventListener("click", async () => {
    const email = prompt(t("auth_email_prompt"));
    const pass = prompt(t("auth_password_prompt"));
    if (!email || !pass) return;
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch (e) {
      ownerToast(authErrorMessage(e.code, { emailForm: true }));
    }
  });
  document.getElementById("ownerSignOut")?.addEventListener("click", () => punkSignOut());

  auth.onAuthStateChanged(async user => {
    if (!user || user.isAnonymous) {
      setUi({ user: null, denied: false, admin: false });
      return;
    }
    const allowed = await confirmOwnerSession(user, db);
    if (!allowed) {
      setUi({ user, denied: true, admin: false });
      return;
    }
    setUi({ user, denied: false, admin: true });
    try {
      await loadStats(db);
    } catch (_) {
      setUi({ user, denied: true, admin: false });
      document.getElementById("ownerStatus").textContent = t("owner_rules_hint");
    }
  });
}

initOwnerAdmin().catch(e => console.error("owner-admin boot failed", e));
