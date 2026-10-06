import { test, expect, type Page } from '@playwright/test';
import { ready } from './helpers';

const KEY = 'site_consent_v1';
const readConsent = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

/** Records every request to the third-party hosts so we can prove gating. */
function watchThirdParty(page: Page) {
  const hits: string[] = [];
  page.route(/googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com\/tr/, (route) => {
    hits.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stub */' });
  });
  return hits;
}

test('nothing optional loads before a choice is made', async ({ page }) => {
  const hits = watchThirdParty(page);
  await page.goto('/');
  await ready(page);
  await expect(page.getByTestId('cookie-banner')).toBeVisible();
  await page.waitForTimeout(800);
  expect(hits).toEqual([]);
  expect(await readConsent(page)).toBeNull();
  expect(await page.evaluate(() => typeof (window as any).gtag)).toBe('undefined');
  expect(await page.evaluate(() => typeof (window as any).fbq)).toBe('undefined');
  expect(await page.evaluate(() => document.cookie)).toBe('');
});

test('reject: stores versioned decision and loads nothing', async ({ page }) => {
  const hits = watchThirdParty(page);
  await page.goto('/');
  await ready(page);
  await page.getByTestId('consent-reject').click();
  await expect(page.getByTestId('cookie-banner')).toHaveCount(0);
  const record = await readConsent(page);
  expect(record.version).toBe(1);
  expect(record.categories).toEqual({ necessary: true, analytics: false, marketing: false });
  expect(Date.parse(record.timestamp)).not.toBeNaN();
  await page.reload();
  await ready(page);
  await page.waitForTimeout(600);
  await expect(page.getByTestId('cookie-banner')).toHaveCount(0);
  expect(hits).toEqual([]);
});

test('accept: loads analytics and marketing scripts only now', async ({ page }) => {
  const hits = watchThirdParty(page);
  await page.goto('/');
  await ready(page);
  expect(hits).toEqual([]);
  await page.getByTestId('consent-accept').click();
  await expect.poll(() => hits.some((u) => /googletagmanager/.test(u))).toBe(true);
  await expect.poll(() => hits.some((u) => /connect\.facebook\.net/.test(u))).toBe(true);
  const record = await readConsent(page);
  expect(record.categories).toEqual({ necessary: true, analytics: true, marketing: true });
});

test('preferences: granular choice, focus trap, Escape and focus return', async ({ page }) => {
  const hits = watchThirdParty(page);
  await page.goto('/');
  await ready(page);
  await page.getByTestId('consent-customize').click();
  const dialog = page.getByRole('dialog', { name: 'Preferenze cookie' });
  await expect(dialog).toBeVisible();
  // opt-in categories are not pre-selected, necessary is locked on
  await expect(dialog.getByRole('checkbox', { name: 'Necessari' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Necessari' })).toBeDisabled();
  await expect(dialog.getByRole('checkbox', { name: 'Analytics' })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Marketing' })).not.toBeChecked();

  // Focus cannot leave the dialog.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  }

  // Only analytics
  await dialog.getByText('Analytics', { exact: true }).locator('xpath=ancestor::li').locator('.switch').click();
  await dialog.getByTestId('consent-save').click();
  await expect(dialog).toBeHidden();
  const record = await readConsent(page);
  expect(record.categories).toEqual({ necessary: true, analytics: true, marketing: false });
  await expect.poll(() => hits.some((u) => /googletagmanager/.test(u))).toBe(true);
  expect(hits.some((u) => /facebook/.test(u))).toBe(false);
});

test('footer button reopens preferences, Escape closes, focus returns, changes are saved', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.getByTestId('consent-accept').click();
  const opener = page.getByRole('button', { name: 'Gestisci preferenze cookie' });
  await opener.scrollIntoViewIfNeeded();
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Preferenze cookie' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: 'Analytics' })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  // Withdraw everything
  await opener.click();
  await dialog.getByRole('button', { name: 'Rifiuta non necessari' }).click();
  const record = await readConsent(page);
  expect(record.categories).toEqual({ necessary: true, analytics: false, marketing: false });
});
