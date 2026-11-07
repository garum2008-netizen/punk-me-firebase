/** Connect compat Firebase to local emulators when ?firebaseEmulator=1 (tests only). */
export function isLocalFirebaseTestHost() {
  try {
    const h = globalThis.location?.hostname?.toLowerCase?.() || "";
    return h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost");
  } catch (_) {
    return false;
  }
}

export function isFirebaseEmulatorQueryRequested() {
  try {
    return new URLSearchParams(globalThis.location?.search || "").has("firebaseEmulator");
  } catch (_) {
    return false;
  }
}

/** True after a successful useEmulator() call in this page. */
export function isFirebaseEmulatorConnected() {
  return globalThis.__punkFirebaseEmulatorConnected === true;
}

export function connectFirebaseEmulatorsIfRequested(firebase) {
  globalThis.__punkFirebaseEmulatorConnected = false;
  try {
    const q = new URLSearchParams(globalThis.location?.search || "");
    if (!q.has("firebaseEmulator")) return false;
    if (!isLocalFirebaseTestHost()) {
      console.warn("firebaseEmulator=1 ignored on non-local host");
      return false;
    }
    const host = q.get("firebaseEmulatorHost") || "127.0.0.1";
    const dbPortRaw = q.get("firebaseEmulatorDbPort");
    const authPortRaw = q.get("firebaseEmulatorAuthPort");
    if (!dbPortRaw || !authPortRaw) {
      console.warn("firebaseEmulator=1 requires firebaseEmulatorDbPort and firebaseEmulatorAuthPort query params");
      return false;
    }
    const dbPort = parseInt(dbPortRaw, 10);
    const authPort = parseInt(authPortRaw, 10);
    if (firebase?.database) {
      firebase.database().useEmulator(host, dbPort);
    }
    if (firebase?.auth) {
      firebase.auth().useEmulator(`http://${host}:${authPort}`);
    }
    globalThis.__punkFirebaseEmulatorConnected = true;
    return true;
  } catch (e) {
    console.warn("firebase emulator connect failed", e);
    return false;
  }
}
