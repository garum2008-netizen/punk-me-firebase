import { punkSignOut } from "./account-auth.mjs";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyACAXPV9H4vfWNUoRYEWzXi6CSX0kpCaho",
  authDomain: "punk-me-40605.firebaseapp.com",
  databaseURL: "https://punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "punk-me-40605",
  messagingSenderId: "761070335468",
  appId: "1:761070335468:web:4bffd5120ef98e79f47cc9",
  storageBucket: "punk-me-40605.firebasestorage.app"
};
const OWNER_EMAIL = "garum2008@gmail.com";
const GAME_VERSION = "living3d-v22r5-accounts";

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function isOwnerUser(user) {
  return user && user.email === OWNER_EMAIL && user.emailVerified;
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

function setUi({ user, denied }) {
  document.getElementById("ownerGameVersion").textContent = GAME_VERSION;
  document.getElementById("ownerSignIn").hidden = !!user;
  document.getElementById("ownerPanel").hidden = !user || denied;
  document.getElementById("ownerDenied").hidden = !user || !denied;
  const st = document.getElementById("ownerStatus");
  if (!user) st.textContent = t("owner_sign_in_prompt");
  else if (denied) st.textContent = user.email || "";
  else st.textContent = `${t("owner_welcome")} ${user.email}`;
}

export function initOwnerAdmin() {
  if (!window.firebase?.apps?.length) firebase.initializeApp(FIREBASE_CONFIG);
  const auth = window.firebase.auth();
  const db = window.firebase.database();

  document.getElementById("ownerBtnGoogle")?.addEventListener("click", async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
    } catch (e) {
      if (e.code === "auth/popup-blocked") await auth.signInWithRedirect(provider);
    }
  });
  document.getElementById("ownerBtnEmail")?.addEventListener("click", async () => {
    const email = prompt(t("auth_email_prompt"));
    const pass = prompt(t("auth_password_prompt"));
    if (email && pass) await auth.signInWithEmailAndPassword(email, pass);
  });
  document.getElementById("ownerSignOut")?.addEventListener("click", () => punkSignOut());

  auth.onAuthStateChanged(async user => {
    if (!user || user.isAnonymous) {
      setUi({ user: null, denied: false });
      return;
    }
    if (!isOwnerUser(user)) {
      setUi({ user, denied: true });
      return;
    }
    setUi({ user, denied: false });
    try {
      await loadStats(db);
    } catch (e) {
      document.getElementById("ownerStatus").textContent = t("owner_rules_hint");
    }
  });

}

initOwnerAdmin();
