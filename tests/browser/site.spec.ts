import { test, expect } from '@playwright/test';
test('landing page renders without overflow, links to real sections, and loads every image', async ({ page }) => { const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.addInitScript(() => localStorage.setItem('btf:product-format-v1', 'mobile')); await page.goto('./?internal=1', { waitUntil: 'domcontentloaded' }); await expect(page.getByRole('heading', { level: 1 })).toContainText('The painting'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); for (const img of await page.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
} expect(await page.locator('a[href*="dashboard"]').count()).toBe(0); await page.getByRole('button', { name: 'The Artist' }).click(); await expect(page.locator('#role-story')).toContainText('follow the light'); expect(errors).toEqual([]); await page.screenshot({ path: `test-results/landing-${test.info().project.name}.png`, fullPage: true }); });
test('audience selection changes requirements and an unconfigured backend never reports success', async ({ page }) => { await page.goto('./?internal=1', { waitUntil: 'domcontentloaded' }); await page.locator('#audience').selectOption('visitor'); await expect(page.locator('#museum-fields')).toBeHidden(); await page.locator('#email').fill('visitor@example.org'); await page.locator('[name=consent]').check(); await page.locator('#signup-form button[type=submit]').click(); await expect(page.locator('#signup-status')).toContainText('not open yet'); await expect(page.locator('#thank-you')).toBeHidden(); });
test('analytics requires consent and privacy remains usable', async ({ page }) => { await page.goto('./', { waitUntil: 'domcontentloaded' }); await expect(page.locator('#analytics-consent')).toBeVisible(); expect(await page.evaluate(() => localStorage.getItem('btf:visitor'))).toBeNull();
    await test.step('decline analytics', async () => { await page.getByRole('button', { name: 'No thanks', exact: true }).click(); }); await expect(page.locator('#analytics-consent')).toBeHidden(); await test.step('open privacy', async () => { await page.getByRole('button', { name: 'Privacy & data', exact: true }).click(); }); await expect(page.locator('#privacy-dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.locator('#privacy-dialog')).toBeHidden(); });
test('dashboard URL opens independently with no exposed metrics', async ({ page }) => { await page.goto('dashboard/', { waitUntil: 'domcontentloaded' }); await expect(page.locator('#auth-panel')).toBeVisible(); await expect(page.locator('#metrics-panel')).toBeHidden(); await expect(page.locator('#auth-status')).toContainText('not configured'); expect(await page.evaluate(() => localStorage.getItem('btf:visitor'))).toBeNull(); });

for (const variant of ['worksheet', 'mobile', 'device']) {
  test(`${variant} shows only its concept and persists on reload`, async ({page}) => {
    await page.addInitScript(value => {
      if (!localStorage.getItem('btf:product-format-v1')) localStorage.setItem('btf:product-format-v1', value);
    }, variant);
    const images: string[] = [];
    page.on('request', request => { if (request.resourceType() === 'image') images.push(request.url()); });
    await page.goto('./?internal=1');
    await expect(page.locator('.concept-hero img')).toHaveAttribute('src', new RegExp(`/images/${variant}.png$`));
    const product = page.locator('.concept-product img');
    await expect(product).toHaveAttribute('src', new RegExp(`/images/${variant}-product.png$`));
    await product.scrollIntoViewIfNeeded();
    await expect.poll(() => product.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    for (const other of ['worksheet', 'mobile', 'device'].filter(value => value !== variant)) {
      await expect(page.locator(`img[src$="/${other}.png"]`)).toHaveCount(0);
      expect(images.some(url => url.endsWith(`/${other}.png`))).toBe(false);
      await expect(page.locator(`img[src$="/${other}-product.png"]`)).toHaveCount(0);
      expect(images.some(url => url.endsWith(`/${other}-product.png`))).toBe(false);
    }
    await expect(page.locator('img[src$="/explore.png"], img[src$="/welcome.png"], #preference')).toHaveCount(0);
    const content = await page.locator('.landing').textContent();
    if (variant !== 'worksheet') expect(content).not.toMatch(/worksheet|audio guide/i);
    if (variant !== 'mobile') expect(content).not.toMatch(/mobile phone|phone-based|designed for phones/i);
    if (variant !== 'device') expect(content).not.toMatch(/dedicated handheld|dedicated device/i);
    if (variant === 'worksheet') await expect(page.locator('.roles-section')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.concept-hero img')).toHaveAttribute('src', new RegExp(`/images/${variant}.png$`));
    await page.screenshot({path: `test-results/concept-${variant}.png`, fullPage: true});
  });
}
test('random assignment survives navigation without storage seeding', async ({page}) => {
  await page.goto('./?internal=1');
  await expect(page.locator('.concept-hero img')).toBeVisible();
  const first = await page.locator('.concept-hero img').getAttribute('src');
  await page.reload();
  await expect(page.locator('.concept-hero img')).toHaveAttribute('src', first!);
});
test('blocked storage still renders a concept and allows signup', async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {get() {throw new Error('blocked');}}));
  await page.goto('./?internal=1');
  await expect(page.locator('.concept-hero img')).toBeVisible();
  await expect(page.locator('#signup-form button[type=submit]')).toBeEnabled();
});
test('initial static HTML does not expose any concept before assignment', async ({request}) => {
  const response = await request.get('./');
  const html = await response.text();
  expect(html).not.toMatch(/images\/(worksheet|mobile|device|explore|welcome)\.png/);
  expect(html).not.toContain('phone-based adventure');
});

for (const concept of ['mobile', 'device']) for (const offer of ['inquiry', 'pilot']) {
  test(`${concept} ${offer} museum landing displays the matching offer and requires museum details`, async ({page}) => {
    // Explicit outreach links must override conflicting stored assignments.
    await page.addInitScript(() => {
      localStorage.setItem('btf:product-format-v1', 'worksheet');
      localStorage.setItem('btf:museum-pricing-v1', 'inquiry');
    });
    await page.goto(`museums/${concept}/${offer}/?internal=1`);
    await expect(page.locator('.concept-hero img')).toHaveAttribute('src', new RegExp(`/images/${concept}.png$`));
    await expect(page.locator('.museum-offer')).toContainText(offer === 'pilot' ? '$1,000 for a 30-day exhibition pilot' : 'receive a quotation');
    if (offer === 'inquiry') await expect(page.locator('.landing')).not.toContainText('$1,000');
    await expect(page.locator('#organization')).toHaveAttribute('required', '');
    await expect(page.locator('#job-role')).toHaveAttribute('required', '');
    await expect(page.locator('#signup-form button[type=submit]')).toContainText(offer === 'pilot' ? '$1,000' : 'quotation');
    await page.locator('#email').fill('museum@example.org');
    await page.locator('#organization').fill('Test museum');
    await page.locator('#job-role').fill('Curator');
    await page.locator('[name=consent]').check();
    await page.locator('#signup-form button[type=submit]').click();
    await expect(page.locator('#signup-status')).toContainText('not open yet');
    await expect(page.locator('#thank-you')).toBeHidden();
    await page.reload();
    await expect(page.locator('.museum-offer')).toContainText(offer === 'pilot' ? '$1,000' : 'quotation');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `test-results/pricing-${concept}-${offer}.png`, fullPage: true});
  });
}
test('root pricing is persistent and worksheet stays outside the test', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('btf:product-format-v1', 'mobile'));
  await page.goto('./?internal=1');
  await expect(page.locator('.museum-offer')).toBeVisible();
  const offer = await page.locator('.museum-offer').textContent();
  await page.reload();
  await expect(page.locator('.museum-offer')).toHaveText(offer!);
  await page.goto('museums/device/pilot/?internal=1');
  await expect(page.locator('.museum-offer')).toContainText('$1,000');
  await page.goto('./?internal=1');
  await expect(page.locator('.museum-offer')).toHaveText(offer!);
});
test('worksheet does not show or assign a pricing offer', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('btf:product-format-v1', 'worksheet'));
  await page.goto('./?internal=1');
  await expect(page.locator('.concept-hero img')).toBeVisible();
  await expect(page.locator('.museum-offer')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('btf:museum-pricing-v1'))).toBeNull();
});
