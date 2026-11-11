/** Connect compat Firebase to local emulators when ?firebaseEmulator=1 (tests only). */
const LOOPBACK_EMULATOR_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function isLoopbackEmulatorHost(host) {
  const h = String(host || "").trim().toLowerCase();
  return LOOPBACK_EMULATOR_HOSTS.has(h);
}

export function isLocalFirebaseTestHost(hostname) {
  try {
    const h = String(hostname ?? globalThis.location?.hostname ?? "").toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost");
  } catch (_) {
    return false;
  }
}

/** Null unless this page is local and the emulator host is loopback. */
export function resolveFirebaseEmulatorTarget(search, pageHost) {
  try {
    const q = new URLSearchParams(search || "");
    if (!q.has("firebaseEmulator")) return null;
    if (!isLocalFirebaseTestHost(pageHost)) return null;
    const requested = q.get("firebaseEmulatorHost") || "127.0.0.1";
    if (!isLoopbackEmulatorHost(requested)) return null;
    const dbPort = parseInt(q.get("firebaseEmulatorDbPort") || "", 10);
    const authPort = parseInt(q.get("firebaseEmulatorAuthPort") || "", 10);
    if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) return null;
    if (!Number.isInteger(authPort) || authPort < 1 || authPort > 65535) return null;
    return { host: requested, dbPort, authPort };
  } catch (_) {
    return null;
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
    const target = resolveFirebaseEmulatorTarget(globalThis.location?.search || "", globalThis.location?.hostname);
    if (!target) {
      if (isFirebaseEmulatorQueryRequested() && !isLocalFirebaseTestHost()) {
        console.warn("firebaseEmulator=1 ignored on non-local host");
      }
      return false;
    }
    if (firebase?.database) {
      firebase.database().useEmulator(target.host, target.dbPort);
    }
    if (firebase?.auth) {
      firebase.auth().useEmulator(`http://${target.host}:${target.authPort}`);
    }
    globalThis.__punkFirebaseEmulatorConnected = true;
    return true;
  } catch (e) {
    console.warn("firebase emulator connect failed", e);
    return false;
  }
}
