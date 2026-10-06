import { test, expect } from '@playwright/test';
import { ready } from './helpers';

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
