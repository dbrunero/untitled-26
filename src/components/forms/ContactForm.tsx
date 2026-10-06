import { useEffect, useId, useRef, useState } from 'preact/hooks';
import CustomSelect from '../ui/CustomSelect';
import { budgetOptions, serviceOptions, timelineOptions } from '../../lib/form-options';
import { fieldOrder, validateContact, validateField, type FieldErrors, type FieldName } from '../../lib/validation';
import '../../styles/forms.css';

interface Props {
  /** Prefix for DOM ids when the form appears more than once. */
  idPrefix?: string;
  /** "light" form sits on paper, "dark" on the dark surface. */
  theme?: 'light' | 'dark';
  privacyHref?: string;
}

interface Values {
  name: string;
  email: string;
  company: string;
  phone: string;
  website: string;
  service: string;
  budget: string;
  timeline: string;
  message: string;
  source: string;
  privacy: boolean;
  marketing: boolean;
  hp: string;
}

const initial: Values = {
  name: '',
  email: '',
  company: '',
  phone: '',
  website: '',
  service: '',
  budget: '',
  timeline: '',
  message: '',
  source: '',
  privacy: false,
  marketing: false,
  hp: '',
};

const labels: Record<string, string> = {
  name: 'Nome e cognome',
  email: 'Email',
  company: 'Azienda',
  phone: 'Telefono',
  website: 'Sito attuale',
  service: 'Servizio richiesto',
  budget: 'Budget indicativo',
  timeline: 'Tempistiche',
  message: 'Descrizione del progetto',
  source: 'Come ci hai conosciuti',
  privacy: 'Informativa privacy',
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactForm({ idPrefix = 'contact', theme = 'dark', privacyHref = '/privacy-policy' }: Props) {
  const uid = useId();
  const id = (n: string) => `${idPrefix}-${uid}-${n}`;
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [serverMessage, setServerMessage] = useState('');
  const [devPreview, setDevPreview] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    // Deep links such as /contact?tema=web-app preselect the requested service.
    const theme = new URLSearchParams(location.search).get('tema');
    const map: Record<string, string> = { create: 'foto-video', grow: 'social', build: 'sito-web' };
    const preset = theme ? (map[theme] ?? theme) : '';
    if (preset && serviceOptions.some((o) => o.value === preset)) setValues((v) => (v.service ? v : { ...v, service: preset }));
  }, []);

  const setField = <K extends keyof Values>(key: K, value: Values[K], validateNow = false) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (validateNow || touched[key as FieldName]) {
      setErrors((prev) => {
        const copy = { ...prev };
        const message = validateField(key as FieldName, next);
        if (message) copy[key as FieldName] = message;
        else delete copy[key as FieldName];
        return copy;
      });
    }
  };

  const blur = (key: FieldName) => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors((prev) => {
      const copy = { ...prev };
      const message = validateField(key, values);
      if (message) copy[key] = message;
      else delete copy[key];
      return copy;
    });
  };

  const focusField = (name: string) => {
    const wrapper = formRef.current?.querySelector<HTMLElement>(`[data-field="${name}"]`);
    const target = wrapper?.querySelector<HTMLElement>('select, button[role="combobox"], input:not([type="hidden"]), textarea');
    target?.focus();
  };

  const errorList = fieldOrder.filter((k) => errors[k]);

  useEffect(() => {
    if (status === 'success') successRef.current?.focus();
    if (status === 'error') errorRef.current?.focus();
  }, [status]);

  const onSubmit = async (event: Event) => {
    event.preventDefault();
    if (status === 'submitting') return; // prevent double submit
    const result = validateContact(values);
    if (!result.success) {
      setErrors(result.errors);
      setTouched(Object.fromEntries(fieldOrder.map((k) => [k, true])));
      setShowSummary(true);
      const first = fieldOrder.find((k) => result.errors[k]);
      // Let the summary render, then move focus to the first invalid field.
      requestAnimationFrame(() => first && focusField(first));
      return;
    }
    setShowSummary(false);
    setErrors({});
    setStatus('submitting');
    setServerMessage('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(values),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; errors?: FieldErrors; mode?: string };
      if (response.ok && data.ok) {
        setDevPreview(data.mode === 'dev-preview');
        setStatus('success');
        return;
      }
      if (response.status === 400 && data.errors) {
        setErrors(data.errors);
        setShowSummary(true);
        setStatus('idle');
        const first = fieldOrder.find((k) => data.errors?.[k]);
        requestAnimationFrame(() => first && focusField(first));
        return;
      }
      setServerMessage(data.message ?? 'Non siamo riusciti a inviare il messaggio. Riprova tra poco.');
      setStatus('error');
    } catch {
      setServerMessage('Connessione assente o troppo lenta. Controlla la rete e riprova.');
      setStatus('error');
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const reset = () => {
    setValues(initial);
    setErrors({});
    setTouched({});
    setShowSummary(false);
    setStatus('idle');
  };

  if (status === 'success') {
    return (
      <div class={`form form--${theme} form-success`} data-state="success">
        <div class="form-success__mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M14 25l7 7 13-15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <h3 class="form-success__title" tabIndex={-1} ref={successRef}>
          Richiesta ricevuta.
        </h3>
        <p>Grazie: ti rispondiamo entro un giorno lavorativo, con una prima proposta di passi successivi.</p>
        {devPreview && (
          <p class="form-note" role="note">
            Modalità sviluppo: il provider email non è configurato, quindi il messaggio non è stato realmente inviato.
          </p>
        )}
        <button type="button" class="btn btn--text" onClick={reset}>
          Invia un’altra richiesta
        </button>
      </div>
    );
  }

  const submitting = status === 'submitting';
  const inputProps = (name: FieldName, extra: Record<string, unknown> = {}) => ({
    id: id(name),
    name,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id(name)}-error` : undefined,
    onBlur: () => blur(name),
    ...extra,
  });

  const err = (name: FieldName) =>
    errors[name] ? (
      <p class="field__error" id={`${id(name)}-error`}>
        <span class="field__error-icon" aria-hidden="true">!</span> {errors[name]}
      </p>
    ) : null;

  return (
    <form
      ref={formRef}
      class={`form form--${theme}`}
      method="post"
      action="/api/contact"
      noValidate
      aria-busy={submitting}
      data-hydrated={hydrated ? 'true' : 'false'}
      onSubmit={onSubmit}
    >
      {showSummary && errorList.length > 0 && (
        <div class="form-summary" role="alert" tabIndex={-1} ref={summaryRef}>
          <p class="form-summary__title">
            {errorList.length === 1 ? 'C’è 1 campo da correggere' : `Ci sono ${errorList.length} campi da correggere`}
          </p>
          <ul>
            {errorList.map((name) => (
              <li key={name}>
                <a
                  href={`#${id(name)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    focusField(name);
                  }}
                >
                  {labels[name] ?? name}: {errors[name]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === 'error' && (
        <div class="form-summary form-summary--server" role="alert" tabIndex={-1} ref={errorRef}>
          <p class="form-summary__title">Invio non riuscito</p>
          <p>{serverMessage}</p>
        </div>
      )}

      <p class="form-legend">I campi con <span aria-hidden="true">*</span><span class="sr-only">asterisco</span> sono obbligatori.</p>

      <div class="form-grid">
        <div class={`field ${errors.name ? 'is-invalid' : ''}`} data-field="name">
          <label class="field__label" for={id('name')}>
            Nome e cognome <span class="field__req" aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            autoComplete="name"
            required
            value={values.name}
            onInput={(e) => setField('name', e.currentTarget.value)}
            {...inputProps('name')}
          />
          {err('name')}
        </div>

        <div class={`field ${errors.email ? 'is-invalid' : ''}`} data-field="email">
          <label class="field__label" for={id('email')}>
            Email <span class="field__req" aria-hidden="true">*</span>
          </label>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={values.email}
            onInput={(e) => setField('email', e.currentTarget.value)}
            {...inputProps('email')}
          />
          {err('email')}
        </div>

        <div class={`field ${errors.company ? 'is-invalid' : ''}`} data-field="company">
          <label class="field__label" for={id('company')}>
            Azienda <span class="field__req" aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            autoComplete="organization"
            required
            value={values.company}
            onInput={(e) => setField('company', e.currentTarget.value)}
            {...inputProps('company')}
          />
          {err('company')}
        </div>

        <div class={`field ${errors.phone ? 'is-invalid' : ''}`} data-field="phone">
          <label class="field__label" for={id('phone')}>
            Telefono <span class="field__opt">(opzionale)</span>
          </label>
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={values.phone}
            onInput={(e) => setField('phone', e.currentTarget.value)}
            {...inputProps('phone')}
          />
          {err('phone')}
        </div>

        <div class={`field field--wide ${errors.website ? 'is-invalid' : ''}`} data-field="website">
          <label class="field__label" for={id('website')}>
            Sito attuale <span class="field__opt">(opzionale)</span>
          </label>
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder="example.com"
            value={values.website}
            onInput={(e) => setField('website', e.currentTarget.value)}
            {...inputProps('website')}
          />
          {err('website')}
        </div>

        <CustomSelect
          class={`field--${theme}`}
          name="service"
          label="Servizio richiesto"
          options={serviceOptions}
          value={values.service}
          required
          error={errors.service}
          onChange={(v) => setField('service', v, true)}
          onBlur={() => blur('service')}
        />
        <CustomSelect
          class={`field--${theme}`}
          name="budget"
          label="Budget indicativo"
          options={budgetOptions}
          value={values.budget}
          required
          error={errors.budget}
          onChange={(v) => setField('budget', v, true)}
          onBlur={() => blur('budget')}
        />
        <CustomSelect
          class={`field--${theme}`}
          name="timeline"
          label="Tempistiche"
          options={timelineOptions}
          value={values.timeline}
          required
          error={errors.timeline}
          onChange={(v) => setField('timeline', v, true)}
          onBlur={() => blur('timeline')}
        />

        <div class={`field ${errors.source ? 'is-invalid' : ''}`} data-field="source">
          <label class="field__label" for={id('source')}>
            Come ci hai conosciuti <span class="field__opt">(opzionale)</span>
          </label>
          <input type="text" value={values.source} onInput={(e) => setField('source', e.currentTarget.value)} {...inputProps('source')} />
          {err('source')}
        </div>

        <div class={`field field--full ${errors.message ? 'is-invalid' : ''}`} data-field="message">
          <label class="field__label" for={id('message')}>
            Descrizione del progetto <span class="field__req" aria-hidden="true">*</span>
          </label>
          <p class="field__hint" id={`${id('message')}-hint`}>
            Obiettivo, contesto, scadenze. Anche poche righe bastano.
          </p>
          <textarea
            rows={5}
            required
            value={values.message}
            onInput={(e) => setField('message', e.currentTarget.value)}
            {...inputProps('message', {
              'aria-describedby': [`${id('message')}-hint`, errors.message ? `${id('message')}-error` : ''].filter(Boolean).join(' '),
            })}
          />
          <div class="field__counter" aria-hidden="true">
            {values.message.length}/3000
          </div>
          {err('message')}
        </div>
      </div>

      {/* Honeypot: invisible to people and assistive tech, tempting for bots. */}
      <div class="hp" aria-hidden="true">
        <label>
          Lascia vuoto questo campo
          <input type="text" name="hp" tabIndex={-1} autoComplete="off" value={values.hp} onInput={(e) => setField('hp', e.currentTarget.value)} />
        </label>
      </div>

      <div class="form-checks">
        <div class={`check ${errors.privacy ? 'is-invalid' : ''}`} data-field="privacy">
          <input
            type="checkbox"
            id={id('privacy')}
            name="privacy"
            required
            checked={values.privacy}
            aria-invalid={errors.privacy ? true : undefined}
            aria-describedby={errors.privacy ? `${id('privacy')}-error` : undefined}
            onChange={(e) => setField('privacy', e.currentTarget.checked, true)}
            onBlur={() => blur('privacy')}
          />
          <label for={id('privacy')}>
            Ho letto l’<a href={privacyHref}>informativa privacy</a> e acconsento al trattamento dei dati per rispondere alla richiesta.{' '}
            <span class="field__req" aria-hidden="true">*</span>
          </label>
          {err('privacy')}
        </div>
        <div class="check" data-field="marketing">
          <input
            type="checkbox"
            id={id('marketing')}
            name="marketing"
            checked={values.marketing}
            onChange={(e) => setField('marketing', e.currentTarget.checked)}
          />
          <label for={id('marketing')}>
            Voglio ricevere novità e proposte via email. <span class="field__opt">(facoltativo, puoi revocare in ogni momento)</span>
          </label>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class={`btn btn--primary btn--large ${submitting ? 'is-loading' : ''}`}
          aria-disabled={submitting}
          data-magnetic="0.2"
          data-cursor="link"
        >
          <span class="btn__label">{submitting ? 'Invio in corso…' : 'Invia il progetto'}</span>
          <span class="btn__arrow" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M3 9h12M10 4l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
          {submitting && <span class="btn__spinner" aria-hidden="true" />}
        </button>
        <p class="form-note" id={id('status')} role="status" aria-live="polite">
          {submitting ? 'Stiamo inviando la tua richiesta…' : ''}
        </p>
      </div>
    </form>
  );
}
