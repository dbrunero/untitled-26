import { defineConfig, envField } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';

try {
  // Node >= 20.12: load .env so PUBLIC_SITE_URL is available while evaluating this file.
  process.loadEnvFile?.('.env');
} catch {
  /* no .env file: fall back to defaults */
}

const site = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';
const siteUrl = new URL(site);

// https://astro.build/config
export default defineConfig({
  site,
  // Static by default: only /api/contact is rendered on demand (prerender = false).
  output: 'static',
  // Netlify turns /api/contact into a Netlify Function; everything else stays static.
  // ADAPTER=node builds a standalone Node server instead (used by the e2e tests / self-hosting).
  adapter: process.env.ADAPTER === 'node' ? node({ mode: 'standalone' }) : netlify(),
  integrations: [preact(), sitemap({ filter: (page) => !page.includes('/404') })],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  // One HTML request, no render-blocking stylesheet round trips (CSS is ~35 kB gzip in total).
  build: { inlineStylesheets: 'always' },
  image: { layout: 'constrained' },
  devToolbar: { enabled: false },
  security: {
    // The production host must be declared so request URLs / the built-in CSRF origin check
    // use the real domain instead of falling back to localhost. Set PUBLIC_SITE_URL accordingly.
    allowedDomains: [
      {
        hostname: siteUrl.hostname,
        protocol: siteUrl.protocol.replace(':', ''),
        ...(siteUrl.port ? { port: siteUrl.port } : {}),
      },
      // Netlify deploy previews and branch deploys.
      { hostname: '**.netlify.app', protocol: 'https' },
    ],
  },
  env: {
    schema: {
      CONTACT_TO_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      /** Optional override of the provider base URL (used by the e2e tests to point at a local mock). */
      RESEND_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_META_PIXEL_ID: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
