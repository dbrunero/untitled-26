import { test, expect } from '@playwright/test';
import { ready, routes } from './helpers';

for (const route of routes) {
  test(`route ${route} loads without console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Outdated Optimize Dep|favicon/.test(m.text())) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await ready(page);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    // every <img> has an alt attribute (empty alt = decorative)
    const missingAlt = await page.locator('img:not([alt])').count();
    expect(missingAlt).toBe(0);
    expect(errors).toEqual([]);
  });
}

test('404 page is on-brand and returns 404', async ({ page }) => {
  const response = await page.goto('/non-esiste');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Torna alla home' })).toBeVisible();
});

for (const width of [1440, 1280, 1024, 768, 390, 360]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/work', '/services', '/about', '/contact', '/work/casa-marea-social']) {
      await page.goto(route);
      await ready(page);
      // The site clips x-overflow on <body> as a safety net; lift it so real overflow becomes measurable.
      await page.addStyleTag({ content: 'html, body { overflow-x: visible !important; }' });
      await page.waitForTimeout(400);
      const culprit = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth <= vw + 1) return null;
        const bad = [...document.querySelectorAll<HTMLElement>('body *')].find((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed';
        });
        return bad ? `${bad.tagName.toLowerCase()}.${bad.className}` : 'unknown';
      });
      expect(culprit, `${route} at ${width}px`).toBeNull();

      // Headline lines are masked with overflow:hidden for the reveal: make sure no word is cut off.
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.line, h1, h2, h3, .card__title')]
          .filter((el) => !el.classList.contains('sr-only') && getComputedStyle(el).overflowX !== 'visible')
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .map((el) => `${el.tagName.toLowerCase()}.${el.className}: "${(el.textContent ?? '').trim().slice(0, 40)}"`),
      );
      expect(clipped, `clipped text on ${route} at ${width}px`).toEqual([]);
    }
  });
}

test('skip link moves focus to main content', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Vai al contenuto' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});
