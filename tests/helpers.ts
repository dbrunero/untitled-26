import { expect, type Page } from '@playwright/test';

/** Waits for Astro islands + the client script to be ready. */
export async function ready(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => document.documentElement.classList.contains('js'));
}

/** Accept the banner so it never covers elements during the test. */
export async function dismissBanner(page: Page) {
  const reject = page.getByTestId('consent-reject');
  await reject.waitFor({ state: 'visible' });
  await reject.click();
  await expect(page.getByTestId('cookie-banner')).toHaveCount(0);
}

export const routes = ['/', '/work', '/services', '/about', '/contact', '/privacy-policy', '/cookie-policy', '/work/nuvola-lab-skincare', '/work/rotta-crm-logistica'];
