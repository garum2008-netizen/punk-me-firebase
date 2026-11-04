#!/usr/bin/env node
/** Playwright: NPC mesh vertex counts match dedicated GLBs within 3s (prod static + preview). */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const {
  exitIfMissingFirebaseEmulatorEnv,
  prodHostFirebaseStubQueryString,
  prepareProdHostSimContext,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");

exitIfMissingFirebaseEmulatorEnv();
const stubQs = prodHostFirebaseStubQueryString();

const root = path.join(__dirname, "..");
const HOWTO_SEEN_KEY = "punk-howto-seen-v1";

const LOCATIONS = {
  room: ["vienna", "mohawk", "cobalt"],
  street: ["razor", "mohawk", "vienna", "cobalt"],
  cemetery: ["gravedigger", "cobalt"]
};

function serveDir(dir, port) {
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
    const abs = path.join(dir, urlPath.replace(/^\//, ""));
    if (!abs.startsWith(dir) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(abs).toLowerCase();
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    fs.createReadStream(abs).pipe(res);
  });
  return new Promise((resolve, reject) => {
    srv.listen(port, "127.0.0.1", () => resolve(srv));
    srv.on("error", reject);
  });
}

async function loadExpectedVertCounts(page, base) {
  return page.evaluate(async baseUrl => {
    const { loadMeshyTemplateForCharacter, getTemplateForCharacter, createCc0Actor } = await import(
      `${baseUrl}/js/world/meshy-punk.mjs`
    );
    const shipped = await fetch(`${baseUrl}/assets/models/meshy/shipped.json`).then(r => r.json());
    function verts(root) {
      let n = 0;
      root?.traverse(o => {
        if (o.isMesh && o.geometry?.attributes?.position) n += o.geometry.attributes.position.count;
      });
      return n;
    }
    const out = {};
    for (const id of shipped) {
      await loadMeshyTemplateForCharacter(id);
      const tpl = getTemplateForCharacter(id, { allowFallback: false });
      const built = createCc0Actor(tpl, id, {}, { actorId: `probe_${id}` });
      out[id] = verts(built.root);
    }
    out.gravedigger = out.vienna;
    out.ghost = out.vienna;
    return out;
  }, base);
}

async function bootGame(page, base, preview) {
  const qs = preview
    ? `lifeCh1E2e=1&npcVert=1${stubQs}`
    : `solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1&npcVert=1${stubQs}`;
  await page.goto(`${base}/?${qs}`, { waitUntil: "load", timeout: 120000 });
  if (preview) {
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
    const confirm = page.locator(
      '#charSelectPortraits #charSelectConfirm, #charSelectConfirm'
    );
    if (await confirm.isVisible({ timeout: 8000 }).catch(() => false)) {
      await confirm.click();
    }
  } else {
    await page.waitForSelector(
      '#charSelectPortraits #charSelectConfirm, #charSelectConfirm',
      { timeout: 120000 }
    );
    await page.click("#charSelectConfirm");
  }
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await page.waitForFunction(() => window.World3D?.isReady?.() === true, undefined, { timeout: 30000 });
}

async function assertLocationNpcs(page, locId, expected, label) {
  const ids = LOCATIONS[locId];
  await page.evaluate(id => {
    if (window.me.location !== id) window.goLocation(id);
  }, locId);
  await page.waitForFunction(l => window.me?.location === l, locId, { timeout: 15000 });
  const deadline = Date.now() + 3000;
  let last = null;
  while (Date.now() < deadline) {
    const heroId = await page.evaluate(() => window.me?.characterId || "vienna");
    last = await page.evaluate(() => window.World3D?.getNpcMeshVertexSnapshot?.());
    const npcs = last?.npcs || {};
    let ok = true;
    for (const id of ids) {
      if (id === heroId) continue;
      const row = npcs[id];
      const want = expected[id];
      if (want == null) continue;
      if (!row || row.verts !== want) {
        ok = false;
        break;
      }
    }
    if (ok) {
      console.log(`npc-mesh-vertex ${label} ${locId}: PASS`, JSON.stringify(last));
      return;
    }
    await page.waitForTimeout(120);
  }
  throw new Error(
    `npc-mesh-vertex ${label} ${locId} FAIL within 3s: ${JSON.stringify(last)} expected ${JSON.stringify(expected)}`
  );
}

async function runMode({ dir, port, preview, label }) {
  const base = `http://127.0.0.1:${port}`;
  const srv = await serveDir(dir, port);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await prepareProdHostSimContext(context);
  await context.addInitScript(key => {
    try {
      localStorage.setItem(key, "1");
    } catch (_) {}
  }, HOWTO_SEEN_KEY);
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
  try {
    await bootGame(page, base, preview);
    const expected = await loadExpectedVertCounts(page, base);
    for (const locId of Object.keys(LOCATIONS)) {
      await assertLocationNpcs(page, locId, expected, label);
    }
    await page.reload({ waitUntil: "load" });
    await bootGame(page, base, preview);
    await assertLocationNpcs(page, "room", expected, `${label}-reload`);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    srv.close();
  }
}

async function main() {
  require("child_process").execSync("node scripts/build-preview.js", { cwd: root, stdio: "inherit" });
  const previewDir = path.join(root, "dist-preview");
  await runMode({ dir: root, port: 3771, preview: false, label: "prod-host" });
  await runMode({ dir: previewDir, port: 3772, preview: true, label: "preview" });
  console.log("test-npc-mesh-vertex-runtime: PASS");
}

main().catch(e => {
  console.error("test-npc-mesh-vertex-runtime: FAIL", e);
  process.exit(1);
});
