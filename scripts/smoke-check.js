const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const must = ["index.html", "js/game.js", "css/game.css", "database.rules.json", "owner.html", "js/account-auth.mjs"];
let ok = true;
for (const f of must) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) {
    console.error("Missing:", f);
    ok = false;
  }
}
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!html.includes("js/game.js")) {
  console.error("index.html must load js/game.js");
  ok = false;
}
const js = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
for (const loc of ["room", "street", "cemetery", "city", "parkour"]) {
  if (!js.includes(`${loc}:`)) {
    console.error("Missing location:", loc);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log("smoke-check ok");
