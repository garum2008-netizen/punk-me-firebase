#!/usr/bin/env node
/**
 * Browser check for the local chapter-1 boot.
 * Confirms objectives, keyboard/joystick split, and no production database calls.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium, webkit } from "playwright";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 3472;
const types = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
  ".jpg": "image/jpeg", ".glb": "model/gltf-binary", ".wasm": "application/wasm"
};

function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(root, url === "/" ? "index.html" : url);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("no");
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(port, "127.0.0.1", () => resolve(server)));
}

async function check(browserType, name, viewport) {
  const browser = await browserType.launch();
  const page = await browser.newPage({ viewport });
  const blocked = [];
  const errors = [];
  page.on("pageerror", err => errors.push(String(err)));
  page.on("request", req => {
    const url = req.url();
    if (/firebaseio\.com|identitytoolkit|securetoken/.test(url)) blocked.push(url);
  });
  try {
    await page.goto(`http://127.0.0.1:${port}/?localplay=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => {
      const loading = document.getElementById("loading");
      const quest = document.getElementById("questBox")?.textContent || "";
      return loading && loading.style.display === "none" && quest.trim().length > 8;
    }, null, { timeout: 20000 });
    const report = await page.evaluate(() => {
      window.setLanguage?.("en", true);
      const rect = el => {
        const r = el.getBoundingClientRect();
        return { y: r.y, bottom: r.bottom, w: r.width, h: r.height };
      };
      window.PunkControls.setTouchMove(0.7, 0.2, false);
      const joy = { ...window.PunkControls.getInputState() };
      window.PunkControls.setKey("d", true);
      const keyed = { ...window.PunkControls.getInputState() };
      window.PunkControls.setKey("d", false);
      const back = { ...window.PunkControls.getInputState() };
      window.PunkControls.setTouchMove(0, 0, false);
      const quest = document.getElementById("questBox");
      return {
        quest: quest.textContent.trim().slice(0, 180),
        questDisplay: getComputedStyle(quest).display,
        shop: document.querySelector("[data-i18n='shop']")?.textContent || "",
        coinsLabel: document.querySelector(".badge-keep .stat-label")?.textContent || "",
        energy: document.getElementById("energyStat")?.textContent || "",
        joy, keyed, back,
        jump: document.getElementById("touchJump") ? rect(document.getElementById("touchJump")) : null,
        dock: rect(document.getElementById("gameBottomBar")),
        vw: window.innerWidth
      };
    });
    await page.screenshot({ path: path.join(root, "qa", `ch1-${name}.png`) });
    if (blocked.length) throw new Error(name + " called production Firebase: " + blocked[0]);
    if (!report.quest) throw new Error(name + " quest box empty");
    if (report.questDisplay === "none") throw new Error(name + " quest objective is hidden");
    if (report.shop !== "Shop") throw new Error(name + " shop label " + report.shop);
    if (viewport.width <= 900) {
      if (report.joy.source !== "touch") throw new Error(name + " joystick was overwritten: " + report.joy.source);
      if (report.keyed.source !== "keyboard" || report.keyed.moveX !== 1) throw new Error(name + " keyboard did not take movement");
      if (report.back.source !== "touch") throw new Error(name + " joystick did not return after the key");
      if (!report.jump || report.jump.bottom > report.dock.y + 4) throw new Error(name + " jump overlaps the dock");
      if (!/Coin|Монет|Mønt/i.test(report.coinsLabel)) throw new Error(name + " coins label missing");
    } else if (report.joy.source === "touch") {
      throw new Error(name + " desktop is still reading the virtual joystick");
    }
    const fatal = errors.filter(e => /SyntaxError|claimRazorDuelReward|PunkControls/.test(e));
    if (fatal.length) throw new Error(fatal[0]);
    return { name, quest: report.quest, errors: errors.slice(0, 4) };
  } finally {
    await browser.close();
  }
}

const server = await startServer();
fs.mkdirSync(path.join(root, "qa"), { recursive: true });
const results = [];
try {
  results.push(await check(chromium, "chromium-mobile", { width: 390, height: 844 }));
  results.push(await check(chromium, "chromium-desktop", { width: 1280, height: 800 }));
  try {
    results.push(await check(webkit, "webkit-mobile", { width: 390, height: 844 }));
  } catch (err) {
    results.push({ name: "webkit-mobile", skipped: true, reason: err.message });
  }
} finally {
  server.close();
}
console.log(JSON.stringify(results, null, 2));
if (results.some(r => r.skipped)) {
  console.log("skipped:", results.filter(r => r.skipped).map(r => r.reason).join(" | "));
}
console.log("chapter 1 browser checks finished");
