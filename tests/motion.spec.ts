import { test, expect } from '@playwright/test';
import { ready, routes } from './helpers';

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('content is visible immediately, no parallax or custom cursor', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await expect(page.locator('html')).not.toHaveClass(/motion/);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-reveal], [data-lines] .line > span')].filter((el) => {
        const s = getComputedStyle(el);
        return s.opacity === '0' || (el.matches('.line > span') && s.transform !== 'none');
      }).length,
    );
    expect(hidden).toBe(0);
    await page.mouse.move(400, 400);
    await page.mouse.move(500, 450);
    await expect(page.locator('html')).not.toHaveClass(/has-cursor/);
    await expect(page.locator('[data-cursor-root]')).toBeHidden();
  });
});

/** The custom cursor must be on screen and under the pointer. */
async function expectCursorAt(page: import('@playwright/test').Page, x: number, y: number) {
  await page.mouse.move(x - 30, y - 30);
  await page.mouse.move(x, y, { steps: 4 });
  await expect(page.locator('html')).toHaveClass(/has-cursor/);
  const root = page.locator('[data-cursor-root]');
  await expect(root).toHaveCount(1);
  await expect(root).toHaveAttribute('data-ready', 'true');
  await expect(root).toHaveCSS('opacity', '1');
  await expect.poll(() => page.locator('[data-cursor-dot]').evaluate((el) => getComputedStyle(el).transform)).toBe(`matrix(1, 0, 0, 1, ${x}, ${y})`);
  // the ring catches up with the dot
  await expect
    .poll(() => page.locator('[data-cursor-ring]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41))
    .toBeGreaterThan(x - 2);
  // and it is really painted on top of the page (not display:none / behind content)
  const box = await page.locator('.cursor__dot-shape').boundingBox();
  expect(box && box.width > 0).toBe(true);
}

test.describe('custom cursor on every page', () => {
  for (const route of [...routes, '/contact/grazie', '/pagina-inesistente']) {
    test(`renders on ${route} (direct load)`, async ({ page }) => {
      await page.goto(route);
      await ready(page);
      await expectCursorAt(page, 420, 380);
    });
  }

  test('survives client-side navigation across all pages', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.getByTestId('consent-reject').click();
    await expectCursorAt(page, 400, 300);
    const nav = page.getByRole('navigation', { name: 'Principale' });
    for (const [name, url] of [['Work', /\/work$/], ['Servizi', /\/services$/], ['Studio', /\/about$/], ['Contatti', /\/contact$/]] as const) {
      await nav.getByRole('link', { name }).click();
      await expect(page).toHaveURL(url);
      // visible right after the swap, before the pointer moves again
      await expect(page.locator('[data-cursor-root]')).toHaveAttribute('data-ready', 'true');
      await expect(page.locator('[data-cursor-root]')).toHaveCSS('opacity', '1');
      await expect(page.locator('html')).toHaveClass(/has-cursor/);
      await expectCursorAt(page, 500, 420);
    }
    await page.goto('/work');
    await ready(page);
    await page.getByRole('link', { name: 'Casa Marea — Stagione 2025' }).click();
    await expect(page).toHaveURL(/casa-marea-social$/);
    await expectCursorAt(page, 640, 400);
    await page.goBack();
    await expectCursorAt(page, 300, 500);
  });

  test('native cursor comes back while the cookie dialog (top layer) is open', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await expectCursorAt(page, 400, 300);
    await page.getByTestId('consent-customize').click();
    const dialog = page.getByRole('dialog', { name: 'Preferenze cookie' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Accetta tutti' })).toHaveCSS('cursor', 'pointer');
    await expect(dialog).not.toHaveCSS('cursor', 'none');
  });
});

test.describe('desktop motion', () => {
  test('custom cursor activates on mouse move and shows VIEW on project cards', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await expect(page.locator('html')).not.toHaveClass(/has-cursor/);
    await page.mouse.move(300, 300);
    await page.mouse.move(320, 320);
    await expect(page.locator('html')).toHaveClass(/has-cursor/);
    await page.getByTestId('consent-reject').click();
    const card = page.locator('.card').first();
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box!.x + 200, box!.y + 100);
    await page.mouse.move(box!.x + 220, box!.y + 120);
    await expect(page.locator('[data-cursor-root]')).toHaveAttribute('data-state', 'view');
    await expect(page.locator('[data-cursor-label]')).toHaveText('VIEW');
  });

  test('view transitions: client navigation keeps the page alive and re-initialises animations', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.getByTestId('consent-reject').click();
    await page.evaluate(() => ((window as any).__marker = 'alive'));
    await page.getByRole('navigation', { name: 'Principale' }).getByRole('link', { name: 'Servizi' }).click();
    await expect(page).toHaveURL(/\/services$/);
    // same JS context ⇒ client-side navigation
    expect(await page.evaluate(() => (window as any).__marker)).toBe('alive');
    await expect(page.locator('html')).toHaveClass(/js/);
    await page.getByRole('navigation', { name: 'Principale' }).getByRole('link', { name: 'Work' }).click();
    await expect(page).toHaveURL(/\/work$/);
    await expect(page.locator('[data-work-item]').first()).toBeVisible();
    // reveals fire again on the new page
    await page.locator('.pg').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('[data-mask].is-in').count()).toBeGreaterThan(0);
    // back to home: services accordion works again (module re-mounted)
    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    const grow = page.locator('#svc-grow-t');
    await grow.scrollIntoViewIfNeeded();
    await grow.click();
    await expect(grow).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('touch devices', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('custom cursor is never enabled and sticky CTA appears after the hero', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.getByTestId('consent-reject').click();
    await expect(page.locator('html')).not.toHaveClass(/has-cursor/);
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.5, behavior: 'instant' }));
    await expect(page.locator('[data-sticky-cta]')).toHaveClass(/is-visible/);
    await page.locator('#contatti').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-sticky-cta]')).not.toHaveClass(/is-visible/);
  });
});
