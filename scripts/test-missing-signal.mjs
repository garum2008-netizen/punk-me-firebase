/**
 * Cold launch of House 13: The Missing Signal through the chapter card.
 * No tutorial flag. No dev commands.
 */
import { chromium } from "playwright";

const base = process.env.PUNK_BASE || "http://127.0.0.1:3466";
const results = [];
function log(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(pass ? "PASS" : "FAIL", id, detail);
}

async function dismissHowTo(page) {
  const howto = page.locator("#howToOverlay.active .howto-close, #howToOverlay.active button");
  if (await howto.count()) await howto.first().click({ force: true }).catch(() => {});
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  await page.addInitScript(() => localStorage.setItem("punkme_lang", "ru"));
  const t0 = Date.now();
  await page.goto(`${base}/?solo=1&v=ms`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /АНГЕЛИНА ПРОПАЛА/.test(document.body.innerText), { timeout: 30000 });
  const cardMs = Date.now() - t0;
  log("mystery-within-30s", cardMs <= 30000, cardMs + "ms");
  await page.waitForFunction(() => document.body.classList.contains("ms-cold-done"), { timeout: 30000 });
  await page.waitForFunction(() => typeof window.setLanguage === "function" && document.querySelector("#charSelectConfirm"));
  await page.evaluate(() => setLanguage("ru", true));
  await page.click('.char-pick[data-id="cobalt"]');
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded === true, { timeout: 60000 });
  await dismissHowTo(page);
  const absent = await page.evaluate(() => window.World3D?.angelinaMark?.()?.present === false);
  log("angelina-absent-before-s5", absent, JSON.stringify(await page.evaluate(() => window.World3D?.angelinaMark?.())));

  const start = Date.now();
  let ending = "";
  let sawTell = false;
  let sawCompanion = false;
  let earlyAngelina = false;
  let lastStep = "";
  while (Date.now() - start < 150000) {
    await dismissHowTo(page);
    const snap = await page.evaluate(() => {
      const state = window.MissingSignal?.debugState?.() || {};
      const present = window.World3D?.angelinaMark?.()?.present === true;
      const tell = document.querySelector("#duel3dHud.duel-tell") != null;
      const hud = document.querySelector("#duel3dHud:not(.hidden)") != null;
      const endingTitle = document.querySelector(".chapter-ending.active .chapter-ending-title")?.textContent || "";
      return { state, present, tell, hud, endingTitle };
    });
    ending = snap.endingTitle;
    if (snap.state.step && snap.state.step !== lastStep) {
      lastStep = snap.state.step;
      console.log("step", lastStep);
    }
    if (snap.state.flags?.companion) sawCompanion = true;
    else if (snap.present) earlyAngelina = true;
    if (/ГЛАВА 2/.test(ending)) break;
    if (snap.tell) {
      sawTell = true;
      await page.evaluate(() => window.duel3dBlock?.());
      await page.waitForTimeout(180);
      continue;
    }
    if (snap.hud) {
      await page.evaluate(() => window.duel3dAttack?.());
      await page.waitForTimeout(160);
      continue;
    }
    const advanced = await page.evaluate(() => {
      const next = document.querySelector("#storyDialog.active #msNext");
      if (next) {
        next.click();
        return "next";
      }
      const st = window.MissingSignal?.debugState?.() || {};
      if (st.step === "s4_symbols") {
        const order = ["Знак дома", "Знак цепи", "Знак искры"];
        const label = order[st.symbols] || order[0];
        const btn = [...document.querySelectorAll("#angelinaGuide button")].find(b => b.textContent.includes(label));
        btn?.click();
        return btn ? "symbol" : "";
      }
      const choices = [...document.querySelectorAll("#angelinaGuide button.secondary")];
      if (choices.length) {
        const prefer = choices.find(b => /Договор|площад|башн/.test(b.textContent)) || choices[0];
        prefer.click();
        return "choice";
      }
      const act = document.getElementById("msAct");
      if (act) {
        act.click();
        return "act";
      }
      return "";
    });
    if (!advanced) await page.waitForTimeout(200);
    else await page.waitForTimeout(90);
  }
  console.log("last-step", lastStep);
  const endState = await page.evaluate(() => window.MissingSignal?.debugState?.());
  if (endState?.flags?.companion) sawCompanion = true;
  log("fight-tell-shown", sawTell, String(sawTell));
  log("angelina-companion", sawCompanion && !earlyAngelina, JSON.stringify({ earlyAngelina, flags: endState?.flags || {} }));
  log("ending-card", /ГЛАВА 2/.test(ending), ending);
  log("twist-flag", endState?.flags?.twist_seen === true, JSON.stringify(endState?.flags || {}));
  log("no-pageerror", errors.length === 0, errors.slice(0, 4).join(" | "));
  const failed = results.filter(r => !r.pass);
  console.log(JSON.stringify({ cardMs, failed: failed.map(r => r.id), ending }, null, 2));
  await browser.close();
  if (failed.length) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
