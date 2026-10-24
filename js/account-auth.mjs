/**
 * Player accounts: link anonymous → Google / email, sign-in, sign-out.
 * Uses Firebase compat (global firebase.auth()).
 */

const REDIRECT_KEY = "punkme_auth_redirect";

const REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment"
]);

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function toast(msg) {
  window.toast?.(msg);
}

function waitForFirebaseApp() {
  if (window.firebase?.apps?.length) return Promise.resolve();
  if (window.__punkFirebaseReady) return window.__punkFirebaseReady;
  return new Promise(resolve => {
    window.addEventListener("punkme-firebase-ready", () => resolve(), { once: true });
  });
}

function getAuth() {
  if (!window.firebase?.apps?.length) return null;
  return window.firebase.auth();
}

function googleProvider() {
  return new firebase.auth.GoogleAuthProvider();
}

export function isAccountModalOpen() {
  return document.getElementById("accountModal")?.classList.contains("active") ?? false;
}

function shouldForceRedirect() {
  return Boolean(window.__punkForceAuthRedirect);
}

export function authErrorMessage(code, { emailForm = false } = {}) {
  if (!code) return t("auth_err_generic");
  if (code === "auth/operation-not-allowed" && emailForm) {
    return t("auth_err_email_unavailable");
  }
  const map = {
    "auth/popup-blocked": t("auth_err_popup"),
    "auth/cancelled-popup-request": t("auth_err_cancelled"),
    "auth/email-already-in-use": t("auth_err_email_used"),
    "auth/credential-already-in-use": t("auth_err_account_exists"),
    "auth/wrong-password": t("auth_err_wrong_password"),
    "auth/user-not-found": t("auth_err_no_user"),
    "auth/weak-password": t("auth_err_weak_password"),
    "auth/invalid-email": t("auth_err_invalid_email"),
    "auth/operation-not-allowed": t("auth_err_providers_disabled"),
    "auth/operation-not-supported-in-this-environment": t("auth_err_unsupported_env"),
    "auth/network-request-failed": t("auth_err_network"),
    "auth/too-many-requests": t("auth_err_too_many_requests"),
    "auth/user-disabled": t("auth_err_user_disabled"),
    "auth/invalid-credential": t("auth_err_invalid_credential"),
    "auth/account-exists-with-different-credential": t("auth_err_account_exists"),
    "auth/requires-recent-login": t("auth_err_requires_recent_login")
  };
  return map[code] || t("auth_err_generic");
}

function setModalOpen(open) {
  const m = document.getElementById("accountModal");
  if (!m) return;
  if (open) {
    document.getElementById("howToOverlay")?.classList.remove("active");
  }
  m.classList.toggle("active", open);
  document.body.classList.toggle("account-modal-open", open);
}

function showConflictDialog({ email, credential, providerLabel }) {
  const dlg = document.getElementById("accountConflictDialog");
  if (!dlg) return Promise.resolve("cancel");
  const body = dlg.querySelector(".account-conflict-body");
  if (body) {
    body.textContent = t("auth_conflict_body").replace("{email}", email || providerLabel || "");
  }
  dlg.classList.add("active");
  return new Promise(resolve => {
    const onKeep = () => {
      dlg.classList.remove("active");
      cleanup();
      resolve("cancel");
    };
    const onUse = () => {
      dlg.classList.remove("active");
      cleanup();
      resolve("signin");
    };
    const btnKeep = dlg.querySelector("[data-conflict=keep]");
    const btnUse = dlg.querySelector("[data-conflict=use]");
    function cleanup() {
      btnKeep?.removeEventListener("click", onKeep);
      btnUse?.removeEventListener("click", onUse);
    }
    btnKeep?.addEventListener("click", onKeep);
    btnUse?.addEventListener("click", onUse);
  });
}

async function signInWithExistingCredential(credential) {
  const auth = getAuth();
  if (!auth || !credential) return;
  await auth.signInWithCredential(credential);
  toast(t("auth_signed_in_existing"));
}

async function redirectGoogleAuth(mode) {
  const auth = getAuth();
  if (!auth) return;
  const provider = googleProvider();
  const user = auth.currentUser;
  sessionStorage.setItem(REDIRECT_KEY, mode === "link" ? "link_google" : "signin_google");
  toast(t("auth_redirect_try"));
  if (mode === "link" && user) {
    await user.linkWithRedirect(provider);
  } else {
    await auth.signInWithRedirect(provider);
  }
}

/**
 * Start Google popup/link synchronously (must run in the user-gesture call stack).
 * Returns the Firebase promise, or null if auth is unavailable.
 */
export function beginGooglePopupAuth() {
  const auth = getAuth();
  if (!auth) return null;
  const provider = googleProvider();
  const user = auth.currentUser;
  if (user?.isAnonymous) {
    return { mode: "link", promise: user.linkWithPopup(provider) };
  }
  return { mode: "signin", promise: auth.signInWithPopup(provider) };
}

async function handleGooglePopupError(e, mode) {
  if (e?.code === "auth/credential-already-in-use" && e.credential) {
    const email = e.email || e.customData?.email || "Google";
    const choice = await showConflictDialog({ email, credential: e.credential, providerLabel: "Google" });
    if (choice === "signin") await signInWithExistingCredential(e.credential);
    return;
  }
  if (REDIRECT_FALLBACK_CODES.has(e?.code)) {
    await redirectGoogleAuth(mode);
    return;
  }
  toast(authErrorMessage(e?.code));
}

function completeGooglePopupSuccess(mode) {
  if (mode === "link") toast(t("auth_linked_ok"));
  else toast(t("auth_signed_in"));
}

/**
 * Google sign-in / link entry for click handlers (popup first; no await before popup).
 */
export function onGoogleSignInClick() {
  if (shouldForceRedirect()) {
    redirectGoogleAuth(getAuth()?.currentUser?.isAnonymous ? "link" : "signin").catch(e =>
      toast(authErrorMessage(e?.code))
    );
    return;
  }
  const started = beginGooglePopupAuth();
  if (!started) {
    toast(t("auth_err_generic"));
    return;
  }
  started.promise
    .then(() => completeGooglePopupSuccess(started.mode))
    .catch(e => handleGooglePopupError(e, started.mode));
}

async function linkEmailPassword(user, email, password) {
  const auth = getAuth();
  const cred = firebase.auth.EmailAuthProvider.credential(email, password);
  try {
    await user.linkWithCredential(cred);
    toast(t("auth_linked_ok"));
  } catch (e) {
    if (e.code === "auth/email-already-in-use" || e.code === "auth/credential-already-in-use") {
      const choice = await showConflictDialog({ email, credential: e.credential, providerLabel: email });
      if (choice === "signin") {
        if (e.credential) await signInWithExistingCredential(e.credential);
        else await auth.signInWithEmailAndPassword(email, password);
      }
      return;
    }
    throw e;
  }
}

async function registerEmailPassword(user, email, password) {
  const cred = firebase.auth.EmailAuthProvider.credential(email, password);
  try {
    await user.linkWithCredential(cred);
    toast(t("auth_linked_ok"));
  } catch (e) {
    if (e.code === "auth/email-already-in-use") {
      const methods = await firebase.auth().fetchSignInMethodsForEmail(email);
      if (methods.includes("password")) {
        const choice = await showConflictDialog({ email, credential: null, providerLabel: email });
        if (choice === "signin") await getAuth().signInWithEmailAndPassword(email, password);
      } else {
        toast(t("auth_err_email_used"));
      }
      return;
    }
    throw e;
  }
}

async function signInEmail(email, password) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (user?.isAnonymous) {
    await registerEmailPassword(user, email, password);
    return;
  }
  await auth.signInWithEmailAndPassword(email, password);
  toast(t("auth_signed_in"));
}

async function resetPassword(email) {
  await getAuth().sendPasswordResetEmail(email);
  toast(t("auth_reset_sent"));
}

export function updateAccountAuthUi(user) {
  const signedIn = user && !user.isAnonymous;
  const label = signedIn
    ? user.displayName || user.email || t("auth_account")
    : null;
  document.querySelectorAll("[data-account-signed-in]").forEach(el => {
    el.hidden = !signedIn;
  });
  document.querySelectorAll("[data-account-signed-out]").forEach(el => {
    el.hidden = signedIn;
  });
  document.querySelectorAll("[data-account-label]").forEach(el => {
    el.textContent = label || "";
  });
  const hud = document.getElementById("accountHudChip");
  if (hud) {
    hud.hidden = !signedIn;
    hud.title = signedIn ? (user.email || "") : "";
    hud.classList.toggle("linked", signedIn);
  }
}

export async function punkSignOut() {
  await waitForFirebaseApp();
  const auth = getAuth();
  if (!auth) return;
  await auth.signOut();
  toast(t("auth_signed_out"));
}

async function handleRedirectResult() {
  const auth = getAuth();
  if (!auth) return;
  try {
    const result = await auth.getRedirectResult();
    sessionStorage.removeItem(REDIRECT_KEY);
    if (result?.user) {
      toast(t("auth_signed_in"));
    }
  } catch (e) {
    sessionStorage.removeItem(REDIRECT_KEY);
    if (e.code === "auth/credential-already-in-use" && e.credential) {
      const choice = await showConflictDialog({
        email: e.email,
        credential: e.credential,
        providerLabel: "Google"
      });
      if (choice === "signin") await signInWithExistingCredential(e.credential);
    } else if (e.code) {
      toast(authErrorMessage(e.code));
    }
  }
}

function wireModal() {
  document.getElementById("btnAccountOpen")?.addEventListener("click", () => setModalOpen(true));
  document.getElementById("btnAccountOpenLoading")?.addEventListener("click", () => setModalOpen(true));
  document.getElementById("btnAccountOpenChar")?.addEventListener("click", () => setModalOpen(true));
  document.getElementById("accountModalClose")?.addEventListener("click", () => setModalOpen(false));
  document.getElementById("btnAccountGoogle")?.addEventListener("click", () => onGoogleSignInClick());
  document.getElementById("btnAccountSignOut")?.addEventListener("click", () => punkSignOut());
  document.getElementById("accountEmailForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("accountEmail")?.value?.trim();
    const pass = document.getElementById("accountPassword")?.value || "";
    if (!email || !pass) return;
    try {
      await signInEmail(email, pass);
      setModalOpen(false);
    } catch (err) {
      toast(authErrorMessage(err.code, { emailForm: true }));
    }
  });
  document.getElementById("btnAccountReset")?.addEventListener("click", async () => {
    const email = document.getElementById("accountEmail")?.value?.trim();
    if (!email) {
      toast(t("auth_enter_email"));
      return;
    }
    try {
      await resetPassword(email);
    } catch (err) {
      toast(authErrorMessage(err.code, { emailForm: true }));
    }
  });
}

export async function initAccountAuth() {
  wireModal();
  window.addEventListener("hashchange", () => {
    if (location.hash === "#account") setModalOpen(true);
  });
  await waitForFirebaseApp();
  const auth = getAuth();
  if (!auth) return;
  if (location.hash === "#account") setModalOpen(true);
  await handleRedirectResult();
  updateAccountAuthUi(auth.currentUser);
  auth.onAuthStateChanged(u => {
    updateAccountAuthUi(u);
    if (u && !u.isAnonymous && window.me) {
      window.me.linkedAuth = {
        email: u.email || null,
        provider: u.providerData?.[0]?.providerId || null
      };
      if (window.__playerLoaded) window.saveMe?.();
    }
  });
}

/** Test hooks */
export async function __testLinkEmailKeepUid(email, password) {
  const auth = getAuth();
  const user = auth?.currentUser;
  if (!user?.isAnonymous) throw new Error("need anonymous user");
  await user.linkWithCredential(firebase.auth.EmailAuthProvider.credential(email, password));
  return { uid: auth.currentUser.uid };
}

window.__punkSignOut = punkSignOut;
window.__punkUpdateAccountUi = updateAccountAuthUi;
window.__punkIsAccountModalOpen = isAccountModalOpen;
window.__punkAccountAuthTestLink = __testLinkEmailKeepUid;
window.__punkWaitFirebase = waitForFirebaseApp;
window.__punkBeginGooglePopupAuth = beginGooglePopupAuth;
window.__punkOnGoogleSignInClick = onGoogleSignInClick;
