import type { ContactData } from './validation';
import { labelFor, serviceOptions, budgetOptions, timelineOptions } from './form-options';

export interface MailConfig {
  to?: string | undefined;
  from?: string | undefined;
  apiKey?: string | undefined;
}

export type SendResult =
  | { ok: true; mode: 'sent' | 'dev-preview' }
  | { ok: false; reason: 'not-configured' | 'provider-error' };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

export function buildMessage(data: ContactData) {
  const rows: Array<[string, string]> = [
    ['Nome', data.name],
    ['Email', data.email],
    ['Azienda', data.company],
    ['Telefono', data.phone || '—'],
    ['Sito attuale', data.website || '—'],
    ['Servizio', labelFor(serviceOptions, data.service)],
    ['Budget', labelFor(budgetOptions, data.budget)],
    ['Tempistiche', labelFor(timelineOptions, data.timeline)],
    ['Come ci ha conosciuti', data.source || '—'],
    ['Consenso marketing', data.marketing ? 'Sì' : 'No'],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nProgetto:\n${data.message}\n`;
  const html = `<table cellpadding="6" style="font-family:system-ui,sans-serif;font-size:14px">${rows
    .map(([k, v]) => `<tr><th align="left">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join('')}</table><h3 style="font-family:system-ui,sans-serif">Progetto</h3><p style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(data.message)}</p>`;
  return { subject: `Nuova richiesta dal sito — ${data.company}`, text, html };
}

/**
 * Email provider adapter. Resend is the default; swap this function to use
 * Postmark, SES, SMTP… The rest of the app only depends on `SendResult`.
 */
export async function sendContactEmail(data: ContactData, config: MailConfig, isDev: boolean): Promise<SendResult> {
  const { to, from, apiKey } = config;
  const message = buildMessage(data);

  if (!to || !from || !apiKey) {
    if (isDev) {
      // Dev-only preview. Never log personal data: only the shape of the request.
      console.info('[contact] dev preview — provider not configured. Fields received:', {
        service: data.service,
        budget: data.budget,
        timeline: data.timeline,
        messageLength: data.message.length,
      });
      return { ok: true, mode: 'dev-preview' };
    }
    return { ok: false, reason: 'not-configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: data.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      console.error('[contact] provider responded with status', response.status);
      return { ok: false, reason: 'provider-error' };
    }
    return { ok: true, mode: 'sent' };
  } catch {
    console.error('[contact] provider request failed');
    return { ok: false, reason: 'provider-error' };
  }
}

/* ---------- naive in-memory rate limiter (per process) ---------- */
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;

/**
 * Limits submissions per client key. In-memory: good enough for a single Node
 * process. Behind serverless/multi-instance deployments use a shared store
 * (Upstash, KV…) or the platform's WAF rate limiting.
 */
export function rateLimit(key: string, now = Date.now()): { allowed: boolean; retryAfter: number } {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    const oldest = recent[0] ?? now;
    return { allowed: false, retryAfter: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return { allowed: true, retryAfter: 0 };
}
