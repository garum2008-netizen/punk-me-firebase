#!/usr/bin/env node
/** Static server for tests — preserves query strings (unlike `serve` cleanUrls). */
const path = require("path");
const { serveStaticDir } = require("./serve-static-root");

async function startTestStaticServe(rootDir, port) {
  const root = path.resolve(rootDir || path.join(__dirname, ".."));
  const p = port ? Number(port) : 0;
  const srv = await serveStaticDir(root, p);
  const addr = srv.address();
  return { srv, port: addr.port, base: `http://127.0.0.1:${addr.port}` };
}

module.exports = { startTestStaticServe };
