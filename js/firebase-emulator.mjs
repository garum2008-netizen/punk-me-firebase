/** Connect compat Firebase to local emulators when ?firebaseEmulator=1 (tests only). */
export function connectFirebaseEmulatorsIfRequested(firebase) {
  try {
    const q = new URLSearchParams(globalThis.location?.search || "");
    if (!q.has("firebaseEmulator")) return;
    const host = q.get("firebaseEmulatorHost") || "127.0.0.1";
    const dbPortRaw = q.get("firebaseEmulatorDbPort");
    const authPortRaw = q.get("firebaseEmulatorAuthPort");
    if (!dbPortRaw || !authPortRaw) {
      console.warn("firebaseEmulator=1 requires firebaseEmulatorDbPort and firebaseEmulatorAuthPort query params");
      return;
    }
    const dbPort = parseInt(dbPortRaw, 10);
    const authPort = parseInt(authPortRaw, 10);
    if (firebase?.database) {
      firebase.database().useEmulator(host, dbPort);
    }
    if (firebase?.auth) {
      firebase.auth().useEmulator(`http://${host}:${authPort}`);
    }
  } catch (e) {
    console.warn("firebase emulator connect failed", e);
  }
}
