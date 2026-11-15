#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
eval "$(node -e "const e=require('./scripts/firebase-emulator-env.js'); e.applyFirebaseEmulatorEnv(); console.log('export FIREBASE_DATABASE_EMULATOR_HOST='+process.env.FIREBASE_DATABASE_EMULATOR_HOST); console.log('export FIREBASE_AUTH_EMULATOR_HOST='+process.env.FIREBASE_AUTH_EMULATOR_HOST); console.log('export FIREBASE_EMULATOR=1');")"
export ORDINARY_PASS=t209-ch1-full
export ORDINARY_DESKTOP_ONLY=1
export PUNK_HEADED="${PUNK_HEADED:-1}"
export PUNK_FFMPEG_RECORD="${PUNK_FFMPEG_RECORD:-0}"
exec node scripts/capture-ice-ordinary-path-footage.js