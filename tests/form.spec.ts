import { test, expect, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { dismissBanner, ready } from './helpers';

const MOCK = 'http://127.0.0.1:4398';
const mockState = async (): Promise<{ count: number; last: { auth: string; body: any } | null }> => (await fetch(`${MOCK}/__last`)).json();

async function fillValid(page: Page) {
  await page.getByLabel(/Nome e cognome/).fill('Mario Rossi');
  await page.getByLabel(/^Email/).fill('mario@azienda.it');
  await page.getByLabel(/^Azienda/).fill('Azienda Demo');
  await pick(page, 'Servizio richiesto', 'Configuratore o preventivatore');
  await pick(page, 'Budget indicativo', '7.500–15.000 €');
  await pick(page, 'Tempistiche', '1–3 mesi');
  await page.getByLabel(/Descrizione del progetto/).fill('Vorremmo un configuratore online per i nostri prodotti, con preventivo automatico.');
  await page.getByLabel(/Ho letto l’informativa privacy/).check();
}

async function openForm(page: Page) {
  await page.goto('/contact');
  await ready(page);
  await dismissBanner(page);
  // The form island hydrates when it scrolls into view (client:visible).
  await page.locator('form').scrollIntoViewIfNeeded();
  await page.locator('form[data-hydrated="true"]').waitFor();
}

async function pick(page: Page, label: string, option: string) {
  const combo = page.getByRole('combobox', { name: new RegExp(label) });
  await combo.click();
  await page.getByRole('option', { name: option }).click();
}

test('empty submit shows summary + inline errors and focuses the first invalid field', async ({ page }) => {
  await openForm(page);
  await page.getByRole('button', { name: 'Invia il progetto' }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'campi da correggere' });
  await expect(summary).toBeVisible();
  await expect(page.getByLabel(/Nome e cognome/)).toBeFocused();
  await expect(page.getByLabel(/Nome e cognome/)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#' + (await page.getByLabel(/Nome e cognome/).getAttribute('aria-describedby')))).toContainText('Inserisci nome e cognome');
  await expect(page.getByRole('combobox', { name: /Servizio richiesto/ })).toHaveAttribute('aria-invalid', 'true');
  // privacy is required
  await expect(page.locator('.field__error', { hasText: 'Per procedere devi confermare' })).toBeVisible();
});

test('progressive validation: email error appears on blur and clears when fixed', async ({ page }) => {
  await openForm(page);
  const email = page.getByLabel(/^Email/);
  await email.fill('non-valida');
  await email.blur();
  await expect(page.getByText('Inserisci un’email valida')).toBeVisible();
  await email.fill('nome@azienda.it');
  await expect(page.getByText('Inserisci un’email valida')).toHaveCount(0);
});

test('valid submission reaches the email provider once and shows the success state', async ({ page }) => {
  await openForm(page);
  const before = (await mockState()).count;
  await fillValid(page);
  await page.route('**/api/contact', async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.continue();
  });
  const submit = page.getByRole('button', { name: 'Invia il progetto' });
  await submit.dblclick();
  await expect(page.getByRole('heading', { name: 'Richiesta ricevuta.' })).toBeFocused();
  const after = await mockState();
  expect(after.count - before).toBe(1); // double click did not double submit
  expect(after.last?.auth).toBe('Bearer re_test_key');
  expect(after.last?.body.to).toEqual(['inbox@example.test']);
  expect(after.last?.body.reply_to).toBe('mario@azienda.it');
  expect(after.last?.body.subject).toContain('Azienda Demo');
  expect(after.last?.body.text).toContain('Configuratore o preventivatore');
});

test.describe('production without email credentials', () => {
  let server: ChildProcess;
  test.beforeAll(async () => {
    server = spawn('node', ['dist/server/entry.mjs'], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '4397', CONTACT_TO_EMAIL: '', CONTACT_FROM_EMAIL: '', RESEND_API_KEY: '' },
      stdio: 'ignore',
    });
    for (let i = 0; i < 50; i++) {
      try {
        if ((await fetch('http://127.0.0.1:4397/robots.txt')).ok) return;
      } catch {
        /* not up yet */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  });
  test.afterAll(() => server?.kill());

  test('never pretends the message was sent: API answers 503 and the UI shows an error', async ({ page, request }) => {
    const payload = {
      name: 'Mario Rossi',
      email: 'mario@azienda.it',
      company: 'Azienda Demo',
      service: 'seo',
      budget: 'da-definire',
      timeline: 'asap',
      message: 'Vorremmo migliorare la visibilità organica del nostro sito.',
      privacy: true,
    };
    const res = await request.post('http://127.0.0.1:4397/api/contact', { data: payload, headers: { Accept: 'application/json' } });
    expect(res.status()).toBe(503);
    expect((await res.json()).ok).toBe(false);

    await page.route('**/api/contact', (route) => route.continue({ url: 'http://127.0.0.1:4397/api/contact' }));
    await openForm(page);
    await fillValid(page);
    await page.getByRole('button', { name: 'Invia il progetto' }).click();
    await expect(page.getByText('Invio non riuscito')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Richiesta ricevuta.' })).toHaveCount(0);
  });
});

test('server-side validation rejects invalid payloads', async ({ request }) => {
  const res = await request.post('/api/contact', { data: { name: 'x', email: 'bad' }, headers: { Accept: 'application/json' } });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.ok).toBe(false);
  expect(body.errors.email).toBeTruthy();
  expect(body.errors.privacy).toBeTruthy();
});

test('honeypot is swallowed silently and cross-origin posts are refused', async ({ request }) => {
  const before = (await mockState()).count;
  const honeypot = await request.post('/api/contact', { data: { hp: 'spam' }, headers: { Accept: 'application/json' } });
  expect(honeypot.status()).toBe(200);
  expect((await mockState()).count).toBe(before); // nothing was sent
  const cross = await request.post('/api/contact', { data: {}, headers: { Origin: 'https://evil.example', Accept: 'application/json' } });
  expect(cross.status()).toBe(403);
});

test('custom select works from the keyboard (open, arrows, typeahead, Home/End, Escape)', async ({ page }) => {
  await openForm(page);
  const combo = page.getByRole('combobox', { name: /Budget indicativo/ });
  await combo.focus();
  await expect(combo).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowDown');
  await expect(combo).toHaveAttribute('aria-expanded', 'true');
  const listId = await combo.getAttribute('aria-controls');
  await expect(page.locator(`#${listId}`)).toBeVisible();
  // opening highlights the first option; one more ArrowDown moves to the second
  await page.keyboard.press('ArrowDown');
  const active = await combo.getAttribute('aria-activedescendant');
  await expect(page.locator(`#${active}`)).toHaveText(/Fino a 3.000/);
  await page.keyboard.press('End');
  await expect(page.locator(`#${await combo.getAttribute('aria-activedescendant')}`)).toHaveText(/Oltre 30.000/);
  await page.keyboard.press('Home');
  await expect(page.locator(`#${await combo.getAttribute('aria-activedescendant')}`)).toHaveText(/Da definire/);
  await page.keyboard.press('Escape');
  await expect(combo).toHaveAttribute('aria-expanded', 'false');
  await expect(combo).toBeFocused();

  // typeahead on the closed control selects, then Enter/Space on the open list commits
  await page.keyboard.type('3');
  await expect(combo).toContainText('3.000–7.500');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(combo).toContainText('7.500–15.000');
  await expect(combo).toHaveAttribute('aria-expanded', 'false');
  // click outside closes
  await combo.click();
  await expect(combo).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('heading', { level: 1 }).click();
  await expect(combo).toHaveAttribute('aria-expanded', 'false');
});
