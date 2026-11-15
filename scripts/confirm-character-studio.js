const { QA_CYBER_PUNK_BLUE } = require("./avatar-qa-presets");

/** t206u: full UI path for mandatory CYBER PUNK BLUE QA hero. */
async function configureCyberPunkBlueStudio(page, heroName = QA_CYBER_PUNK_BLUE.name) {
  await page.waitForSelector('[data-testid="character-studio"]', { timeout: 120000 });
  const clicks = [
    ["hairStyle", QA_CYBER_PUNK_BLUE.hairStyle],
    ["skinTone", QA_CYBER_PUNK_BLUE.skinTone],
    ["hairColor", QA_CYBER_PUNK_BLUE.hairColor],
    ["bodyPreset", QA_CYBER_PUNK_BLUE.bodyPreset],
    ["outfitStyle", QA_CYBER_PUNK_BLUE.outfitStyle],
    ["accessoryToggle", "wings_01"]
  ];
  const studioStillSteps = [
    { after: ["hairColor", QA_CYBER_PUNK_BLUE.hairColor], tag: "studio-after-hair" },
    { after: ["outfitStyle", QA_CYBER_PUNK_BLUE.outfitStyle], tag: "studio-after-outfit" },
    { after: ["accessoryToggle", "wings_01"], tag: "studio-after-wings" }
  ];
  for (const [field, id] of clicks) {
    await page.locator(`[data-field="${field}"][data-id="${id}"]`).scrollIntoViewIfNeeded();
    const prev = await page.evaluate(() => window.__lastStudioPreviewMs || 0);
    await page.click(`[data-field="${field}"][data-id="${id}"]`);
    const fast = process.env.CAPTURE_STUDIO_FAST === "1";
    if (!fast) {
      await page
        .waitForFunction(p => (window.__lastStudioPreviewMs || 0) > p, prev, { timeout: 5000 })
        .catch(() => {});
      await page.waitForTimeout(60);
    } else {
      await page.waitForTimeout(45);
    }
    const still = studioStillSteps.find(s => s.after[0] === field && s.after[1] === id);
    if (still && !fast) {
      await page.waitForTimeout(120);
      await page.locator("#charSelect3d").screenshot({ path: `/tmp/${still.tag}.png` }).catch(() => {});
      still._captured = true;
    } else if (still && fast) {
      await page.waitForTimeout(80);
      await page.locator("#charSelect3d").screenshot({ path: `/tmp/${still.tag}.png` }).catch(() => {});
      still._captured = true;
    }
  }
  await page.evaluate(() => {
    document.querySelector('[data-field="accessoryToggle"][data-id="wings_01"]')?.click();
  });
  const wingsOk = await page.evaluate(() => {
    const sum = document.querySelector('[data-testid="studio-summary"]')?.textContent || "";
    return /Wings|Крылья|Vinger/i.test(sum);
  });
  if (!wingsOk) throw new Error("studio summary missing wings after QA picks");
  await page.fill('[data-testid="hero-name-input"]', heroName);
}

/** Playwright helper: Character Studio (t204u) or legacy mesh pick. */
async function confirmCharacterStudio(page, heroName = "TestHero") {
  await page.waitForSelector(
    '[data-testid="character-studio-confirm"], #charSelectConfirm',
    { timeout: 120000 }
  );
  const studio = await page.locator('[data-testid="character-studio"]').isVisible().catch(() => false);
  if (studio) {
    await page.fill('[data-testid="hero-name-input"]', heroName);
    await page.locator('[data-testid="character-studio-confirm"]').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      document.querySelector('[data-testid="character-studio-confirm"]')?.click();
    });
    return;
  }
  const sliceChar = await page.locator('[data-testid="char-select-angelina"]').isVisible().catch(() => false);
  if (sliceChar) {
    await page.click(".char-portrait-pick >> nth=0");
  } else {
    await page.click('.char-pick[data-id="cobalt"]');
  }
  await page.click("#charSelectConfirm");
}

module.exports = { confirmCharacterStudio, configureCyberPunkBlueStudio, QA_CYBER_PUNK_BLUE };
