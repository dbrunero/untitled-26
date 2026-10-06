import { test, expect } from '@playwright/test';
import { dismissBanner, ready } from './helpers';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('mobile menu opens, traps focus, locks scroll and closes with Escape', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await dismissBanner(page);
  const toggle = page.getByRole('button', { name: 'Apri il menu' });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  const menu = page.getByRole('dialog', { name: 'Menu principale' });
  await expect(menu).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chiudi il menu' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('html')).toHaveClass(/is-locked/);
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await expect(menu.getByRole('link', { name: /Work/ })).toBeFocused();

  // Focus stays inside header + menu.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => {
      const a = document.activeElement;
      return !!a && (!!a.closest('[data-mobile-menu]') || !!a.closest('[data-header]'));
    });
    expect(inside).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button', { name: 'Apri il menu' })).toBeFocused();
  await expect(page.locator('html')).not.toHaveClass(/is-locked/);
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
});

test('menu link navigates and closes the menu', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await dismissBanner(page);
  await page.getByRole('button', { name: 'Apri il menu' }).click();
  await page.getByRole('dialog', { name: 'Menu principale' }).getByRole('link', { name: /Servizi/ }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.locator('html')).not.toHaveClass(/is-locked/);
  await expect(page.getByRole('button', { name: 'Apri il menu' })).toBeVisible();
});
