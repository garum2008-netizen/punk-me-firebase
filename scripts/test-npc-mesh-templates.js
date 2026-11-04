#!/usr/bin/env node
/** Prod: hero NPCs use dedicated meshy GLBs (byte-identical to main); dog present. */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { pathToFileURL } = require("url");

const root = path.join(__dirname, "..");

function assertSameAsMain(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error("FAIL: missing", rel);
    return false;
  }
  try {
    execSync(`git show origin/main:${rel} | cmp -s - "${abs}"`, {
      cwd: root,
      stdio: "pipe"
    });
    return true;
  } catch {
    console.error("FAIL: byte mismatch vs main for", rel);
    return false;
  }
}

function glbVertexCount(absPath) {
  const buf = fs.readFileSync(absPath);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  let verts = 0;
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const acc = prim.attributes?.POSITION;
      if (acc == null) continue;
      const accessor = json.accessors[acc];
      verts += accessor?.count || 0;
    }
  }
  const tex = (json.textures?.length || 0) + (json.images?.length || 0);
  return { verts, tex };
}

function glbBounds(absPath) {
  const buf = fs.readFileSync(absPath);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const acc = prim.attributes?.POSITION;
      if (acc == null) continue;
      const accessor = json.accessors[acc];
      const bv = json.bufferViews[accessor.bufferView];
      const start = (bv.byteOffset || 0) + (accessor.byteOffset || 0);
      const stride = 12;
      for (let i = 0; i < accessor.count; i++) {
        const o = start + i * stride;
        const x = buf.readFloatLE(20 + jsonLen + o);
        const y = buf.readFloatLE(20 + jsonLen + o + 4);
        const z = buf.readFloatLE(20 + jsonLen + o + 8);
        min[0] = Math.min(min[0], x);
        min[1] = Math.min(min[1], y);
        min[2] = Math.min(min[2], z);
        max[0] = Math.max(max[0], x);
        max[1] = Math.max(max[1], y);
        max[2] = Math.max(max[2], z);
      }
    }
  }
  return { min, max };
}

function boundsEqual(a, b, eps = 1e-4) {
  for (let i = 0; i < 3; i++) {
    if (Math.abs(a.min[i] - b.min[i]) > eps) return false;
    if (Math.abs(a.max[i] - b.max[i]) > eps) return false;
  }
  return true;
}

async function main() {
  const mod = await import(pathToFileURL(path.join(root, "js/world/meshy-punk.mjs")).href);
  const { meshyGlbPathForHero } = mod;

  const shipped = JSON.parse(
    fs.readFileSync(path.join(root, "assets/models/meshy/shipped.json"), "utf8")
  );
  let failed = 0;
  for (const id of ["mohawk", "cobalt", "razor", "vienna"]) {
    if (!shipped.includes(id) && id !== "vienna") {
      console.error("FAIL: shipped.json missing", id);
      failed++;
    }
    const rel = meshyGlbPathForHero(id).split("?")[0];
    if (id === "mohawk" && !rel.includes("mohawk.glb")) failed++;
    if (id === "cobalt" && !rel.includes("cobalt.glb")) failed++;
    if (id === "razor" && !rel.includes("razor.glb")) failed++;
    if (id === "vienna" && !rel.includes("punk_pink.glb")) failed++;
  }

  for (const rel of [
    "assets/models/meshy/mohawk.glb",
    "assets/models/meshy/cobalt.glb",
    "assets/models/meshy/razor.glb",
    "assets/models/meshy/punk_pink.glb"
  ]) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      console.error("FAIL: missing", rel);
      failed++;
      continue;
    }
    const mainRel = rel;
    const mainPath = path.join(root, `.tmp-main-hero-${path.basename(rel)}`);
    try {
      execSync(`git show origin/main:${mainRel} > "${mainPath}"`, {
        cwd: root,
        shell: true,
        stdio: "pipe",
        maxBuffer: 64 * 1024 * 1024
      });
      const cur = glbVertexCount(abs);
      const base = glbVertexCount(mainPath);
      if (cur.tex < 1) {
        console.error("FAIL: textures missing in", rel);
        fs.unlinkSync(mainPath);
        failed++;
        continue;
      }
      if (cur.verts !== base.verts) {
        console.error("FAIL: vertex count must equal main exactly", rel, cur.verts, base.verts);
        failed++;
      } else {
        console.log("OK:", path.basename(rel), "verts exact match main", cur.verts);
      }
      if (!boundsEqual(glbBounds(abs), glbBounds(mainPath))) {
        console.error("FAIL: bbox vs main", rel);
        failed++;
      } else {
        console.log("OK:", path.basename(rel), "bbox matches main");
      }
      fs.unlinkSync(mainPath);
    } catch (e) {
      console.error("FAIL: hero compare", rel, e.message);
      failed++;
    }
  }

  const dogPath = path.join(root, "assets/models/pets/punk_dog.glb");
  if (!fs.existsSync(dogPath)) {
    console.error("FAIL: missing punk_dog.glb");
    failed++;
  } else {
    const mainDog = path.join(root, ".tmp-main-dog.glb");
    try {
      fs.writeFileSync(mainDog, execSync("git show origin/main:assets/models/pets/punk_dog.glb", { cwd: root }));
      const cur = glbVertexCount(dogPath);
      const base = glbVertexCount(mainDog);
      fs.unlinkSync(mainDog);
      if (cur.tex < 1) {
        console.error("FAIL: punk_dog.glb missing textures/images");
        failed++;
      }
      if (cur.verts !== base.verts) {
        console.error("FAIL: dog vertex count must equal main exactly", cur.verts, base.verts);
        failed++;
      } else {
        console.log("OK: punk_dog verts exact match main", cur.verts);
      }
    } catch (e) {
      console.error("FAIL: dog compare", e.message);
      failed++;
    }
  }

  const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
  if (/angelina-skins\/shipped.*SHOP|SHOP[\s\S]*angelina-skins\/shipped/.test(gameJs)) {
    console.error("FAIL: SHOP still references Angelina shipped assets");
    failed++;
  }

  if (failed) {
    console.error(`test-npc-mesh-templates: ${failed} failed`);
    process.exit(1);
  }
  console.log("test-npc-mesh-templates: PASS (main-identical GLBs + prod shop icons)");
}

main().catch(e => {
  console.error("test-npc-mesh-templates: FAIL", e);
  process.exit(1);
});
