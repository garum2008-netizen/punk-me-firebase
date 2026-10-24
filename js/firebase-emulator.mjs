/** Connect compat Firebase to local emulators when ?firebaseEmulator=1 (tests only). */
export function connectFirebaseEmulatorsIfRequested(firebase) {
  try {
    const q = new URLSearchParams(globalThis.location?.search || "");
    if (!q.has("firebaseEmulator")) return;
    const host = q.get("firebaseEmulatorHost") || "127.0.0.1";
    const dbPort = parseInt(q.get("firebaseEmulatorDbPort") || "9000", 10);
    const authPort = parseInt(q.get("firebaseEmulatorAuthPort") || "9099", 10);
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
