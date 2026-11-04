#!/usr/bin/env node
/** Meshopt decoder loads from vendored js/vendor (CDN meshopt_decoder blocked). */
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

const root = path.join(__dirname, "..");
const HOWTO = "punkme_howto_seen";
const stubQs = prodHostFirebaseStubQueryString();

const meshyPunkSrc = fs.readFileSync(path.join(root, "js/world/meshy-punk.mjs"), "utf8");
if (!meshyPunkSrc.includes('vendor/meshopt_decoder.module.js')) {
  console.error("FAIL: meshy-punk.mjs must import vendored meshopt decoder");
  process.exit(1);
}

function isBlockedMeshoptCdn(url) {
  return /cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/examples\/jsm\/libs\/meshopt_decoder/i.test(url);
}

function serveDir(dir, port) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
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

(async () => {
  const port = 3779;
  const srv = await serveDir(root, port);
  try {
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    await prepareProdHostSimContext(ctx);
    await ctx.addInitScript(k => {
      try {
        localStorage.setItem(k, "1");
      } catch (_) {}
    }, HOWTO);
    const page = await ctx.newPage();
    const meshoptCdnAttempts = [];
    const okGlbs = [];
    page.on("request", req => {
      if (isBlockedMeshoptCdn(req.url())) meshoptCdnAttempts.push(req.url());
    });
    page.on("response", res => {
      const u = res.url();
      if (u.includes(".glb") && res.status() === 200) okGlbs.push(u);
    });
    await page.route("**/*", route => {
      if (isBlockedMeshoptCdn(route.request().url())) {
        return route.abort("blockedbyclient");
      }
      return route.continue();
    });
    await installProdFirebaseRouteBlock(page);
    await page.goto(
      `http://127.0.0.1:${port}/?solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1${stubQs}`,
      { waitUntil: "load", timeout: 120000 }
    );
    await page.waitForSelector(
      '#charSelectPortraits #charSelectConfirm, [data-testid="char-select-angelina"], #charSelectConfirm',
      { timeout: 120000 }
    );
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.waitForFunction(() => window.World3D?.isReady?.() === true, undefined, { timeout: 60000 });
    await page.evaluate(() => window.goLocation("room"));
    await page.waitForFunction(
      () => {
        const n = window.World3D?.getNpcMeshVertexSnapshot?.()?.npcs?.vienna;
        return n && n.visible && n.verts > 1000;
      },
      undefined,
      { timeout: 15000 }
    );
    const localDecoderOk = await page.evaluate(async () => {
      const res = await fetch("/js/vendor/meshopt_decoder.module.js", { cache: "no-store" });
      return res.ok;
    });
    if (meshoptCdnAttempts.length) {
      throw new Error(`meshopt CDN was requested: ${meshoptCdnAttempts.join(", ")}`);
    }
    if (!localDecoderOk) {
      throw new Error("vendored meshopt_decoder.module.js not reachable");
    }
    if (!okGlbs.some(u => u.includes("punk_pink.glb") || u.includes("meshy"))) {
      throw new Error(`no meshy GLB loaded (${okGlbs.length} glbs)`);
    }
    await browser.close();
    console.log("test-meshopt-local-decoder: PASS");
  } finally {
    srv.close();
  }
})().catch(e => {
  console.error("test-meshopt-local-decoder: FAIL", e);
  process.exit(1);
});
