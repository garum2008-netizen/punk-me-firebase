#!/usr/bin/env node
/** Minimal static file server for Playwright tests (correct MIME for .mjs). */
const http = require("http");
const fs = require("fs");
const path = require("path");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
  ".txt": "text/plain; charset=utf-8"
};

function serveStaticDir(dir, port) {
  const root = path.resolve(dir);
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath === "/") urlPath = "/index.html";
      const abs = path.join(root, urlPath.replace(/^\//, ""));
      if (!abs.startsWith(root) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = path.extname(abs).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      fs.createReadStream(abs).pipe(res);
    });
    srv.listen(port, "127.0.0.1", () => resolve(srv));
    srv.on("error", reject);
  });
}

module.exports = { serveStaticDir, MIME };
