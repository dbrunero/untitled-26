import { test, expect } from '@playwright/test';
import { dismissBanner, ready } from './helpers';

test('work filters by category via custom select, updates URL, shows empty state and resets', async ({ page }) => {
  await page.goto('/work');
  await ready(page);
  await dismissBanner(page);
  await page.locator('[data-testid="work-filters"] button[role="combobox"]').first().waitFor();
  const category = page.getByRole('combobox', { name: /Categoria/ });
  await category.click();
  await page.getByRole('option', { name: 'Eventi' }).click();
  await expect(page).toHaveURL(/categoria=eventi/);
  await expect(page.locator('[data-work-item]:not([hidden])')).toHaveCount(1);
  await expect(page.locator('[data-work-count]')).toHaveText('1 progetto');

  // combine with a year that has no match → empty state
  const year = page.getByRole('combobox', { name: /Anno/ });
  await year.click();
  await page.getByRole('option', { name: '2025' }).click();
  await expect(page.locator('[data-work-empty]')).toBeVisible();
  await expect(page.locator('[data-work-item]:not([hidden])')).toHaveCount(0);

  await page.getByRole('button', { name: 'Azzera filtri' }).click();
  await expect(page.locator('[data-work-item]:not([hidden])')).toHaveCount(6);
  await expect(page).not.toHaveURL(/categoria|anno/);
  await expect(page.locator('[data-work-empty]')).toBeHidden();
});

test('filters are restored from the URL', async ({ page }) => {
  await page.goto('/work?categoria=software');
  await ready(page);
  await expect(page.locator('[data-work-item]:not([hidden])')).toHaveCount(2);
  await expect(page.getByRole('combobox', { name: /Categoria/ })).toContainText('Software custom');
});

test('navigates from the archive to a case study and on to the next project', async ({ page }) => {
  await page.goto('/work');
  await ready(page);
  await dismissBanner(page);
  await page.getByRole('link', { name: 'Casa Marea — Stagione 2025' }).click();
  await expect(page).toHaveURL(/\/work\/casa-marea-social$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Casa Marea');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  await page.getByRole('link', { name: /Progetto successivo/ }).first().click();
  await expect(page).toHaveURL(/\/work\/festival-linea-live$/);
});

test('home → case study from the featured grid', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await dismissBanner(page);
  const link = page.getByRole('link', { name: 'Rotta — CRM e dashboard operativa' });
  await link.scrollIntoViewIfNeeded();
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/work\/rotta-crm-logistica$/);
});

test('services accordion is keyboard accessible and keeps aria-expanded truthful', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await dismissBanner(page);
  const create = page.locator('#svc-create-t');
  const grow = page.locator('#svc-grow-t');
  await expect(create).toHaveAttribute('aria-expanded', 'true');
  await grow.scrollIntoViewIfNeeded();
  await grow.focus();
  await page.keyboard.press('Enter');
  await expect(grow).toHaveAttribute('aria-expanded', 'true');
  await expect(create).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#svc-grow-p')).toBeVisible();
  await expect(page.locator('#svc-create-p')).toBeHidden();
});
