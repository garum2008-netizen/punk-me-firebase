#!/usr/bin/env node
/**
 * Pack owner review artifacts into HALO_OWNER_REVIEW_STORE (read-only, emulator tests inside).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const STORE =
  process.env.HALO_OWNER_REVIEW_STORE ||
  "/cursor/stores/self/t179-halo-owner-review-f174622";
const REPO_SHA = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
const manifestShipped = JSON.parse(
  fs.readFileSync(path.join(root, "data/story/angelina-skin-manifest.json"), "utf8")
);

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("FAIL: sharp required");
  process.exit(1);
}

function sha256File(p) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(p));
  return h.digest("hex");
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function relFromRoot(abs) {
  return path.relative(root, abs).replace(/\\/g, "/");
}

const ASSETS = [
  { id: "A", kind: "portrait", shipped: "assets/ui/angelina-skins/shipped/angelina-teen-A-portrait.webp" },
  { id: "A", kind: "world", shipped: "assets/ui/angelina-skins/shipped/angelina-teen-A-world.webp" },
  { id: "B", kind: "portrait", shipped: "assets/ui/angelina-skins/shipped/angelina-teen-B-portrait.webp" },
  { id: "B", kind: "world", shipped: "assets/ui/angelina-skins/shipped/angelina-teen-B-world.webp" },
  {
    id: "C",
    kind: "portrait",
    shipped: "assets/ui/angelina-skins/shipped/angelina-teen-C-v2-portrait.webp",
  },
  { id: "C", kind: "world", shipped: "assets/ui/angelina-skins/shipped/angelina-teen-C-v2-world.webp" },
];

const SOURCE = {
  A: manifestShipped.skins.A.source,
  B: manifestShipped.skins.B.source,
  C: manifestShipped.skins.C.source,
};

const CANDIDATE_FROZEN_DIR = path.join(STORE, "frozen-candidate-f174622-webp");
const CANDIDATE_R1_DIR = path.join(STORE, "frozen-ablation-R1-webp");
const SHIPPED_DIR = path.join(STORE, "shipped-ab6fa-webp");
const PREVIEW_DIR = path.join(STORE, "preview-only");
const SERVE_DIR = path.join(root, "assets/ui/angelina-skins/.owner-review-serve");

function candidateRel(id, kind) {
  const f =
    id === "C"
      ? `angelina-teen-C-v2-${kind}.webp`
      : `angelina-teen-${id}-${kind}.webp`;
  return path.join(CANDIDATE_FROZEN_DIR, f);
}

function r1Rel(id, kind) {
  const f =
    id === "C"
      ? `angelina-teen-C-v2-${kind}.webp`
      : `angelina-teen-${id}-${kind}.webp`;
  return path.join(CANDIDATE_R1_DIR, f);
}

async function cropZoom8x(inputPath, outPath, cx, cy, halfSize = 48) {
  const meta = await sharp(inputPath).metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const left = Math.max(0, Math.min(w - 1, Math.round(cx - halfSize)));
  const top = Math.max(0, Math.min(h - 1, Math.round(cy - halfSize)));
  const width = Math.min(halfSize * 2, w - left);
  const height = Math.min(halfSize * 2, h - top);
  const crop = await sharp(inputPath).extract({ left, top, width, height }).toBuffer();
  await sharp(crop)
    .resize(width * 8, height * 8, { kernel: sharp.kernel.nearest })
    .png()
    .toFile(outPath);
}

async function sideBySide(paths, labels, outPath, tileW = 280) {
  const bufs = [];
  let maxH = 0;
  for (const p of paths) {
    const { data, info } = await sharp(p)
      .resize(tileW)
      .toBuffer({ resolveWithObject: true });
    bufs.push({ data, info });
    maxH = Math.max(maxH, info.height);
  }
  const canvasW = tileW * paths.length;
  const composite = [];
  let x = 0;
  for (let i = 0; i < bufs.length; i++) {
    composite.push({ input: bufs[i].data, left: x, top: Math.floor((maxH - bufs[i].info.height) / 2) });
    x += tileW;
  }
  await sharp({
    create: { width: canvasW, height: maxH, channels: 4, background: { r: 40, g: 40, b: 48, alpha: 255 } },
  })
    .composite(composite)
    .png()
    .toFile(outPath);
  fs.writeFileSync(`${outPath}.labels.txt`, labels.join(" | "));
}

function runMeasure(rels) {
  const r = spawnSync(
    "node",
    [path.join(root, "scripts/measure-angelina-halo-batch-json.js"), ...rels],
    { cwd: root, encoding: "utf8", env: { ...process.env, FIREBASE_EMULATOR: "1" } }
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return JSON.parse(r.stdout.trim());
}

function runDump(rel) {
  const r = spawnSync(
    "node",
    [path.join(root, "scripts/dump-angelina-halo-bad-px.js"), rel, "both"],
    { cwd: root, encoding: "utf8", env: { ...process.env, FIREBASE_EMULATOR: "1" } }
  );
  if (r.status !== 0) return { error: r.stderr || r.stdout };
  try {
    return JSON.parse(r.stdout.trim());
  } catch {
    return { error: "parse", raw: (r.stdout || "").slice(0, 500) };
  }
}

function buildServeManifest() {
  fs.mkdirSync(SERVE_DIR, { recursive: true });
  const m = JSON.parse(JSON.stringify(manifestShipped));
  for (const a of ASSETS) {
    const key = a.kind;
    for (const [label, dirFn] of [
      ["shipped", () => path.join(SERVE_DIR, "shipped", path.basename(a.shipped))],
      ["candidate", () => path.join(SERVE_DIR, "candidate", path.basename(a.shipped))],
    ]) {
      const src = label === "shipped" ? path.join(root, a.shipped) : candidateRel(a.id, a.kind);
      const dest = dirFn();
      if (fs.existsSync(src)) {
        copyFile(src, dest);
        m.skins[a.id][key].path = relFromRoot(dest);
      }
    }
  }
  const prev = path.join(
    root,
    "assets/ui/angelina-skins/.owner-preview-only/angelina-teen-A-portrait-edge-preview-f174622.webp"
  );
  if (fs.existsSync(prev)) {
    const dest = path.join(SERVE_DIR, "preview", path.basename(prev));
    copyFile(prev, dest);
  }
  const manPath = path.join(SERVE_DIR, "manifest-owner-review.json");
  fs.writeFileSync(manPath, JSON.stringify(m, null, 2));
  return manPath;
}

function runComposites(outSubdir, manifestPath, prefix) {
  const out = path.join(STORE, outSubdir);
  const r = spawnSync("node", [path.join(root, "scripts/save-angelina-browser-composites.js")], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      FIREBASE_EMULATOR: "1",
      FIREBASE_DATABASE_EMULATOR_HOST: process.env.FIREBASE_DATABASE_EMULATOR_HOST || "127.0.0.1:9000",
      FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099",
      ANGELINA_COMPOSITE_MANIFEST: manifestPath,
      ANGELINA_COMPOSITE_OUT: out,
      ANGELINA_COMPOSITE_NAME_PREFIX: prefix,
    },
  });
  return { ok: r.status === 0, log: (r.stdout || "") + (r.stderr || "") };
}

(async () => {
  fs.mkdirSync(STORE, { recursive: true });

  // Freeze shipped ab6fa
  for (const a of ASSETS) {
    copyFile(path.join(root, a.shipped), path.join(SHIPPED_DIR, path.basename(a.shipped)));
  }

  // Freeze ablation R1 (distinct lineage — not v4/v6)
  const r1src = path.join(root, "assets/ui/angelina-skins/.candidate-review");
  for (const a of ASSETS) {
    const name = path.basename(a.shipped);
    const src = path.join(r1src, name);
    if (fs.existsSync(src)) copyFile(src, path.join(CANDIDATE_R1_DIR, name));
  }
  copyFile(
    path.join(r1src, "gate-results.json"),
    path.join(STORE, "logs/ablation-R1-gate-results.json")
  );
  copyFile(
    path.join(r1src, "README.md"),
    path.join(STORE, "logs/ablation-R1-README.md")
  );

  // Logs (log-only lineages — no matching webp for v4/v6)
  for (const [name, src] of [
    ["build-v4-log-only.txt", "/opt/cursor/artifacts/halo-repair-build-v4.log"],
    ["build-v6-log-only.txt", "/opt/cursor/artifacts/halo-repair-build-v6.log"],
    ["build-f7475cd-summary.md", "/opt/cursor/artifacts/halo-repair-run-f7475cd-summary.md"],
  ]) {
    if (fs.existsSync(src)) copyFile(src, path.join(STORE, "logs", name));
  }

  const gates = { repoSha: REPO_SHA, assets: {}, scopes: {} };

  const sets = [
    { key: "shipped_ab6fa", dir: SHIPPED_DIR, params: { branch: "ab6fa302", lock: "shipped baseline" } },
    {
      key: "frozen_candidate_f174622",
      dir: CANDIDATE_FROZEN_DIR,
      params: {
        buildScriptSha: REPO_SHA,
        ANGELINA_SKIP_SWEEP: "1",
        ANGELINA_LOCK_THRESH: "0.8",
        ANGELINA_LOCK_INSET: "1",
        ANGELINA_HALO_REPAIR_MAX_ROUNDS: "0",
        note: "WebPs from ONE build snapshot at f174622 (pre-repair-round metrics in gates.json)",
      },
    },
    {
      key: "frozen_ablation_R1",
      dir: CANDIDATE_R1_DIR,
      params: { row: "R1", see: "logs/ablation-R1-gate-results.json" },
    },
  ];

  for (const set of sets) {
    gates.scopes[set.key] = { params: set.params, halo: {} };
    const serveSet = path.join(SERVE_DIR, set.key);
    fs.mkdirSync(serveSet, { recursive: true });
    for (const a of ASSETS) {
      const name = path.basename(a.shipped);
      const p = path.join(set.dir, name);
      const slotKey = `${a.id}_${a.kind}`;
      if (!fs.existsSync(p)) {
        gates.scopes[set.key].halo[slotKey] = { missing: true };
        continue;
      }
      const served = path.join(serveSet, name);
      copyFile(p, served);
      const rel = relFromRoot(served);
      let meas = null;
      let dump = { error: "skipped" };
      try {
        meas = runMeasure([rel])[rel];
        const doDump =
          set.key === "frozen_candidate_f174622" ||
          (set.key === "shipped_ab6fa" && a.id === "A" && a.kind === "portrait");
        if (doDump) dump = runDump(rel);
      } catch (e) {
        gates.scopes[set.key].halo[slotKey] = {
          path: rel,
          sha256: sha256File(p),
          measureError: String(e.message || e),
        };
        continue;
      }
      const sha = sha256File(p);
      const badPath = path.join(STORE, "bad-pixels", `${set.key}-${slotKey}.json`);
      fs.mkdirSync(path.dirname(badPath), { recursive: true });
      fs.writeFileSync(badPath, JSON.stringify(dump, null, 2));
      gates.scopes[set.key].halo[slotKey] = {
        path: rel,
        sha256: sha,
        source: SOURCE[a.id],
        measure: meas,
        badPixels: {
          lanczosCount: dump.lanczos3?.count ?? dump.count,
          browserCount: dump.browser3?.count,
          pixelsSample: (dump.pixels || []).slice(0, 64),
          dumpFile: badPath,
        },
      };
    }
  }

  // Preview A portrait
  const prevPath = path.join(
    root,
    "assets/ui/angelina-skins/.owner-preview-only/angelina-teen-A-portrait-edge-preview-f174622.webp"
  );
  if (fs.existsSync(prevPath)) {
    copyFile(prevPath, path.join(PREVIEW_DIR, path.basename(prevPath)));
    const servedPrev = path.join(SERVE_DIR, "preview-only", path.basename(prevPath));
    copyFile(prevPath, servedPrev);
    const rel = relFromRoot(servedPrev);
    const prevParamsSrc = path.join(STORE, "logs/A-portrait-preview-params.json");
    if (fs.existsSync(path.join(root, "assets/ui/angelina-skins/.owner-preview-only/angelina-teen-A-portrait-edge-preview-f174622.webp"))) {
      copyFile(prevParamsSrc, path.join(PREVIEW_DIR, "A-portrait-preview-params.json"));
    }
    try {
      gates.preview_A_portrait = {
        path: rel,
        sha256: sha256File(prevPath),
        measure: runMeasure([rel])[rel],
        badPixels: runDump(rel),
        paramsFile: path.join(STORE, "preview-only/A-portrait-preview-params.json"),
      };
    } catch (e) {
      gates.preview_A_portrait = { path: rel, measureError: String(e.message || e) };
    }
  }

  fs.writeFileSync(path.join(STORE, "gates-per-6-assets.json"), JSON.stringify(gates, null, 2));

  // Before composites (shipped)
  const shipMan = JSON.parse(JSON.stringify(manifestShipped));
  const shipManPath = path.join(STORE, "tmp-manifest-shipped.json");
  fs.writeFileSync(shipManPath, JSON.stringify(shipMan, null, 2));
  runComposites("composites-shipped-ab6fa", shipManPath, "before-ab6fa");

  // Candidate frozen composites if present
  if (fs.existsSync(path.join(CANDIDATE_FROZEN_DIR, "angelina-teen-A-portrait.webp"))) {
    const man = buildServeManifest();
    runComposites("composites-frozen-candidate-f174622", man, "after-candidate-f174622");
  }

  // Copy known before composites from artifact cache
  const beforeSrc = "/opt/cursor/artifacts/halo-repair-b86032a/before";
  const compBefore = path.join(STORE, "composites-before-ab6fa-cache");
  if (fs.existsSync(beforeSrc)) {
    for (const f of fs.readdirSync(beforeSrc)) {
      if (f.endsWith(".png")) copyFile(path.join(beforeSrc, f), path.join(compBefore, f));
    }
  }

  const aBad = gates.scopes.frozen_candidate_f174622?.halo?.A_portrait?.badPixels?.pixelsSample?.[0];
  const zoomDir = path.join(STORE, "side-by-side/A-portrait-8x-crop");
  fs.mkdirSync(zoomDir, { recursive: true });
  const cx = aBad ? Math.floor(aBad.x / 3) : 120;
  const cy = aBad ? Math.floor(aBad.y / 3) : 200;

  const sbsDir = path.join(STORE, "side-by-side");
  const aPortraits = [
    [path.join(root, SOURCE.A.path), "approved-source-A.png"],
    [path.join(SHIPPED_DIR, "angelina-teen-A-portrait.webp"), "shipped-ab6fa"],
    [
      path.join(CANDIDATE_FROZEN_DIR, "angelina-teen-A-portrait.webp"),
      "frozen-candidate-f174622",
    ],
    [prevPath, "preview-edge-inset"],
  ].filter(([p]) => fs.existsSync(p));

  if (aPortraits.length >= 2) {
    await sideBySide(
      aPortraits.map(x => x[0]),
      aPortraits.map(x => x[1]),
      path.join(sbsDir, "A-portrait-source-shipped-candidate-preview.png")
    );
    for (const bg of ["white", "111"]) {
      const comp = path.join(STORE, `composites-shipped-ab6fa/before-ab6fa-A-portrait-browser-${bg}.png`);
      const cand = path.join(
        STORE,
        `composites-frozen-candidate-f174622/after-candidate-f174622-A-portrait-browser-${bg}.png`
      );
      const tiles = [];
      const labs = [];
      if (fs.existsSync(comp)) {
        tiles.push(comp);
        labs.push(`shipped-${bg}`);
      }
      if (fs.existsSync(cand)) {
        tiles.push(cand);
        labs.push(`candidate-${bg}`);
      }
      if (tiles.length >= 2) {
        await sideBySide(tiles, labs, path.join(sbsDir, `A-portrait-browser-${bg}-shipped-vs-candidate.png`));
      }
    }
    const frozenP = path.join(CANDIDATE_FROZEN_DIR, "angelina-teen-A-portrait.webp");
    if (fs.existsSync(frozenP)) {
      await cropZoom8x(frozenP, path.join(zoomDir, "candidate-white-bg-8x.png"), cx, cy);
    }
    if (fs.existsSync(prevPath)) {
      await cropZoom8x(prevPath, path.join(zoomDir, "preview-edge-8x.png"), cx, cy);
    }
  }

  for (const id of ["B", "C"]) {
    for (const kind of ["portrait", "world"]) {
      const base = id === "C" ? `angelina-teen-C-v2-${kind}` : `angelina-teen-${id}-${kind}`;
      for (const bg of ["white", "111"]) {
        const before = path.join(compBefore, `halo-${id}-${kind}-browser-${bg}.png`);
        const after = path.join(
          STORE,
          `composites-frozen-candidate-f174622/after-candidate-f174622-${id}-${kind}-browser-${bg}.png`
        );
        if (fs.existsSync(before) && fs.existsSync(after)) {
          await sideBySide(
            [before, after],
            [`ab6fa-before-${bg}`, `candidate-f174622-${bg}`],
            path.join(sbsDir, `${id}-${kind}-before-after-${bg}.png`)
          );
        }
      }
    }
  }

  const readme = `# Owner visual review pack (NO SHIP)

**Repo SHA:** \`${REPO_SHA}\`
**Store:** \`${STORE}\`

## Scope labels

| Label | Meaning |
|-------|---------|
| **OVERALL gate PASS** | **NO** — A portrait still has halo bad px |
| **Limited B+C scope** | Frozen candidate may show B/C 0/0; selective ship is **not** full gate pass |

## Lineage (do not mix)

| ID | WebP files? | Use |
|----|-------------|-----|
| **frozen-candidate-f174622-webp/** | Yes (when build snapshot present) | Gates tied to \`gates-per-6-assets.json\` → \`frozen_candidate_f174622\` |
| **frozen-ablation-R1-webp/** | Yes | Older R1 ablation; gates in \`logs/ablation-R1-gate-results.json\` only |
| **build-v4-log-only.txt** | **No** | Metrics only: A P4+L19 W0+0, B0, C0 (interrupted before snapshot) |
| **build-v6-log-only.txt** | **No** | Metrics only: A P4+L9 W2+2, B0, C0 (interrupted) |
| **preview-only/** | A portrait preview | **NOT SHIPPED** |

## Key paths

- \`gates-per-6-assets.json\` — sha256, source sha, halo browser/lanczos, bad-pixel samples (all 6×3 sets where present)
- \`side-by-side/\` — same-size comparisons + 8× crops
- \`composites-*/\` — white/#111 browser 3×
`;

  fs.writeFileSync(path.join(STORE, "README.md"), readme);
  console.log("OWNER_REVIEW_PACK_OK", STORE);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
