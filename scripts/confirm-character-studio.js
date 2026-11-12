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

module.exports = { confirmCharacterStudio };
