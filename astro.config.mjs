import { defineConfig, envField } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

try {
  // Node >= 20.12: load .env so PUBLIC_SITE_URL is available while evaluating this file.
  process.loadEnvFile?.('.env');
} catch {
  /* no .env file: fall back to defaults */
}

const site = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

// https://astro.build/config
export default defineConfig({
  site,
  // Static by default: only /api/contact is rendered on demand (prerender = false).
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [preact(), sitemap({ filter: (page) => !page.includes('/404') })],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  image: { layout: 'constrained' },
  devToolbar: { enabled: false },
  env: {
    schema: {
      CONTACT_TO_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_META_PIXEL_ID: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
