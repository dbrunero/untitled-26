/**
 * Consent store: the only place that reads/writes the user's cookie choices.
 *
 *  - Stored in localStorage under `site_consent_v1` (versioned + timestamped).
 *  - Nothing optional runs until `analytics` / `marketing` are explicitly true.
 *  - Every change is broadcast with a `consent:change` CustomEvent so third-party
 *    loaders (src/lib/third-party.ts) and UI can react.
 *
 * LEGAL NOTE: this is a technical mechanism. Texts, categories and retention periods
 * must be reviewed by a qualified professional before going live.
 */
import { consentConfig } from '../config/site';

export interface ConsentCategories {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentRecord {
  version: number;
  timestamp: string;
  categories: ConsentCategories;
}

export const CONSENT_EVENT = 'consent:change';
export const CONSENT_OPEN_EVENT = 'consent:open';

const isBrowser = () => typeof window !== 'undefined';

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValid(value: unknown): value is ConsentRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<ConsentRecord>;
  return (
    v.version === consentConfig.version &&
    typeof v.timestamp === 'string' &&
    !!v.categories &&
    typeof v.categories.analytics === 'boolean' &&
    typeof v.categories.marketing === 'boolean'
  );
}

function isExpired(record: ConsentRecord): boolean {
  const saved = Date.parse(record.timestamp);
  if (Number.isNaN(saved)) return true;
  const limit = new Date(saved);
  limit.setMonth(limit.getMonth() + consentConfig.renewAfterMonths);
  return Date.now() > limit.getTime();
}

/** Returns the stored decision, or null when the user has not chosen yet (or it expired / changed version). */
export function getConsent(): ConsentRecord | null {
  if (!isBrowser()) return null;
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(consentConfig.storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed) || isExpired(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasConsent(category: 'analytics' | 'marketing'): boolean {
  return getConsent()?.categories[category] === true;
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): ConsentRecord {
  const previous = getConsent();
  const record: ConsentRecord = {
    version: consentConfig.version,
    timestamp: new Date().toISOString(),
    categories: { necessary: true, analytics: choice.analytics, marketing: choice.marketing },
  };
  const storage = safeStorage();
  try {
    storage?.setItem(consentConfig.storageKey, JSON.stringify(record));
  } catch {
    /* storage unavailable: the choice only lives for this page view */
  }
  window.dispatchEvent(new CustomEvent<{ record: ConsentRecord; previous: ConsentRecord | null }>(CONSENT_EVENT, { detail: { record, previous } }));
  return record;
}

export const acceptAll = () => saveConsent({ analytics: true, marketing: true });
export const rejectOptional = () => saveConsent({ analytics: false, marketing: false });

export function onConsentChange(cb: (record: ConsentRecord, previous: ConsentRecord | null) => void): () => void {
  const handler = (event: Event) => {
    const { record, previous } = (event as CustomEvent<{ record: ConsentRecord; previous: ConsentRecord | null }>).detail;
    cb(record, previous);
  };
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}

/** Opens the preferences panel (used by the footer button and the cookie policy page). */
export function openConsentPreferences(trigger?: HTMLElement | null) {
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT, { detail: { trigger: trigger ?? null } }));
}
