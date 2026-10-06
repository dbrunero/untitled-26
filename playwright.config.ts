import { defineConfig } from '@playwright/test';

const PORT = 4399;
const MOCK_PORT = 4398;

/**
 * E2E runs against the PRODUCTION build (node adapter), the closest thing to what ships.
 * A local mock stands in for Resend so the real email code path is exercised end to end.
 * The "not configured" production behaviour is covered by tests/form.spec.ts, which spawns
 * a second server without mail credentials.
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
  webServer: [
    {
      command: 'node tests/mock-resend.mjs',
      url: `http://127.0.0.1:${MOCK_PORT}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `ADAPTER=node pnpm build && node dist/server/entry.mjs`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        HOST: '127.0.0.1',
        PORT: String(PORT),
        PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}`,
        // Fake analytics IDs: only used to prove that nothing loads before consent.
        PUBLIC_GA_MEASUREMENT_ID: 'G-TEST000000',
        PUBLIC_META_PIXEL_ID: '1234567890',
        CONTACT_TO_EMAIL: 'inbox@example.test',
        CONTACT_FROM_EMAIL: 'site@example.test',
        RESEND_API_KEY: 're_test_key',
        RESEND_API_URL: `http://127.0.0.1:${MOCK_PORT}`,
      },
    },
  ],
});
