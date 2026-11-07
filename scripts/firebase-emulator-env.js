#!/usr/bin/env node
/** Read Auth/Database emulator host:port from firebase.json (single source of truth). */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const firebaseJson = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
const dbPort = firebaseJson.emulators?.database?.port;
const authPort = firebaseJson.emulators?.auth?.port;

if (!dbPort || !authPort) {
  throw new Error("firebase.json must define emulators.database.port and emulators.auth.port");
}

const DB_HOST = process.env.FIREBASE_EMULATOR_DB_HOST || "127.0.0.1";
const AUTH_HOST = process.env.FIREBASE_EMULATOR_AUTH_HOST || "127.0.0.1";

function applyFirebaseEmulatorEnv(extra = {}) {
  process.env.FIREBASE_EMULATOR = extra.FIREBASE_EMULATOR || process.env.FIREBASE_EMULATOR || "1";
  process.env.FIREBASE_DATABASE_EMULATOR_HOST =
    extra.FIREBASE_DATABASE_EMULATOR_HOST ||
    process.env.FIREBASE_DATABASE_EMULATOR_HOST ||
    `${DB_HOST}:${dbPort}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST =
    extra.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    `${AUTH_HOST}:${authPort}`;
  return {
    dbPort,
    authPort,
    FIREBASE_DATABASE_EMULATOR_HOST: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
    FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST
  };
}

module.exports = {
  dbPort,
  authPort,
  DB_HOST,
  AUTH_HOST,
  applyFirebaseEmulatorEnv
};
