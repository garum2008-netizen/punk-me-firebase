/**
 * Regression checks for the three publish blockers:
 * emulator host allowlist, owner session denial, unused owner email removed.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  resolveFirebaseEmulatorTarget,
  isLoopbackEmulatorHost
} from "../js/firebase-emulator.mjs";
import { ownerSessionAllowed } from "../js/owner-session.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  }
}

const attack = "firebaseEmulator=1&firebaseEmulatorHost=attacker.example&firebaseEmulatorDbPort=9000&firebaseEmulatorAuthPort=9099";
assert(resolveFirebaseEmulatorTarget(attack, "punk-me-angel.example") === null, "public link cannot retarget login");
assert(resolveFirebaseEmulatorTarget(attack, "127.0.0.1") === null, "loopback page still rejects an external emulator host");
assert(resolveFirebaseEmulatorTarget("firebaseEmulator=1&firebaseEmulatorDbPort=9000&firebaseEmulatorAuthPort=9099", "evil.com") === null, "default host is not used off localhost");
const local = resolveFirebaseEmulatorTarget(
  "firebaseEmulator=1&firebaseEmulatorHost=127.0.0.1&firebaseEmulatorDbPort=9000&firebaseEmulatorAuthPort=9099",
  "localhost"
);
assert(local && local.host === "127.0.0.1" && local.dbPort === 9000 && local.authPort === 9099, "local emulator target allowed");
assert(resolveFirebaseEmulatorTarget("firebaseEmulator=1&firebaseEmulatorHost=localhost&firebaseEmulatorDbPort=0&firebaseEmulatorAuthPort=9099", "localhost") === null, "port 0 rejected");
assert(isLoopbackEmulatorHost("127.0.0.1.attacker.example") === false, "lookalike host rejected");

const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
assert(!game.includes("OWNER_EMAIL"), "owner email constant removed");
assert(!game.includes("garum2008@gmail.com"), "owner email string removed from the game");
assert(game.includes("isLoopbackEmulatorHost"), "game rejects non-loopback emulator hosts");
assert(!game.includes("owner: isOwner"), "save payload does not copy a browser owner flag");

const rules = JSON.parse(fs.readFileSync(path.join(root, "database.rules.json"), "utf8"));
const ownerRule = rules.rules.players.$uid.owner[".validate"];
assert(ownerRule.includes("auth.token.admin === true"), "owner true requires an admin token");
assert(ownerRule.includes("newData.val() == false"), "owner false is the default a player may write");
assert(rules.rules.players[".read"].includes("auth.token.admin === true"), "player list read requires admin");
assert(rules.rules[".read"] === false && rules.rules[".write"] === false, "database root denies by default");

assert(ownerSessionAllowed({ signedIn: false, anonymous: false, adminClaim: true, databaseConfirmed: true }) === false, "signed-out denied");
assert(ownerSessionAllowed({ signedIn: true, anonymous: true, adminClaim: true, databaseConfirmed: true }) === false, "anonymous denied");
assert(ownerSessionAllowed({ signedIn: true, anonymous: false, adminClaim: false, databaseConfirmed: true }) === false, "missing admin claim denied");
assert(ownerSessionAllowed({ signedIn: true, anonymous: false, adminClaim: true, databaseConfirmed: false }) === false, "database denial blocks the owner panel");
assert(ownerSessionAllowed({ signedIn: true, anonymous: false, adminClaim: true, databaseConfirmed: true }) === true, "admin claim plus database read allows the owner");

const ownerSrc = fs.readFileSync(path.join(root, "js/owner-admin.mjs"), "utf8");
assert(ownerSrc.includes("getIdTokenResult(true)"), "owner session refreshes the token");
assert(ownerSrc.includes('db.ref("players")'), "owner panel confirms with a database read");
assert(!ownerSrc.includes("user.email"), "owner screen does not print an email address");

if (failed) {
  console.error(`security-publish-guards: ${failed} failed`);
  process.exit(1);
}
console.log("security-publish-guards: PASS");
