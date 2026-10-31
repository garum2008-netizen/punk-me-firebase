#!/usr/bin/env node
/** Static preview bundle for Cloudflare Pages (no tests/docs/source PNGs/qa). */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist-preview");

const SKIP_DIRS = new Set([
  "node_modules",
  "dist-preview",
  "docs",
  "scripts",
  "qa",
  "captures",
  "artifacts",
  ".git",
  "functions"
]);

const SKIP_FILE_RE =
  /\.(md|map|test\.js|spec\.js)$/i;
const SKIP_PATH_RE = [
  /[\\/]angelina-skins[\\/]source[\\/]/i,
  /[\\/]database\.rules\.json$/i,
  /[\\/]firebase\.json$/i,
  /[\\/]package(-lock)?\.json$/i,
  /[\\/]owner-admin\.mjs$/i,
];

const COPY_ROOTS = ["css", "js", "data", "imagine_images", "assets/models"];

function shouldSkip(rel) {
  const norm = rel.replace(/\\/g, "/");
  if (SKIP_FILE_RE.test(norm)) return true;
  if (/owner-admin\.mjs$/i.test(norm)) return true;
  return SKIP_PATH_RE.some(re => re.test(norm));
}

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function stripPreviewSecrets(destAbs) {
  const base = path.basename(destAbs);
  if (base !== "game.js") return;
  let src = fs.readFileSync(destAbs, "utf8");
  src = src.replace(
    /const FIREBASE_CONFIG = \{[\s\S]*?\};/,
    "const FIREBASE_CONFIG = null; /* preview: no production Firebase */"
  );
  fs.writeFileSync(destAbs, src, "utf8");
}

function copyTree(srcDir, destDir, relBase = "") {
  if (!fs.existsSync(srcDir)) return;
  for (const name of fs.readdirSync(srcDir)) {
    const rel = path.join(relBase, name).replace(/\\/g, "/");
    const abs = path.join(srcDir, name);
    if (shouldSkip(rel)) continue;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name) && relBase === "") continue;
      copyTree(abs, path.join(destDir, name), rel);
    } else {
      copyFile(abs, path.join(destDir, name));
      stripPreviewSecrets(path.join(destDir, name));
    }
  }
}

function copyShippedSkins() {
  const shipped = path.join(ROOT, "assets/ui/angelina-skins/shipped");
  const out = path.join(OUT, "assets/ui/angelina-skins/shipped");
  if (!fs.existsSync(shipped)) return;
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(shipped)) {
    if (!/\.webp$/i.test(f)) continue;
    copyFile(path.join(shipped, f), path.join(out, f));
  }
}

function transformIndex(html) {
  if (!html.includes('meta name="robots"')) {
    html = html.replace(
      "<head>",
      '<head>\n<meta name="robots" content="noindex">\n<meta name="punk-preview-build" content="1">'
    );
  }
  html = html.replace(/<script src="https:\/\/www\.gstatic\.com\/firebase[^"]+"[^>]*><\/script>\s*/g, "");
  html = html.replace(
    /<script src="js\/game\.js[^"]*"><\/script>/,
    `<script>window.__PUNK_PREVIEW__=true;</script>
<script src="js/preview-save.js?v=preview"></script>
<script src="js/game.js?v=preview"></script>`
  );
  html = html.replace(
    /<script type="module">\s*import \{ initAccountAuth \}[\s\S]*?<\/script>\s*/m,
    ""
  );
  return html;
}

function writeRobots() {
  fs.writeFileSync(path.join(OUT, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");
}

function copyMiddleware() {
  const src = path.join(ROOT, "functions", "_middleware.js");
  const dest = path.join(OUT, "functions", "_middleware.js");
  copyFile(src, dest);
}

function main() {
  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  for (const dir of COPY_ROOTS) {
    copyTree(path.join(ROOT, dir), path.join(OUT, dir));
  }
  copyShippedSkins();

  for (const page of ["subscribe.html", "terms.html", "privacy.html"]) {
    const p = path.join(ROOT, page);
    if (fs.existsSync(p)) copyFile(p, path.join(OUT, page));
  }

  const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  fs.writeFileSync(path.join(OUT, "index.html"), transformIndex(indexHtml), "utf8");

  writeRobots();
  copyMiddleware();

  const files = [];
  function walk(d, prefix = "") {
    for (const name of fs.readdirSync(d)) {
      const rel = prefix ? `${prefix}/${name}` : name;
      const abs = path.join(d, name);
      const st = fs.statSync(abs);
      if (st.isDirectory()) walk(abs, rel);
      else files.push({ rel, bytes: st.size });
    }
  }
  walk(OUT);
  const total = files.reduce((s, f) => s + f.bytes, 0);
  console.log("build:preview OK", OUT);
  console.log("files:", files.length, "bytes:", total);
}

main();
