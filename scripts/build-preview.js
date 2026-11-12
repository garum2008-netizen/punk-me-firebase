#!/usr/bin/env node
/** Closed preview bundle. Strips production Firebase config. Does not deploy. */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist-preview");
const SHA = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();

const SKIP_DIRS = new Set([
  "node_modules", "dist-preview", "docs", "scripts", "qa", "captures",
  "artifacts", ".git", "functions", "ice", "cursor-commander"
]);

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function stripFirebase(destAbs) {
  if (path.basename(destAbs) !== "game.js") return;
  let src = fs.readFileSync(destAbs, "utf8");
  src = src.replace(
    /const FIREBASE_CONFIG = \{[\s\S]*?\};/,
    "const FIREBASE_CONFIG = null; /* preview: no production Firebase */"
  );
  if (src.includes("punk-me-40605")) {
    console.error("preview bundle still contains the production Firebase project id");
    process.exit(1);
  }
  fs.writeFileSync(destAbs, src);
}

function copyTree(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  for (const name of fs.readdirSync(srcDir)) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) copyTree(abs, dest);
    else {
      copyFile(abs, dest);
      stripFirebase(dest);
    }
  }
}

function transformIndex(html) {
  html = html.replace(
    "<head>",
    `<head>\n<meta name="robots" content="noindex">\n<meta name="punk-preview-sha" content="${SHA}">`
  );
  html = html.replace(/<script src="https:\/\/www\.gstatic\.com\/firebase[^"]+"[^>]*><\/script>\s*/g, "");
  html = html.replace(
    /<script src="js\/game\.js[^"]*"><\/script>/,
    `<script>window.__PUNK_PREVIEW__=true;</script>\n<script src="js/preview-save.js?v=${SHA.slice(0, 7)}"></script>\n<script src="js/game.js?v=${SHA.slice(0, 7)}"></script>`
  );
  html = html.replace(
    /<script type="module">\s*import \{ initAccountAuth \}[\s\S]*?<\/script>\s*/m,
    ""
  );
  return html;
}

rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });
for (const dir of ["css", "js", "data", "imagine_images", "assets"]) {
  copyTree(path.join(ROOT, dir), path.join(OUT, dir));
}
for (const page of ["subscribe.html", "terms.html", "privacy.html"]) {
  const p = path.join(ROOT, page);
  if (fs.existsSync(p)) copyFile(p, path.join(OUT, page));
}
fs.writeFileSync(path.join(OUT, "index.html"), transformIndex(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")));
fs.writeFileSync(path.join(OUT, "robots.txt"), "User-agent: *\nDisallow: /\n");
fs.writeFileSync(path.join(OUT, "_headers"), "/*\n  X-Robots-Tag: noindex, nofollow\n");
fs.writeFileSync(path.join(OUT, "PREVIEW_SHA.txt"), SHA + "\n");

let files = 0;
let bytes = 0;
(function walk(d) {
  for (const name of fs.readdirSync(d)) {
    const abs = path.join(d, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs);
    else { files += 1; bytes += st.size; }
  }
})(OUT);
console.log("build:preview OK", SHA, "files", files, "bytes", bytes);
