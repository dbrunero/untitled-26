/**
 * Contact form delivery through Formspree (https://formspree.io).
 * The site is fully static: the browser posts straight to the Formspree endpoint, so there is
 * no server code and no secret to protect (the form ID is public by design).
 *
 * To switch provider (Web3Forms, Basin, a serverless function…) replace `submitContact`:
 * the form component only depends on `SubmitResult`.
 */
import { PUBLIC_FORMSPREE_ID } from 'astro:env/client';
import type { ContactData, FieldErrors, FieldName } from './validation';
import { fieldOrder } from './validation';
import { labelFor, serviceOptions, budgetOptions, timelineOptions } from './form-options';

export type SubmitResult =
  | { ok: true; mode: 'sent' | 'dev-preview' }
  | { ok: false; reason: 'not-configured' | 'validation' | 'provider-error' | 'network'; message: string; errors?: FieldErrors };

const isConfigured = (id: string | undefined): id is string => !!id && /^[a-zA-Z0-9]{6,}$/.test(id.trim());

/** Formspree endpoint, or null while PUBLIC_FORMSPREE_ID is missing. */
export const formspreeEndpoint = (): string | null =>
  isConfigured(PUBLIC_FORMSPREE_ID) ? `https://formspree.io/f/${PUBLIC_FORMSPREE_ID.trim()}` : null;

/** What lands in the inbox: readable labels instead of internal option values. */
export function buildPayload(data: ContactData): Record<string, string> {
  return {
    name: data.name,
    email: data.email, // Formspree uses "email" as reply-to
    company: data.company,
    phone: data.phone || '—',
    website: data.website || '—',
    service: labelFor(serviceOptions, data.service),
    budget: labelFor(budgetOptions, data.budget),
    timeline: labelFor(timelineOptions, data.timeline),
    message: data.message,
    source: data.source || '—',
    privacy: 'Accettata',
    marketing: data.marketing ? 'Sì' : 'No',
    _subject: `Nuova richiesta dal sito — ${data.company}`,
  };
}

interface FormspreeError {
  field?: string;
  code?: string;
  message?: string;
}

export async function submitContact(data: ContactData, signal?: AbortSignal): Promise<SubmitResult> {
  // Honeypot: bots get a silent "success", nothing is sent.
  if (data.hp) return { ok: true, mode: 'sent' };

  const endpoint = formspreeEndpoint();
  if (!endpoint) {
    // Development only: let the UI be exercised without an account. Never fake success in production.
    if (import.meta.env.DEV) return { ok: true, mode: 'dev-preview' };
    return {
      ok: false,
      reason: 'not-configured',
      message: 'Il modulo non è ancora collegato a un servizio di invio. Scrivici direttamente via email.',
    };
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildPayload(data)),
      ...(signal ? { signal } : {}),
    });
  } catch {
    return { ok: false, reason: 'network', message: 'Connessione assente o troppo lenta. Controlla la rete e riprova.' };
  }

  if (response.ok) return { ok: true, mode: 'sent' };

  const body = (await response.json().catch(() => ({}))) as { errors?: FormspreeError[] };
  const errors: FieldErrors = {};
  for (const e of body.errors ?? []) {
    if (e.field && (fieldOrder as string[]).includes(e.field)) {
      errors[e.field as FieldName] = e.code === 'TYPE_EMAIL' ? 'Inserisci un’email valida, per esempio nome@azienda.it.' : (e.message ?? 'Valore non valido.');
    }
  }
  if (Object.keys(errors).length) return { ok: false, reason: 'validation', message: 'Controlla i campi evidenziati.', errors };
  if (response.status === 429) return { ok: false, reason: 'provider-error', message: 'Troppe richieste in poco tempo. Riprova tra qualche minuto.' };
  return { ok: false, reason: 'provider-error', message: 'Non siamo riusciti a inviare il messaggio. Riprova tra poco o scrivici via email.' };
}
