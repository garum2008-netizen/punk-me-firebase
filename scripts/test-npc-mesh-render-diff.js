#!/usr/bin/env node
/** Room hero GLBs: vertex counts match main; optional render sanity via bbox (same mesh data). */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const EXPECTED = {
  "assets/models/meshy/mohawk.glb": 51317,
  "assets/models/meshy/cobalt.glb": 43317,
  "assets/models/meshy/punk_pink.glb": 20403,
  "assets/models/meshy/razor.glb": 53190,
  "assets/models/pets/punk_dog.glb": 4256
};

function glbVertexCount(absPath) {
  const buf = fs.readFileSync(absPath);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  let verts = 0;
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const acc = prim.attributes?.POSITION;
      if (acc == null) continue;
      verts += json.accessors[acc]?.count || 0;
    }
  }
  return verts;
}

let failed = 0;
for (const [rel, want] of Object.entries(EXPECTED)) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error("FAIL: missing", rel);
    failed++;
    continue;
  }
  const got = glbVertexCount(abs);
  if (got !== want) {
    console.error(`FAIL: ${rel} verts ${got} !== main ${want}`);
    failed++;
  } else {
    console.log("OK:", path.basename(rel), "verts", got);
  }
}

if (failed) {
  console.error(`test-npc-mesh-render-diff: ${failed} failed`);
  process.exit(1);
}
console.log("test-npc-mesh-render-diff: PASS (main vertex parity)");
