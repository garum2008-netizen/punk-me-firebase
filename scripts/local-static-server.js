#!/usr/bin/env node
/** Start `serve` on a free port (default 8765) for Playwright tests. */
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PUNK_PORT || process.env.PORT || 8765);

function waitForPort(p, attempts = 60) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      n++;
      const req = http.get(`http://127.0.0.1:${p}/`, res => {
        res.resume();
        resolve(p);
      });
      req.on("error", () => {
        if (n >= attempts) reject(new Error(`port ${p} not ready`));
        else setTimeout(tick, 250);
      });
    };
    tick();
  });
}

let child = null;

async function start() {
  if (child) return `http://127.0.0.1:${port}`;
  child = spawn("npx", ["--yes", "serve", "-l", String(port), "."], {
    cwd: root,
    stdio: "ignore",
    detached: false
  });
  child.on("exit", () => {
    child = null;
  });
  await waitForPort(port);
  return `http://127.0.0.1:${port}`;
}

function stop() {
  if (child) {
    child.kill("SIGTERM");
    child = null;
  }
}

module.exports = { start, stop, port };

if (require.main === module) {
  start()
    .then(url => console.log(url))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}
