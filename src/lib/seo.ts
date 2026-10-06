import { site, isPlaceholder, safeUrl } from '../config/site';

export interface Crumb {
  name: string;
  path: string;
}

type Json = Record<string, unknown>;

export const absoluteUrl = (path: string, base: URL | string): string => new URL(path, base).toString();

/** Removes keys whose value is empty or still a "[PLACEHOLDER]" so we never publish fake data. */
function clean<T extends Json>(obj: T): T {
  const out: Json = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'string' && isPlaceholder(v)) continue;
    out[k] = v;
  }
  return out as T;
}

export function organizationLd(origin: string): Json {
  const sameAs = [safeUrl(site.instagram), safeUrl(site.linkedin)].filter(Boolean);
  return clean({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${origin}/#organization`,
    name: site.name,
    legalName: site.legalName,
    url: origin,
    description: site.defaultDescription,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.email) ? site.email : undefined,
    telephone: isPlaceholder(site.phone) ? undefined : site.phone,
    logo: `${origin}/icon-512.png`,
    image: `${origin}/og-default.jpg`,
    sameAs: sameAs.length ? sameAs : undefined,
    areaServed: 'IT',
    knowsAbout: [
      'Fotografia di prodotto',
      'Produzione video',
      'Social media management',
      'Google Ads',
      'SEO',
      'Sviluppo web',
      'Ecommerce',
      'Web app custom',
    ],
  });
}

export function websiteLd(origin: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: origin,
    name: site.name,
    inLanguage: site.lang,
    publisher: { '@id': `${origin}/#organization` },
  };
}

export function breadcrumbLd(crumbs: Crumb[], origin: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path, origin),
    })),
  };
}

export function creativeWorkLd(
  p: { title: string; description: string; year: number; image: string; url: string; client: string; services: string[] },
  origin: string,
): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: p.title,
    description: p.description,
    datePublished: String(p.year),
    image: p.image,
    url: p.url,
    keywords: p.services.join(', '),
    creator: { '@id': `${origin}/#organization` },
  };
}
