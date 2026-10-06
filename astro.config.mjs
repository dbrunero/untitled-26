import { defineConfig, envField } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

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
  // Fully static (SSG): no adapter, no server code. The contact form posts to Formspree.
  output: 'static',
  integrations: [preact(), sitemap({ filter: (page) => !page.includes('/404') })],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  // One HTML request, no render-blocking stylesheet round trips (CSS is ~35 kB gzip in total).
  build: { inlineStylesheets: 'always' },
  image: { layout: 'constrained' },
  devToolbar: { enabled: false },
  env: {
    schema: {
      PUBLIC_FORMSPREE_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_META_PIXEL_ID: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
