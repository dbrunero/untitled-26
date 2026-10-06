import type { APIRoute } from 'astro';
import { CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL, RESEND_API_KEY, RESEND_API_URL } from 'astro:env/server';
import { validateContact, type FieldErrors } from '../../lib/validation';
import { rateLimit, sendContactEmail } from '../../lib/contact';

// This is the only route rendered on demand; everything else is static.
export const prerender = false;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

const wantsJson = (request: Request) => (request.headers.get('accept') ?? '').includes('application/json');

function plainResponse(request: Request, redirectTo: string, payload: unknown, status: number) {
  if (wantsJson(request)) return json(payload, status);
  if (status < 400) return new Response(null, { status: 303, headers: { Location: redirectTo } });
  const message = (payload as { message?: string }).message ?? 'Si è verificato un errore.';
  const html = `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invio non riuscito</title><body style="font-family:system-ui;background:#09090a;color:#f5f2eb;padding:2rem;max-width:40rem;margin:auto"><h1>Invio non riuscito</h1><p>${message.replace(/</g, '&lt;')}</p><p><a style="color:#c2ff1f" href="/contact">Torna al modulo</a></p></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
  // CSRF: browsers always send Origin on cross-origin POST. Reject mismatches.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) {
    return json({ ok: false, message: 'Origine della richiesta non valida.' }, 403);
  }

  const contentType = request.headers.get('content-type') ?? '';
  let raw: Record<string, unknown>;
  try {
    if (contentType.includes('application/json')) {
      raw = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      const read = (k: string) => (form.get(k) ?? '') as string;
      raw = {
        name: read('name'),
        email: read('email'),
        company: read('company'),
        phone: read('phone'),
        website: read('website'),
        service: read('service'),
        budget: read('budget'),
        timeline: read('timeline'),
        message: read('message'),
        source: read('source'),
        privacy: form.get('privacy') === 'on' || form.get('privacy') === 'true',
        marketing: form.get('marketing') === 'on' || form.get('marketing') === 'true',
        hp: read('hp'),
      };
    }
  } catch {
    return plainResponse(request, '/contact', { ok: false, message: 'Richiesta non leggibile.' }, 400);
  }

  // Honeypot: pretend everything went fine so bots do not adapt.
  if (typeof raw.hp === 'string' && raw.hp.length > 0) {
    return plainResponse(request, '/contact/grazie', { ok: true }, 200);
  }

  const limit = rateLimit(clientAddress ?? request.headers.get('x-forwarded-for') ?? 'unknown');
  if (!limit.allowed) {
    return json(
      { ok: false, message: 'Hai inviato troppe richieste. Riprova tra qualche minuto.' },
      429,
      { 'Retry-After': String(limit.retryAfter) },
    );
  }

  const result = validateContact(raw);
  if (!result.success) {
    const errors: FieldErrors = result.errors;
    return plainResponse(request, '/contact', { ok: false, message: 'Controlla i campi evidenziati.', errors }, 400);
  }

  const sent = await sendContactEmail(
    result.data,
    { to: CONTACT_TO_EMAIL, from: CONTACT_FROM_EMAIL, apiKey: RESEND_API_KEY, apiUrl: RESEND_API_URL },
    import.meta.env.DEV,
  );

  if (!sent.ok) {
    const message =
      sent.reason === 'not-configured'
        ? 'Il servizio di invio non è ancora configurato. Scrivici direttamente via email.'
        : 'Non siamo riusciti a inviare il messaggio. Riprova tra poco o scrivici via email.';
    return plainResponse(request, '/contact', { ok: false, message }, sent.reason === 'not-configured' ? 503 : 502);
  }

  return plainResponse(request, '/contact/grazie', { ok: true, mode: sent.mode }, 200);
};

export const ALL: APIRoute = () =>
  json({ ok: false, message: 'Metodo non consentito.' }, 405, { Allow: 'POST' });
