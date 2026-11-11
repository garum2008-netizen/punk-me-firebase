#!/usr/bin/env node
/** Cemetery showcase must not use pale emissive box placeholder for cemetery_ghost_float. */
const path = require("path");
const { pathToFileURL } = require("url");

async function main() {
  const mod = await import(
    pathToFileURL(path.join(__dirname, "..", "js/world/location-showcase-props.mjs")).href
  );
  const { addShowcaseProps } = mod;
  const THREE = await import("three");
  const root = new THREE.Group();
  addShowcaseProps("cemetery", root);

  const bad = [];
  root.traverse(obj => {
    if (obj.userData?.propTag !== "cemetery_ghost_float") return;
    let node = obj;
    if (obj.isGroup && obj.children.length) node = obj;
    node.traverse(child => {
      if (!child.isMesh) return;
      const geo = child.geometry;
      const emi = child.material?.emissive?.getHex?.() ?? 0;
      if (geo?.type === "BoxGeometry" && emi === 0x88ccff) {
        bad.push("pale emissive box ghost");
      }
      if (geo?.type === "BoxGeometry") {
        bad.push("box geometry on ghost float");
      }
    });
  });

  const ghost = root.children.find(c => c.userData?.propTag === "cemetery_ghost_float");
  if (!ghost) {
    console.error("FAIL: missing cemetery_ghost_float prop");
    process.exit(1);
  }
  const types = new Set();
  ghost.traverse(c => {
    if (c.isMesh && c.geometry?.type) types.add(c.geometry.type);
  });
  if (!types.has("SphereGeometry") && !types.has("CylinderGeometry")) {
    bad.push("expected sheet ghost meshes, got " + [...types].join(","));
  }
  if (bad.length) {
    console.error("FAIL:", bad.join("; "));
    process.exit(1);
  }
  console.log("cemetery-showcase-ghost: PASS", { geometryTypes: [...types] });
}

main().catch(e => {
  console.error("cemetery-showcase-ghost: FAIL", e);
  process.exit(1);
});
