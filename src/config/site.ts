/**
 * Single source of truth for every placeholder that must be replaced
 * before going live. Search the repo for "[" placeholders listed in README.
 */
export const site = {
  name: '[NOME AGENZIA]',
  legalName: '[RAGIONE SOCIALE]',
  vat: '[PARTITA IVA]',
  address: '[INDIRIZZO]',
  city: '[CITTÀ]',
  email: '[EMAIL]',
  phone: '[TELEFONO]',
  pec: '[PEC]',
  privacyOfficer: '[RESPONSABILE PRIVACY]',
  instagram: '[LINK INSTAGRAM]',
  linkedin: '[LINK LINKEDIN]',
  productionUrl: '[URL PRODUZIONE]',
  /** Link calendario (Cal.com, Calendly, Google Appointment…). Lasciare vuoto finché non esiste. */
  calendarUrl: '',
  tagline: 'Creative + digital studio',
  defaultDescription:
    'Contenuti foto e video, marketing e prodotti digitali custom: un solo partner creativo, dalla prima fotografia all’ultima riga di codice.',
  locale: 'it_IT',
  lang: 'it',
  themeColor: '#09090A',
  /** Quando false, i link social placeholder non vengono resi cliccabili. */
  socialsReady: false,
} as const;

/** True se il valore è ancora un placeholder tra parentesi quadre. */
export const isPlaceholder = (value: string): boolean => /^\[.+\]$/.test(value.trim());

/** Restituisce un href valido oppure undefined se il valore è ancora un placeholder. */
export const safeUrl = (value: string): string | undefined =>
  /^https?:\/\//.test(value) ? value : undefined;

export const mailto = (): string | undefined =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.email) ? `mailto:${site.email}` : undefined;

export const tel = (): string | undefined => {
  const digits = site.phone.replace(/[^\d+]/g, '');
  return digits.length >= 6 ? `tel:${digits}` : undefined;
};

export const nav = [
  { label: 'Work', href: '/work' },
  { label: 'Servizi', href: '/services' },
  { label: 'Studio', href: '/about' },
  { label: 'Contatti', href: '/contact' },
] as const;

/** Il sito dichiara quali cookie/tecnologie usa realmente. Aggiornare insieme alla Cookie Policy. */
export const cookieInventory = [
  {
    name: 'site_consent_v1',
    provider: 'Sito (first party)',
    category: 'Necessari',
    purpose: 'Memorizza le preferenze di consenso espresse dall’utente.',
    duration: '12 mesi',
    storage: 'localStorage',
  },
  {
    name: '_ga, _ga_*',
    provider: 'Google Analytics 4',
    category: 'Analytics',
    purpose: 'Misurazione aggregata dell’utilizzo del sito. Caricato soltanto dopo il consenso Analytics e solo se è configurato un ID.',
    duration: 'fino a 13 mesi',
    storage: 'Cookie',
  },
  {
    name: '_fbp',
    provider: 'Meta Pixel',
    category: 'Marketing',
    purpose: 'Misurazione delle conversioni e audience per campagne. Caricato soltanto dopo il consenso Marketing e solo se è configurato un ID.',
    duration: 'fino a 3 mesi',
    storage: 'Cookie',
  },
] as const;

export const consentConfig = {
  storageKey: 'site_consent_v1',
  version: 1,
  /** Mesi dopo i quali il banner viene riproposto. */
  renewAfterMonths: 12,
} as const;
