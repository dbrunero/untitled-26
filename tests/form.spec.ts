import { test, expect, type Page } from '@playwright/test';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { dismissBanner, ready } from './helpers';

const FORMSPREE = 'https://formspree.io/f/testform01';

/** Stands in for Formspree and records what the browser sent. */
async function mockFormspree(page: Page, reply: { status: number; body: unknown } = { status: 200, body: { ok: true } }) {
  const calls: Array<{ url: string; body: any; accept: string | undefined }> = [];
  await page.route('https://formspree.io/**', async (route) => {
    const req = route.request();
    calls.push({ url: req.url(), body: req.postDataJSON(), accept: req.headers()['accept'] });
    await new Promise((r) => setTimeout(r, 300));
    await route.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.body) });
  });
  return calls;
}

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

test('valid submission is posted once to Formspree and shows the success state', async ({ page }) => {
  const calls = await mockFormspree(page);
  await openForm(page);
  await fillValid(page);
  await page.getByRole('button', { name: 'Invia il progetto' }).dblclick();
  await expect(page.getByRole('heading', { name: 'Richiesta ricevuta.' })).toBeFocused();
  expect(calls).toHaveLength(1); // double click did not double submit
  expect(calls[0]!.url).toBe(FORMSPREE);
  expect(calls[0]!.accept).toContain('application/json');
  expect(calls[0]!.body).toMatchObject({
    name: 'Mario Rossi',
    email: 'mario@azienda.it',
    company: 'Azienda Demo',
    service: 'Configuratore o preventivatore',
    budget: '7.500–15.000 €',
    timeline: '1–3 mesi',
    marketing: 'No',
  });
  expect(calls[0]!.body._subject).toContain('Azienda Demo');
});

test('invalid data never reaches Formspree', async ({ page }) => {
  const calls = await mockFormspree(page);
  await openForm(page);
  await page.getByLabel(/Nome e cognome/).fill('Mario Rossi');
  await page.getByRole('button', { name: 'Invia il progetto' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'da correggere' })).toBeVisible();
  expect(calls).toHaveLength(0);
});

test('provider errors are shown, field errors are mapped, nothing is faked', async ({ page }) => {
  await mockFormspree(page, { status: 422, body: { errors: [{ field: 'email', code: 'TYPE_EMAIL', message: 'should be an email' }] } });
  await openForm(page);
  await fillValid(page);
  await page.getByRole('button', { name: 'Invia il progetto' }).click();
  await expect(page.getByLabel(/^Email/)).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel(/^Email/)).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Richiesta ricevuta.' })).toHaveCount(0);

  await page.unroute('https://formspree.io/**');
  await mockFormspree(page, { status: 500, body: {} });
  await page.getByRole('button', { name: 'Invia il progetto' }).click();
  await expect(page.getByText('Invio non riuscito')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Richiesta ricevuta.' })).toHaveCount(0);
});

test('honeypot submissions are dropped silently', async ({ page }) => {
  const calls = await mockFormspree(page);
  await openForm(page);
  await fillValid(page);
  await page.locator('input[name="_gotcha"]').evaluate((el: HTMLInputElement) => {
    el.value = 'spam';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Invia il progetto' }).click();
  await expect(page.getByRole('heading', { name: 'Richiesta ricevuta.' })).toBeVisible();
  expect(calls).toHaveLength(0);
});

test('without JavaScript the form still posts to Formspree with native controls', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/contact');
  const form = page.locator('form.form');
  await expect(form).toHaveAttribute('action', FORMSPREE);
  await expect(form).toHaveAttribute('method', 'post');
  await expect(form.locator('select[name="service"]')).toBeVisible();
  await expect(form.locator('input[name="_next"]')).toHaveValue(/\/contact\/grazie$/);
  await context.close();
});

test.describe('production build without PUBLIC_FORMSPREE_ID', () => {
  let server: ChildProcess;
  test.beforeAll(async () => {
    test.setTimeout(180_000);
    const env = { ...process.env, PUBLIC_FORMSPREE_ID: '', PUBLIC_SITE_URL: 'http://127.0.0.1:4397' };
    execSync('pnpm exec astro build --outDir .tmp-noform', { env, stdio: 'ignore' });
    server = spawn('node', ['tests/static-server.mjs', '.tmp-noform', '4397'], { env, stdio: 'ignore' });
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch('http://127.0.0.1:4397/robots.txt')).ok) return;
      } catch {
        /* not up yet */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  });
  test.afterAll(() => server?.kill());

  test('never pretends the message was sent', async ({ page }) => {
    await page.goto('http://127.0.0.1:4397/contact');
    await ready(page);
    await dismissBanner(page);
    await page.locator('form').scrollIntoViewIfNeeded();
    await page.locator('form[data-hydrated="true"]').waitFor();
    await fillValid(page);
    await page.getByRole('button', { name: 'Invia il progetto' }).click();
    await expect(page.getByText('Invio non riuscito')).toBeVisible();
    await expect(page.getByText('non è ancora collegato')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Richiesta ricevuta.' })).toHaveCount(0);
  });
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
