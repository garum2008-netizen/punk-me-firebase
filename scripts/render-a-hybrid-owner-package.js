#!/usr/bin/env node
/**
 * Owner final hybrid review package — region-validated crops, automated halo/browser QA.
 * PREVIEW ONLY — does not touch shipped assets.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { serveStaticDir } = require("./serve-static-root");
const {
  prepareProdHostSimContext,
  installProdFirebaseRouteBlock,
  assertFirebaseEmulatorTestEnv,
} = require("./firebase-test-emulator-guard");

const root = path.join(__dirname, "..");
const STORE =
  process.env.HALO_OWNER_REVIEW_STORE ||
  "/cursor/stores/self/t179-halo-owner-review-f174622";
const TAG = process.env.ANGELINA_HYBRID_TAG || "t186";
const OUT = path.join(STORE, `owner-final-hybrid-${TAG}`);

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("sharp required");
  process.exit(1);
}

const FROZEN_SHA = {
  portrait: "0d77752411383a92ee7126a9f69dc3f2b0d79614e971523a18af609026f11ab3",
  world: "dd9b92cfeac121e2c8cf861d7c41649537169fa3df9c5e68edc349dfef3218b7",
};
const CONTOUR_SHA = {
  portrait: "2536ff6dd469a847bc77a7d78298b1e573ac5d693858d76768177abaafbb1f5c",
  world: "9d3ec6e0e2801b5abdf7edfab517acee019ff97843d6d2eb4aef7cb8d6216eea",
};

function sha256(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function assertEmulator() {
  process.env.FIREBASE_EMULATOR = "1";
  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  }
  assertFirebaseEmulatorTestEnv();
}

function measureHalo(relOrAbs) {
  const r = spawnSync("node", [path.join(root, "scripts/measure-angelina-halo-json.js"), relOrAbs], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, FIREBASE_EMULATOR: "1" },
  });
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout.trim());
  } catch {
    return null;
  }
}

async function findHandCenter(rgbaPath) {
  const { data, info } = await sharp(rgbaPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let best = { x: Math.floor(w * 0.65), y: Math.floor(h * 0.28), score: -1 };
  const half = 36;
  for (let cy = Math.floor(h * 0.12); cy < Math.floor(h * 0.55); cy += 6) {
    for (let cx = Math.floor(w * 0.35); cx < Math.floor(w * 0.92); cx += 6) {
      let score = 0;
      for (let dy = -half; dy < half; dy += 2) {
        for (let dx = -half; dx < half; dx += 2) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const a = data[(y * w + x) * 4 + 3];
          if (a >= 24 && a < 245) score += 3;
          if (a >= 245) score += 1;
        }
      }
      if (score > best.score) best = { x: cx, y: cy, score };
    }
  }
  return best;
}

function spotCenters(w, h, hand) {
  return {
    hand: { x: hand.x, y: hand.y, half: 44, label: "hand+fingers" },
    hair: { x: Math.floor(w * 0.48), y: Math.floor(h * 0.1), half: 36, label: "hair" },
    jacket: { x: Math.floor(w * 0.42), y: Math.floor(h * 0.52), half: 38, label: "jacket" },
    shoe: { x: Math.floor(w * 0.5), y: Math.floor(h * 0.88), half: 42, label: "shoe+leg" },
    fingers: {
      x: Math.min(w - 20, hand.x + 28),
      y: Math.max(20, hand.y - 18),
      half: 28,
      label: "finger tips",
    },
  };
}

async function extractRegionCrop(srcPath, outPath, cx, cy, half) {
  const meta = await sharp(srcPath).metadata();
  const w = meta.width;
  const h = meta.height;
  const left = Math.max(0, Math.min(w - 1, cx - half));
  const top = Math.max(0, Math.min(h - 1, cy - half));
  const width = Math.min(half * 2, w - left);
  const height = Math.min(half * 2, h - top);
  await sharp(srcPath).extract({ left, top, width, height }).png().toFile(outPath);
  const m = await sharp(outPath).metadata();
  return { left, top, width: m.width, height: m.height, cropPath: outPath };
}

function validateRegionCrop(cropMeta, kind) {
  const maxSide = Math.max(cropMeta.width, cropMeta.height);
  if (maxSide > 220) {
    throw new Error(
      `${kind}: crop too large (${cropMeta.width}x${cropMeta.height}) — looks like full figure, not region`
    );
  }
  if (maxSide < 40) {
    throw new Error(`${kind}: crop too small`);
  }
  return true;
}

async function flatOnBg(srcPath, outPath, bg) {
  const meta = await sharp(srcPath).metadata();
  const colors = { white: "#ffffff", "111": "#111111", contrast: "#3d6ea8" };
  await sharp({
    create: {
      width: meta.width,
      height: meta.height,
      channels: 3,
      background: colors[bg] || bg,
    },
  })
    .composite([{ input: await sharp(srcPath).toBuffer() }])
    .png()
    .toFile(outPath);
}

async function scaleCrop(srcPath, outPath, scale, bg) {
  const flat = `${outPath}.flat.png`;
  await flatOnBg(srcPath, flat, bg);
  const meta = await sharp(flat).metadata();
  await sharp(flat)
    .resize(meta.width * scale, meta.height * scale, { kernel: sharp.kernel.nearest })
    .png()
    .toFile(outPath);
}

async function rowComposite(paths, labels, outPath, tileW) {
  const parts = [];
  for (const p of paths) {
    const { data, info } = await sharp(p).resize(tileW).toBuffer({ resolveWithObject: true });
    parts.push({ data, info });
  }
  const H = Math.max(...parts.map(p => p.info.height));
  const W = tileW * parts.length;
  const layers = parts.map((p, i) => ({
    input: p.data,
    left: i * tileW,
    top: Math.floor((H - p.info.height) / 2),
  }));
  await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 24, g: 24, b: 28 } },
  })
    .composite(layers)
    .png()
    .toFile(outPath);
  fs.writeFileSync(`${outPath}.labels.txt`, labels.join(" | "));
}

async function browserComposite(relPath, cssW, cssH, bgHex, outPath, deviceScaleFactor) {
  const port = 8860 + Math.floor(Math.random() * 80);
  const srv = await serveStaticDir(root, port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor });
  await prepareProdHostSimContext(context, { prodHostSim: false, firebaseStub: false });
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
  await page.goto(`${baseUrl}/scripts/fixtures/angelina-skin-halo-browser.html`);
  const imgUrl = `${baseUrl}/${relPath.replace(/^\//, "")}`;
  const png = await page.evaluate(
    async ({ imgUrl, cssW, cssH, bgHex }) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("load"));
        img.src = imgUrl;
      });
      const scale = window.devicePixelRatio || 1;
      const cw = Math.round(cssW * scale);
      const ch = Math.round(cssH * scale);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, cw, ch);
      return canvas.toDataURL("image/png");
    },
    { imgUrl, cssW, cssH, bgHex }
  );
  await browser.close();
  srv.close();
  const b64 = png.replace(/^data:image\/png;base64,/, "");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
}

function gitHead() {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  return r.stdout.trim();
}

async function packageKind(kind) {
  const hybridName = `angelina-teen-A-${kind}-hybrid-preview-${TAG}.webp`;
  const hybridStore = path.join(STORE, `preview-hybrid-a-${TAG}`, hybridName);
  const hybridServe = path.join(root, "assets/ui/angelina-skins/.owner-preview-only", hybridName);
  const hybrid = fs.existsSync(hybridServe) ? hybridServe : hybridStore;
  if (!fs.existsSync(hybrid)) throw new Error(`missing hybrid ${kind}`);

  const assets = {
    source: path.join(root, "assets/ui/angelina-skins/source/angelina-teen-A.png"),
    shipped: path.join(root, "assets/ui/angelina-skins/shipped", `angelina-teen-A-${kind}.webp`),
    frozen: path.join(STORE, "frozen-candidate-f174622-webp", `angelina-teen-A-${kind}.webp`),
    contour: path.join(
      STORE,
      "preview-contour-a-17fc69d",
      `angelina-teen-A-${kind}-contour-preview-17fc69d.webp`
    ),
    hybrid,
  };
  for (const [k, p] of Object.entries(assets)) {
    if (!fs.existsSync(p)) throw new Error(`missing ${k}: ${p}`);
  }
  if (sha256(assets.frozen) !== FROZEN_SHA[kind]) {
    throw new Error(`frozen sha mismatch ${kind}`);
  }
  if (sha256(assets.contour) !== CONTOUR_SHA[kind]) {
    throw new Error(`contour sha mismatch ${kind}`);
  }

  const serveDir = path.join(root, "assets/ui/angelina-skins/.owner-review-serve", `hybrid_${TAG}`);
  fs.mkdirSync(serveDir, { recursive: true });
  const serveName = path.basename(hybrid);
  fs.copyFileSync(hybrid, path.join(serveDir, serveName));
  const serveRel = `assets/ui/angelina-skins/.owner-review-serve/hybrid_${TAG}/${serveName}`;

  const kindDir = path.join(OUT, kind);
  fs.mkdirSync(kindDir, { recursive: true });

  const fiveWay = [
    [assets.source, "approved-source"],
    [assets.shipped, "shipped-ab6fa"],
    [assets.frozen, "frozen-f174622"],
    [assets.contour, "contour-17fc69d"],
    [assets.hybrid, `hybrid-${TAG}`],
  ];
  await rowComposite(
    fiveWay.map(x => x[0]),
    fiveWay.map(x => x[1]),
    path.join(kindDir, `${kind}-full-scale-5way.png`),
    kind === "portrait" ? 220 : 160
  );

  const meta = await sharp(assets.hybrid).metadata();
  const hand = await findHandCenter(assets.hybrid);
  const spots = spotCenters(meta.width, meta.height, hand);
  const cropManifest = [];

  for (const [spot, cfg] of Object.entries(spots)) {
    const spotDir = path.join(kindDir, "crops", spot);
    fs.mkdirSync(spotDir, { recursive: true });
    const labels = {
      frozen: "frozen-f174622",
      contour: "contour-17fc69d",
      hybrid: `hybrid-${TAG}`,
    };
    const cropPaths = [];
    for (const [key, src] of [
      ["frozen", assets.frozen],
      ["contour", assets.contour],
      ["hybrid", assets.hybrid],
    ]) {
      const nativeCrop = path.join(spotDir, `${key}-native-crop.png`);
      const cm = await extractRegionCrop(src, nativeCrop, cfg.x, cfg.y, cfg.half);
      validateRegionCrop(cm, `${kind}/${spot}/${key}`);
      cropManifest.push({
        kind,
        spot,
        variant: key,
        regionLabel: cfg.label,
        ...cm,
        sha256Source: sha256(src),
      });
      for (const bg of ["white", "111", "contrast"]) {
        await flatOnBg(nativeCrop, path.join(spotDir, `${key}-1x-${bg}.png`), bg);
        await scaleCrop(nativeCrop, path.join(spotDir, `${key}-2x-${bg}.png`), 2, bg);
        await scaleCrop(nativeCrop, path.join(spotDir, `${key}-8x-${bg}.png`), 8, bg);
      }
      cropPaths.push(path.join(spotDir, `${key}-8x-white.png`));
    }
    await rowComposite(
      cropPaths,
      [labels.frozen, labels.contour, labels.hybrid],
      path.join(spotDir, `${spot}-8x-white-row.png`),
      140
    );
    fs.writeFileSync(
      path.join(spotDir, `${spot}-8x-white-row.png.labels.txt`),
      `${cfg.label} | frozen | contour | hybrid`
    );
  }

  const metrics = {};
  for (const [label, p] of Object.entries(assets)) {
    const rel =
      label === "hybrid"
        ? serveRel
        : p.startsWith(root)
          ? path.relative(root, p).replace(/\\/g, "/")
          : p;
    const halo = measureHalo(rel);
    metrics[label] = {
      path: p,
      sha256: sha256(p),
      halo,
    };
  }

  const browserOut = path.join(kindDir, "browser-composites");
  fs.mkdirSync(browserOut, { recursive: true });
  for (const [bgHex, bgName] of [
    ["#ffffff", "white"],
    ["#111111", "111"],
    ["#3d6ea8", "contrast"],
  ]) {
    for (const dsf of [1, 2, 3]) {
      await browserComposite(
        serveRel,
        meta.width,
        meta.height,
        bgHex,
        path.join(browserOut, `hybrid-browser-dsf${dsf}-${bgName}.png`),
        dsf
      );
    }
  }

  const dump = spawnSync(
    "node",
    [path.join(root, "scripts/dump-angelina-halo-bad-px.js"), serveRel, "both"],
    { cwd: root, encoding: "utf8", env: { ...process.env, FIREBASE_EMULATOR: "1" } }
  );
  if (dump.status === 0) {
    fs.writeFileSync(path.join(kindDir, "hybrid-bad-pixels.json"), dump.stdout);
  }

  return { metrics, cropManifest, serveRel, hybridSha: sha256(assets.hybrid) };
}

function gateVerdict(halo, sil, label) {
  const l = halo?.lanczos?.bgOpaqueBand ?? -1;
  const b = halo?.browser?.bgOpaqueBand ?? -1;
  const haloPass = l === 0 && b === 0;
  const silPass = sil === 0;
  let status = "FAIL";
  if (haloPass && silPass) status = "PASS";
  else if (!haloPass) status = "FAIL";
  return {
    label,
    greyMattBrowser: b,
    greyMattLanczos: l,
    silhouetteNearWhite: sil,
    status,
    shipReady: haloPass && silPass,
  };
}

(async () => {
  assertEmulator();
  fs.mkdirSync(OUT, { recursive: true });
  const metricsPath = path.join(STORE, `preview-hybrid-a-${TAG}`, "hybrid-preview-metrics.json");
  if (!fs.existsSync(metricsPath)) {
    console.error("run preview-angelina-a-hybrid-owner.py first");
    process.exit(1);
  }
  const hybridMetrics = JSON.parse(fs.readFileSync(metricsPath, "utf8"));
  const portrait = await packageKind("portrait");
  const world = await packageKind("world");

  const acceptance = {
    generatedAt: new Date().toISOString(),
    firebaseEmulator: true,
    pipelineGitSha: gitHead(),
    baselineFrozenSha: FROZEN_SHA,
    baselineContourSha: CONTOUR_SHA,
    hybridOutputSha: {
      portrait: portrait.hybridSha,
      world: world.hybridSha,
    },
    gates: {
      greyMattTarget: "browser0_lanczos0_15px_band",
      noThresholdRelaxation: true,
    },
    variants: {},
    cropValidation: "region_crops_max220px_native",
  };

  for (const v of hybridMetrics.variants) {
    const pkg = v.kind === "portrait" ? portrait : world;
    acceptance.variants[v.kind] = {
      hybrid: gateVerdict(v.halo, v.silhouetteNearWhite, `hybrid-${TAG}`),
      frozenReference: {
        sha256: pkg.metrics.frozen.sha256,
        halo: pkg.metrics.frozen.halo,
      },
      contourReference: {
        sha256: pkg.metrics.contour.sha256,
        halo: pkg.metrics.contour.halo,
      },
      alpha255Share: v.alpha255Share,
      diffVsFrozen: v.diffVsFrozen,
      diffVsContour: v.diffVsContour,
      localHybridMeta: v.localHybridMeta,
    };
  }

  const portraitG = acceptance.variants.portrait.hybrid;
  const worldG = acceptance.variants.world.hybrid;
  const shipReady =
    portraitG.status === "PASS" &&
    worldG.status === "PASS" &&
    acceptance.variants.portrait.hybrid.shipReady &&
    acceptance.variants.world.hybrid.shipReady;

  acceptance.overall = shipReady
    ? "APPROVE_FOR_FINAL_QA"
    : "REWORK_REQUIRED";
  acceptance.overallNote = shipReady
    ? "Automated gates 0/0 on hybrid preview; owner visual sign-off still required."
    : "greyMatt > 0/0 on hybrid — NOT ship-ready per gate policy (preview comparison OK).";

  const report = {
    acceptance,
    portraitPackage: portrait,
    worldPackage: world,
    params: hybridMetrics.params,
  };
  fs.writeFileSync(path.join(OUT, "acceptance-gates.json"), JSON.stringify(acceptance, null, 2));
  fs.writeFileSync(path.join(OUT, "package-manifest.json"), JSON.stringify(report, null, 2));

  const md = buildMarkdown(report, acceptance);
  fs.writeFileSync(path.join(OUT, "OWNER_FINAL_HYBRID_REPORT.md"), md);

  console.log("HYBRID_PACKAGE_OK", OUT);
  console.log("OVERALL", acceptance.overall);
})().catch(e => {
  console.error(e);
  process.exit(1);
});

function buildMarkdown(report, acceptance) {
  const v = report.params;
  const lines = [
    "# OWNER — A localized hybrid preview (t186, comparison only)",
    "",
    `**Verdict:** \`${acceptance.overall}\``,
    "",
    acceptance.overallNote,
    "",
    "## Baselines (immutable hashes verified at build)",
    "",
    "| Asset | portrait SHA-256 | world SHA-256 |",
    "|-------|------------------|---------------|",
    `| frozen f174622 | ${acceptance.baselineFrozenSha.portrait} | ${acceptance.baselineFrozenSha.world} |`,
    `| contour 17fc69d | ${acceptance.baselineContourSha.portrait} | ${acceptance.baselineContourSha.world} |`,
    `| **hybrid ${TAG}** | ${acceptance.hybridOutputSha.portrait} | ${acceptance.hybridOutputSha.world} |`,
    "",
    "## Pipeline",
    "",
    "```json",
    JSON.stringify(v, null, 2),
    "```",
    "",
    `git HEAD at package: \`${acceptance.pipelineGitSha}\``,
    "",
    "## Acceptance gates (same thresholds, no relaxation)",
    "",
  ];
  for (const kind of ["portrait", "world"]) {
    const g = acceptance.variants[kind].hybrid;
    lines.push(
      `- **${kind} hybrid**: greyMatt browser=${g.greyMattBrowser} lanczos=${g.greyMattLanczos} | silhouetteNearWhite=${g.silhouetteNearWhite} | **${g.status}**`
    );
  }
  lines.push("", "## Package paths", "", `\`${OUT}\``, "", "### Visual", "", "- `portrait/portrait-full-scale-5way.png`", "- `world/world-full-scale-5way.png`", "- `*/crops/*/` region crops (validated ≤220px native, 1x/2x/8x, white/#111/contrast)", "- `*/browser-composites/` hybrid browser dsf 1/2/3", "", "## NOT shipped", "", "No files in `assets/ui/angelina-skins/shipped/`. PR55 tooling only.");
  return lines.join("\n");
}
