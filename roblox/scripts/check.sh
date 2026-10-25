#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$ROOT/.tools/bin:$PATH"
cd "$ROOT"
mkdir -p build
stylua src tests
selene src
lune run tests/lune/tests.luau
rojo build -o build/PunkMeAngel_Ep1.rbxlx default.project.json
cp build/PunkMeAngel_Ep1.rbxlx release/PunkMeAngel_Ep1.rbxlx
mkdir -p /opt/cursor/artifacts
cp build/PunkMeAngel_Ep1.rbxlx /opt/cursor/artifacts/PunkMeAngel_Ep1.rbxlx
echo "OK: build/PunkMeAngel_Ep1.rbxlx (+ release + artifacts)"
