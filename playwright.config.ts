import { defineConfig } from '@playwright/test';

const PORT = 4399;

/**
 * E2E runs against the PRODUCTION static build, served by a tiny static server (tests/static-server.mjs).
 * Formspree is never contacted: tests intercept the request in the browser.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Uses the locally installed Google Chrome so no browser download is needed.
    // On CI run `pnpm exec playwright install chromium` and remove `channel`.
    channel: process.env.CI ? undefined : 'chrome',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm build && node tests/static-server.mjs dist ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}`,
      PUBLIC_FORMSPREE_ID: 'testform01',
      // Fake analytics IDs: only used to prove that nothing loads before consent.
      PUBLIC_GA_MEASUREMENT_ID: 'G-TEST000000',
      PUBLIC_META_PIXEL_ID: '1234567890',
    },
  },
});
