/**
 * Centralised loader for optional third-party scripts.
 * Nothing in this file runs unless the matching consent category is true.
 *
 * To remove analytics entirely: delete `loadAnalytics`, the `analytics` branch in
 * `applyConsent`, and leave PUBLIC_GA_MEASUREMENT_ID empty.
 */
import { PUBLIC_GA_MEASUREMENT_ID, PUBLIC_META_PIXEL_ID } from 'astro:env/client';
import { getConsent, onConsentChange, type ConsentRecord } from './consent';

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

const isConfigured = (id: string | undefined): id is string => !!id && !/^(\[|x+$)/i.test(id.trim());

let analyticsLoaded = false;
let pixelLoaded = false;

function injectScript(src: string, id: string): void {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

export function loadAnalytics(): void {
  if (analyticsLoaded || !isConfigured(PUBLIC_GA_MEASUREMENT_ID)) return;
  analyticsLoaded = true;
  const id = PUBLIC_GA_MEASUREMENT_ID;
  window[`ga-disable-${id}`] = false;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  // Page views are sent manually so they also work with view transitions.
  window.gtag('config', id, { send_page_view: false, anonymize_ip: true });
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`, 'ga4-loader');
  trackPageView();
}

export function loadMetaPixel(): void {
  if (pixelLoaded || !isConfigured(PUBLIC_META_PIXEL_ID)) return;
  pixelLoaded = true;
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      (fbq.queue = fbq.queue ?? []).push(args);
    } as NonNullable<Window['fbq']>;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;
  }
  injectScript('https://connect.facebook.net/en_US/fbevents.js', 'meta-pixel-loader');
  window.fbq?.('init', PUBLIC_META_PIXEL_ID);
  window.fbq?.('track', 'PageView');
}

/** Called on every client-side navigation (astro:page-load). */
export function trackPageView(): void {
  const consent = getConsent();
  if (consent?.categories.analytics && analyticsLoaded && window.gtag) {
    window.gtag('event', 'page_view', { page_location: location.href, page_title: document.title });
  }
}

function expireCookie(name: string): void {
  const hostParts = location.hostname.split('.');
  const domains = ['', ...hostParts.map((_, i) => `.${hostParts.slice(i).join('.')}`)];
  for (const domain of domains) {
    document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}; SameSite=Lax`;
  }
}

/** Revoked consent: stop collecting and delete the cookies we know about. */
function teardown(category: 'analytics' | 'marketing'): void {
  const names = document.cookie.split(';').map((c) => c.split('=')[0]?.trim() ?? '');
  if (category === 'analytics') {
    if (isConfigured(PUBLIC_GA_MEASUREMENT_ID)) window[`ga-disable-${PUBLIC_GA_MEASUREMENT_ID}`] = true;
    names.filter((n) => n === '_ga' || n.startsWith('_ga_') || n === '_gid').forEach(expireCookie);
    analyticsLoaded = false;
    document.getElementById('ga4-loader')?.remove();
  } else {
    names.filter((n) => n === '_fbp' || n === '_fbc').forEach(expireCookie);
    pixelLoaded = false;
    document.getElementById('meta-pixel-loader')?.remove();
    delete window.fbq;
  }
}

export function applyConsent(record: ConsentRecord | null, previous: ConsentRecord | null = null): void {
  if (record?.categories.analytics) loadAnalytics();
  else if (previous?.categories.analytics) teardown('analytics');

  if (record?.categories.marketing) loadMetaPixel();
  else if (previous?.categories.marketing) teardown('marketing');
}

let initialised = false;

/** Boots the consent → script pipeline once per full page load. */
export function initThirdParty(): void {
  if (initialised) return;
  initialised = true;
  applyConsent(getConsent());
  onConsentChange((record, previous) => applyConsent(record, previous));
  document.addEventListener('astro:page-load', trackPageView);
}
