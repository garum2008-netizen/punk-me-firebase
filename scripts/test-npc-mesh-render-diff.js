#!/usr/bin/env node
/**
 * Playwright: render each hero GLB + dog vs origin/main at fixed camera; MAD ≤ 2.0 on RGB.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execSync } = require("child_process");
const { chromium } = require("playwright");
const sharp = require("sharp");
const {
  exitIfMissingFirebaseEmulatorEnv,
  firebaseEmulatorQueryString,
  prepareProdHostSimContext,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");

exitIfMissingFirebaseEmulatorEnv();
const emulatorQs = firebaseEmulatorQueryString();
const root = path.join(__dirname, "..");
const MAD_MAX = 2.0;
const HEROES = [
  { id: "mohawk", glb: "assets/models/meshy/mohawk.glb" },
  { id: "cobalt", glb: "assets/models/meshy/cobalt.glb" },
  { id: "razor", glb: "assets/models/meshy/razor.glb" },
  { id: "vienna", glb: "assets/models/meshy/punk_pink.glb" },
  { id: "dog", glb: "assets/models/pets/punk_dog.glb", dog: true }
];

const mainGlbCache = path.join(root, ".tmp-main-glb-render-diff");
const MAIN_GLB = {};

function ensureMainGlbs() {
  fs.mkdirSync(mainGlbCache, { recursive: true });
  for (const h of HEROES) {
    const dest = path.join(mainGlbCache, path.basename(h.glb));
    if (!fs.existsSync(dest)) {
      const buf = execSync(`git show origin/main:${h.glb}`, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
      fs.writeFileSync(dest, buf);
    }
    MAIN_GLB[h.glb] = dest;
  }
}

function serveWithGlbOverride(port, useMainGlbs) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".glb": "model/gltf-binary"
  };
  const srv = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const rel = urlPath.replace(/^\//, "");
    if (useMainGlbs && rel.endsWith(".glb") && MAIN_GLB[rel]) {
      res.writeHead(200, { "Content-Type": "model/gltf-binary" });
      fs.createReadStream(MAIN_GLB[rel]).pipe(res);
      return;
    }
    const abs = path.join(root, rel);
    if (!abs.startsWith(root) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(abs).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(abs).pipe(res);
  });
  return new Promise((resolve, reject) => {
    srv.listen(port, "127.0.0.1", () => resolve(srv));
    srv.on("error", reject);
  });
}

async function captureMeshRenders(page, base) {
  return page.evaluate(async baseUrl => {
    const THREE = await import("three");
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const { MeshoptDecoder } = await import(`${baseUrl}/js/vendor/meshopt_decoder.module.js`);
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    async function renderGlb(url, yaw = 0.42) {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111111);
      const rootObj = gltf.scene;
      scene.add(rootObj);
      rootObj.rotation.y = yaw;
      const box = new THREE.Box3().setFromObject(rootObj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const span = Math.max(size.x, size.y, size.z, 0.01);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(512, 512);
      const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
      const dist = span * 2.35;
      camera.position.set(center.x + dist * 0.55, center.y + span * 0.22, center.z + dist * 0.72);
      camera.lookAt(center.x, center.y + span * 0.08, center.z);
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(2, 4, 3);
      scene.add(key);
      renderer.render(scene, camera);
      const dataUrl = canvas.toDataURL("image/png");
      renderer.dispose();
      return dataUrl;
    }

    const heroes = [
      { id: "mohawk", url: `${baseUrl}/assets/models/meshy/mohawk.glb` },
      { id: "cobalt", url: `${baseUrl}/assets/models/meshy/cobalt.glb` },
      { id: "razor", url: `${baseUrl}/assets/models/meshy/razor.glb?v=2` },
      { id: "vienna", url: `${baseUrl}/assets/models/meshy/punk_pink.glb` },
      { id: "dog", url: `${baseUrl}/assets/models/pets/punk_dog.glb`, yaw: 0.55 }
    ];
    const out = {};
    for (const h of heroes) {
      out[h.id] = await renderGlb(h.url, h.yaw ?? 0.42);
    }
    return out;
  }, base);
}

async function madBetweenPngs(dataUrlA, dataUrlB) {
  const bufA = Buffer.from(dataUrlA.split(",")[1], "base64");
  const bufB = Buffer.from(dataUrlB.split(",")[1], "base64");
  const { data: a, info } = await sharp(bufA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: b } = await sharp(bufB)
    .resize(info.width, info.height)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] < 32 && b[i + 3] < 32) continue;
    sum +=
      (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
    n++;
  }
  return n ? sum / n : 0;
}

async function runPass(useMainGlbs, port) {
  const srv = await serveWithGlbOverride(port, useMainGlbs);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  await prepareProdHostSimContext(ctx, { prodHostSim: false, firebaseStub: true });
  const page = await ctx.newPage();
  await installProdFirebaseRouteBlock(page);
  try {
    await page.goto(`http://127.0.0.1:${port}/?solo=1${emulatorQs}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000
    });
    await page.waitForFunction(() => typeof window.fetch === "function", undefined, { timeout: 30000 });
    return await captureMeshRenders(page, `http://127.0.0.1:${port}`);
  } finally {
    await page.close();
    await ctx.close();
    await browser.close();
    srv.close();
  }
}

(async () => {
  ensureMainGlbs();
  const branchPort = 3810;
  const mainPort = 3811;
  const branch = await runPass(false, branchPort);
  const baseline = await runPass(true, mainPort);
  let failed = 0;
  for (const h of HEROES) {
    const mad = await madBetweenPngs(branch[h.id], baseline[h.id]);
    console.log(`MAD ${h.id}: ${mad.toFixed(3)} (max ${MAD_MAX})`);
    if (mad > MAD_MAX) failed++;
  }
  if (failed) {
    console.error(`test-npc-mesh-render-diff: ${failed} heroes exceeded MAD ${MAD_MAX}`);
    process.exit(1);
  }
  console.log("test-npc-mesh-render-diff: PASS");
})().catch(e => {
  console.error("test-npc-mesh-render-diff: FAIL", e);
  process.exit(1);
});
