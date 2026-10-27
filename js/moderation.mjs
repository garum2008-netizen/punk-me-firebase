const FIREBASE_CONFIG = {
  apiKey: "AIzaSyACAXPV9H4vfWNUoRYEWzXi6CSX0kpCaho",
  authDomain: "punk-me-40605.firebaseapp.com",
  databaseURL: "https://punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "punk-me-40605",
  messagingSenderId: "761070335468",
  appId: "1:761070335468:web:4bffd5120ef98e79f47cc9",
  storageBucket: "punk-me-40605.firebasestorage.app"
};

firebase.initializeApp(FIREBASE_CONFIG);

function workerBase() {
  const stored = localStorage.getItem("punk_safe_chat_worker") || "";
  return (window.__PUNK_SAFE_CHAT_URL || stored || "").replace(/\/$/, "");
}

async function modFetch(path) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Sign in first");
  const token = await user.getIdToken();
  const res = await fetch(`${workerBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.status);
  return json;
}

async function modPost(path, body) {
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("Sign in first");
  const token = await user.getIdToken();
  const res = await fetch(`${workerBase()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.status);
  return json;
}

document.getElementById("saveUrl")?.addEventListener("click", () => {
  const v = document.getElementById("workerUrl")?.value?.trim();
  if (v) localStorage.setItem("punk_safe_chat_worker", v);
});

document.getElementById("loadReports")?.addEventListener("click", async () => {
  const out = document.getElementById("out");
  try {
    const data = await modFetch("/api/mod/reports");
    out.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    out.textContent = String(e.message || e);
  }
});

firebase.auth().onAuthStateChanged(user => {
  const out = document.getElementById("out");
  if (!user) {
    firebase.auth().signInAnonymously().catch(err => {
      out.textContent = "Auth failed: " + err.message;
    });
  } else {
    out.textContent = "Signed in as " + user.uid + ". Load reports when Worker URL is set.";
  }
});

window.punkMod = { modPost, modFetch };
