import { punkSignOut, onGoogleSignInClick, authErrorMessage } from "./account-auth.mjs";
import { connectFirebaseEmulatorsIfRequested } from "./firebase-emulator.mjs";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyACAXPV9H4vfWNUoRYEWzXi6CSX0kpCaho",
  authDomain: "punk-me-40605.firebaseapp.com",
  databaseURL: "https://punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "punk-me-40605",
  messagingSenderId: "761070335468",
  appId: "1:761070335468:web:4bffd5120ef98e79f47cc9",
  storageBucket: "punk-me-40605.firebasestorage.app"
};
const GAME_VERSION = "story-preview-p0-r2";

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

async function userHasAdminClaim(user) {
  if (!user || user.isAnonymous) return false;
  try {
    const token = await user.getIdTokenResult();
    return token.claims.admin === true;
  } catch (_) {
    return false;
  }
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
  else st.textContent = `${t("owner_welcome")} ${user.email || user.uid}`;
}

export function initOwnerAdmin() {
  if (typeof initLanguage === "function") initLanguage();
  if (typeof applyI18nDom === "function") applyI18nDom();
  if (!window.firebase?.apps?.length) firebase.initializeApp(FIREBASE_CONFIG);
  connectFirebaseEmulatorsIfRequested(firebase);
  const auth = window.firebase.auth();
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
    const admin = await userHasAdminClaim(user);
    if (!admin) {
      setUi({ user, denied: true, admin: false });
      return;
    }
    setUi({ user, denied: false, admin: true });
    try {
      await loadStats(db);
    } catch (e) {
      document.getElementById("ownerStatus").textContent = t("owner_rules_hint");
    }
  });
}

initOwnerAdmin();
