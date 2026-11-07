#!/usr/bin/env node
/**
 * Verify Cloudflare Pages Functions bundle starts (no createRequire) and Basic Auth works.
 */
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
const OUTDIR = path.join(ROOT, ".wrangler-preview-functions-out");
const PORT = 8700 + (process.pid % 500);

function runBuildPreview() {
  const r = spawnSync("node", [path.join(__dirname, "build-preview.js")], {
    cwd: ROOT,
    stdio: "inherit"
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

function runFunctionsBuild() {
  if (fs.existsSync(OUTDIR)) fs.rmSync(OUTDIR, { recursive: true, force: true });
  const r = spawnSync(
    "npx",
    [
      "--yes",
      "wrangler@4.156.2",
      "pages",
      "functions",
      "build",
      "functions",
      "--project-directory",
      ROOT,
      "--build-output-directory",
      "dist-preview",
      "--outdir",
      OUTDIR,
      "--compatibility-date",
      "2024-09-23"
    ],
    { cwd: ROOT, stdio: "inherit", env: process.env }
  );
  if (r.status !== 0) {
    console.error("wrangler pages functions build failed exit", r.status);
    process.exit(r.status || 1);
  }
}

function assertBundleNoCreateRequire() {
  const files = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (fs.statSync(abs).isDirectory()) walk(abs);
      else if (/\.(js|mjs)$/i.test(name)) files.push(abs);
    }
  }
  walk(OUTDIR);
  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    if (/createRequire\s*\(/.test(txt)) {
      console.error("FAIL: createRequire still in bundle:", path.relative(ROOT, f));
      process.exit(1);
    }
  }
  console.log("wrangler-bundle: PASS (no createRequire in", files.length, "files)");
}

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers }, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8")
        })
      );
    });
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
  });
}

async function waitForServer(base, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await httpGet(`${base}/`);
      if (r.status === 401 || r.status === 200) return;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("wrangler pages dev did not become ready (expected 401/200 on /)");
}

async function stopProcessGroup(child, graceMs = 4000) {
  if (!child?.pid) return;
  await new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    child.once("exit", finish);
    child.once("error", finish);
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch (_) {
      try {
        child.kill("SIGTERM");
      } catch (_) {}
    }
    setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (_) {
        try {
          child.kill("SIGKILL");
        } catch (_) {}
      }
      setTimeout(finish, 800);
    }, graceMs);
  });
}

async function runPagesDevSmoke() {
  const devVarsPath = path.join(ROOT, ".dev.vars");
  const hadDevVars = fs.existsSync(devVarsPath);
  const prevDevVars = hadDevVars ? fs.readFileSync(devVarsPath, "utf8") : null;
  fs.writeFileSync(devVarsPath, "PREVIEW_USER=preview_test_user\nPREVIEW_PASS=preview_test_pass\n", "utf8");

  const env = { ...process.env };
  const child = spawn(
    "npx",
    [
      "--yes",
      "wrangler@4.156.2",
      "pages",
      "dev",
      "dist-preview",
      "--port",
      String(PORT),
      "--ip",
      "127.0.0.1",
      "--compatibility-date",
      "2024-09-23"
    ],
    { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"], detached: true }
  );

  let log = "";
  child.stdout.on("data", d => {
    log += d.toString();
  });
  child.stderr.on("data", d => {
    log += d.toString();
  });

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    const unauth = await httpGet(`http://127.0.0.1:${PORT}/`);
    if (unauth.status !== 401) {
      console.error("FAIL: expected 401 without auth, got", unauth.status, unauth.body.slice(0, 120));
      process.exit(1);
    }
    const auth = Buffer.from("preview_test_user:preview_test_pass").toString("base64");
    const ok = await httpGet(`http://127.0.0.1:${PORT}/`, { Authorization: `Basic ${auth}` });
    if (ok.status !== 200) {
      console.error("FAIL: expected 200 with auth, got", ok.status);
      process.exit(1);
    }
    const robots = ok.headers["x-robots-tag"] || ok.headers["X-Robots-Tag"];
    if (!robots || !String(robots).includes("noindex")) {
      console.error("FAIL: missing X-Robots-Tag noindex on authed response, headers", ok.headers);
      process.exit(1);
    }
    const fnLeak = await httpGet(`http://127.0.0.1:${PORT}/functions/_middleware.js`, {
      Authorization: `Basic ${auth}`
    });
    if (fnLeak.status === 200 && fnLeak.body.includes("onRequest")) {
      console.error("FAIL: /functions/_middleware.js served as static asset");
      process.exit(1);
    }
    console.log("wrangler-pages-dev: PASS (401 unauth, 200 auth, no static /functions leak)");
  } catch (e) {
    console.error("wrangler-pages-dev: FAIL", e.message);
    console.error(log.slice(-4000));
    process.exit(1);
  } finally {
    await stopProcessGroup(child);
    if (hadDevVars) fs.writeFileSync(devVarsPath, prevDevVars, "utf8");
    else {
      try {
        fs.unlinkSync(devVarsPath);
      } catch (_) {}
    }
  }
}

async function main() {
  runBuildPreview();
  runFunctionsBuild();
  assertBundleNoCreateRequire();
  await runPagesDevSmoke();
  console.log("preview-wrangler: PASS");
}

main().catch(e => {
  console.error("preview-wrangler: FAIL", e);
  process.exit(1);
});
