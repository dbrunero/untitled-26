export interface Option {
  value: string;
  label: string;
}

export const serviceOptions: Option[] = [
  { value: 'foto-video', label: 'Foto e video' },
  { value: 'social', label: 'Social media' },
  { value: 'google-ads', label: 'Google Ads' },
  { value: 'seo', label: 'SEO' },
  { value: 'tracking', label: 'Tracking e Meta Pixel' },
  { value: 'sito-web', label: 'Sito web' },
  { value: 'ecommerce', label: 'Ecommerce' },
  { value: 'configuratore', label: 'Configuratore o preventivatore' },
  { value: 'crm', label: 'CRM o gestionale' },
  { value: 'web-app', label: 'Web app custom' },
  { value: 'altro', label: 'Altro' },
];

export const budgetOptions: Option[] = [
  { value: 'da-definire', label: 'Da definire' },
  { value: 'fino-3000', label: 'Fino a 3.000 €' },
  { value: '3000-7500', label: '3.000–7.500 €' },
  { value: '7500-15000', label: '7.500–15.000 €' },
  { value: '15000-30000', label: '15.000–30.000 €' },
  { value: 'oltre-30000', label: 'Oltre 30.000 €' },
];

export const timelineOptions: Option[] = [
  { value: 'asap', label: 'Appena possibile' },
  { value: 'entro-1-mese', label: 'Entro 1 mese' },
  { value: '1-3-mesi', label: '1–3 mesi' },
  { value: '3-6-mesi', label: '3–6 mesi' },
  { value: 'nessuna-scadenza', label: 'Nessuna scadenza precisa' },
];

export const labelFor = (options: Option[], value: string): string =>
  options.find((o) => o.value === value)?.label ?? value;
