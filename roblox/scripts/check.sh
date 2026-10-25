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
echo "OK: build/PunkMeAngel_Ep1.rbxlx"
